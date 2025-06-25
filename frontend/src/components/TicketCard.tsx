
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Download, Share2, QrCode } from "lucide-react";

interface TicketData {
  id: number;
  eventId: number;
  eventTitle: string;
  artist: string;
  date: string;
  venue: string;
  location: string;
  price: string;
  image: string;
  ticketNumber: string;
  purchaseDate: string;
  qrCode: string;
}

interface TicketCardProps {
  ticket: TicketData;
}

const TicketCard = ({ ticket }: TicketCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPurchaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDownloadTicket = () => {
    console.log('Downloading ticket:', ticket.ticketNumber);
  };

  const handleShareTicket = () => {
    if (navigator.share) {
      navigator.share({
        title: `${ticket.eventTitle} Ticket`,
        text: `Check out my ticket for ${ticket.eventTitle}!`,
        url: window.location.href,
      });
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={ticket.image} 
          alt={ticket.eventTitle}
          className="w-full h-48 object-cover"
        />
        <Badge className="absolute top-3 left-3 bg-primary">
          NFT Ticket
        </Badge>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{ticket.eventTitle}</CardTitle>
        <p className="text-muted-foreground">{ticket.artist}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDate(ticket.date)}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="line-clamp-1">{ticket.venue}, {ticket.location}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Ticket #</span>
            <span className="font-mono">{ticket.ticketNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Price Paid</span>
            <span>{ticket.price}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Purchased</span>
            <span>{formatPurchaseDate(ticket.purchaseDate)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-center">
          <img 
            src={ticket.qrCode} 
            alt="Ticket QR Code"
            className="w-24 h-24"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTicket}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareTicket}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketCard;
