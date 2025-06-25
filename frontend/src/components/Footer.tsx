
import { Ticket } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background border-t py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Ticket className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">TicketVerse</span>
            </div>
            <p className="text-muted-foreground">The future of concert ticketing on the blockchain.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">For Buyers</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Browse Events</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">My Tickets</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Resale Market</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Wallet Guide</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">For Sellers</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Create Event</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Dashboard</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Analytics</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 TicketVerse. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
