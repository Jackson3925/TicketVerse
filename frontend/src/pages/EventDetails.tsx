import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Ticket, Users, Clock, ArrowLeft, Share2, Heart, Wallet } from "lucide-react";
import TicketPurchaseDialog from "@/components/TicketPurchaseDialog";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  // Mock data - in a real app, this would come from an API based on the ID
  const event = {
    id: 1,
    title: "Electric Nights Festival",
    artist: "Various Artists",
    date: "2024-07-15",
    time: "19:00",
    venue: "Madison Square Garden",
    location: "New York, NY",
    price: "0.25 ETH",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop",
    category: "Electronic",
    ticketsLeft: 156,
    totalTickets: 500,
    description: "Get ready for the most electrifying night of electronic music! Electric Nights Festival brings together the world's top DJs and producers for an unforgettable experience. From progressive house to techno, this festival will take you on a sonic journey through the best of electronic music.",
    lineup: ["DJ Snake", "Deadmau5", "Tiësto", "Martin Garrix", "Skrillex"],
    venue_details: {
      address: "4 Pennsylvania Plaza, New York, NY 10001",
      capacity: "20,789",
      parking: "Available on-site",
      accessibility: "Wheelchair accessible"
    },
    event_info: {
      doors_open: "18:00",
      age_restriction: "18+",
      dress_code: "Casual",
      duration: "6 hours"
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const soldPercentage = ((event.totalTickets - event.ticketsLeft) / event.totalTickets) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Ticket className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">TicketVerse</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/my-tickets')}>
              <Wallet className="h-4 w-4 mr-2" />
              My Tickets
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative rounded-xl overflow-hidden">
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge className="absolute top-4 left-4 bg-primary">
                {event.category}
              </Badge>
              <div className="absolute top-4 right-4 bg-background/90 backdrop-blur px-2 py-1 rounded-full text-sm font-semibold">
                {event.price}
              </div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                <p className="text-xl opacity-90">{event.artist}</p>
              </div>
            </div>

            {/* Event Info */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold">Event Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{formatDate(event.date)}</p>
                      <p className="text-sm text-muted-foreground">Event Date</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{event.time}</p>
                      <p className="text-sm text-muted-foreground">Start Time</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{event.venue}</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{event.venue_details.capacity} capacity</p>
                      <p className="text-sm text-muted-foreground">Venue Size</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold">About This Event</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {event.description}
                </p>
                
                <Separator className="my-6" />
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Lineup</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.lineup.map((artist, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {artist}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Venue Information */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold">Venue Information</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Address</h4>
                    <p className="text-muted-foreground">{event.venue_details.address}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Parking</h4>
                    <p className="text-muted-foreground">{event.venue_details.parking}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Accessibility</h4>
                    <p className="text-muted-foreground">{event.venue_details.accessibility}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Age Restriction</h4>
                    <p className="text-muted-foreground">{event.event_info.age_restriction}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Ticket Purchase */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Get Tickets</h3>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{event.price}</p>
                    <p className="text-sm text-muted-foreground">per ticket</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Availability */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Tickets Available</span>
                    <span className="text-sm text-muted-foreground">
                      {event.ticketsLeft} of {event.totalTickets}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${soldPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {soldPercentage.toFixed(1)}% sold
                  </p>
                </div>

                <Separator />

                {/* Quick Info */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Doors Open</span>
                    <span className="text-sm font-medium">{event.event_info.doors_open}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Duration</span>
                    <span className="text-sm font-medium">{event.event_info.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Dress Code</span>
                    <span className="text-sm font-medium">{event.event_info.dress_code}</span>
                  </div>
                </div>

                <Separator />

                {/* Purchase Buttons */}
                <div className="space-y-3">
                  <Button 
                    className="w-full text-lg py-6" 
                    size="lg"
                    onClick={() => setIsPurchaseDialogOpen(true)}
                  >
                    <Ticket className="h-5 w-5 mr-2" />
                    Buy Ticket Now
                  </Button>
                  <Button variant="outline" className="w-full" size="lg">
                    Add to Wishlist
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Secure NFT tickets on the blockchain • No hidden fees
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TicketPurchaseDialog
        isOpen={isPurchaseDialogOpen}
        onClose={() => setIsPurchaseDialogOpen(false)}
        event={event}
      />
    </div>
  );
};

export default EventDetails;
