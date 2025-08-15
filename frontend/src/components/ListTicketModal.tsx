import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { contractService, NFTTicketInfo, contractUtils } from '@/lib/contracts';

interface ListTicketModalProps {
  ticket: NFTTicketInfo;
  onListingCreated: () => void;
  dbTicketId?: string; // Database ticket ID for creating resale listing
}

const ListTicketModal = ({ ticket, onListingCreated, dbTicketId }: ListTicketModalProps) => {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleListTicket = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price in ETH.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Check if transfers are enabled first
      const transferEnabled = await contractService.isTransferEnabled(ticket.eventContract);
      console.log('Transfer enabled:', transferEnabled);
      
      // Check event date
      const eventDate = await contractService.getEventDate(ticket.eventContract);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      console.log('Event date:', eventDate, 'Current:', currentTimestamp, 'Past event:', currentTimestamp > eventDate);
      
      // Check ownership
      const owner = await contractService.checkTicketOwnership(ticket.eventContract, ticket.tokenId);
      console.log('Ticket owner:', owner, 'User wallet:', await contractService.getConnectedAccount());
      
      if (!transferEnabled) {
        toast({
          title: "Transfers Disabled",
          description: "The event organizer has not enabled transfers for this ticket. Try enabling transfers first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const txHash = await contractService.listTicketForResale(
        ticket.eventContract,
        ticket.tokenId,
        price
      );

      // Also create database record
      if (dbTicketId) {
        try {
          console.log('Creating database listing for ticket:', dbTicketId, 'price:', price);
          const { resaleAPI } = await import('@/lib/api');
          const dbListing = await resaleAPI.createResaleListing({
            ticket_id: dbTicketId,
            resale_price: parseFloat(price),
            expires_at: undefined // No expiry
          });
          console.log('Database listing created:', dbListing);
        } catch (dbError) {
          console.error('Failed to create database listing:', dbError);
          toast({
            title: "Warning",
            description: "Blockchain listing succeeded but database sync failed. The listing is still valid.",
            variant: "destructive",
          });
        }
      } else {
        console.warn('No database ticket ID provided - database listing skipped');
      }

      toast({
        title: "Ticket Listed Successfully",
        description: `Your ticket is now available for resale. Transaction: ${txHash.slice(0, 10)}...`,
      });

      setOpen(false);
      setPrice('');
      onListingCreated();
    } catch (err: any) {
      console.error('Error listing ticket:', err);
      toast({
        title: "Listing Failed",
        description: contractUtils.formatContractError(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const originalPrice = parseFloat(ticket.ticketInfo.price);
  const currentPrice = parseFloat(price);
  const priceIncrease = currentPrice > originalPrice ? 
    ((currentPrice - originalPrice) / originalPrice * 100).toFixed(1) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          List for Resale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>List Ticket for Resale</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Ticket Info */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">NFT Ticket #{ticket.tokenId}</h3>
                <p className="text-sm text-muted-foreground">
                  Type ID: {ticket.ticketInfo.ticketTypeId}
                </p>
              </div>
              <Badge variant="secondary">
                Original: {ticket.ticketInfo.price} ETH
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Contract: {contractUtils.formatContractAddress(ticket.eventContract)}
            </p>
          </div>

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">Resale Price (ETH)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-10"
              />
            </div>
            {priceIncrease && (
              <p className="text-sm text-orange-600">
                +{priceIncrease}% above original price
              </p>
            )}
          </div>

          {/* Platform Fees Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-1">Platform Fees</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div className="flex justify-between">
                <span>Platform Fee (1%):</span>
                <span>{currentPrice ? (currentPrice * 0.01).toFixed(6) : '0.000'} ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Royalty Fee (2%):</span>
                <span>{currentPrice ? (currentPrice * 0.02).toFixed(6) : '0.000'} ETH</span>
              </div>
              <div className="flex justify-between border-t border-blue-300 pt-1">
                <span className="font-medium">You'll receive:</span>
                <span className="font-medium">
                  {currentPrice ? (currentPrice * 0.97).toFixed(6) : '0.000'} ETH
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleListTicket}
              disabled={loading || !price || parseFloat(price) <= 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Listing...
                </>
              ) : (
                'List Ticket'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListTicketModal;