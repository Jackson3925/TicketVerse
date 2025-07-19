
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Download, Share2, QrCode } from "lucide-react";
import type { Ticket } from '@/lib/supabase';

type TicketWithRelations = Ticket & {
  events?: { 
    id: string;
    title: string; 
    date: string; 
    time: string; 
    poster_image_url?: string;
    category: string;
    artists?: { id: string; name: string; image_url?: string };
    venues?: { id: string; name: string; city: string; state?: string };
  };
  seat_categories?: { id: string; name: string; price: number; color?: string };
  orders?: { id: string; purchase_date: string; total_price: number; transaction_hash?: string };
};

interface TicketCardProps {
  ticket: TicketWithRelations;
}

const TicketCard = ({ ticket }: TicketCardProps) => {
  // Extract data with fallbacks
  const eventTitle = ticket.events?.title || 'Unknown Event';
  const artistName = ticket.events?.artists?.name || 'Unknown Artist';
  const eventDate = ticket.events?.date || '';
  const eventTime = ticket.events?.time || '';
  const venueName = ticket.events?.venues?.name || 'Unknown Venue';
  const venueLocation = ticket.events?.venues ? `${ticket.events.venues.city}${ticket.events.venues.state ? `, ${ticket.events.venues.state}` : ''}` : 'Unknown Location';
  const seatCategoryName = ticket.seat_categories?.name || 'General Admission';
  const price = ticket.seat_categories?.price ? `$${ticket.seat_categories.price.toFixed(2)}` : 'N/A';
  const posterImage = ticket.events?.poster_image_url || '/placeholder-event.jpg';
  const ticketNumber = ticket.ticket_number || ticket.id;
  const purchaseDate = ticket.orders?.purchase_date || ticket.created_at || '';
  const qrCode = ticket.qr_code || '/placeholder-qr.png';

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPurchaseDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    if (!dateString) return 'Date TBD';
    const date = formatDate(dateString);
    const time = timeString ? ` at ${timeString}` : '';
    return `${date}${time}`;
  };

  const handleDownloadTicket = () => {
    console.log('Downloading ticket:', ticketNumber);
  };

  const handleShareTicket = () => {
    if (navigator.share) {
      navigator.share({
        title: `${eventTitle} Ticket`,
        text: `Check out my ticket for ${eventTitle}!`,
        url: window.location.href,
      });
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={posterImage} 
          alt={eventTitle}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-event.jpg';
          }}
        />
        <Badge className="absolute top-3 left-3 bg-primary">
          NFT Ticket
        </Badge>
        {ticket.is_used && (
          <Badge className="absolute top-3 right-3 bg-destructive">
            Used
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{eventTitle}</CardTitle>
        <p className="text-muted-foreground">{artistName}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDateTime(eventDate, eventTime)}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="line-clamp-1">{venueName}, {venueLocation}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Ticket #</span>
            <span className="font-mono">{ticketNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Seat Category</span>
            <span>{seatCategoryName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Price Paid</span>
            <span>{price}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Purchased</span>
            <span>{formatPurchaseDate(purchaseDate)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-center">
          {qrCode ? (
            <img 
              src={qrCode} 
              alt="Ticket QR Code"
              className="w-24 h-24"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-qr.png';
              }}
            />
          ) : (
            <div className="w-24 h-24 bg-muted rounded flex items-center justify-center">
              <QrCode className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
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
export type { TicketWithRelations };
