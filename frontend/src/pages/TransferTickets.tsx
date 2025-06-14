
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Calendar, MapPin, Gift, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TransferTickets = () => {
  const [selectedTicket, setSelectedTicket] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [transferMethod, setTransferMethod] = useState("wallet");
  const { toast } = useToast();

  const ownedTickets = [
    {
      id: 1,
      eventTitle: "Electric Nights Festival",
      artist: "Various Artists",
      date: "2024-07-15",
      venue: "Madison Square Garden",
      location: "New York, NY",
      ticketNumber: "NFT-001-2024",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&h=200&fit=crop"
    },
    {
      id: 2,
      eventTitle: "Rock Revolution Tour",
      artist: "Thunder Strike",
      date: "2024-07-22",
      venue: "Hollywood Bowl",
      location: "Los Angeles, CA",
      ticketNumber: "NFT-002-2024",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop"
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTransfer = () => {
    if (!selectedTicket || (!recipientAddress && !recipientEmail)) {
      toast({
        title: "Missing Information",
        description: "Please select a ticket and provide recipient details.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Transfer Initiated",
      description: "Your ticket transfer has been submitted to the blockchain.",
    });

    // Reset form
    setSelectedTicket("");
    setRecipientAddress("");
    setRecipientEmail("");
    setTransferMessage("");
  };

  const selectedTicketData = ownedTickets.find(ticket => ticket.id.toString() === selectedTicket);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Transfer Tickets</h1>
          <p className="text-muted-foreground">
            Send your NFT tickets to friends or family
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transfer Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="h-5 w-5 mr-2" />
                Transfer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Select Ticket */}
              <div className="space-y-2">
                <Label htmlFor="ticket">Select Ticket to Transfer</Label>
                <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a ticket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ownedTickets.map((ticket) => (
                      <SelectItem key={ticket.id} value={ticket.id.toString()}>
                        {ticket.eventTitle} - {formatDate(ticket.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transfer Method */}
              <div className="space-y-2">
                <Label>Transfer Method</Label>
                <Select value={transferMethod} onValueChange={setTransferMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet Address</SelectItem>
                    <SelectItem value="email">Email Address</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Details */}
              {transferMethod === "wallet" ? (
                <div className="space-y-2">
                  <Label htmlFor="address">Recipient Wallet Address</Label>
                  <Input
                    id="address"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="email">Recipient Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
              )}

              {/* Optional Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message for the recipient..."
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium">Important Notice</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Ticket transfers are irreversible. Make sure the recipient details are correct.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleTransfer} className="w-full">
                <Gift className="h-4 w-4 mr-2" />
                Transfer Ticket
              </Button>
            </CardContent>
          </Card>

          {/* Selected Ticket Preview */}
          {selectedTicketData && (
            <Card>
              <CardHeader>
                <CardTitle>Ticket Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <img 
                    src={selectedTicketData.image} 
                    alt={selectedTicketData.eventTitle}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  
                  <div>
                    <h3 className="text-lg font-semibold">{selectedTicketData.eventTitle}</h3>
                    <p className="text-muted-foreground">{selectedTicketData.artist}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(selectedTicketData.date)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="line-clamp-1">{selectedTicketData.venue}, {selectedTicketData.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Ticket #</span>
                      <Badge variant="outline">{selectedTicketData.ticketNumber}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-center text-sm text-muted-foreground pt-4">
                    <span>This ticket will be transferred</span>
                    <ArrowRight className="h-4 w-4 mx-2" />
                    <span>to recipient</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferTickets;
