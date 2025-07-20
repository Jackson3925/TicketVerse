import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  WalletInfo, 
  WalletError, 
  isWalletAvailable, 
  formatEther, 
  hexToDecimal,
  isSupportedChain,
  DEFAULT_CHAIN_ID,
  SUPPORTED_CHAINS 
} from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  wallet: WalletInfo | null;
  error: string | null;
  
  // Connection methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (chainId: number) => Promise<void>;
  
  // Utility methods
  sendTransaction: (to: string, value: string, data?: string) => Promise<string>;
  getBalance: (address?: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { signInWithWallet, isAuthenticated } = useAuth();

  // Set up event listeners only (don't auto-check connection)
  useEffect(() => {
    setupEventListeners();
    setupAuthEventListeners();
    
    return () => {
      removeEventListeners();
      removeAuthEventListeners();
    };
  }, []);

  const checkConnection = async () => {
    if (!isWalletAvailable()) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await updateWalletInfo(accounts[0]);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Failed to check wallet connection:', err);
    }
  };

  const setupEventListeners = () => {
    if (!isWalletAvailable()) return;

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);
  };

  const removeEventListeners = () => {
    if (!isWalletAvailable()) return;

    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
    window.ethereum.removeListener('disconnect', handleDisconnect);
  };

  const setupAuthEventListeners = () => {
    window.addEventListener('auth:signout', handleAuthSignOut);
  };

  const removeAuthEventListeners = () => {
    window.removeEventListener('auth:signout', handleAuthSignOut);
  };

  const handleAuthSignOut = async () => {
    // Automatically disconnect wallet when user signs out
    if (isConnected) {
      await disconnectWallet();
    }
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      // Check if user is already authenticated with a different wallet
      if (isAuthenticated) {
        const currentUser = await auth.getCurrentUser();
        const userWalletAddress = currentUser?.buyerProfile?.wallet_address || currentUser?.sellerProfile?.wallet_address;
        
        // If user has a registered wallet address and it doesn't match the new one
        if (userWalletAddress && userWalletAddress.toLowerCase() !== accounts[0].toLowerCase()) {
          console.log('Wallet mismatch detected:', {
            registered: userWalletAddress,
            attempting: accounts[0]
          });
          
          toast({
            title: "Wallet Mismatch",
            description: "You've switched to a different wallet. Please use your registered wallet address or sign out first.",
            variant: "destructive",
          });
          
          // Clear the wallet state immediately without updating database
          setIsConnected(false);
          setWallet(null);
          setError("Wallet mismatch - please connect with your registered wallet");
          return;
        }
      }
      
      await updateWalletInfo(accounts[0]);
      
      // Update wallet information in database when account changes
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        });
        const formattedBalance = formatEther(BigInt(balance));
        await updateWalletInDatabase(accounts[0], formattedBalance);
        
        // Attempt auto-login with new wallet
        await attemptWalletAuth(accounts[0]);
      } catch (error) {
        console.error('Failed to update wallet info in database on account change:', error);
      }
    }
  };

  const handleChainChanged = (chainId: string) => {
    // Reload the page to reset state when chain changes
    window.location.reload();
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  const updateWalletInfo = async (address: string) => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });

      const walletInfo: WalletInfo = {
        address,
        chainId: hexToDecimal(chainId),
        balance: formatEther(BigInt(balance)),
      };

      // Try to get ENS name (optional)
      try {
        // This would require additional setup with ENS resolver
        // For now, we'll skip ENS lookup
        walletInfo.ensName = undefined;
      } catch (ensError) {
        // ENS lookup failed, ignore
      }

      setWallet(walletInfo);
      setError(null);
    } catch (err) {
      throw new WalletError('Failed to get wallet information');
    }
  };

  const updateWalletInDatabase = async (address: string, balance: string) => {
    try {
      const user = await auth.getCurrentUser();
      
      if (!user || !user.userProfile) {
        console.log('No authenticated user found, skipping database update');
        return;
      }

      const userType = user.userProfile.user_type;
      const balanceNumber = parseFloat(balance);
      
      if (userType === 'buyer') {
        await auth.updateBuyer({
          wallet_address: address,
          wallet_balance: balanceNumber,
          wallet_verified: true,
        });
      } else if (userType === 'seller') {
        await auth.updateSeller({
          wallet_address: address,
          wallet_balance: balanceNumber,
          wallet_verified: true,
        });
      }

      console.log('Wallet information updated in database');
    } catch (error) {
      console.error('Failed to update wallet information in database:', error);
      // Don't throw error to prevent breaking wallet connection
    }
  };

  const attemptWalletAuth = async (address: string) => {
    try {
      // Only attempt auto-login if not already authenticated
      if (!isAuthenticated) {
        await signInWithWallet(address);
        console.log('Auto-login successful with wallet:', address);
        toast({
          title: "Auto-Login Successful",
          description: `Logged in with wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      }
    } catch (error: any) {
      // Handle wallet mismatch error
      if (error.message?.includes('Wallet address mismatch')) {
        toast({
          title: "Wallet Mismatch",
          description: "This wallet doesn't match your registered wallet address. Please use the correct wallet or register a new account.",
          variant: "destructive",
        });
        // Disconnect the mismatched wallet
        await disconnectWalletOnly();
        return;
      }
      
      // Silently fail if wallet is not registered - user can manually register
      if (!error.message?.includes('Wallet address not found')) {
        console.error('Auto-login failed:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!isWalletAvailable()) {
      const errorMsg = 'No Web3 wallet detected. Please install MetaMask or another Web3 wallet.';
      setError(errorMsg);
      toast({
        title: "Wallet Not Found",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple concurrent connection attempts
    if (isConnecting) {
      console.log('Wallet connection already in progress');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access with timeout to handle hanging connections
      const accounts = await Promise.race([
        window.ethereum.request({
          method: 'eth_requestAccounts',
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 30000)
        )
      ]) as string[];

      if (accounts.length === 0) {
        throw new WalletError('No accounts found');
      }

      // Check if user is already authenticated with a different wallet before connecting
      if (isAuthenticated) {
        const currentUser = await auth.getCurrentUser();
        const userWalletAddress = currentUser?.buyerProfile?.wallet_address || currentUser?.sellerProfile?.wallet_address;
        
        // If user has a registered wallet address and it doesn't match the connecting one
        if (userWalletAddress && userWalletAddress.toLowerCase() !== accounts[0].toLowerCase()) {
          throw new WalletError(`Wallet mismatch: You're trying to connect ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)} but your account is registered with ${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}. Please connect with the correct wallet or sign out first.`);
        }
      }

      await updateWalletInfo(accounts[0]);
      
      // Check if we're on a supported chain
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = hexToDecimal(chainId);
      
      if (!isSupportedChain(currentChainId)) {
        toast({
          title: "Unsupported Network",
          description: `Please switch to a supported network. Current: ${currentChainId}`,
          variant: "destructive",
        });
        // Optionally auto-switch to default chain
        await switchChain(DEFAULT_CHAIN_ID);
      }

      setIsConnected(true);
      
      // Update wallet information in database
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });
      const formattedBalance = formatEther(BigInt(balance));
      await updateWalletInDatabase(accounts[0], formattedBalance);
      
      // Attempt auto-login with wallet
      await attemptWalletAuth(accounts[0]);
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
    } catch (err: any) {
      console.log('Wallet connection error:', err);
      
      // Handle user rejection (code 4001) or rejection message gracefully
      if (err.code === 4001 || err.message?.includes('User rejected') || err.message?.includes('rejected the request')) {
        // User rejected the connection request - don't show error
        setError(null);
        console.log('User cancelled wallet connection');
      } else if (err.message === 'Connection timeout') {
        // Handle connection timeout
        setError('Connection timeout. Please try again.');
        toast({
          title: "Connection Timeout",
          description: "Wallet connection timed out. Please try again.",
          variant: "destructive",
        });
      } else {
        const errorMsg = err.message || 'Failed to connect wallet';
        setError(errorMsg);
        toast({
          title: "Connection Failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } finally {
      // Always reset loading state regardless of success/failure/cancellation
      setIsConnecting(false);
    }
  };

  const disconnectWalletOnly = async () => {
    setIsConnected(false);
    setWallet(null);
    setError(null);
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  const disconnectWallet = async () => {
    setIsConnected(false);
    setWallet(null);
    setError(null);
    
    // Clear wallet information from database
    try {
      const user = await auth.getCurrentUser();
      
      if (user && user.userProfile) {
        const userType = user.userProfile.user_type;
        
        if (userType === 'buyer') {
          await auth.updateBuyer({
            wallet_address: undefined,
            wallet_balance: 0,
            wallet_verified: false,
          });
        } else if (userType === 'seller') {
          await auth.updateSeller({
            wallet_address: undefined,
            wallet_balance: 0,
            wallet_verified: false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to clear wallet information from database:', error);
    }
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  const switchChain = async (chainId: number) => {
    if (!isWalletAvailable() || !isConnected) {
      throw new WalletError('Wallet not connected');
    }

    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) {
      throw new WalletError('Unsupported chain ID');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: chain.name,
              rpcUrls: [chain.rpcUrl],
              nativeCurrency: chain.nativeCurrency,
              blockExplorerUrls: [chain.blockExplorer],
            }],
          });
        } catch (addError) {
          throw new WalletError('Failed to add network');
        }
      } else {
        throw new WalletError('Failed to switch network');
      }
    }
  };

  const sendTransaction = async (to: string, value: string, data = '0x'): Promise<string> => {
    if (!isWalletAvailable() || !wallet) {
      throw new WalletError('Wallet not connected');
    }

    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to,
          value: `0x${BigInt(value).toString(16)}`,
          data,
        }],
      });

      return txHash;
    } catch (err: any) {
      throw new WalletError(err.message || 'Transaction failed');
    }
  };

  const getBalance = async (address?: string): Promise<string> => {
    if (!isWalletAvailable()) {
      throw new WalletError('Wallet not available');
    }

    const targetAddress = address || wallet?.address;
    if (!targetAddress) {
      throw new WalletError('No address provided');
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [targetAddress, 'latest'],
      });

      return formatEther(BigInt(balance));
    } catch (err: any) {
      throw new WalletError('Failed to get balance');
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!isWalletAvailable() || !wallet) {
      throw new WalletError('Wallet not connected');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, wallet.address],
      });

      return signature;
    } catch (err: any) {
      throw new WalletError(err.message || 'Failed to sign message');
    }
  };

  const value = {
    isConnected,
    isConnecting,
    wallet,
    error,
    connectWallet,
    disconnectWallet,
    switchChain,
    sendTransaction,
    getBalance,
    signMessage,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Global ethereum interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}