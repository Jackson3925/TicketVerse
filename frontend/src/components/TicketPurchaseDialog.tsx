
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, CreditCard, Ticket, CheckCircle, MapPin } from "lucide-react";
import SeatSelection from "./SeatSelection";
import { contractService, contractUtils, TicketPurchaseParams } from "@/lib/contracts";
import { useWeb3 } from "@/hooks/useWeb3";
import { ticketsAPI, ordersAPI, seatAssignmentsAPI } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Event {
  id: string; // Database UUID
  contract_event_id: number | null; // Smart contract event ID
  title: string;
  artist: string;
  date: string;
  venue: string;
  location: string;
  price: string;
  image: string;
}

interface TicketPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

interface Seat {
  id: string;
  row: string;
  number: number;
  price: string;
  status: 'available' | 'occupied' | 'selected';
  category: 'vip' | 'premium' | 'standard';
}

const TicketPurchaseDialog = ({ isOpen, onClose, event }: TicketPurchaseDialogProps) => {
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTicketType, setSelectedTicketType] = useState<number>(0);
  const [purchasedTokenIds, setPurchasedTokenIds] = useState<number[]>([]);
  const { toast } = useToast();
  const { wallet, isConnected, connectWallet } = useWeb3();
  const { user } = useAuth();
  const account = wallet?.address;

  const handleConnectWallet = async () => {
    setIsProcessing(true);
    try {
      await connectWallet();
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async () => {
    if (!isConnected || !account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to purchase tickets.",
        variant: "destructive"
      });
      return;
    }

    if (!contractUtils.isValidContractEventId(event.contract_event_id)) {
      toast({
        title: "Event Not Available",
        description: "This event is not yet available for blockchain ticket purchases.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Get ticket contract address to fetch ticket types and validate prices
      const ticketContractAddress = await contractService.getTicketContractAddress(event.contract_event_id);
      const contractTicketTypes = await contractService.getTicketTypes(ticketContractAddress);
      
      if (contractTicketTypes.length === 0) {
        throw new Error('No ticket types found for this event');
      }
      
      // Get the first selected seat to determine category and price
      const firstSeat = selectedSeats[0];
      const databasePrice = parseFloat(firstSeat.price.replace(' ETH', ''));
      
      // Find matching ticket type by price (for now, use first available or match by price)
      let matchedTicketTypeId = 0;
      let contractPrice = contractTicketTypes[0].price;
      
      // Try to find exact price match
      const exactMatch = contractTicketTypes.findIndex(tt => 
        Math.abs(parseFloat(tt.price) - databasePrice) < 0.0001 // Allow small precision difference
      );
      
      if (exactMatch >= 0) {
        matchedTicketTypeId = exactMatch;
        contractPrice = contractTicketTypes[exactMatch].price;
      } else {
        console.warn(`No exact price match found. Database: ${databasePrice} ETH, Available contract prices:`, 
          contractTicketTypes.map(tt => tt.price));
        // Use the first ticket type as fallback
        contractPrice = contractTicketTypes[0].price;
      }
      
      console.log(`Using ticket type ${matchedTicketTypeId} with price ${contractPrice} ETH`);
      
      // Prepare purchase parameters using validated contract price
      const purchaseParams: TicketPurchaseParams = {
        eventId: event.contract_event_id, // Use contract event ID instead of database UUID
        ticketTypeId: matchedTicketTypeId,
        recipient: account,
        priceInEth: contractPrice // Use exact contract price
      };

      // Calculate total price using validated contract price for all seats
      const totalPrice = selectedSeats.length * parseFloat(contractPrice);
      
      // Find seat category ID using the already defined firstSeat
      const seatCategoryId = await ticketsAPI.findSeatCategoryId(event.id, firstSeat.category);
      
      if (!seatCategoryId) {
        throw new Error(`Seat category '${firstSeat.category}' not found for event`);
      }
      
      // Step 1: Call contract to purchase tickets and get real token IDs
      const purchaseResults = [];
      
      // Purchase tickets one by one to get individual token IDs
      for (let i = 0; i < selectedSeats.length; i++) {
        const result = await contractService.purchaseTicket(purchaseParams);
        purchaseResults.push(result);
        console.log(`Ticket ${i + 1} purchased - Token ID: ${result.tokenId}, Transaction: ${result.transactionHash}`);
      }

      // Step 2: Create order in database with confirmed status and first transaction hash
      const orderData = {
        event_id: event.id,
        seat_category_id: seatCategoryId,
        quantity: selectedSeats.length,
        unit_price: parseFloat(contractPrice),
        total_price: totalPrice,
        status: 'confirmed',
        transaction_hash: purchaseResults[0].transactionHash
      };
      
      console.log('Creating confirmed order:', orderData);
      const order = await ordersAPI.createOrder(orderData);
      console.log('Order created with confirmed status:', order);
      
      // Step 3: Create tickets in database with real token IDs
      const ticketPromises = selectedSeats.map(async (seat, i) => {
        const purchaseResult = purchaseResults[i];
        const ticketData = {
          token_id: purchaseResult.tokenId, // ✅ Using real token ID from blockchain
          order_id: order.id,
          event_id: event.id,
          seat_category_id: seatCategoryId,
          ticket_number: `TKT-${purchaseResult.tokenId}`,
          seat_row: seat.row === 'AUTO' ? null : seat.row,
          seat_number: seat.row === 'AUTO' ? null : seat.number.toString()
        };
        
        console.log('Creating ticket with real token ID:', ticketData);
        return await ticketsAPI.createTicket(ticketData);
      });
      
      const createdTickets = await Promise.all(ticketPromises);
      console.log('Tickets created with real token IDs:', createdTickets);
      
      // Step 4: Confirm seat assignments in database
      if (user) {
        try {
          await seatAssignmentsAPI.confirmSeatPurchase(event.id, user.id, order.id);
          console.log('Seat assignments confirmed and marked as sold');
        } catch (seatError) {
          console.error('Error confirming seat assignments:', seatError);
          // Don't fail the whole purchase for seat assignment issues
        }
      }
      
      setPurchasedTokenIds(purchaseResults.map(r => r.tokenId));
      setStep(4);
      
      toast({
        title: "Purchase Successful!",
        description: `${selectedSeats.length} NFT ticket${selectedSeats.length > 1 ? 's' : ''} purchased! Token IDs: ${purchaseResults.map(r => r.tokenId).join(', ')}`,
      });
    } catch (error: any) {
      console.error('Error purchasing ticket:', error);
      toast({
        title: "Purchase Failed",
        description: contractUtils.formatContractError(error),
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setQuantity(1);
    setSelectedSeats([]);
    setSelectedTicketType(0);
    setPurchasedTokenIds([]);
    setIsProcessing(false);
    onClose();
  };

  const totalPrice = selectedSeats.reduce((sum, seat) => 
    sum + parseFloat(seat.price.replace(' ETH', '')), 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={resetDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Ticket className="h-5 w-5" />
            <span>Purchase Tickets</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex space-x-3">
                <img src={event.image} alt={event.title} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.artist}</p>
                  <p className="text-xs text-muted-foreground">{event.venue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Quantity Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="quantity">Number of Tickets</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="6"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum 6 tickets per purchase
                </p>
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Select Seats
              </Button>
            </div>
          )}

          {/* Step 2: Seat Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <SeatSelection
                maxSeats={quantity}
                selectedSeats={selectedSeats}
                onSeatsChange={setSelectedSeats}
                eventId={event.id}
              />

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={selectedSeats.length === 0}
                  className="flex-1"
                >
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Wallet Connection & Payment */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-center mb-4">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Total: {totalPrice.toFixed(3)} ETH
                  </Badge>
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Selected Seats:</span>
                    <span>{selectedSeats.map(s => s.id).join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span>{selectedSeats.length}</span>
                  </div>
                </div>
              </div>

              {!isConnected ? (
                <Button 
                  onClick={handleConnectWallet} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {isProcessing ? "Connecting..." : "Connect Wallet"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Wallet Connected: {account?.slice(0, 6)}...{account?.slice(-4)}</span>
                  </div>
                  
                  <Button 
                    onClick={handlePurchase} 
                    disabled={isProcessing}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing Payment..." : `Buy ${selectedSeats.length} NFT Ticket${selectedSeats.length > 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}

              <Button variant="outline" onClick={() => setStep(2)} className="w-full">
                Back to Seat Selection
              </Button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Purchase Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Your NFT tickets have been minted and added to your wallet.
                </p>
                <div className="mt-2 text-sm space-y-1">
                  <div><strong>Seats:</strong> {selectedSeats.map(s => s.id).join(', ')}</div>
                  {purchasedTokenIds.length > 0 && (
                    <div>
                      <strong>Token IDs:</strong> {purchasedTokenIds.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={resetDialog} className="w-full">
                View My Tickets
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketPurchaseDialog;
