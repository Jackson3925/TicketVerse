
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoleProtection } from "@/hooks/useRoleProtection";
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
  Ticket
} from "lucide-react";
import Navigation from "@/components/Navigation";

const SellerDashboard = () => {
  const navigate = useNavigate();
  
  // Protect this route for sellers only
  const { hasAccess } = useRoleProtection({ requiredRole: 'seller' });
  
  if (!hasAccess) {
    return null; // useRoleProtection handles the redirect
  }

  // Mock data - in real app this would come from API
  const [events] = useState([
    {
      id: 1,
      title: "Electric Nights Festival",
      artist: "Various Artists",
      date: "2024-07-15",
      venue: "Madison Square Garden",
      totalTickets: 500,
      soldTickets: 342,
      revenue: 85500,
      status: "active"
    },
    {
      id: 2,
      title: "Jazz Under the Stars",
      artist: "Blue Note Quartet",
      date: "2024-08-03",
      venue: "Central Park",
      totalTickets: 200,
      soldTickets: 156,
      revenue: 23400,
      status: "active"
    },
    {
      id: 3,
      title: "Rock Revival",
      artist: "Thunder Strike",
      date: "2024-06-20",
      venue: "Arena Stadium",
      totalTickets: 800,
      soldTickets: 800,
      revenue: 120000,
      status: "sold-out"
    }
  ]);

  const totalRevenue = events.reduce((sum, event) => sum + event.revenue, 0);
  const totalSold = events.reduce((sum, event) => sum + event.soldTickets, 0);
  const totalCapacity = events.reduce((sum, event) => sum + event.totalTickets, 0);

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
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSold}</div>
              <p className="text-xs text-muted-foreground">{((totalSold/totalCapacity)*100).toFixed(1)}% of capacity</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.filter(e => e.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">3 upcoming events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Sale Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((totalSold/totalCapacity)*100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">+5% from last week</p>
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
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant={event.status === 'sold-out' ? 'default' : 'secondary'}>
                        {event.status === 'sold-out' ? 'Sold Out' : 'Active'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{event.artist} • {event.venue}</p>
                    <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="font-semibold">${event.revenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.soldTickets}/{event.totalTickets} sold
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;
