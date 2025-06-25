
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft,
  Search,
  Mail,
  User,
  Calendar,
  MessageCircle,
  Download,
  Filter
} from "lucide-react";

const CustomerManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Mock customer data
  const customers = [
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@email.com",
      totalPurchases: 3,
      totalSpent: 750,
      lastPurchase: "2024-06-15",
      events: ["Rock Revival", "Electric Nights Festival"],
      status: "vip"
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      totalPurchases: 2,
      totalSpent: 420,
      lastPurchase: "2024-06-10",
      events: ["Jazz Under the Stars", "Classical Evening"],
      status: "regular"
    },
    {
      id: 3,
      name: "Mike Chen",
      email: "mike.chen@email.com",
      totalPurchases: 1,
      totalSpent: 150,
      lastPurchase: "2024-06-01",
      events: ["Rock Revival"],
      status: "new"
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily.davis@email.com",
      totalPurchases: 5,
      totalSpent: 1250,
      lastPurchase: "2024-06-20",
      events: ["Electric Nights Festival", "Jazz Under the Stars", "Rock Revival"],
      status: "vip"
    }
  ];

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "all" || customer.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const averageSpent = totalRevenue / totalCustomers;
  const vipCustomers = customers.filter(c => c.status === "vip").length;

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
              <h1 className="text-3xl font-bold">Customer Management</h1>
              <p className="text-primary-foreground/80 mt-2">View and manage your ticket buyers</p>
            </div>
            <Button variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Export List
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Active ticket buyers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From ticket sales</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Spent</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averageSpent.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">Per customer</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vipCustomers}</div>
              <p className="text-xs text-muted-foreground">{((vipCustomers/totalCustomers)*100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select 
            className="px-4 py-2 border rounded-md"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <option value="all">All Customers</option>
            <option value="vip">VIP Customers</option>
            <option value="regular">Regular Customers</option>
            <option value="new">New Customers</option>
          </select>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>Manage relationships with your ticket buyers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{customer.name}</h4>
                        <Badge 
                          variant={
                            customer.status === 'vip' ? 'default' : 
                            customer.status === 'new' ? 'secondary' : 'outline'
                          }
                        >
                          {customer.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{customer.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Last purchase: {new Date(customer.lastPurchase).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="text-right mr-4">
                      <p className="font-semibold">${customer.totalSpent}</p>
                      <p className="text-sm text-muted-foreground">{customer.totalPurchases} purchases</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Events attended:</p>
                    <div className="flex flex-wrap gap-1">
                      {customer.events.map((event, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No customers found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerManagement;
