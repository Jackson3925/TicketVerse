import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import CombinedAuthForm from "@/components/CombinedAuthForm";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const metadataRole = user.user_metadata?.user_role
      const mappedMetadataRole = metadataRole === 'customer' ? 'buyer' : metadataRole
      const userRole = user.userProfile?.user_type || mappedMetadataRole;
      
      if (userRole === 'seller') {
        navigate('/seller/dashboard');
      } else if (userRole === 'buyer' || metadataRole === 'customer') {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = (userRole: string) => {
    // The actual user role will be determined by the auth system
    // This is just for display purposes
    toast({
      title: "Welcome!",
      description: "You have successfully signed in.",
    });
    // Navigation will be handled by the useEffect above based on actual user role
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome Back</h1>
          <p className="text-xl text-primary-foreground/90">
            Sign in to your account or create a new one
          </p>
        </div>
      </div>

      {/* Auth Form Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Benefits */}
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-bold">Why Join Our Platform?</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Customer Benefits */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-primary">As a Customer</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <span className="text-lg">🎟️</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Easy Ticket Management</h4>
                      <p className="text-sm text-muted-foreground">
                        View all your tickets in one place and transfer to friends
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <span className="text-lg">💎</span>
                    </div>
                    <div>
                      <h4 className="font-medium">NFT Tickets</h4>
                      <p className="text-sm text-muted-foreground">
                        Own unique NFT tickets as digital collectibles
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <span className="text-lg">🔄</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Resale Marketplace</h4>
                      <p className="text-sm text-muted-foreground">
                        Safely buy and sell tickets through our marketplace
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Benefits */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-orange-600">As a Seller</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Advanced Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Track sales, revenue, and event performance
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <span className="text-lg">🎫</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Event Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Create unlimited events with custom pricing
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <span className="text-lg">💰</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Resale Control</h4>
                      <p className="text-sm text-muted-foreground">
                        Set resale rules and earn royalties
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auth Form */}
          <div className="flex-1">
            <CombinedAuthForm 
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
            <h2 className="text-3xl font-bold mb-4">Platform Features</h2>
            <p className="text-muted-foreground">
              Everything you need for the perfect event experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">🔐 Secure Payments</h3>
              <p className="text-muted-foreground text-sm">
                Pay with cryptocurrency securely through blockchain technology
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">📱 Mobile Ready</h3>
              <p className="text-muted-foreground text-sm">
                Access your tickets and manage events from any device
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">🎯 Smart Contracts</h3>
              <p className="text-muted-foreground text-sm">
                Transparent and secure ticket transactions on the blockchain
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;