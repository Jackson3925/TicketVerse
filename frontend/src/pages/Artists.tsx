
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Music, Users, Calendar, Loader2 } from "lucide-react";
import { artistsAPI } from "@/lib/api";
import type { Artist } from "@/lib/supabase";

type ArtistWithShows = Artist & {
  upcoming_shows: number;
  followers_formatted: string;
};

const Artists = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState<ArtistWithShows[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Format followers count
  const formatFollowers = (count: number | null): string => {
    if (!count) return "0";
    
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
  };

  // Fetch artists from database
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const artistsData = await artistsAPI.getArtists();
        
        // Enrich each artist with upcoming shows count and formatted followers
        const enrichedArtists = await Promise.all(
          artistsData.map(async (artist) => {
            const artistWithShows = await artistsAPI.getArtistById(artist.id);
            return {
              ...artist,
              upcoming_shows: artistWithShows?.upcoming_shows || 0,
              followers_formatted: formatFollowers(artist.followers)
            };
          })
        );
        
        setArtists(enrichedArtists);
      } catch (err) {
        console.error("Error fetching artists:", err);
        setError("Failed to load artists. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  const filteredArtists = artists.filter(artist => 
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (artist.genre && artist.genre.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleArtistClick = (artistId: string) => {
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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading artists...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-500 mb-4">⚠️ Error loading artists</div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : filteredArtists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtists.map((artist) => (
              <Card 
                key={artist.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
                onClick={() => handleArtistClick(artist.id)}
              >
                <div className="relative">
                  <img 
                    src={artist.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop"} 
                    alt={artist.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {artist.genre && (
                      <Badge className="bg-primary/90">
                        {artist.genre}
                      </Badge>
                    )}
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
                    {artist.description || "No description available"}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      {artist.followers_formatted} followers
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {artist.upcoming_shows} shows
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
