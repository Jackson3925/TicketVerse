// Web3 Types and Utilities
export interface WalletInfo {
  address: string;
  chainId: number;
  balance: string;
  ensName?: string;
}

export interface SupportedChain {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Supported blockchain networks
export const SUPPORTED_CHAINS: Record<number, SupportedChain> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18,
    },
  },
  31337: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: 'http://localhost',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

// Default chain (you can change this based on your deployment)
export const DEFAULT_CHAIN_ID = 11155111; // Sepolia testnet

export class WalletError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WalletError';
  }
}

// Utility functions for Web3
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatBalance = (balance: string, decimals = 4): string => {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';
  return num.toFixed(decimals);
};

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Check if MetaMask or other wallet is available
export const isWalletAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

// Get chain name by ID
export const getChainName = (chainId: number): string => {
  return SUPPORTED_CHAINS[chainId]?.name || `Unknown Chain (${chainId})`;
};

// Check if chain is supported
export const isSupportedChain = (chainId: number): boolean => {
  return chainId in SUPPORTED_CHAINS;
};

// Convert hex to decimal
export const hexToDecimal = (hex: string): number => {
  return parseInt(hex, 16);
};

// Convert decimal to hex
export const decimalToHex = (decimal: number): string => {
  return `0x${decimal.toString(16)}`;
};

// Format units (similar to ethers.formatEther)
export const formatEther = (wei: bigint): string => {
  const divisor = BigInt('1000000000000000000'); // 10^18
  const quotient = wei / divisor;
  const remainder = wei % divisor;
  
  if (remainder === BigInt(0)) {
    return quotient.toString();
  }
  
  const remainderStr = remainder.toString().padStart(18, '0').replace(/0+$/, '');
  return `${quotient}.${remainderStr}`;
};

// Parse units (similar to ethers.parseEther)
export const parseEther = (ether: string): bigint => {
  const [integer, decimal = ''] = ether.split('.');
  const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);
  return BigInt(integer + paddedDecimal);
};

export default {
  WalletError,
  formatAddress,
  formatBalance,
  isValidAddress,
  isWalletAvailable,
  getChainName,
  isSupportedChain,
  hexToDecimal,
  decimalToHex,
  formatEther,
  parseEther,
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN_ID,
};