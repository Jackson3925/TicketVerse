
import { useState } from "react";
import { useAuthRequired } from "@/hooks/useRoleProtection";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Wallet, Bell, Shield, Settings, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AccountProfile = () => {
  // Protect this route - both customers and sellers can access profile
  const { hasAccess } = useAuthRequired();
  
  if (!hasAccess) {
    return null; // useAuthRequired handles the redirect
  }

  const [profileData, setProfileData] = useState({
    displayName: "Music Lover",
    email: "user@example.com",
    bio: "Passionate about live music and NFT collectibles",
    location: "New York, NY"
  });
  
  const [notifications, setNotifications] = useState({
    eventReminders: true,
    ticketUpdates: true,
    priceAlerts: false,
    marketingEmails: false
  });

  const { toast } = useToast();

  const walletInfo = {
    address: "0x7d8a2f9b3c1e5a8d2f9b3c1e5a8d2f9b3c1e5a8d",
    balance: "2.45 ETH",
    verified: true
  };

  const stats = {
    ticketsPurchased: 12,
    eventsAttended: 8,
    nftTicketsOwned: 4,
    memberSince: "January 2024"
  };

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletInfo.address);
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard.",
    });
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Account Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Form */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>

                    <Button onClick={handleSaveProfile} className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Profile Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">{profileData.displayName}</h3>
                    <p className="text-sm text-muted-foreground">{profileData.location}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground">{profileData.bio}</p>
                  </div>
                  
                  <div className="flex justify-center">
                    <Badge variant="secondary">Member since {stats.memberSince}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2" />
                  Wallet Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Wallet Address</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="text-sm bg-muted px-3 py-2 rounded flex-1 truncate">
                          {walletInfo.address}
                        </code>
                        <Button variant="outline" size="sm" onClick={handleCopyAddress}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Balance</Label>
                      <div className="text-2xl font-bold mt-1">{walletInfo.balance}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="text-sm">Wallet Verified</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        Your wallet is securely connected and verified. All transactions are protected by blockchain security.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Event Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get notified before your events</p>
                    </div>
                    <Switch
                      checked={notifications.eventReminders}
                      onCheckedChange={(checked) => handleNotificationChange('eventReminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ticket Updates</Label>
                      <p className="text-sm text-muted-foreground">Updates about your ticket purchases</p>
                    </div>
                    <Switch
                      checked={notifications.ticketUpdates}
                      onCheckedChange={(checked) => handleNotificationChange('ticketUpdates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Price Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notifications about price changes</p>
                    </div>
                    <Switch
                      checked={notifications.priceAlerts}
                      onCheckedChange={(checked) => handleNotificationChange('priceAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">Promotional content and offers</p>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.ticketsPurchased}</div>
                  <p className="text-sm text-muted-foreground">Tickets Purchased</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.eventsAttended}</div>
                  <p className="text-sm text-muted-foreground">Events Attended</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.nftTicketsOwned}</div>
                  <p className="text-sm text-muted-foreground">NFT Tickets Owned</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">4.8★</div>
                  <p className="text-sm text-muted-foreground">Community Rating</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AccountProfile;
