
import { Button } from "@/components/ui/button";
import { Ticket, Wallet, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const Navigation = () => {
  const navigate = useNavigate();

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
          
          {/* Account Dropdown */}
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
        </div>
        <Button variant="outline" className="flex items-center space-x-2">
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;
