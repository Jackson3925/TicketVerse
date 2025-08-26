
import { useState, useEffect, useCallback } from "react";
import { eventsAPI, utilsAPI } from '@/lib/api';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import Navigation from "@/components/Navigation";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MapPin, Calendar } from "lucide-react";
import type { Event } from '@/lib/supabase';

type EventWithRelations = Event & {
  artists?: { name: string; image_url?: string; verified?: boolean }
  venues?: { name: string; city: string; state?: string; country: string }
  seat_categories?: Array<{ price: number; capacity: number; sold: number }>
}

const BrowseEvents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [events, setEvents] = useState<EventWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Use real-time events hook for live updates
  const { events: realtimeEvents } = useRealtimeEvents();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Load events and categories in parallel
        const [eventsData, categoriesData] = await Promise.all([
          eventsAPI.getEvents(),
          utilsAPI.getEventCategories()
        ]);

        setEvents(eventsData);
        setCategories(['all', ...categoriesData]);
        
        // Extract unique locations from events
        const uniqueLocations = new Set<string>();
        eventsData.forEach(event => {
          if (event.venues?.city && event.venues?.state) {
            uniqueLocations.add(`${event.venues.city}, ${event.venues.state}`);
          } else if (event.venues?.city) {
            uniqueLocations.add(event.venues.city);
          }
        });
        setLocations(['all', ...Array.from(uniqueLocations)]);
        
        setError(null);
      } catch (err) {
        console.error('Error loading browse events data:', err);
        setError('Failed to load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Helper function to filter past events
  const filterPastEvents = useCallback((events: EventWithRelations[]) => {
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0]
    
    return events.filter(event => {
      const eventTime = event.time || '00:00:00'
      return event.date > currentDate || 
             (event.date === currentDate && eventTime >= currentTime)
    })
  }, [])

  // Update events when real-time data changes
  useEffect(() => {
    if (realtimeEvents.length > 0) {
      // Apply the same past event filtering to real-time data
      const filteredRealtimeEvents = filterPastEvents(realtimeEvents)
      setEvents(filteredRealtimeEvents);
    }
  }, [realtimeEvents, filterPastEvents]);

  // Filter and search events
  const filteredEvents = useCallback(() => {
    let filtered = events.filter(event => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        event.title.toLowerCase().includes(searchLower) ||
        event.artists?.name.toLowerCase().includes(searchLower) ||
        event.venues?.name.toLowerCase().includes(searchLower);

      // Category filter  
      const matchesGenre = selectedGenre === "all" || event.category === selectedGenre;

      // Location filter
      const eventLocation = event.venues?.state 
        ? `${event.venues.city}, ${event.venues.state}`
        : event.venues?.city;
      const matchesLocation = selectedLocation === "all" || eventLocation === selectedLocation;

      return matchesSearch && matchesGenre && matchesLocation;
    });

    // Sort events
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'price':
        filtered.sort((a, b) => {
          const aMinPrice = Math.min(...(a.seat_categories?.map(cat => cat.price) || [0]));
          const bMinPrice = Math.min(...(b.seat_categories?.map(cat => cat.price) || [0]));
          return aMinPrice - bMinPrice;
        });
        break;
      case 'popularity':
        filtered.sort((a, b) => (b.sold_tickets || 0) - (a.sold_tickets || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [events, searchQuery, selectedGenre, selectedLocation, sortBy]);

  const displayEvents = filteredEvents();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-destructive mb-4">Oops! Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Events</h1>
          <p className="text-muted-foreground">
            Discover amazing concerts and events • {displayEvents.length} events found
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, artists, venues..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location === "all" ? "All Locations" : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {selectedGenre !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedGenre}
                <button onClick={() => setSelectedGenre("all")} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {selectedLocation !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selectedLocation}
                <button onClick={() => setSelectedLocation("all")} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
          </div>
        </div>

        {/* Events Grid */}
        {displayEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground">
              {events.length === 0 
                ? "No events are currently available." 
                : "Try adjusting your search criteria or filters"
              }
            </p>
            {events.length === 0 && (
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Refresh
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseEvents;
