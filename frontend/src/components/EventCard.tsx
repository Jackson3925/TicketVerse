
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ticket } from "lucide-react";
import type { Event } from "@/lib/supabase";

type EventWithRelations = Event & {
  artists?: { id: string; name: string; image_url?: string }
  venues?: { id: string; name: string; city: string; state?: string; country: string }
  seat_categories?: Array<{ id: string; name: string; price: number; capacity: number; sold?: number }>
}

interface EventCardProps {
  event: EventWithRelations;
}

const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPrice = (event: EventWithRelations) => {
    if (event.seat_categories && event.seat_categories.length > 0) {
      const minPrice = Math.min(...event.seat_categories.map(cat => cat.price));
      return `From $${minPrice}`;
    }
    return "Price TBA";
  };

  const getTicketsLeft = (event: EventWithRelations) => {
    if (event.seat_categories && event.seat_categories.length > 0) {
      const totalCapacity = event.seat_categories.reduce((sum, cat) => sum + cat.capacity, 0);
      const totalSold = event.seat_categories.reduce((sum, cat) => sum + (cat.sold || 0), 0);
      return totalCapacity - totalSold;
    }
    return event.total_tickets ? (event.total_tickets - (event.sold_tickets || 0)) : 0;
  };

  const handleCardClick = () => {
    navigate(`/event/${event.id}`);
  };

  const handleBuyTickets = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/event/${event.id}`);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
      onClick={handleCardClick}
    >
      <div className="relative">
        <img 
          src={event.poster_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop"} 
          alt={event.title}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <Badge 
          className="absolute top-3 left-3 bg-primary/90 text-primary-foreground"
        >
          {event.category}
        </Badge>
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded-full text-sm font-semibold">
          {formatPrice(event)}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-muted-foreground text-sm">{event.artists?.name || "Various Artists"}</p>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          {formatDate(event.date)}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-2" />
          <span className="line-clamp-1">
            {event.venues?.name || "Venue TBA"}, {event.venues?.city && event.venues?.state ? `${event.venues.city}, ${event.venues.state}` : event.venues?.city || "Location TBA"}
          </span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Ticket className="h-4 w-4 mr-2" />
          {getTicketsLeft(event)} tickets left
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full group-hover:bg-primary/90 transition-colors"
          onClick={handleBuyTickets}
        >
          Buy Tickets
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;
