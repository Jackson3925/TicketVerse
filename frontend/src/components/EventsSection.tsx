
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EventCard from "@/components/EventCard";
import type { Event } from "@/lib/supabase";

type EventWithRelations = Event & {
  artists?: { id: string; name: string; image_url?: string }
  venues?: { id: string; name: string; city: string; state?: string; country: string }
  seat_categories?: Array<{ id: string; name: string; price: number; capacity: number; sold?: number }>
}

interface EventsSectionProps {
  events: EventWithRelations[]
}

const EventsSection = ({ events }: EventsSectionProps) => {
  const navigate = useNavigate();

  // Get unique categories from the events
  const getUniqueCategories = () => {
    const categories = events
      .map(event => event.category)
      .filter((category, index, arr) => category && arr.indexOf(category) === index);
    return categories;
  };

  const handleViewAllEvents = () => {
    navigate('/browse-events');
  };

  if (!events || events.length === 0) {
    return (
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Upcoming Events</h2>
          <Button variant="outline" onClick={handleViewAllEvents}>View All Events</Button>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No upcoming events available at the moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Upcoming Events</h2>
        <Button variant="outline" onClick={handleViewAllEvents}>View All Events</Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant="secondary" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">
          <Music className="h-4 w-4 mr-1" />
          All Genres
        </Badge>
        {getUniqueCategories().map((category) => (
          <Badge 
            key={category} 
            variant="outline" 
            className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground"
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
};

export default EventsSection;
