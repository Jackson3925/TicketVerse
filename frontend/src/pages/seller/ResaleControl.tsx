
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResaleControl = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock resale settings for events
  const [resaleSettings, setResaleSettings] = useState([
    {
      eventId: 1,
      eventName: "Electric Nights Festival",
      resaleEnabled: true,
      maxResalePrice: 500,
      royaltyPercentage: 10,
      transferRestrictions: false
    },
    {
      eventId: 2,
      eventName: "Jazz Under the Stars", 
      resaleEnabled: true,
      maxResalePrice: 300,
      royaltyPercentage: 15,
      transferRestrictions: true
    },
    {
      eventId: 3,
      eventName: "Rock Revival",
      resaleEnabled: false,
      maxResalePrice: 0,
      royaltyPercentage: 0,
      transferRestrictions: true
    }
  ]);

  const updateEventSetting = (eventId: number, field: string, value: any) => {
    setResaleSettings(prev => 
      prev.map(setting => 
        setting.eventId === eventId 
          ? { ...setting, [field]: value }
          : setting
      )
    );
  };

  const saveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Resale control settings have been updated successfully."
    });
  };

  const totalRoyaltiesEarned = 2450; // Mock data

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
                {resaleSettings.filter(s => s.resaleEnabled).length}
              </div>
              <p className="text-xs text-muted-foreground">Out of {resaleSettings.length} events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Royalty Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(resaleSettings.reduce((sum, s) => sum + s.royaltyPercentage, 0) / resaleSettings.length).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Across all events</p>
            </CardContent>
          </Card>
        </div>

        {/* Resale Settings by Event */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Event Resale Settings
            </CardTitle>
            <CardDescription>
              Configure resale rules, price caps, and royalty percentages for each event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {resaleSettings.map((setting) => (
                <div key={setting.eventId} className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">{setting.eventName}</h3>
                    <Badge variant={setting.resaleEnabled ? "default" : "secondary"}>
                      {setting.resaleEnabled ? "Resale Enabled" : "Resale Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Enable/Disable Resale */}
                    <div className="space-y-2">
                      <Label htmlFor={`resale-${setting.eventId}`}>Allow Resale</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`resale-${setting.eventId}`}
                          checked={setting.resaleEnabled}
                          onCheckedChange={(checked) => 
                            updateEventSetting(setting.eventId, 'resaleEnabled', checked)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {setting.resaleEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Max Resale Price */}
                    <div className="space-y-2">
                      <Label htmlFor={`price-${setting.eventId}`}>Max Resale Price ($)</Label>
                      <Input
                        id={`price-${setting.eventId}`}
                        type="number"
                        value={setting.maxResalePrice}
                        onChange={(e) => 
                          updateEventSetting(setting.eventId, 'maxResalePrice', parseInt(e.target.value))
                        }
                        disabled={!setting.resaleEnabled}
                        placeholder="0"
                      />
                    </div>
                    
                    {/* Royalty Percentage */}
                    <div className="space-y-2">
                      <Label htmlFor={`royalty-${setting.eventId}`}>Royalty Rate (%)</Label>
                      <Input
                        id={`royalty-${setting.eventId}`}
                        type="number"
                        value={setting.royaltyPercentage}
                        onChange={(e) => 
                          updateEventSetting(setting.eventId, 'royaltyPercentage', parseInt(e.target.value))
                        }
                        disabled={!setting.resaleEnabled}
                        placeholder="0"
                        min="0"
                        max="25"
                      />
                    </div>
                    
                    {/* Transfer Restrictions */}
                    <div className="space-y-2">
                      <Label htmlFor={`transfer-${setting.eventId}`}>Transfer Restrictions</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`transfer-${setting.eventId}`}
                          checked={setting.transferRestrictions}
                          onCheckedChange={(checked) => 
                            updateEventSetting(setting.eventId, 'transferRestrictions', checked)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {setting.transferRestrictions ? "Restricted" : "Open"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save All Settings
              </Button>
            </div>
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
