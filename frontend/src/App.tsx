import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import EventDetails from "./pages/EventDetails";
import MyTickets from "./pages/MyTickets";
import BrowseEvents from "./pages/BrowseEvents";
import Artists from "./pages/Artists";
import ResaleMarketplace from "./pages/ResaleMarketplace";
import TransferTickets from "./pages/TransferTickets";
import AccountProfile from "./pages/AccountProfile";
import OrderHistory from "./pages/OrderHistory";
import SellEvent from "./pages/SellEvent";
import SellerDashboard from "./pages/SellerDashboard";
import ManageEvents from "./pages/seller/ManageEvents";
import SalesAnalytics from "./pages/seller/SalesAnalytics";
import CustomerManagement from "./pages/seller/CustomerManagement";
import ResaleControl from "./pages/seller/ResaleControl";
import CustomerAuth from "./pages/CustomerAuth";
import SellerAuth from "./pages/SellerAuth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/browse-events" element={<BrowseEvents />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/resale" element={<ResaleMarketplace />} />
            <Route path="/transfer" element={<TransferTickets />} />
            <Route path="/profile" element={<AccountProfile />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/sell-event" element={<SellEvent />} />
            {/* Authentication Routes */}
            <Route path="/auth/customer" element={<CustomerAuth />} />
            <Route path="/auth/seller" element={<SellerAuth />} />
            {/* Seller Dashboard Routes */}
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/seller/manage-events" element={<ManageEvents />} />
            <Route path="/seller/analytics" element={<SalesAnalytics />} />
            <Route path="/seller/customers" element={<CustomerManagement />} />
            <Route path="/seller/resale-control" element={<ResaleControl />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;