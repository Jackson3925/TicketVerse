import { useState } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  ChevronDown
} from "lucide-react";
import { formatAddress, getChainName, isSupportedChain, SUPPORTED_CHAINS } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";

interface WalletConnectionProps {
  variant?: "button" | "card";
  showBalance?: boolean;
  showChainSwitcher?: boolean;
  size?: "sm" | "default" | "lg";
}

const WalletConnection = ({ 
  variant = "button", 
  showBalance = true, 
  showChainSwitcher = true,
  size = "default" 
}: WalletConnectionProps) => {
  const { 
    isConnected, 
    isConnecting, 
    wallet, 
    error, 
    connectWallet, 
    disconnectWallet, 
    switchChain,
    getBalance
  } = useWeb3();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const copyAddress = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const openInExplorer = () => {
    if (wallet?.address && wallet?.chainId) {
      const chain = SUPPORTED_CHAINS[wallet.chainId];
      if (chain) {
        window.open(`${chain.blockExplorer}/address/${wallet.address}`, '_blank');
      }
    }
  };

  const refreshBalance = async () => {
    if (!wallet) return;
    
    setIsRefreshing(true);
    try {
      await getBalance(wallet.address);
      toast({
        title: "Balance Updated",
        description: "Wallet balance has been refreshed",
      });
    } catch (err: any) {
      toast({
        title: "Refresh Failed",
        description: err.message || "Failed to refresh balance",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChainSwitch = async (chainId: number) => {
    try {
      await switchChain(chainId);
      toast({
        title: "Network Switched",
        description: `Switched to ${getChainName(chainId)}`,
      });
    } catch (err: any) {
      toast({
        title: "Switch Failed",
        description: err.message || "Failed to switch network",
        variant: "destructive",
      });
    }
  };

  // Button variant (for navigation)
  if (variant === "button") {
    if (!isConnected) {
      return (
        <Button 
          onClick={connectWallet} 
          disabled={isConnecting}
          variant="outline" 
          size={size}
          className="flex items-center space-x-2"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </span>
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">{formatAddress(wallet?.address || '')}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Wallet Connected</span>
              {isSupportedChain(wallet?.chainId || 0) ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Address:</span>
                <span className="text-xs font-mono">{formatAddress(wallet?.address || '')}</span>
              </div>
              
              {showBalance && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Balance:</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-mono">{wallet?.balance} ETH</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshBalance}
                      disabled={isRefreshing}
                      className="h-4 w-4 p-0"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Network:</span>
                <Badge variant={isSupportedChain(wallet?.chainId || 0) ? "default" : "destructive"}>
                  {getChainName(wallet?.chainId || 0)}
                </Badge>
              </div>
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={copyAddress}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={openInExplorer}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>
          
          {showChainSwitcher && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Switch Network</div>
              {Object.values(SUPPORTED_CHAINS).map((chain) => (
                <DropdownMenuItem 
                  key={chain.chainId}
                  onClick={() => handleChainSwitch(chain.chainId)}
                  disabled={wallet?.chainId === chain.chainId}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{chain.name}</span>
                    {wallet?.chainId === chain.chainId && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => disconnectWallet()} className="text-destructive">
            <Wallet className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Card variant (for detailed wallet info)
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5" />
          <span>Wallet Connection</span>
        </CardTitle>
        <CardDescription>
          {isConnected ? "Your wallet is connected" : "Connect your Web3 wallet to interact with the platform"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!isConnected ? (
          <Button onClick={connectWallet} disabled={isConnecting} className="w-full">
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Connected Address</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {formatAddress(wallet?.address || '')}
                </p>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" onClick={copyAddress}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={openInExplorer}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {showBalance && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Balance</p>
                  <p className="text-xs text-muted-foreground">
                    {wallet?.balance} ETH
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshBalance}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Network</p>
                <div className="flex items-center space-x-2">
                  <Badge variant={isSupportedChain(wallet?.chainId || 0) ? "default" : "destructive"}>
                    {getChainName(wallet?.chainId || 0)}
                  </Badge>
                  {!isSupportedChain(wallet?.chainId || 0) && (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {showChainSwitcher && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      Switch Network
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Switch Network</DialogTitle>
                      <DialogDescription>
                        Choose a network to switch to
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      {Object.values(SUPPORTED_CHAINS).map((chain) => (
                        <Button
                          key={chain.chainId}
                          variant={wallet?.chainId === chain.chainId ? "default" : "outline"}
                          onClick={() => handleChainSwitch(chain.chainId)}
                          disabled={wallet?.chainId === chain.chainId}
                          className="w-full justify-between"
                        >
                          <span>{chain.name}</span>
                          {wallet?.chainId === chain.chainId && (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              <Button variant="destructive" onClick={() => disconnectWallet()} className="flex-1">
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletConnection;