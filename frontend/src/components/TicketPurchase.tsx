import { useState } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Wallet, 
  Ticket, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  CreditCard,
  Receipt
} from "lucide-react";
import { contractService, contractUtils, type TicketPurchaseParams } from "@/lib/contracts";
import { formatEther, parseEther } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { ordersAPI, ticketsAPI } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface TicketType {
  id: number;
  name: string;
  price: string; // in ETH
  available: number;
  description?: string;
}

interface TicketPurchaseProps {
  eventId: number;
  eventName: string;
  ticketTypes: TicketType[];
  eventDate: Date;
  onPurchaseSuccess?: (txHash: string) => void;
}

const TicketPurchase = ({
  eventId,
  eventName,
  ticketTypes,
  eventDate,
  onPurchaseSuccess
}: TicketPurchaseProps) => {
  const { isConnected, wallet, connectWallet } = useWeb3();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [selectedTicketType, setSelectedTicketType] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<'select' | 'confirm' | 'processing' | 'success'>('select');

  const selectedTicket = ticketTypes.find(t => t.id.toString() === selectedTicketType);
  const totalPrice = selectedTicket ? contractUtils.calculateTotalPrice(selectedTicket.price, quantity) : "0";
  const canPurchase = selectedTicket && quantity > 0 && quantity <= selectedTicket.available && isConnected && isAuthenticated;

  const handlePurchase = async () => {
    if (!canPurchase || !selectedTicket || !wallet) return;

    setIsPurchasing(true);
    setPurchaseStep('processing');

    try {
      // Check if user has sufficient balance
      const userBalance = parseFloat(wallet.balance);
      const totalCost = parseFloat(totalPrice);
      
      if (userBalance < totalCost) {
        throw new Error(`Insufficient balance. Required: ${totalPrice} ETH, Available: ${wallet.balance} ETH`);
      }

      const purchaseParams: TicketPurchaseParams = {
        eventId,
        ticketType: selectedTicket.id,
        quantity,
        pricePerTicket: selectedTicket.price
      };

      const txHash = await contractService.purchaseTickets(purchaseParams);
      
      setPurchaseStep('success');
      toast({
        title: "Purchase Successful!",
        description: `Transaction hash: ${txHash.slice(0, 10)}...`,
      });

      if (onPurchaseSuccess) {
        onPurchaseSuccess(txHash);
      }

    } catch (error: any) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Transaction failed. Please try again.",
        variant: "destructive",
      });
      setPurchaseStep('select');
    } finally {
      setIsPurchasing(false);
    }
  };

  const resetPurchase = () => {
    setPurchaseStep('select');
    setSelectedTicketType("");
    setQuantity(1);
  };

  if (purchaseStep === 'success') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle>Purchase Successful!</CardTitle>
          <CardDescription>
            Your tickets have been purchased and will appear in your wallet shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={resetPurchase} variant="outline" className="mr-2">
            Buy More Tickets
          </Button>
          <Button onClick={() => window.open('/my-tickets', '_blank')}>
            View My Tickets
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Ticket className="h-5 w-5" />
          <span>Purchase Tickets</span>
        </CardTitle>
        <CardDescription>
          {eventName} • {eventDate.toLocaleDateString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Wallet Connection Check */}
        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your wallet to purchase tickets</span>
              <Button size="sm" onClick={connectWallet}>
                Connect Wallet
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Info */}
        {isConnected && wallet && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Connected Wallet:</span>
              <span className="font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span>Balance:</span>
              <span className="font-mono">{wallet.balance} ETH</span>
            </div>
          </div>
        )}

        {/* Ticket Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-type">Ticket Type</Label>
            <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
              <SelectTrigger>
                <SelectValue placeholder="Select ticket type" />
              </SelectTrigger>
              <SelectContent>
                {ticketTypes.map((ticket) => (
                  <SelectItem key={ticket.id} value={ticket.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{ticket.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {ticket.price} ETH • {ticket.available} available
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTicket && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedTicket.available}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={isPurchasing}
              />
              {quantity > selectedTicket.available && (
                <p className="text-sm text-destructive">
                  Only {selectedTicket.available} tickets available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Purchase Summary */}
        {selectedTicket && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">Purchase Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ticket Type:</span>
                <span>{selectedTicket.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Price per ticket:</span>
                <span>{selectedTicket.price} ETH</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Total:</span>
                <span>{totalPrice} ETH</span>
              </div>
            </div>
          </div>
        )}

        {/* Balance Warning */}
        {isConnected && wallet && selectedTicket && parseFloat(wallet.balance) < parseFloat(totalPrice) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Insufficient balance. You need {totalPrice} ETH but only have {wallet.balance} ETH.
            </AlertDescription>
          </Alert>
        )}

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={!canPurchase || isPurchasing}
          className="w-full"
          size="lg"
        >
          {isPurchasing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {purchaseStep === 'processing' ? 'Processing Transaction...' : 'Purchasing...'}
            </>
          ) : !isConnected ? (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet to Purchase
            </>
          ) : !selectedTicket ? (
            "Select Ticket Type"
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Purchase for {totalPrice} ETH
            </>
          )}
        </Button>

        {/* Terms */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Tickets are non-refundable</p>
          <p>• NFT tickets will be transferred to your wallet</p>
          <p>• Gas fees apply for blockchain transactions</p>
          <p>• Transfers may be restricted until event date</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketPurchase;