
import { useState } from "react";
import Navigation from "@/components/Navigation";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MapPin, Calendar } from "lucide-react";

const BrowseEvents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const allEvents = [
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
    },
    {
      id: 5,
      title: "Hip Hop Legends",
      artist: "MC Flow",
      date: "2024-08-12",
      venue: "Brooklyn Barclays",
      location: "Brooklyn, NY",
      price: "0.28 ETH",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      category: "Hip-Hop",
      ticketsLeft: 67
    },
    {
      id: 6,
      title: "Classical Symphony",
      artist: "Vienna Orchestra",
      date: "2024-08-20",
      venue: "Carnegie Hall",
      location: "New York, NY",
      price: "0.15 ETH",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop",
      category: "Classical",
      ticketsLeft: 23
    }
  ];

  const genres = ["all", "Electronic", "Rock", "Pop", "Jazz", "Hip-Hop", "Classical"];
  const locations = ["all", "New York, NY", "Los Angeles, CA", "Chicago, IL", "Brooklyn, NY"];

  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === "all" || event.category === selectedGenre;
    const matchesLocation = selectedLocation === "all" || event.location === selectedLocation;
    
    return matchesSearch && matchesGenre && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Events</h1>
          <p className="text-muted-foreground">
            Discover amazing concerts and events • {filteredEvents.length} events found
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
                {genres.map(genre => (
                  <SelectItem key={genre} value={genre}>
                    {genre === "all" ? "All Genres" : genre}
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
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseEvents;
