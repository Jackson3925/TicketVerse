
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Search, 
  Edit, 
  Eye, 
  Trash2, 
  Plus,
  ArrowLeft,
  Shield,
  Filter
} from "lucide-react";

const ManageEvents = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data
  const [events] = useState([
    {
      id: 1,
      title: "Electric Nights Festival",
      artist: "Various Artists",
      date: "2024-07-15",
      venue: "Madison Square Garden",
      location: "New York, NY",
      totalTickets: 500,
      soldTickets: 342,
      revenue: 85500,
      status: "active",
      category: "Electronic"
    },
    {
      id: 2,
      title: "Jazz Under the Stars",
      artist: "Blue Note Quartet",
      date: "2024-08-03",
      venue: "Central Park",
      location: "New York, NY",
      totalTickets: 200,
      soldTickets: 156,
      revenue: 23400,
      status: "active",
      category: "Jazz"
    },
    {
      id: 3,
      title: "Rock Revival",
      artist: "Thunder Strike",
      date: "2024-06-20",
      venue: "Arena Stadium",
      location: "Los Angeles, CA",
      totalTickets: 800,
      soldTickets: 800,
      revenue: 120000,
      status: "sold-out",
      category: "Rock"
    },
    {
      id: 4,
      title: "Classical Evening",
      artist: "Symphony Orchestra",
      date: "2024-09-10",
      venue: "Concert Hall",
      location: "Boston, MA",
      totalTickets: 300,
      soldTickets: 89,
      revenue: 13350,
      status: "active",
      category: "Classical"
    }
  ]);

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.venue.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Manage Events</h1>
          <p className="text-primary-foreground/80 mt-2">Edit, view, and manage all your concert events</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events, artists, or venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button onClick={() => navigate("/sell-event")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <Badge variant={event.status === 'sold-out' ? 'default' : 'secondary'}>
                        {event.status === 'sold-out' ? 'Sold Out' : 'Active'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {event.artist} • {event.category}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString()} • {event.venue}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tickets Sold</p>
                      <p className="font-semibold">{event.soldTickets} / {event.totalTickets}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-semibold">{event.revenue.toFixed(5)} ETH</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(event.soldTickets / event.totalTickets) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => navigate(`/verify/${event.contract_event_id || event.id}`)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => navigate("/seller/resale-control")}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or create a new event</p>
            <Button onClick={() => navigate("/sell-event")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Event
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageEvents;
