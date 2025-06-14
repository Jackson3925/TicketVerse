
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Star } from "lucide-react";

const FeaturedEvents = () => {
  const featuredEvents = [
    {
      id: 1,
      title: "MetaVerse Music Festival",
      artist: "Various Artists",
      date: "2024-08-12",
      venue: "Virtual Arena",
      location: "Metaverse",
      price: "0.45 ETH",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop",
      category: "Electronic",
      description: "The biggest virtual concert experience featuring top electronic artists from around the world.",
      isFeatured: true
    },
    {
      id: 2,
      title: "Blockchain Symphony",
      artist: "Crypto Orchestra",
      date: "2024-08-20",
      venue: "Lincoln Center",
      location: "New York, NY",
      price: "0.28 ETH",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop",
      category: "Classical",
      description: "A unique blend of classical music and blockchain technology in an unforgettable live performance.",
      isFeatured: true
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-center mb-12">
        <Star className="h-6 w-6 text-yellow-500 mr-2" />
        <h2 className="text-3xl font-bold">Featured Events</h2>
        <Star className="h-6 w-6 text-yellow-500 ml-2" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {featuredEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-2 border-primary/20">
            <div className="relative">
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge className="absolute top-4 left-4 bg-yellow-500 text-black font-semibold">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur px-3 py-1 rounded-full">
                <span className="font-bold text-lg">{event.price}</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="text-2xl font-bold mb-1">{event.title}</h3>
                <p className="text-lg opacity-90">{event.artist}</p>
              </div>
            </div>
            
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {event.description}
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-foreground">
                  <Calendar className="h-5 w-5 mr-3 text-primary" />
                  <span className="font-medium">{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center text-foreground">
                  <MapPin className="h-5 w-5 mr-3 text-primary" />
                  <span className="font-medium">{event.venue}, {event.location}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button className="flex-1 text-lg py-6" size="lg">
                  Get Tickets Now
                </Button>
                <Button variant="outline" size="lg" className="px-6">
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
