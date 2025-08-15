
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft,
  Settings,
  Percent,
  DollarSign,
  Shield,
  Info,
  Save,
  Loader2,
  ToggleLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { contractService } from "@/lib/contracts";

const ResaleControl = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isConnected, connectWallet, wallet } = useWeb3();
  const { contractEventId } = useParams<{ contractEventId: string }>();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferStates, setTransferStates] = useState<Record<string, boolean>>({});
  const [updatingTransfer, setUpdatingTransfer] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { eventsAPI } = await import('@/lib/api');
      const allEvents = await eventsAPI.getSellerEvents();
      
      // Filter events that have contract_event_id (deployed to blockchain)
      const blockchainEvents = allEvents.filter(event => event.contract_event_id);
      setEvents(blockchainEvents);
      
      // Load transfer states for each event
      const states: Record<string, boolean> = {};
      for (const event of blockchainEvents) {
        if (event.contract_event_id) {
          try {
            const contractEvent = await contractService.getEvent(event.contract_event_id);
            const transferEnabled = await contractService.isTransferEnabled(contractEvent.ticketContract);
            console.log(`Transfer status for event "${event.title}" (${event.contract_event_id}):`, {
              eventId: event.id,
              contractEventId: event.contract_event_id,
              ticketContract: contractEvent.ticketContract,
              transferEnabled
            });
            states[event.id] = transferEnabled;
          } catch (error) {
            console.warn('Error checking transfer state for event:', event.id, error);
            states[event.id] = false;
          }
        }
      }
      setTransferStates(states);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error Loading Events",
        description: "Failed to load your events from the blockchain.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTransfers = async (eventId: string) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to manage transfer settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingTransfer(eventId);
      
      const event = events.find(e => e.id === eventId);
      if (!event?.contract_event_id) {
        throw new Error('Event not found on blockchain');
      }

      const contractEvent = await contractService.getEvent(event.contract_event_id);
      const currentState = transferStates[eventId];
      
      console.log(`Toggling transfer for event "${event.title}":`, {
        eventId,
        contractEventId: event.contract_event_id,
        ticketContract: contractEvent.ticketContract,
        currentState,
        newState: !currentState
      });
      
      await contractService.setTransferEnabled(contractEvent.ticketContract, !currentState);
      
      // Update local state
      setTransferStates(prev => ({
        ...prev,
        [eventId]: !currentState
      }));

      toast({
        title: "Transfer Settings Updated",
        description: `Transfers ${!currentState ? 'enabled' : 'disabled'} for ${event.title}`,
      });
    } catch (error: any) {
      console.error('Error updating transfer settings:', error);
      toast({
        title: "Update Failed",
        description: error.message || 'Failed to update transfer settings',
        variant: "destructive",
      });
    } finally {
      setUpdatingTransfer(null);
    }
  };


  const totalRoyaltiesEarned = 0; // TODO: Calculate from actual resale data

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/seller/dashboard")}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Resale Control</h1>
          <p className="text-primary-foreground/80 mt-2">Manage secondary market rules and royalties</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Wallet Connection Notice */}
        {!isConnected && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800 font-medium">Wallet Connection Required</span>
              </div>
              <Button
                onClick={connectWallet}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Connect Wallet
              </Button>
            </div>
            <p className="text-orange-700 text-sm mt-1">
              Connect your wallet to manage transfer settings and interact with smart contracts.
            </p>
          </div>
        )}

        {isConnected && wallet && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">Wallet Connected</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Connected to {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </p>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Royalties Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRoyaltiesEarned}</div>
              <p className="text-xs text-muted-foreground">From secondary sales</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events with Resale</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(transferStates).filter(enabled => enabled).length}
              </div>
              <p className="text-xs text-muted-foreground">Out of {events.length} events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3%</div>
              <p className="text-xs text-muted-foreground">1% platform + 2% royalty</p>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Settings by Event */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Ticket Transfer Settings
            </CardTitle>
            <CardDescription>
              Enable or disable ticket transfers and resale for each event on the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                <p className="text-muted-foreground">Loading your events...</p>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-6">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Contract Event ID: {event.contract_event_id} • {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={transferStates[event.id] ? "default" : "secondary"}>
                        {transferStates[event.id] ? "Transfers Enabled" : "Transfers Disabled"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={`transfer-${event.id}`}>Enable Ticket Transfers & Resale</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow ticket holders to transfer and resell their tickets on the marketplace
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Switch
                          id={`transfer-${event.id}`}
                          checked={transferStates[event.id] || false}
                          onCheckedChange={() => toggleTransfers(event.id)}
                          disabled={updatingTransfer === event.id || !isConnected}
                        />
                        {updatingTransfer === event.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </div>
                    
                    {!isConnected && (
                      <p className="text-sm text-orange-600 mt-2">
                        Connect your wallet to manage resale settings
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <h3 className="font-medium mb-1">No Blockchain Events Found</h3>
                <p className="text-muted-foreground text-sm">
                  Create events and deploy them to the blockchain to manage transfer settings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Resale Control Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Resale Benefits</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Earn royalties on every secondary sale</li>
                  <li>• Prevent excessive price gouging</li>
                  <li>• Maintain control over your event tickets</li>
                  <li>• Build fan loyalty through fair pricing</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Best Practices</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Set royalty rates between 5-15%</li>
                  <li>• Cap resale prices at 150-200% of face value</li>
                  <li>• Enable transfer restrictions for VIP tickets</li>
                  <li>• Monitor secondary market activity regularly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResaleControl;
