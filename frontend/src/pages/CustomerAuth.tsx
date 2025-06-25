import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import CustomerAuthForm from "@/components/CustomerAuthForm";
import { useToast } from "@/hooks/use-toast";

const CustomerAuth = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated as customer
  useEffect(() => {
    if (isAuthenticated && user) {
      const metadataRole = user.user_metadata?.user_role
      const mappedMetadataRole = metadataRole === 'customer' ? 'buyer' : metadataRole
      const userRole = user.userProfile?.user_type || mappedMetadataRole;
      if (userRole === 'buyer' || metadataRole === 'customer') {
        // Redirect to homepage or where they came from
        navigate('/');
      } else if (userRole === 'seller') {
        // Redirect seller to their dashboard
        navigate('/seller/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = () => {
    toast({
      title: "Welcome!",
      description: "You can now browse events and purchase tickets.",
    });
    // Redirect to homepage or intended destination
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Customer Portal</h1>
          <p className="text-xl text-primary-foreground/90">
            Discover amazing events and manage your tickets
          </p>
        </div>
      </div>

      {/* Auth Form Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Benefits */}
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-bold">Why Join as a Customer?</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <span className="text-2xl">🎟️</span>
                </div>
                <div>
                  <h3 className="font-semibold">Easy Ticket Management</h3>
                  <p className="text-muted-foreground">
                    View all your tickets in one place, transfer to friends, and access QR codes
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <span className="text-2xl">🔔</span>
                </div>
                <div>
                  <h3 className="font-semibold">Event Notifications</h3>
                  <p className="text-muted-foreground">
                    Get notified about upcoming events, ticket reminders, and exclusive offers
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <span className="text-2xl">💎</span>
                </div>
                <div>
                  <h3 className="font-semibold">NFT Tickets</h3>
                  <p className="text-muted-foreground">
                    Own unique NFT tickets that serve as digital collectibles
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <span className="text-2xl">🔄</span>
                </div>
                <div>
                  <h3 className="font-semibold">Resale Marketplace</h3>
                  <p className="text-muted-foreground">
                    Safely buy and sell tickets through our verified marketplace
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Auth Form */}
          <div className="flex-1">
            <CustomerAuthForm 
              mode="login" 
              onSuccess={handleSuccess}
              className="sticky top-8"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Customer Features</h2>
            <p className="text-muted-foreground">
              Everything you need for the perfect event experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Browse Events</h3>
              <p className="text-muted-foreground text-sm">
                Search and filter through thousands of events by category, location, and date
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Secure Payments</h3>
              <p className="text-muted-foreground text-sm">
                Pay with cryptocurrency securely through blockchain technology
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Order History</h3>
              <p className="text-muted-foreground text-sm">
                Track all your purchases and download receipts anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAuth;