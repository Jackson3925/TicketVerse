
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { analyticsAPI, eventsAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  BarChart3,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";

const SalesAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Protect this route for sellers only
  const { hasAccess } = useRoleProtection({ requiredRole: 'seller' });
  
  if (!hasAccess) {
    return null; // useRoleProtection handles the redirect
  }

  // State for real data
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load real data from API
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Load analytics and events in parallel
        const [analyticsData, eventsData] = await Promise.all([
          analyticsAPI.getSellerAnalytics(),
          eventsAPI.getSellerEvents()
        ]);
        
        setAnalytics(analyticsData);
        setEvents(eventsData);
        
      } catch (error) {
        console.error('Error loading analytics data:', error);
        toast({
          title: "Error Loading Analytics",
          description: "Failed to load analytics data. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [user, toast]);

  // Calculate event performance from real data
  const eventPerformance = events.map(event => ({
    id: event.id,
    title: event.title,
    revenue: (event.sold_tickets || 0) * (event.seat_categories?.[0]?.price || 0),
    ticketsSold: event.sold_tickets || 0,
    conversionRate: event.total_tickets > 0 ? ((event.sold_tickets || 0) / event.total_tickets * 100) : 0,
    avgPrice: event.seat_categories?.[0]?.price || 0,
    status: event.status
  })).sort((a, b) => b.revenue - a.revenue);

  // Calculate sales by category from real data
  const salesByCategory = events.reduce((acc, event) => {
    if (event.seat_categories) {
      event.seat_categories.forEach(category => {
        const existing = acc.find(item => item.category === category.name);
        const sold = category.sold || 0;
        const revenue = sold * category.price;
        
        if (existing) {
          existing.sold += sold;
          existing.revenue += revenue;
        } else {
          acc.push({
            category: category.name,
            sold,
            revenue,
            percentage: 0 // Will calculate after
          });
        }
      });
    }
    return acc;
  }, []);

  // Calculate percentages
  const totalCategoryRevenue = salesByCategory.reduce((sum, cat) => sum + cat.revenue, 0);
  salesByCategory.forEach(cat => {
    cat.percentage = totalCategoryRevenue > 0 ? (cat.revenue / totalCategoryRevenue * 100) : 0;
  });

  // Calculate monthly growth
  const monthlyGrowth = analytics?.monthlyRevenue?.length > 1 ? 
    ((analytics.monthlyRevenue[analytics.monthlyRevenue.length - 1].revenue - 
      analytics.monthlyRevenue[analytics.monthlyRevenue.length - 2].revenue) / 
      analytics.monthlyRevenue[analytics.monthlyRevenue.length - 2].revenue * 100) : 0;

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading analytics data...</p>
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
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/seller/dashboard")}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Sales Analytics</h1>
              <p className="text-primary-foreground/80 mt-2">Track revenue, sales trends, and performance metrics</p>
            </div>
            <Button variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(analytics?.totalRevenue || 0).toLocaleString()}</div>
              <p className="text-xs text-green-600">
                {monthlyGrowth > 0 ? `+${monthlyGrowth.toFixed(1)}% from last month` : 'No growth data'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalTicketsSold || 0}</div>
              <p className="text-xs text-muted-foreground">Across all events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Ticket Price</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(analytics?.averageTicketPrice || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Average per ticket</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(analytics?.conversionRate || 0).toFixed(1)}%</div>
              <p className="text-xs text-green-600">Sales conversion rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.eventsCount || 0}</div>
              <p className="text-xs text-muted-foreground">{events.filter(e => e.status === 'active').length} active</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Event Performance</CardTitle>
              <CardDescription>Revenue and sales by event</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventPerformance.length > 0 ? (
                  eventPerformance.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge variant={event.conversionRate === 100 ? "default" : "secondary"}>
                          {event.status === 'sold_out' ? "Sold Out" : "Active"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold">${event.revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tickets Sold</p>
                          <p className="font-semibold">{event.ticketsSold}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Price</p>
                          <p className="font-semibold">${event.avgPrice}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conversion</p>
                          <p className="font-semibold">{event.conversionRate.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${event.conversionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No events found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Breakdown by ticket type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {salesByCategory.length > 0 ? (
                  salesByCategory.map((category) => (
                    <div key={category.category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{category.category}</span>
                        <span className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-muted-foreground">Sold: </span>
                          <span className="font-medium">{category.sold}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Revenue: </span>
                          <span className="font-medium">${category.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            category.category === 'VIP' ? 'bg-yellow-500' :
                            category.category === 'Premium' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sales data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Timeline - Monthly Revenue Chart */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Monthly Revenue Trends</CardTitle>
            <CardDescription>Revenue breakdown by month</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
              <div className="space-y-4">
                {analytics.monthlyRevenue.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">{month.month}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">${month.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No monthly revenue data available</p>
                  <p className="text-sm text-muted-foreground mt-1">Create events and sell tickets to see trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesAnalytics;
