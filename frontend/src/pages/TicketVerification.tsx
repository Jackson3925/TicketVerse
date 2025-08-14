import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import QRScanner from "@/components/QRScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Hash,
  RefreshCw,
  Search
} from "lucide-react";
import { contractService } from "@/lib/contracts";
import { useAuth } from "@/hooks/useAuth";
import type { VerificationResult } from "@/lib/qrVerification";

interface VerificationStats {
  totalScanned: number;
  validTickets: number;
  invalidTickets: number;
  duplicateAttempts: number;
}

const TicketVerification: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VerificationStats>({
    totalScanned: 0,
    validTickets: 0,
    invalidTickets: 0,
    duplicateAttempts: 0
  });
  const [recentVerifications, setRecentVerifications] = useState<Array<{
    timestamp: Date;
    result: VerificationResult;
    tokenId?: number;
  }>>([]);
  const [searchTokenId, setSearchTokenId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  useEffect(() => {
    if (eventId) {
      loadEventInfo();
    }
  }, [eventId]);

  const loadEventInfo = async () => {
    try {
      setLoading(true);
      const contractEventId = parseInt(eventId!);
      const event = await contractService.getEvent(contractEventId);
      setEventInfo(event);
    } catch (error) {
      console.error('Failed to load event info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketVerified = (result: VerificationResult) => {
    // Update stats
    setStats(prev => ({
      ...prev,
      totalScanned: prev.totalScanned + 1,
      validTickets: result.isValid ? prev.validTickets + 1 : prev.validTickets,
      invalidTickets: result.isValid ? prev.invalidTickets : prev.invalidTickets + 1,
      duplicateAttempts: result.error?.includes('already used') ? prev.duplicateAttempts + 1 : prev.duplicateAttempts
    }));

    // Add to recent verifications
    setRecentVerifications(prev => [
      {
        timestamp: new Date(),
        result,
        tokenId: result.tokenId
      },
      ...prev.slice(0, 9) // Keep only last 10 verifications
    ]);
  };

  const handleManualTokenSearch = async () => {
    if (!searchTokenId.trim() || !eventInfo) return;

    try {
      const tokenId = parseInt(searchTokenId);
      const isValid = await contractService.isTicketValid(eventInfo.ticketContract, tokenId);
      const owner = await contractService.checkTicketOwnership(eventInfo.ticketContract, tokenId);
      
      setSearchResult({
        tokenId,
        isValid,
        owner,
        contractAddress: eventInfo.ticketContract
      });
    } catch (error: any) {
      setSearchResult({
        tokenId: parseInt(searchTokenId),
        isValid: false,
        error: error.message || 'Token not found'
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading event information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Ticket Verification</h1>
              <p className="text-muted-foreground">
                {eventInfo ? eventInfo.name : `Event #${eventId}`}
              </p>
            </div>
          </div>

          {eventInfo && (
            <Alert>
              <AlertDescription>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Event Date</div>
                    <div>{new Date(eventInfo.eventDate * 1000).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="font-medium">Contract</div>
                    <div className="font-mono">{formatAddress(eventInfo.ticketContract)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Total Sold</div>
                    <div>{eventInfo.totalTicketsSold} tickets</div>
                  </div>
                  <div>
                    <div className="font-medium">Status</div>
                    <Badge variant={eventInfo.isActive ? "default" : "secondary"}>
                      {eventInfo.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Scanner */}
          <div className="lg:col-span-2">
            <QRScanner 
              onTicketVerified={handleTicketVerified}
              eventId={eventId}
            />
          </div>

          {/* Stats and Tools */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Verification Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.validTickets}</div>
                    <div className="text-sm text-green-600">Valid</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.invalidTickets}</div>
                    <div className="text-sm text-red-600">Invalid</div>
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Total Scanned: {stats.totalScanned}
                  {stats.duplicateAttempts > 0 && (
                    <div className="text-orange-600">
                      Duplicates: {stats.duplicateAttempts}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Manual Token Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Manual Token Lookup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Token ID..."
                    value={searchTokenId}
                    onChange={(e) => setSearchTokenId(e.target.value)}
                    type="number"
                  />
                  <Button onClick={handleManualTokenSearch}>
                    <Hash className="h-4 w-4" />
                  </Button>
                </div>
                
                {searchResult && (
                  <Alert className={searchResult.isValid ? "border-green-500" : "border-red-500"}>
                    <AlertDescription>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium">
                          Token #{searchResult.tokenId}: {searchResult.isValid ? "✅ Valid" : "❌ Invalid"}
                        </div>
                        {searchResult.owner && (
                          <div>Owner: {formatAddress(searchResult.owner)}</div>
                        )}
                        {searchResult.error && (
                          <div className="text-red-600">{searchResult.error}</div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Recent Verifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Verifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentVerifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No verifications yet
                    </p>
                  ) : (
                    recentVerifications.map((verification, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          {verification.result.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-mono">
                            {verification.tokenId ? `#${verification.tokenId}` : 'Invalid'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(verification.timestamp)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketVerification;