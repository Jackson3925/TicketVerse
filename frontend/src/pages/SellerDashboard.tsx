
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useAuth } from "@/hooks/useAuth";
import { eventsAPI, analyticsAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Eye,
  Edit,
  Settings,
  BarChart3,
  UserCheck,
  Ticket,
  Loader2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Protect this route for sellers only
  const { hasAccess } = useRoleProtection({ requiredRole: 'seller' });
  
  if (!hasAccess) {
    return null; // useRoleProtection handles the redirect
  }

  // State for real data
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load real data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Load events and analytics in parallel
        const [eventsData, analyticsData] = await Promise.all([
          eventsAPI.getSellerEvents(),
          analyticsAPI.getSellerAnalytics()
        ]);
        
        console.log('Dashboard data loaded:', { eventsData, analyticsData });
        setEvents(eventsData);
        setAnalytics(analyticsData);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error Loading Dashboard",
          description: "Failed to load dashboard data. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, toast]);

  // Calculate totals from real data
  const totalRevenue = analytics?.totalRevenue || 0;
  const totalSold = analytics?.totalTicketsSold || 0;
  const totalCapacity = events.reduce((sum, event) => sum + (event.total_tickets || 0), 0);
  const activeEventsCount = events.filter(e => e.status === 'active').length;

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading dashboard data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-primary-foreground/80">Manage your events, track sales, and analyze performance</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toFixed(5)} ETH</div>
              <p className="text-xs text-muted-foreground">All time revenue from ticket sales</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSold}</div>
              <p className="text-xs text-muted-foreground">
                {totalCapacity > 0 ? `${((totalSold/totalCapacity)*100).toFixed(1)}% of capacity` : 'No events yet'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEventsCount}</div>
              <p className="text-xs text-muted-foreground">{events.length} total events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Sale Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.conversionRate?.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground">Sales conversion rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button onClick={() => navigate("/sell-event")} className="h-20 flex flex-col">
            <Calendar className="h-6 w-6 mb-2" />
            Create Event
          </Button>
          <Button onClick={() => navigate("/seller/analytics")} variant="outline" className="h-20 flex flex-col">
            <BarChart3 className="h-6 w-6 mb-2" />
            Sales Analytics
          </Button>
          <Button onClick={() => navigate("/seller/customers")} variant="outline" className="h-20 flex flex-col">
            <UserCheck className="h-6 w-6 mb-2" />
            Customers
          </Button>
        </div>

        {/* Recent Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Events</CardTitle>
              <CardDescription>Overview of your concert events</CardDescription>
            </div>
            <Button onClick={() => navigate("/seller/manage-events")} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge variant={event.status === 'sold_out' ? 'default' : 'secondary'}>
                          {event.status === 'sold_out' ? 'Sold Out' : 'Active'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {event.artists?.name || 'Unknown Artist'} • {event.venues?.name || 'Unknown Venue'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-semibold">
                        {(event.actual_revenue || 0).toFixed(5)} ETH
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.actual_sold_tickets || 0}/{event.total_tickets || 0} sold
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/event/${event.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/seller/edit-event/${event.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No events created yet</p>
                  <Button className="mt-4" onClick={() => navigate("/sell-event")}>
                    Create Your First Event
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;
