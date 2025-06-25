import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import SellerAuthForm from "@/components/SellerAuthForm";
import { useToast } from "@/hooks/use-toast";

const SellerAuth = () => {
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
        // Redirect to seller dashboard
        navigate('/seller/dashboard');
      } else if (userRole === 'buyer' || metadataRole === 'customer') {
        // Redirect customer to homepage
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = () => {
    toast({
      title: "Welcome to the Seller Portal!",
      description: "You can now create events and manage your business.",
    });
    // Redirect to seller dashboard
    navigate('/seller/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Seller Portal</h1>
          <p className="text-xl text-white/90">
            Create, manage, and grow your event business
          </p>
        </div>
      </div>

      {/* Auth Form Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Benefits */}
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-bold">Why Become a Seller?</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h3 className="font-semibold">Advanced Analytics</h3>
                  <p className="text-muted-foreground">
                    Track sales, revenue, customer behavior, and event performance
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <span className="text-2xl">🎫</span>
                </div>
                <div>
                  <h3 className="font-semibold">Event Management</h3>
                  <p className="text-muted-foreground">
                    Create unlimited events with custom pricing and seating arrangements
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h3 className="font-semibold">Customer Management</h3>
                  <p className="text-muted-foreground">
                    Build relationships with customers and track their purchase history
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <h3 className="font-semibold">Resale Control</h3>
                  <p className="text-muted-foreground">
                    Set resale rules, earn royalties, and prevent ticket scalping
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">Getting Started is Easy!</h4>
              <p className="text-orange-700 text-sm">
                Create your seller account, verify your information, and start selling tickets within minutes.
                Our platform handles payments, NFT generation, and customer support.
              </p>
            </div>
          </div>

          {/* Auth Form */}
          <div className="flex-1">
            <SellerAuthForm 
              mode="signup" 
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
            <h2 className="text-3xl font-bold mb-4">Seller Dashboard Features</h2>
            <p className="text-muted-foreground">
              Everything you need to run a successful event business
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">📈 Sales Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Real-time sales data, revenue tracking, and performance insights
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">🎪 Event Creation</h3>
              <p className="text-muted-foreground text-sm">
                Easy-to-use event builder with custom seating and pricing
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">👤 Customer Insights</h3>
              <p className="text-muted-foreground text-sm">
                Understand your audience with detailed customer analytics
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">🔄 Resale Management</h3>
              <p className="text-muted-foreground text-sm">
                Control secondary market sales and earn resale royalties
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-xl text-white/90 mb-6">
            Join thousands of event organizers already using our platform
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <span>✓ No setup fees</span>
            <span>✓ Secure payments</span>
            <span>✓ 24/7 support</span>
            <span>✓ Advanced analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerAuth;