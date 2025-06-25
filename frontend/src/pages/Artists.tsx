
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Music, Users, Calendar } from "lucide-react";

const Artists = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const artists = [
    {
      id: 1,
      name: "Thunder Strike",
      genre: "Rock",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      followers: "2.5M",
      upcomingShows: 3,
      description: "Electrifying rock band known for their powerful live performances and chart-topping hits.",
      verified: true
    },
    {
      id: 2,
      name: "Luna Star",
      genre: "Pop",
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop",
      followers: "4.2M",
      upcomingShows: 5,
      description: "Pop sensation with multiple Grammy nominations and sold-out world tours.",
      verified: true
    },
    {
      id: 3,
      name: "DJ Snake",
      genre: "Electronic",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&h=300&fit=crop",
      followers: "8.1M",
      upcomingShows: 7,
      description: "World-renowned DJ and producer, headlining major festivals worldwide.",
      verified: true
    },
    {
      id: 4,
      name: "Miles Davis Tribute",
      genre: "Jazz",
      image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop",
      followers: "890K",
      upcomingShows: 2,
      description: "Celebrating the legacy of jazz legend Miles Davis with authentic performances.",
      verified: false
    },
    {
      id: 5,
      name: "MC Flow",
      genre: "Hip-Hop",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      followers: "3.7M",
      upcomingShows: 4,
      description: "Rising hip-hop artist with platinum albums and powerful lyrical storytelling.",
      verified: true
    },
    {
      id: 6,
      name: "Vienna Orchestra",
      genre: "Classical",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&h=300&fit=crop",
      followers: "1.2M",
      upcomingShows: 6,
      description: "Prestigious orchestra performing classical masterpieces in renowned venues worldwide.",
      verified: true
    }
  ];

  const filteredArtists = artists.filter(artist => 
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArtistClick = (artistId: number) => {
    // For now, redirect to browse events filtered by artist
    // In the future, this could go to individual artist pages
    navigate(`/browse-events?artist=${artistId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Artists & Performers</h1>
          <p className="text-muted-foreground">
            Discover talented artists and their upcoming shows • {filteredArtists.length} artists
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artists or genres..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Artists Grid */}
        {filteredArtists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtists.map((artist) => (
              <Card 
                key={artist.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => handleArtistClick(artist.id)}
              >
                <div className="relative">
                  <img 
                    src={artist.image} 
                    alt={artist.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-primary/90">
                      {artist.genre}
                    </Badge>
                    {artist.verified && (
                      <Badge className="bg-blue-500/90 text-white">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-white text-xl font-bold mb-1">{artist.name}</h3>
                  </div>
                </div>
                
                <CardHeader className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {artist.description}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      {artist.followers} followers
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {artist.upcomingShows} shows
                    </div>
                  </div>
                  
                  <Button className="w-full" size="sm">
                    <Music className="h-4 w-4 mr-2" />
                    View Events
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No artists found</h3>
            <p className="text-muted-foreground">Try adjusting your search query</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Artists;
