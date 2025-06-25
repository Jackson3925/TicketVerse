
import { Button } from "@/components/ui/button";
import { Ticket, Wallet, Menu, LogIn, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const Navigation = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getUserDisplayName = () => {
    if (user?.userProfile?.display_name) {
      return user.userProfile.display_name;
    }
    if (user?.buyerProfile?.display_name) {
      return user.buyerProfile.display_name;
    }
    if (user?.sellerProfile?.display_name) {
      return user.sellerProfile.display_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getUserRole = () => {
    const metadataRole = user?.user_metadata?.user_role;
    const mappedMetadataRole = metadataRole === 'customer' ? 'buyer' : metadataRole;
    return user?.userProfile?.user_type || mappedMetadataRole || 'buyer';
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <Ticket className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">TicketVerse</span>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <span 
            className="text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate('/browse-events')}
          >
            Browse Events
          </span>
          <span 
            className="text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate('/artists')}
          >
            Artists
          </span>
          <span 
            className="text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate('/my-tickets')}
          >
            My Tickets
          </span>
          <span 
            className="text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate('/resale')}
          >
            Resale
          </span>
          <span 
            className="text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate('/seller/dashboard')}
          >
            Sell Events
          </span>
          
          {/* Account Dropdown - Only show when authenticated */}
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Account Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/orders')}>
                  Order History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/transfer')}>
                  Transfer Tickets
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Help & Support
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Right side buttons */}
        <div className="flex items-center space-x-3">
          {/* Authentication buttons */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{getUserDisplayName()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {getUserDisplayName()}
                </div>
                <div className="px-2 py-1.5 text-xs text-muted-foreground capitalize">
                  {getUserRole()} Account
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {getUserRole() === 'seller' && (
                  <DropdownMenuItem onClick={() => navigate('/seller/dashboard')}>
                    <Ticket className="h-4 w-4 mr-2" />
                    Seller Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate('/my-tickets')}>
                  <Ticket className="h-4 w-4 mr-2" />
                  My Tickets
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/auth/customer')}>
                  <User className="h-4 w-4 mr-2" />
                  Customer Login
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/auth/seller')}>
                  <Ticket className="h-4 w-4 mr-2" />
                  Seller Login
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Connect Wallet button */}
          <Button variant="outline" className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
