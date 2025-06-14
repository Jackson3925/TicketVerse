
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, Clock, MapPin, Calendar, Shield } from "lucide-react";

const ResaleMarketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [priceRange, setPriceRange] = useState("all");

  const resaleTickets = [
    {
      id: 1,
      eventTitle: "Electric Nights Festival",
      artist: "Various Artists",
      date: "2024-07-15",
      venue: "Madison Square Garden",
      location: "New York, NY",
      originalPrice: "0.25 ETH",
      resalePrice: "0.32 ETH",
      priceChange: "+28%",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop",
      seller: "0x7d8a...9b2f",
      timeLeft: "2 days",
      verified: true,
      category: "Electronic"
    },
    {
      id: 2,
      eventTitle: "Rock Revolution Tour",
      artist: "Thunder Strike",
      date: "2024-07-22",
      venue: "Hollywood Bowl",
      location: "Los Angeles, CA",
      originalPrice: "0.18 ETH",
      resalePrice: "0.22 ETH",
      priceChange: "+22%",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      seller: "0x4a1c...5e3d",
      timeLeft: "5 days",
      verified: true,
      category: "Rock"
    },
    {
      id: 3,
      eventTitle: "Jazz Under Stars",
      artist: "Miles Davis Tribute",
      date: "2024-07-28",
      venue: "Blue Note",
      location: "Chicago, IL",
      originalPrice: "0.12 ETH",
      resalePrice: "0.15 ETH",
      priceChange: "+25%",
      image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop",
      seller: "0x9f2e...7a8b",
      timeLeft: "1 week",
      verified: false,
      category: "Jazz"
    },
    {
      id: 4,
      eventTitle: "Pop Paradise",
      artist: "Luna Star",
      date: "2024-08-05",
      venue: "Staples Center",
      location: "Los Angeles, CA",
      originalPrice: "0.32 ETH",
      resalePrice: "0.28 ETH",
      priceChange: "-12%",
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop",
      seller: "0x6b9d...4c1f",
      timeLeft: "3 weeks",
      verified: true,
      category: "Pop"
    }
  ];

  const filteredTickets = resaleTickets.filter(ticket =>
    ticket.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Resale Marketplace</h1>
          <p className="text-muted-foreground">
            Buy verified NFT tickets from other users • {filteredTickets.length} tickets available
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, artists, venues..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Event Date</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="recent">Recently Listed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under-0.2">Under 0.2 ETH</SelectItem>
                <SelectItem value="0.2-0.5">0.2 - 0.5 ETH</SelectItem>
                <SelectItem value="over-0.5">Over 0.5 ETH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Marketplace Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">Secure Resale Marketplace</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            All tickets are verified NFTs. Transactions are secured by smart contracts on the blockchain.
          </p>
        </div>

        {/* Resale Tickets Grid */}
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                <div className="relative">
                  <img 
                    src={ticket.image} 
                    alt={ticket.eventTitle}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-orange-500 text-white">
                      Resale
                    </Badge>
                    {ticket.verified && (
                      <Badge className="bg-green-500 text-white">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded-full">
                    <div className="text-sm font-semibold">{ticket.resalePrice}</div>
                    <div className={`text-xs ${ticket.priceChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {ticket.priceChange}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="text-lg font-bold mb-1 line-clamp-1">{ticket.eventTitle}</h3>
                    <p className="text-sm opacity-90">{ticket.artist}</p>
                  </div>
                </div>
                
                <CardHeader className="pb-2">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(ticket.date)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="line-clamp-1">{ticket.venue}, {ticket.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {ticket.timeLeft} left
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Original Price:</span>
                    <span className="line-through">{ticket.originalPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Seller:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{ticket.seller}</code>
                  </div>
                  
                  <Button className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Buy Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResaleMarketplace;
