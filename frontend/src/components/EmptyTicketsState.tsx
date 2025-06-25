
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EmptyTicketsState = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <Ticket className="h-16 w-16 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">No Tickets Yet</h1>
          <p className="text-muted-foreground">
            You haven't purchased any tickets yet. Browse events and get your first NFT ticket!
          </p>
        </div>
        <Button onClick={() => navigate('/')}>
          Browse Events
        </Button>
      </div>
    </div>
  );
};

export default EmptyTicketsState;
