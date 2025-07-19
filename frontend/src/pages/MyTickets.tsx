
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ticketsAPI } from '@/lib/api';
import { useRealtimeTickets } from '@/hooks/useRealtimeEvents';
import { useAuth } from '@/hooks/useAuth';
import { useRoleProtection } from '@/hooks/useRoleProtection';
import Navigation from "@/components/Navigation";
import EmptyTicketsState from "@/components/EmptyTicketsState";
import TicketCard from "@/components/TicketCard";
import ErrorBoundary, { TicketCardErrorFallback } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar, MapPin, Ticket } from "lucide-react";
import type { TicketWithRelations } from '@/components/TicketCard';

const MyTickets = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Protect this route for buyers only
  const { hasAccess } = useRoleProtection({ requiredRole: 'buyer' });
  
  if (!hasAccess) {
    return null; // useRoleProtection handles the redirect
  }
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Real-time tickets updates
  const { tickets: realtimeTickets, loading: realtimeLoading } = useRealtimeTickets(user?.id);

  // Load user tickets
  useEffect(() => {
    const loadTickets = async () => {
      if (!isAuthenticated || !user) {
        setTickets([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null); // Clear previous errors
        const userTickets = await ticketsAPI.getUserTickets(user.id);
        setTickets(userTickets);
      } catch (err) {
        console.error('Error loading tickets:', err);
        // Provide more specific error messages
        if (err instanceof Error) {
          if (err.message.includes('Network')) {
            setError('Network error. Please check your connection and try again.');
          } else if (err.message.includes('authentication')) {
            setError('Authentication error. Please sign in again.');
          } else {
            setError(`Failed to load your tickets: ${err.message}`);
          }
        } else {
          setError('Failed to load your tickets. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [isAuthenticated, user]);

  // Update tickets when real-time data changes
  useEffect(() => {
    if (realtimeTickets && realtimeTickets.length >= 0) {
      // Only update if real-time data is more recent or different
      setTickets(realtimeTickets);
    }
  }, [realtimeTickets]);

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      ticket.events?.title.toLowerCase().includes(searchLower) ||
      ticket.events?.artists?.name.toLowerCase().includes(searchLower) ||
      ticket.events?.venues?.name.toLowerCase().includes(searchLower);

    // Status filter
    const now = new Date();
    const eventDate = ticket.events?.date ? new Date(ticket.events.date) : null;
    let matchesStatus = true;
    
    if (filterStatus === 'upcoming') {
      matchesStatus = eventDate ? eventDate > now : false;
    } else if (filterStatus === 'past') {
      matchesStatus = eventDate ? eventDate < now : false;
    } else if (filterStatus === 'used') {
      matchesStatus = ticket.is_used || false;
    } else if (filterStatus === 'unused') {
      matchesStatus = !ticket.is_used;
    }

    // Category filter
    const matchesCategory = filterCategory === "all" || 
      ticket.events?.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories from tickets
  const categories = [...new Set(tickets.map(ticket => ticket.events?.category).filter(Boolean))];

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your NFT tickets.
            </p>
            <Button onClick={() => navigate('/auth?returnTo=/my-tickets')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state - only show loading if both API and realtime are loading
  if (loading && realtimeLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  // Retry function
  const retryLoadTickets = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const userTickets = await ticketsAPI.getUserTickets(user.id);
      setTickets(userTickets);
    } catch (err) {
      console.error('Error retrying tickets load:', err);
      setError('Failed to load your tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-destructive mb-4">Oops! Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={retryLoadTickets} disabled={loading}>
                {loading ? 'Retrying...' : 'Try Again'}
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <EmptyTicketsState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
          <p className="text-muted-foreground">
            Your NFT concert tickets • {filteredTickets.length} of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="upcoming">Upcoming Events</SelectItem>
                <SelectItem value="past">Past Events</SelectItem>
                <SelectItem value="used">Used Tickets</SelectItem>
                <SelectItem value="unused">Unused Tickets</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
                setFilterCategory("all");
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Active Filters */}
          {(searchQuery || filterStatus !== "all" || filterCategory !== "all") && (
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="ml-1 hover:text-destructive"
                  >×</button>
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filterStatus}
                  <button 
                    onClick={() => setFilterStatus("all")} 
                    className="ml-1 hover:text-destructive"
                  >×</button>
                </Badge>
              )}
              {filterCategory !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category: {filterCategory}
                  <button 
                    onClick={() => setFilterCategory("all")} 
                    className="ml-1 hover:text-destructive"
                  >×</button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Tickets Grid */}
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.map((ticket) => (
              <ErrorBoundary 
                key={ticket.id} 
                fallback={TicketCardErrorFallback}
                onError={(error) => {
                  console.error('Error rendering ticket card:', error, ticket);
                }}
              >
                <TicketCard ticket={ticket} />
              </ErrorBoundary>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
            <p className="text-muted-foreground mb-4">
              No tickets match your current search criteria.
            </p>
            <Button 
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
                setFilterCategory("all");
              }}
            >
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        {tickets.length > 0 && (
          <div className="mt-12 text-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/browse-events')}>
                <Ticket className="h-4 w-4 mr-2" />
                Buy More Tickets
              </Button>
              <Button variant="outline" onClick={() => navigate('/orders')}>
                View Order History
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
