
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ordersAPI } from '@/lib/api';
import { useRealtimeOrders } from '@/hooks/useRealtimeEvents';
import { useAuth } from '@/hooks/useAuth';
import { useRoleProtection } from '@/hooks/useRoleProtection';
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Calendar, MapPin, ExternalLink, Receipt, Ticket, ShoppingBag } from "lucide-react";
import type { Order } from '@/lib/supabase';

type OrderWithRelations = Order & {
  events?: { id: string; title: string; date: string; poster_image_url?: string };
  artists?: { id: string; name: string };
  venues?: { id: string; name: string; city: string; state?: string };
  seat_categories?: { id: string; name: string };
};

const OrderHistory = () => {
  // Protect this route for customers only
  const { hasAccess } = useRoleProtection({ requiredRole: 'customer' });
  
  if (!hasAccess) {
    return null; // useRoleProtection handles the redirect
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const orders = [
    {
      id: "ORD-001",
      eventTitle: "Electric Nights Festival",
      artist: "Various Artists",
      date: "2024-07-15",
      venue: "Madison Square Garden",
      location: "New York, NY",
      purchaseDate: "2024-06-10",
      price: "0.25 ETH",
      quantity: 2,
      status: "completed",
      transactionHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      ticketNumbers: ["NFT-001-2024", "NFT-002-2024"]
    },
    {
      id: "ORD-002",
      eventTitle: "Rock Revolution Tour",
      artist: "Thunder Strike",
      date: "2024-07-22",
      venue: "Hollywood Bowl",
      location: "Los Angeles, CA",
      purchaseDate: "2024-06-15",
      price: "0.18 ETH",
      quantity: 1,
      status: "completed",
      transactionHash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
      ticketNumbers: ["NFT-003-2024"]
    },
    {
      id: "ORD-003",
      eventTitle: "Jazz Under Stars",
      artist: "Miles Davis Tribute",
      date: "2024-07-28",
      venue: "Blue Note",
      location: "Chicago, IL",
      purchaseDate: "2024-06-20",
      price: "0.12 ETH",
      quantity: 1,
      status: "refunded",
      transactionHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
      ticketNumbers: ["NFT-004-2024"]
    },
    {
      id: "ORD-004",
      eventTitle: "Pop Paradise",
      artist: "Luna Star",
      date: "2024-08-05",
      venue: "Staples Center",
      location: "Los Angeles, CA",
      purchaseDate: "2024-07-01",
      price: "0.32 ETH",
      quantity: 3,
      status: "pending",
      transactionHash: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
      ticketNumbers: ["NFT-005-2024", "NFT-006-2024", "NFT-007-2024"]
    }
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesDate = dateFilter === "all" || 
                       (dateFilter === "30days" && new Date(order.purchaseDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
                       (dateFilter === "3months" && new Date(order.purchaseDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadReceipt = (orderId: string) => {
    console.log('Downloading receipt for order:', orderId);
  };

  const handleViewTransaction = (hash: string) => {
    window.open(`https://etherscan.io/tx/${hash}`, '_blank');
  };

  const totalSpent = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + parseFloat(order.price.replace(' ETH', '')), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Order History</h1>
          <p className="text-muted-foreground">
            View your past purchases and transaction history • {filteredOrders.length} orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalSpent.toFixed(2)} ETH</div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.filter(o => o.status === 'completed').length}</div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.reduce((sum, o) => sum + o.quantity, 0)}</div>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.eventTitle}</div>
                        <div className="text-sm text-muted-foreground">{order.artist}</div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(order.date)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {order.venue}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(order.purchaseDate)}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell className="font-medium">{order.price}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadReceipt(order.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewTransaction(order.transactionHash)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderHistory;
