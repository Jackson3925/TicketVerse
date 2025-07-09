
import { useState, useEffect } from "react";
import { useAuthRequired } from "@/hooks/useRoleProtection";
import { useAuth } from "@/hooks/useAuth";
import { useWeb3 } from "@/hooks/useWeb3";
import Navigation from "@/components/Navigation";
import WalletConnection from "@/components/WalletConnection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Wallet, Bell, Shield, Settings, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/auth";
import type { UpdateUserData, UpdateBuyerData, UpdateSellerData } from "@/lib/auth";

const AccountProfile = () => {
  // Protect this route - both customers and sellers can access profile
  const { hasAccess } = useAuthRequired();
  const { user, loading: authLoading } = useAuth();
  const { wallet, isConnected } = useWeb3();
  
  if (!hasAccess) {
    return null; // useAuthRequired handles the redirect
  }

  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    bio: "",
    location: "",
    businessName: "",
    businessType: "individual" as "individual" | "company" | "venue",
    contactPhone: "",
    walletAddress: "",
    preferredGenres: [] as string[],
  });
  
  const [notifications, setNotifications] = useState({
    eventReminders: true,
    ticketUpdates: true,
    priceAlerts: false,
    marketingEmails: false,
    newOrders: true,
    customerMessages: true,
    payoutUpdates: true
  });

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const { toast } = useToast();

  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user || authLoading) return;
      
      try {
        setProfileLoading(true);
        
        // If user profiles are undefined, try to reload them
        if (!user.userProfile) {
          console.log('User profile is undefined, trying to reload...');
          const freshUser = await auth.getCurrentUser();
          console.log('Fresh user data:', freshUser);
          
          if (freshUser) {
            // Update with fresh user data
            Object.assign(user, freshUser);
          }
          
          // If still no profile, user might not have been created properly
          if (!freshUser?.userProfile) {
            console.error('User profile missing from database. User ID:', user.id);
            toast({
              title: "Profile Error",
              description: "Your profile is missing from the database. Please contact support or try logging out and back in.",
              variant: "destructive"
            });
            return;
          }
        }
        
        // Base user data
        const userProfile = user.userProfile;
        const buyerProfile = user.buyerProfile;
        const sellerProfile = user.sellerProfile;
        
        console.log('Loading profile data:', {
          userProfile,
          buyerProfile,
          sellerProfile,
          user,
          userType: userProfile?.user_type,
          userId: user.id
        });
        
        if (userProfile) {
          setProfileData(prev => ({
            ...prev,
            displayName: userProfile.display_name || "",
            email: userProfile.email || "",
            bio: buyerProfile?.bio || sellerProfile?.bio || "",
            location: buyerProfile?.location || sellerProfile?.location || "",
            businessName: sellerProfile?.business_name || "",
            businessType: sellerProfile?.business_type || "individual",
            contactPhone: sellerProfile?.contact_phone || "",
            preferredGenres: buyerProfile?.preferred_genres || [],
          }));
          
          // Set notifications based on user type
          if ((userProfile.user_type === 'buyer' || userProfile.user_type === 'customer') && buyerProfile) {
            setNotifications(prev => ({
              ...prev,
              eventReminders: buyerProfile.notification_event_reminders ?? true,
              ticketUpdates: buyerProfile.notification_ticket_updates ?? true,
              priceAlerts: buyerProfile.notification_price_alerts ?? false,
              marketingEmails: buyerProfile.notification_marketing_emails ?? false
            }));
          } else if (userProfile.user_type === 'seller' && sellerProfile) {
            setNotifications(prev => ({
              ...prev,
              newOrders: sellerProfile.notification_new_orders ?? true,
              customerMessages: sellerProfile.notification_customer_messages ?? true,
              payoutUpdates: sellerProfile.notification_payout_updates ?? true,
              marketingEmails: sellerProfile.notification_marketing_emails ?? false
            }));
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setProfileLoading(false);
      }
    };
    
    loadProfileData();
  }, [user, authLoading, toast]);

  const walletInfo = {
    address: isConnected ? (wallet?.address || "Not connected") : 
             (user?.buyerProfile?.wallet_address || user?.sellerProfile?.wallet_address || "Not connected"),
    balance: isConnected ? (wallet?.balance || "0.00") + " ETH" : 
             `${user?.buyerProfile?.wallet_balance || user?.sellerProfile?.wallet_balance || 0.00} ETH`,
    verified: isConnected && !!wallet?.address || 
              user?.buyerProfile?.wallet_verified || user?.sellerProfile?.wallet_verified || false
  };

  const stats = {
    ticketsPurchased: user?.buyerProfile?.tickets_purchased || 0,
    eventsAttended: user?.buyerProfile?.events_attended || 0,
    nftTicketsOwned: user?.buyerProfile?.nft_tickets_owned || 0,
    eventsCreated: user?.sellerProfile?.events_created || 0,
    totalRevenue: user?.sellerProfile?.total_revenue || 0,
    memberSince: user?.userProfile?.created_at 
      ? new Date(user.userProfile.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        })
      : "Unknown"
  };

  const userType = user?.userProfile?.user_type;
  const isBuyer = userType === 'buyer' || userType === 'customer';
  const isSeller = userType === 'seller';
  
  // Debug logging
  console.log('User type detection:', {
    userType,
    isBuyer,
    isSeller,
    userProfile: user?.userProfile,
    buyerProfile: user?.buyerProfile,
    sellerProfile: user?.sellerProfile
  });

  const handleSaveProfile = async () => {
    if (!user?.userProfile) return;
    
    setLoading(true);
    try {
      // Update base user data
      const userUpdates: UpdateUserData = {
        display_name: profileData.displayName,
      };
      
      const { error: userError } = await auth.updateUser(userUpdates);
      if (userError) throw userError;
      
      // Update role-specific data
      if (isBuyer) {
        const buyerUpdates: UpdateBuyerData = {
          bio: profileData.bio,
          location: profileData.location,
          wallet_address: isConnected ? wallet?.address : undefined,
          preferred_genres: profileData.preferredGenres,
          notification_event_reminders: notifications.eventReminders,
          notification_ticket_updates: notifications.ticketUpdates,
          notification_price_alerts: notifications.priceAlerts,
          notification_marketing_emails: notifications.marketingEmails
        };
        
        const { error: buyerError } = await auth.updateBuyer(buyerUpdates);
        if (buyerError) throw buyerError;
      } else if (isSeller) {
        const sellerUpdates: UpdateSellerData = {
          business_name: profileData.businessName,
          business_type: profileData.businessType,
          bio: profileData.bio,
          location: profileData.location,
          contact_phone: profileData.contactPhone,
          wallet_address: isConnected ? wallet?.address : undefined,
          notification_new_orders: notifications.newOrders,
          notification_customer_messages: notifications.customerMessages,
          notification_payout_updates: notifications.payoutUpdates,
          notification_marketing_emails: notifications.marketingEmails
        };
        
        const { error: sellerError } = await auth.updateSeller(sellerUpdates);
        if (sellerError) throw sellerError;
      }
      
      toast({
        title: "Profile Updated",
        description: `Your profile information has been saved successfully.${isConnected ? ' Wallet address has been linked to your account.' : ''}`,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
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
                        disabled
                        className="opacity-60"
                      />
                      <p className="text-sm text-muted-foreground">Email cannot be changed from this page</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="City, State/Country"
                      />
                    </div>

                    {isSeller && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input
                            id="businessName"
                            value={profileData.businessName}
                            onChange={(e) => setProfileData(prev => ({ ...prev, businessName: e.target.value }))}
                            placeholder="Your business or venue name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="businessType">Business Type</Label>
                          <select
                            id="businessType"
                            value={profileData.businessType}
                            onChange={(e) => setProfileData(prev => ({ ...prev, businessType: e.target.value as "individual" | "company" | "venue" }))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="individual">Individual</option>
                            <option value="company">Company</option>
                            <option value="venue">Venue</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contactPhone">Contact Phone</Label>
                          <Input
                            id="contactPhone"
                            value={profileData.contactPhone}
                            onChange={(e) => setProfileData(prev => ({ ...prev, contactPhone: e.target.value }))}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </>
                    )}

                    {isBuyer && (
                      <>
                        <div className="space-y-2">
                          <Label>Preferred Genres</Label>
                          <div className="flex flex-wrap gap-2">
                            {["Rock", "Pop", "Hip Hop", "Electronic", "Jazz", "Classical", "Country", "R&B", "Reggae", "Folk", "Alternative", "Indie", "Metal", "Punk", "Blues", "Latin", "World", "Gospel"].map((genre) => (
                              <Button
                                key={genre}
                                type="button"
                                variant={profileData.preferredGenres.includes(genre) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setProfileData(prev => ({
                                    ...prev,
                                    preferredGenres: prev.preferredGenres.includes(genre)
                                      ? prev.preferredGenres.filter(g => g !== genre)
                                      : [...prev.preferredGenres, genre]
                                  }));
                                }}
                              >
                                {genre}
                              </Button>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Click to select/deselect your preferred music genres
                          </p>
                        </div>

                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Wallet Connection</Label>
                      <div className="border rounded-md p-3">
                        <WalletConnection variant="card" showBalance={false} showChainSwitcher={false} />
                        {isConnected && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                            ✓ Wallet connected. Click "Save Changes" to link this wallet to your account.
                          </div>
                        )}
                        {!isConnected && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                            Connect your wallet to enable ticket purchases and NFT management.
                          </div>
                        )}
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} className="w-full" disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4 mr-2" />
                      )}
                      {loading ? "Saving..." : "Save Changes"}
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
                    <h3 className="text-lg font-semibold">{profileData.displayName || "Anonymous User"}</h3>
                    <p className="text-sm text-muted-foreground">{profileData.location || "Location not set"}</p>
                    {isSeller && profileData.businessName && (
                      <p className="text-sm font-medium text-primary mt-1">{profileData.businessName}</p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground">{profileData.bio || "No bio available"}</p>
                  </div>
                  
                  <div className="flex justify-center">
                    <Badge variant="secondary">Member since {stats.memberSince}</Badge>
                  </div>
                  
                  <div className="flex justify-center">
                    <Badge variant={isBuyer ? "default" : "outline"}>
                      {isBuyer ? "Buyer" : "Seller"}
                    </Badge>
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
                        {walletInfo.verified && (
                          <Button variant="outline" size="sm" onClick={handleCopyAddress}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Balance</Label>
                      <div className="text-2xl font-bold mt-1">{walletInfo.balance}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Shield className={`h-5 w-5 ${walletInfo.verified ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-sm">{walletInfo.verified ? 'Wallet Connected' : 'Wallet Not Connected'}</span>
                      {walletInfo.verified && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>

                    <div className={`border rounded-lg p-4 ${
                      walletInfo.verified 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <p className={`text-sm ${
                        walletInfo.verified 
                          ? 'text-blue-800' 
                          : 'text-yellow-800'
                      }`}>
                        {walletInfo.verified 
                          ? 'Your wallet is securely connected and verified. All transactions are protected by blockchain security.'
                          : 'Connect your wallet to purchase tickets and manage your NFT collection. You can add your wallet address in the profile section above.'
                        }
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
                  {isBuyer && (
                    <>
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
                    </>
                  )}

                  {isSeller && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>New Orders</Label>
                          <p className="text-sm text-muted-foreground">Notifications when customers purchase tickets</p>
                        </div>
                        <Switch
                          checked={notifications.newOrders}
                          onCheckedChange={(checked) => handleNotificationChange('newOrders', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Customer Messages</Label>
                          <p className="text-sm text-muted-foreground">Messages from customers</p>
                        </div>
                        <Switch
                          checked={notifications.customerMessages}
                          onCheckedChange={(checked) => handleNotificationChange('customerMessages', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Payout Updates</Label>
                          <p className="text-sm text-muted-foreground">Notifications about earnings and payouts</p>
                        </div>
                        <Switch
                          checked={notifications.payoutUpdates}
                          onCheckedChange={(checked) => handleNotificationChange('payoutUpdates', checked)}
                        />
                      </div>
                    </>
                  )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isBuyer && (
                <>
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
                      <div className="text-2xl font-bold">{user?.buyerProfile?.community_rating?.toFixed(1) || '0.0'}</div>
                      <p className="text-sm text-muted-foreground">Community Rating</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{user?.buyerProfile?.wallet_balance?.toFixed(2) || '0.00'} ETH</div>
                      <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{user?.buyerProfile?.wallet_verified ? '✅' : '❌'}</div>
                      <p className="text-sm text-muted-foreground">Wallet Verified</p>
                    </CardContent>
                  </Card>
                </>
              )}
              
              {isSeller && (
                <>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{stats.eventsCreated}</div>
                      <p className="text-sm text-muted-foreground">Events Created</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{user?.sellerProfile?.average_rating?.toFixed(1) || '0.0'}</div>
                      <p className="text-sm text-muted-foreground">Average Rating</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{user?.sellerProfile?.verified_seller ? '✅' : '❌'}</div>
                      <p className="text-sm text-muted-foreground">Verified Seller</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{user?.sellerProfile?.commission_rate?.toFixed(1) || '5.0'}%</div>
                      <p className="text-sm text-muted-foreground">Commission Rate</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{user?.sellerProfile?.wallet_balance?.toFixed(2) || '0.00'} ETH</div>
                      <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isBuyer && (
                <Card>
                  <CardHeader>
                    <CardTitle>Buyer Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Preferred Genres</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profileData.preferredGenres.length > 0 ? (
                          profileData.preferredGenres.map((genre, index) => (
                            <Badge key={index} variant="secondary">{genre}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No genres selected</span>
                        )}
                      </div>
                    </div>


                    <div>
                      <Label className="text-sm font-medium">Member Since</Label>
                      <p className="text-sm text-muted-foreground">
                        {user?.buyerProfile?.member_since 
                          ? new Date(user.buyerProfile.member_since).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : 'Unknown'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isSeller && (
                <Card>
                  <CardHeader>
                    <CardTitle>Seller Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Business Type</Label>
                      <Badge variant="default" className="ml-2">
                        {user?.sellerProfile?.business_type || 'individual'}
                      </Badge>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Commission Rate</Label>
                      <p className="text-sm text-muted-foreground">
                        {user?.sellerProfile?.commission_rate?.toFixed(1) || '5.0'}%
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Tax ID</Label>
                      <p className="text-sm text-muted-foreground">
                        {user?.sellerProfile?.tax_id || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Verification Status</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user?.sellerProfile?.verified_seller ? "default" : "secondary"}>
                          {user?.sellerProfile?.verified_seller ? "Verified" : "Not Verified"}
                        </Badge>
                        {user?.sellerProfile?.verified_seller && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Account Type</Label>
                    <Badge variant="default" className="ml-2">
                      {(userType === 'buyer' || userType === 'customer') ? 'Buyer' : 'Seller'}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Account Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {user?.userProfile?.created_at 
                        ? new Date(user.userProfile.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Unknown'
                      }
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm text-muted-foreground">
                      {user?.userProfile?.updated_at 
                        ? new Date(user.userProfile.updated_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Unknown'
                      }
                    </p>
                  </div>
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
