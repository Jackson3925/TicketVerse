
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music } from "lucide-react";
import EventCard from "@/components/EventCard";

const EventsSection = () => {
  const upcomingEvents = [
    {
      id: 1,
      title: "Electric Nights Festival",
      artist: "Various Artists",
      date: "2024-07-15",
      venue: "Madison Square Garden",
      location: "New York, NY",
      price: "0.25 ETH",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop",
      category: "Electronic",
      ticketsLeft: 156
    },
    {
      id: 2,
      title: "Rock Revolution Tour",
      artist: "Thunder Strike",
      date: "2024-07-22",
      venue: "Hollywood Bowl",
      location: "Los Angeles, CA",
      price: "0.18 ETH",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      category: "Rock",
      ticketsLeft: 89
    },
    {
      id: 3,
      title: "Jazz Under Stars",
      artist: "Miles Davis Tribute",
      date: "2024-07-28",
      venue: "Blue Note",
      location: "Chicago, IL",
      price: "0.12 ETH",
      image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop",
      category: "Jazz",
      ticketsLeft: 45
    },
    {
      id: 4,
      title: "Pop Paradise",
      artist: "Luna Star",
      date: "2024-08-05",
      venue: "Staples Center",
      location: "Los Angeles, CA",
      price: "0.32 ETH",
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop",
      category: "Pop",
      ticketsLeft: 234
    }
  ];

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Upcoming Events</h2>
        <Button variant="outline">View All Events</Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Badge variant="secondary" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">
          <Music className="h-4 w-4 mr-1" />
          All Genres
        </Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">Rock</Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">Electronic</Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">Pop</Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">Jazz</Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">Hip-Hop</Badge>
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {upcomingEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
};

export default EventsSection;
