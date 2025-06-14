
import { useNavigate } from "react-router-dom";
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
  BarChart3
} from "lucide-react";

const SalesAnalytics = () => {
  const navigate = useNavigate();

  // Mock analytics data
  const analytics = {
    totalRevenue: 229200,
    totalTicketsSold: 1298,
    averageTicketPrice: 176.5,
    conversionRate: 68.2,
    monthlyGrowth: 12.5
  };

  const eventPerformance = [
    {
      id: 1,
      title: "Rock Revival",
      revenue: 120000,
      ticketsSold: 800,
      conversionRate: 100,
      avgPrice: 150
    },
    {
      id: 2,
      title: "Electric Nights Festival",
      revenue: 85500,
      ticketsSold: 342,
      conversionRate: 68.4,
      avgPrice: 250
    },
    {
      id: 3,
      title: "Jazz Under the Stars",
      revenue: 23400,
      ticketsSold: 156,
      conversionRate: 78.0,
      avgPrice: 150
    }
  ];

  const salesByCategory = [
    { category: "VIP", sold: 156, revenue: 62400, percentage: 27.2 },
    { category: "Premium", sold: 445, revenue: 89000, percentage: 38.8 },
    { category: "Standard", sold: 697, revenue: 77800, percentage: 34.0 }
  ];

  return (
    <div className="min-h-screen bg-background">
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
              <div className="text-2xl font-bold">${analytics.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-green-600">+{analytics.monthlyGrowth}% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTicketsSold}</div>
              <p className="text-xs text-muted-foreground">Across all events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Ticket Price</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.averageTicketPrice}</div>
              <p className="text-xs text-muted-foreground">+8% from last period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
              <p className="text-xs text-green-600">+2.1% improvement</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">2 upcoming</p>
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
                {eventPerformance.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge variant={event.conversionRate === 100 ? "default" : "secondary"}>
                        {event.conversionRate === 100 ? "Sold Out" : "Active"}
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
                        <p className="font-semibold">{event.conversionRate}%</p>
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
                ))}
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
                {salesByCategory.map((category) => (
                  <div key={category.category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{category.category}</span>
                      <span className="text-sm text-muted-foreground">{category.percentage}%</span>
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
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Timeline - Placeholder for chart */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Sales Timeline</CardTitle>
            <CardDescription>Revenue trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sales chart visualization would go here</p>
                <p className="text-sm text-muted-foreground mt-1">Integration with charts library needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesAnalytics;
