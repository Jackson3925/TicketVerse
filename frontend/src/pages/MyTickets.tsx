
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import EmptyTicketsState from "@/components/EmptyTicketsState";
import TicketCard from "@/components/TicketCard";

interface TicketData {
  id: number;
  eventId: number;
  eventTitle: string;
  artist: string;
  date: string;
  venue: string;
  location: string;
  price: string;
  image: string;
  ticketNumber: string;
  purchaseDate: string;
  qrCode: string;
}

const MyTickets = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);

  useEffect(() => {
    const storedTickets = localStorage.getItem('myTickets');
    if (storedTickets) {
      setTickets(JSON.parse(storedTickets));
    }
  }, []);

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <EmptyTicketsState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
          <p className="text-muted-foreground">
            Your NFT concert tickets • {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyTickets;
