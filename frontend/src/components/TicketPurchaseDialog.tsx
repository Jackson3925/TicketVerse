
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

interface Event {
  id: number;
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
  const [walletConnected, setWalletConnected] = useState(false);
  const { toast } = useToast();

  const handleConnectWallet = async () => {
    setIsProcessing(true);
    // Simulate wallet connection
    setTimeout(() => {
      setWalletConnected(true);
      setIsProcessing(false);
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected.",
      });
    }, 2000);
  };

  const handlePurchase = async () => {
    setIsProcessing(true);
    // Simulate NFT ticket purchase
    setTimeout(() => {
      setStep(4);
      setIsProcessing(false);
      toast({
        title: "Purchase Successful!",
        description: `${selectedSeats.length} NFT ticket(s) purchased successfully.`,
      });
      
      // Store tickets with seat information
      const existingTickets = JSON.parse(localStorage.getItem('myTickets') || '[]');
      const newTickets = selectedSeats.map((seat, i) => ({
        id: Date.now() + i,
        eventId: event.id,
        eventTitle: event.title,
        artist: event.artist,
        date: event.date,
        venue: event.venue,
        location: event.location,
        price: seat.price,
        image: event.image,
        ticketNumber: `TKT-${Date.now()}-${i + 1}`,
        seatInfo: {
          row: seat.row,
          number: seat.number,
          category: seat.category
        },
        purchaseDate: new Date().toISOString(),
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TICKET-${seat.id}-${Date.now()}`,
      }));
      localStorage.setItem('myTickets', JSON.stringify([...existingTickets, ...newTickets]));
    }, 3000);
  };

  const resetDialog = () => {
    setStep(1);
    setQuantity(1);
    setSelectedSeats([]);
    setWalletConnected(false);
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

              {!walletConnected ? (
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
                    <span className="text-sm">Wallet Connected</span>
                  </div>
                  
                  <Button 
                    onClick={handlePurchase} 
                    disabled={isProcessing}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing Payment..." : `Buy ${selectedSeats.length} Ticket${selectedSeats.length > 1 ? 's' : ''}`}
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
                <div className="mt-2 text-sm">
                  <strong>Seats:</strong> {selectedSeats.map(s => s.id).join(', ')}
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
