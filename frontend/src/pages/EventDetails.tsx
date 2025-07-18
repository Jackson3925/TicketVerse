import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { eventsAPI } from '@/lib/api';
import { useRealtimeEventAvailability } from '@/hooks/useRealtimeEvents';
import { useAuth } from '@/hooks/useAuth';
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Ticket, Users, Clock, ArrowLeft, Share2, Heart, Wallet } from "lucide-react";
import TicketPurchaseDialog from "@/components/TicketPurchaseDialog";
import type { Event } from '@/lib/supabase';

type EventWithRelations = Event & {
  contract_event_id?: number | null; // Add contract event ID support
  artists?: { id: string; name: string; image_url?: string; verified?: boolean; description?: string }
  venues?: { 
    id: string; 
    name: string; 
    address: string; 
    city: string; 
    state?: string; 
    country: string; 
    capacity?: number; 
    parking_available?: boolean; 
    accessibility_features?: string[] 
  }
  seat_categories?: Array<{ 
    id: string; 
    name: string; 
    price: number; 
    capacity: number; 
    sold: number; 
    color?: string; 
    nft_image_url?: string 
  }>
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [event, setEvent] = useState<EventWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time availability updates
  const { availability } = useRealtimeEventAvailability(id || '');

  // Load event data
  useEffect(() => {
    const loadEventData = async () => {
      if (!id) {
        setError('Event ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const eventData = await eventsAPI.getEventById(id);
        
        if (!eventData) {
          setError('Event not found');
        } else {
          setEvent(eventData);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading event:', err);
        setError('Failed to load event details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [id]);

  // Update event with real-time availability
  useEffect(() => {
    if (availability && event) {
      setEvent(prev => prev ? {
        ...prev,
        total_tickets: availability.total_tickets,
        sold_tickets: availability.total_tickets - availability.remaining
      } : null);
    }
  }, [availability, event]);

  // Utility functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMinPrice = () => {
    if (!event?.seat_categories || event.seat_categories.length === 0) {
      return 'TBA'
    }
    const minPrice = Math.min(...event.seat_categories.map(cat => cat.price))
    return `$${minPrice}`
  };

  const getTicketsLeft = () => {
    if (!event?.total_tickets || event.sold_tickets === undefined) {
      return 0
    }
    return event.total_tickets - event.sold_tickets
  };

  const getSoldPercentage = () => {
    if (!event?.total_tickets || event.sold_tickets === undefined) {
      return 0
    }
    return (event.sold_tickets / event.total_tickets) * 100
  };

  const isSoldOut = () => {
    return getTicketsLeft() <= 0
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      navigate('/auth?returnTo=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setIsPurchaseDialogOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-destructive mb-4">
              {error || 'Event not found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || 'The event you\'re looking for doesn\'t exist or has been removed.'}
            </p>
            <div className="space-x-2">
              <Button onClick={() => navigate('/browse-events')}>
                Browse Events
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative rounded-xl overflow-hidden">
              <img 
                src={event.poster_image_url || '/placeholder.svg'} 
                alt={event.title}
                className="w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge className="absolute top-4 left-4 bg-primary">
                {event.category}
              </Badge>
              <div className="absolute top-4 right-4 bg-background/90 backdrop-blur px-2 py-1 rounded-full text-sm font-semibold">
                {getMinPrice()}
              </div>
              {isSoldOut() && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">SOLD OUT</span>
                </div>
              )}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                <p className="text-xl opacity-90 flex items-center">
                  {event.artists?.name}
                  {event.artists?.verified && (
                    <span className="ml-2 text-blue-400">✓</span>
                  )}
                </p>
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
                      <p className="font-medium">{event.venues?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.venues?.city}
                        {event.venues?.state && `, ${event.venues.state}`}
                        {event.venues?.country && `, ${event.venues.country}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {event.venues?.capacity ? `${event.venues.capacity.toLocaleString()} capacity` : 'Capacity TBA'}
                      </p>
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
                  {event.description || 'Event description coming soon...'}
                </p>
                
                {event.artists?.description && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">About the Artist</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {event.artists.description}
                      </p>
                    </div>
                  </>
                )}

                {event.seat_categories && event.seat_categories.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Ticket Categories</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {event.seat_categories.map((category) => (
                          <div key={category.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">{category.name}</h4>
                              <span className="text-lg font-bold text-primary">${category.price}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {category.capacity - category.sold} of {category.capacity} available
                            </div>
                            {category.capacity - category.sold <= 10 && (
                              <Badge variant="destructive" className="mt-2 text-xs">
                                Only {category.capacity - category.sold} left!
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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
                    <p className="text-muted-foreground">
                      {event.venues?.address || 'Address TBA'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Parking</h4>
                    <p className="text-muted-foreground">
                      {event.venues?.parking_available ? 'Available on-site' : 'Limited parking'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Accessibility</h4>
                    <p className="text-muted-foreground">
                      {event.venues?.accessibility_features?.length ? 
                        event.venues.accessibility_features.join(', ') : 
                        'Contact venue for details'
                      }
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Age Restriction</h4>
                    <p className="text-muted-foreground">
                      {event.age_restriction || 'All ages welcome'}
                    </p>
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
                    <p className="text-2xl font-bold text-primary">{getMinPrice()}</p>
                    <p className="text-sm text-muted-foreground">starting from</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Availability */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Tickets Available</span>
                    <span className="text-sm text-muted-foreground">
                      {getTicketsLeft()} of {event.total_tickets}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${getSoldPercentage()}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getSoldPercentage().toFixed(1)}% sold
                  </p>
                  {availability && (
                    <p className="text-xs text-blue-500 mt-1 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                      Live availability
                    </p>
                  )}
                </div>

                <Separator />

                {/* Quick Info */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Doors Open</span>
                    <span className="text-sm font-medium">
                      {event.doors_open || 'TBA'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Duration</span>
                    <span className="text-sm font-medium">
                      {event.duration_minutes ? `${event.duration_minutes} minutes` : 'TBA'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Dress Code</span>
                    <span className="text-sm font-medium">
                      {event.dress_code || 'Casual'}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Purchase Buttons */}
                <div className="space-y-3">
                  <Button 
                    className="w-full text-lg py-6" 
                    size="lg"
                    onClick={handlePurchase}
                    disabled={isSoldOut() || !event.contract_event_id}
                  >
                    <Ticket className="h-5 w-5 mr-2" />
                    {isSoldOut() ? 'Sold Out' : 
                     !event.contract_event_id ? 'Blockchain Setup Pending' :
                     isAuthenticated ? 'Buy NFT Tickets' : 'Sign In to Buy'}
                  </Button>
                  {!event.contract_event_id && (
                    <p className="text-xs text-muted-foreground text-center">
                      Smart contract integration in progress. Please check back soon.
                    </p>
                  )}
                  {!isSoldOut() && (
                    <Button variant="outline" className="w-full" size="lg">
                      <Heart className="h-4 w-4 mr-2" />
                      Add to Wishlist
                    </Button>
                  )}
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
        event={{
          id: event.id,
          contract_event_id: event.contract_event_id,
          title: event.title,
          artist: event.artists?.name || 'Unknown Artist',
          date: event.date,
          venue: event.venues?.name || 'Unknown Venue',
          location: event.venues ? `${event.venues.city}, ${event.venues.country}` : 'Unknown Location',
          price: getMinPrice(),
          image: event.poster_image_url || '/placeholder.svg'
        }}
      />
    </div>
  );
};

export default EventDetails;
