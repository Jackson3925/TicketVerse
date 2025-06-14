
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ticket } from "lucide-react";

interface Event {
  id: number;
  title: string;
  artist: string;
  date: string;
  venue: string;
  location: string;
  price: string;
  image: string;
  category: string;
  ticketsLeft: number;
}

interface EventCardProps {
  event: Event;
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
          src={event.image} 
          alt={event.title}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <Badge 
          className="absolute top-3 left-3 bg-primary/90 text-primary-foreground"
        >
          {event.category}
        </Badge>
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded-full text-sm font-semibold">
          {event.price}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-muted-foreground text-sm">{event.artist}</p>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          {formatDate(event.date)}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-2" />
          <span className="line-clamp-1">{event.venue}, {event.location}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Ticket className="h-4 w-4 mr-2" />
          {event.ticketsLeft} tickets left
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
