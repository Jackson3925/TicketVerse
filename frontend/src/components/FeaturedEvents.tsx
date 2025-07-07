
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Event } from "@/lib/supabase";

type EventWithRelations = Event & {
  artists?: { id: string; name: string; image_url?: string }
  venues?: { id: string; name: string; city: string; state?: string; country: string }
  seat_categories?: Array<{ id: string; name: string; price: number }>
}

interface FeaturedEventsProps {
  events: EventWithRelations[]
}

const FeaturedEvents = ({ events }: FeaturedEventsProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  if (!events || events.length === 0) {
    return (
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center mb-12">
          <Star className="h-6 w-6 text-yellow-500 mr-2" />
          <h2 className="text-3xl font-bold">Featured Events</h2>
          <Star className="h-6 w-6 text-yellow-500 ml-2" />
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No featured events available at the moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-center mb-12">
        <Star className="h-6 w-6 text-yellow-500 mr-2" />
        <h2 className="text-3xl font-bold">Featured Events</h2>
        <Star className="h-6 w-6 text-yellow-500 ml-2" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {events.map((event) => (
          <Card 
            key={event.id} 
            className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-2 border-primary/20 cursor-pointer"
            onClick={() => handleEventClick(event.id)}
          >
            <div className="relative">
              <img 
                src={event.poster_image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop"} 
                alt={event.title}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge className="absolute top-4 left-4 bg-yellow-500 text-black font-semibold">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur px-3 py-1 rounded-full">
                <span className="font-bold text-lg">{formatPrice(event)}</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-2xl font-bold mb-1">{event.title}</h3>
                <p className="text-lg opacity-90">{event.artists?.name || "Various Artists"}</p>
              </div>
            </div>
            
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {event.description || "Join us for an unforgettable experience at this featured event."}
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-foreground">
                  <Calendar className="h-5 w-5 mr-3 text-primary" />
                  <span className="font-medium">{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center text-foreground">
                  <MapPin className="h-5 w-5 mr-3 text-primary" />
                  <span className="font-medium">
                    {event.venues?.name || "Venue TBA"}, {event.venues?.city && event.venues?.state ? `${event.venues.city}, ${event.venues.state}` : event.venues?.city || "Location TBA"}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="flex-1 text-lg py-6" 
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event.id);
                  }}
                >
                  Get Tickets Now
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="px-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event.id);
                  }}
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default FeaturedEvents;
