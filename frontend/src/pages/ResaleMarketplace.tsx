
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, Clock, MapPin, Calendar, Shield, Loader2, AlertCircle, Wallet, Store, X } from "lucide-react";
import { useWeb3 } from "@/hooks/useWeb3";
import { useToast } from "@/hooks/use-toast";
import { contractService, ResaleListingInfo, contractUtils, NFTTicketInfo } from "@/lib/contracts";
import { ethers } from "ethers";
import ListTicketModal from "@/components/ListTicketModal";

const ResaleMarketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [priceRange, setPriceRange] = useState("all");
  const [listings, setListings] = useState<ResaleListingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyingTicket, setBuyingTicket] = useState<string | null>(null);
  const [userTickets, setUserTickets] = useState<NFTTicketInfo[]>([]);
  const [loadingUserTickets, setLoadingUserTickets] = useState(false);
  const [showMyTickets, setShowMyTickets] = useState(false);
  const [userListings, setUserListings] = useState<ResaleListingInfo[]>([]);
  const [loadingUserListings, setLoadingUserListings] = useState(false);
  const [showMyListings, setShowMyListings] = useState(false);
  const [cancellingListing, setCancellingListing] = useState<string | null>(null);
  
  const { isConnected, connectWallet, wallet } = useWeb3();
  const { toast } = useToast();

  useEffect(() => {
    loadResaleListings();
  }, []);

  useEffect(() => {
    if (isConnected && wallet && showMyTickets) {
      loadUserTickets();
    }
  }, [isConnected, wallet, showMyTickets]);

  useEffect(() => {
    if (isConnected && wallet && showMyListings) {
      loadUserListings();
    }
  }, [isConnected, wallet, showMyListings]);

  const loadResaleListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const resaleListings = await contractService.getEnrichedResaleListings();
      setListings(resaleListings);
    } catch (err: any) {
      console.error('Error loading resale listings:', err);
      setError(err.message || 'Failed to load resale listings');
    } finally {
      setLoading(false);
    }
  };

  const loadUserTickets = async () => {
    if (!wallet?.address) return;

    try {
      setLoadingUserTickets(true);
      
      // Better approach: Get tickets from database first, then verify ownership on blockchain
      const { ticketsAPI, eventsAPI } = await import('@/lib/api');
      
      // Get user's tickets from database (much faster) 
      // Note: getUserTickets uses authenticated user ID, not wallet address
      const dbTickets = await ticketsAPI.getUserTickets();
      console.log('DB Tickets found:', dbTickets.length, dbTickets);
      const userTickets: NFTTicketInfo[] = [];

      // For each database ticket, verify ownership on blockchain and get full details
      for (const dbTicket of dbTickets) {
        console.log('Processing ticket:', dbTicket);
        if (!dbTicket.token_id || !dbTicket.event_id) {
          console.log('Skipping ticket - missing token_id or event_id');
          continue;
        }
        
        try {
          // Get event to find the contract_event_id
          const event = await eventsAPI.getEventById(dbTicket.event_id);
          if (!event?.contract_event_id) continue;
          
          // Get the specific event's ticket contract address from TicketFactory
          const contractEvent = await contractService.getEvent(event.contract_event_id);
          const ticketContractAddress = contractEvent.ticketContract;
          
          // Verify ownership on blockchain (single targeted call)
          const owner = await contractService.checkTicketOwnership(
            ticketContractAddress, 
            dbTicket.token_id
          );
          
          // Only include if user still owns the ticket
          if (owner.toLowerCase() === wallet.address.toLowerCase()) {
            // Get full ticket details from the specific event's TicketNFT contract
            const { TICKET_NFT_ABI } = await import('@/lib/contracts');
            const contract = await contractService.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
            const tokenURI = await contract.tokenURI(dbTicket.token_id);
            const ticketInfo = await contract.getTicketInfo(dbTicket.token_id);

            userTickets.push({
              tokenId: dbTicket.token_id,
              owner: wallet.address,
              tokenURI,
              eventContract: ticketContractAddress,
              ticketInfo: {
                ticketTypeId: Number(ticketInfo.ticketTypeId),
                price: ethers.formatEther(ticketInfo.price),
                mintTimestamp: Number(ticketInfo.mintTimestamp),
                isValidated: ticketInfo.isValidated,
                isUsed: ticketInfo.isUsed
              },
              dbTicketId: dbTicket.id // Add database ticket ID
            });
          }
        } catch (error) {
          console.warn('Error verifying ticket ownership for token:', dbTicket.token_id, error);
          // Skip this ticket if verification fails
        }
      }

      setUserTickets(userTickets);
    } catch (err: any) {
      console.error('Error loading user tickets:', err);
      toast({
        title: "Error Loading Your Tickets",
        description: err.message || 'Failed to load your tickets',
        variant: "destructive",
      });
    } finally {
      setLoadingUserTickets(false);
    }
  };

  const loadUserListings = async () => {
    if (!wallet?.address) return;
    
    try {
      setLoadingUserListings(true);
      
      // Get all active listings and filter by user's address
      const allListings = await contractService.getEnrichedResaleListings();
      const userOwnedListings = allListings.filter(listing => 
        listing.seller.toLowerCase() === wallet.address.toLowerCase()
      );
      
      console.log('User listings found:', userOwnedListings.length);
      setUserListings(userOwnedListings);
    } catch (err: any) {
      console.error('Error loading user listings:', err);
      toast({
        title: "Error Loading Your Listings",
        description: err.message || 'Failed to load your listings',
        variant: "destructive",
      });
    } finally {
      setLoadingUserListings(false);
    }
  };

  const handleCancelListing = async (listing: ResaleListingInfo) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to cancel listings.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCancellingListing(listing.ticketContract + ':' + listing.tokenId);
      
      // Cancel on blockchain
      const txHash = await contractService.cancelResaleListing(
        listing.ticketContract,
        listing.tokenId
      );

      // Update database status
      try {
        const { resaleAPI } = await import('@/lib/api');
        await resaleAPI.updateResaleListingStatus(listing.id, 'cancelled');
        console.log('Database listing status updated to cancelled');
      } catch (dbError) {
        console.error('Failed to update database listing status:', dbError);
        toast({
          title: "Warning",
          description: "Blockchain cancellation succeeded but database sync failed.",
          variant: "destructive",
        });
      }

      toast({
        title: "Listing Cancelled",
        description: `Your listing has been cancelled. Transaction: ${txHash.slice(0, 10)}...`,
      });

      // Refresh listings
      loadResaleListings();
      loadUserListings();
    } catch (err: any) {
      console.error('Error cancelling listing:', err);
      toast({
        title: "Cancel Failed",
        description: err.message || 'Failed to cancel listing',
        variant: "destructive",
      });
    } finally {
      setCancellingListing(null);
    }
  };

  const handleBuyTicket = async (listing: ResaleListingInfo) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to buy tickets.",
        variant: "destructive",
      });
      return;
    }

    try {
      setBuyingTicket(`${listing.ticketContract}-${listing.tokenId}`);
      
      const txHash = await contractService.buyResaleTicket(
        listing.ticketContract,
        listing.tokenId,
        listing.price
      );
      
      // Update database status
      try {
        const { resaleAPI } = await import('@/lib/api');
        await resaleAPI.updateResaleListingStatus(listing.id, 'sold');
        console.log('Database listing status updated to sold');
      } catch (dbError) {
        console.error('Failed to update database listing status:', dbError);
        toast({
          title: "Warning",
          description: "Purchase succeeded but database sync failed.",
          variant: "destructive",
        });
      }
      
      toast({
        title: "Purchase Successful",
        description: `Ticket purchased! Transaction: ${txHash.slice(0, 10)}...`,
      });
      
      // Reload listings to update the UI
      await loadResaleListings();
    } catch (err: any) {
      console.error('Error buying ticket:', err);
      toast({
        title: "Purchase Failed",
        description: contractUtils.formatContractError(err),
        variant: "destructive",
      });
    } finally {
      setBuyingTicket(null);
    }
  };

  const filteredTickets = listings.filter(listing => {
    const eventTitle = listing.eventInfo?.name || 'Unknown Event';
    const searchMatch = eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       listing.seller.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!searchMatch) return false;
    
    if (priceRange !== 'all') {
      const price = parseFloat(listing.price);
      switch (priceRange) {
        case 'under-0.2':
          return price < 0.2;
        case '0.2-0.5':
          return price >= 0.2 && price <= 0.5;
        case 'over-0.5':
          return price > 0.5;
        default:
          return true;
      }
    }
    
    return true;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTicketId = (listing: ResaleListingInfo) => {
    return `${listing.ticketContract}-${listing.tokenId}`;
  };

  const isTicketBeingBought = (listing: ResaleListingInfo) => {
    return buyingTicket === getTicketId(listing);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Resale Marketplace</h1>
          <p className="text-muted-foreground">
            Buy verified NFT tickets from other users • {filteredTickets.length} tickets available
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, sellers..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Event Date</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="recent">Recently Listed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under-0.2">Under 0.2 ETH</SelectItem>
                <SelectItem value="0.2-0.5">0.2 - 0.5 ETH</SelectItem>
                <SelectItem value="over-0.5">Over 0.5 ETH</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={loadResaleListings} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Marketplace Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 font-medium">Secure Resale Marketplace</span>
            </div>
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMyTickets(!showMyTickets)}
              >
                <Wallet className="h-4 w-4 mr-2" />
                {showMyTickets ? 'Hide' : 'Show'} My Tickets
              </Button>
            )}
          </div>
          <p className="text-blue-700 text-sm mt-1">
            All tickets are verified NFTs. Transactions are secured by smart contracts on the blockchain.
          </p>
        </div>

        {/* User Tickets Section */}
        {isConnected && showMyTickets && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">My Tickets</h2>
                  <p className="text-muted-foreground text-sm">
                    Manage your owned tickets and list them for resale
                  </p>
                </div>
                <Button
                  onClick={loadUserTickets}
                  disabled={loadingUserTickets}
                  variant="outline"
                  size="sm"
                >
                  {loadingUserTickets ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUserTickets ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                  <p className="text-muted-foreground">Loading your tickets...</p>
                </div>
              ) : userTickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTickets.map((ticket) => (
                    <Card key={`${ticket.eventContract}-${ticket.tokenId}`} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">Ticket #{ticket.tokenId}</h3>
                              <p className="text-sm text-muted-foreground">
                                Type ID: {ticket.ticketInfo.ticketTypeId}
                              </p>
                            </div>
                            <Badge variant={ticket.ticketInfo.isUsed ? "secondary" : "default"}>
                              {ticket.ticketInfo.isUsed ? "Used" : "Active"}
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Original Price:</span>
                              <span>{ticket.ticketInfo.price} ETH</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Contract:</span>
                              <code className="text-xs">
                                {contractUtils.formatContractAddress(ticket.eventContract)}
                              </code>
                            </div>
                          </div>

                          {!ticket.ticketInfo.isUsed && (
                            <ListTicketModal
                              ticket={ticket}
                              dbTicketId={ticket.dbTicketId}
                              onListingCreated={() => {
                                loadResaleListings();
                                loadUserTickets();
                              }}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-medium mb-1">No Tickets Found</h3>
                  <p className="text-muted-foreground text-sm">
                    You don't own any tickets yet. Purchase some tickets to list them for resale.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Listings Section */}
        {isConnected && (
          <div className="mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMyListings(!showMyListings)}
              className="mb-4"
            >
              <Store className="h-4 w-4 mr-2" />
              {showMyListings ? 'Hide' : 'Show'} My Active Listings
            </Button>

            {showMyListings && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">My Active Listings</h2>
                      <p className="text-muted-foreground text-sm">
                        Manage your tickets currently listed for resale
                      </p>
                    </div>
                    <Button
                      onClick={loadUserListings}
                      disabled={loadingUserListings}
                      variant="outline"
                      size="sm"
                    >
                      {loadingUserListings ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingUserListings ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                      <p className="text-muted-foreground">Loading your listings...</p>
                    </div>
                  ) : userListings.length > 0 ? (
                    <div className="grid gap-4">
                      {userListings.map((listing) => (
                        <div
                          key={`${listing.ticketContract}-${listing.tokenId}`}
                          className="border rounded-lg p-4 flex justify-between items-center"
                        >
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-medium">{listing.eventName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Token ID: {listing.tokenId} • Listed on {new Date(listing.listingDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">{listing.price} ETH</p>
                                <p className="text-xs text-muted-foreground">
                                  Original: {listing.originalPrice} ETH
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">Active</Badge>
                              <span>•</span>
                              <span>Contract: {listing.ticketContract.slice(0, 10)}...</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelListing(listing)}
                              disabled={cancellingListing === listing.ticketContract + ':' + listing.tokenId}
                            >
                              {cancellingListing === listing.ticketContract + ':' + listing.tokenId ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Listing
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Store className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <h3 className="font-medium mb-1">No Active Listings</h3>
                      <p className="text-muted-foreground text-sm">
                        You don't have any tickets listed for resale yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">Error Loading Listings</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <Button 
              onClick={loadResaleListings} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading Resale Listings...</h3>
            <p className="text-muted-foreground">Fetching tickets from the blockchain</p>
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.map((listing) => (
              <Card key={getTicketId(listing)} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">NFT Ticket #{listing.tokenId}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-orange-500 text-white">
                      Resale
                    </Badge>
                    <Badge className="bg-green-500 text-white">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded-full">
                    <div className="text-sm font-semibold">{listing.price} ETH</div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="text-lg font-bold mb-1 line-clamp-1">
                      {listing.eventInfo?.name || 'Unknown Event'}
                    </h3>
                    <p className="text-sm opacity-90">Token ID: {listing.tokenId}</p>
                  </div>
                </div>
                
                <CardHeader className="pb-2">
                  <div className="space-y-2">
                    {listing.eventInfo && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(listing.eventInfo.eventDate)}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="line-clamp-1">Contract: {contractUtils.formatContractAddress(listing.ticketContract)}</span>
                    </div>
                    {listing.ticketInfo && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        Type ID: {listing.ticketInfo.ticketInfo.ticketTypeId}
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {listing.ticketInfo && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Original Price:</span>
                      <span className="line-through">{listing.ticketInfo.ticketInfo.price} ETH</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Seller:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {contractUtils.formatContractAddress(listing.seller)}
                    </code>
                  </div>
                  
                  {!isConnected ? (
                    <Button className="w-full" onClick={connectWallet}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Connect Wallet to Buy
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => handleBuyTicket(listing)}
                      disabled={isTicketBeingBought(listing)}
                    >
                      {isTicketBeingBought(listing) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Purchasing...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Buy Now - {listing.price} ETH
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {listings.length === 0 ? 'No tickets available for resale' : 'No tickets found'}
            </h3>
            <p className="text-muted-foreground">
              {listings.length === 0 
                ? 'Check back later for new listings or connect to the correct network'
                : 'Try adjusting your search criteria'
              }
            </p>
            {listings.length === 0 && (
              <Button onClick={loadResaleListings} className="mt-4">
                Refresh Listings
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResaleMarketplace;
