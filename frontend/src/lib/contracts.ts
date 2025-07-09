// Smart Contract Integration for Concert Platform
import { parseEther, formatEther } from '@/lib/web3';

// Contract ABIs - These should be imported from your compiled contracts
export const TICKET_FACTORY_ABI = [
  {
    "inputs": [],
    "name": "createEvent",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "ticketContract", "type": "address"},
      {"internalType": "uint256", "name": "ticketType", "type": "uint256"},
      {"internalType": "address", "name": "to", "type": "address"}
    ],
    "name": "mintTicket",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "events",
    "outputs": [
      {"internalType": "address", "name": "ticketContract", "type": "address"},
      {"internalType": "address", "name": "organizer", "type": "address"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "eventDate", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const TICKET_NFT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Contract addresses (update these with your deployed contract addresses)
export const CONTRACT_ADDRESSES = {
  TICKET_FACTORY: "0x...", // Your TicketFactory contract address
  // Add other contract addresses as needed
};

// Contract interaction interfaces
export interface EventData {
  ticketContract: string;
  organizer: string;
  name: string;
  eventDate: number;
  isActive: boolean;
}

export interface TicketPurchaseParams {
  eventId: number;
  ticketType: number;
  quantity: number;
  pricePerTicket: string; // in ETH
}

export interface TicketInfo {
  tokenId: number;
  owner: string;
  tokenURI: string;
  eventContract: string;
}

// Contract interaction class
export class ContractService {
  private ethereum: any;

  constructor() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.ethereum = window.ethereum;
    }
  }

  // Helper method to make contract calls
  private async makeContractCall(
    contractAddress: string,
    abi: any[],
    method: string,
    params: any[] = [],
    value?: string
  ): Promise<any> {
    if (!this.ethereum) {
      throw new Error('No Web3 provider found');
    }

    try {
      // For read operations, use eth_call
      if (!value && ['balanceOf', 'ownerOf', 'tokenURI', 'events'].includes(method)) {
        const data = this.encodeFunction(abi, method, params);
        const result = await this.ethereum.request({
          method: 'eth_call',
          params: [{
            to: contractAddress,
            data: data
          }, 'latest']
        });
        return this.decodeResult(abi, method, result);
      }

      // For write operations, use eth_sendTransaction
      const accounts = await this.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        throw new Error('No connected accounts');
      }

      const data = this.encodeFunction(abi, method, params);
      const txParams: any = {
        from: accounts[0],
        to: contractAddress,
        data: data
      };

      if (value) {
        txParams.value = `0x${BigInt(parseEther(value)).toString(16)}`;
      }

      const txHash = await this.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      return txHash;
    } catch (error: any) {
      throw new Error(`Contract call failed: ${error.message}`);
    }
  }

  // Encode function call data (simplified - in production use ethers.js or web3.js)
  private encodeFunction(abi: any[], method: string, params: any[]): string {
    // This is a simplified implementation
    // In production, use proper ABI encoding from ethers.js or web3.js
    const functionAbi = abi.find(item => item.name === method);
    if (!functionAbi) {
      throw new Error(`Function ${method} not found in ABI`);
    }
    
    // For demonstration purposes, return a placeholder
    // In real implementation, you'd use proper ABI encoding
    return '0x' + method.slice(0, 8).padEnd(8, '0').repeat(8);
  }

  // Decode result data (simplified - in production use ethers.js or web3.js)
  private decodeResult(abi: any[], method: string, result: string): any {
    // This is a simplified implementation
    // In production, use proper ABI decoding from ethers.js or web3.js
    return result;
  }

  // Create a new event
  async createEvent(
    eventName: string,
    eventDate: number,
    ticketTypes: { name: string; price: string; supply: number }[]
  ): Promise<string> {
    return await this.makeContractCall(
      CONTRACT_ADDRESSES.TICKET_FACTORY,
      TICKET_FACTORY_ABI,
      'createEvent',
      [eventName, eventDate, ticketTypes]
    );
  }

  // Purchase tickets
  async purchaseTickets(params: TicketPurchaseParams): Promise<string> {
    const totalPrice = (parseFloat(params.pricePerTicket) * params.quantity).toString();
    
    return await this.makeContractCall(
      CONTRACT_ADDRESSES.TICKET_FACTORY,
      TICKET_FACTORY_ABI,
      'mintTicket',
      [params.eventId, params.ticketType, params.quantity],
      totalPrice
    );
  }

  // Get event information
  async getEvent(eventId: number): Promise<EventData> {
    const result = await this.makeContractCall(
      CONTRACT_ADDRESSES.TICKET_FACTORY,
      TICKET_FACTORY_ABI,
      'events',
      [eventId]
    );

    // Parse the result into EventData structure
    // This is simplified - actual implementation would depend on your contract structure
    return {
      ticketContract: result[0],
      organizer: result[1],
      name: result[2],
      eventDate: parseInt(result[3]),
      isActive: result[4]
    };
  }

  // Get user's tickets for a specific event
  async getUserTickets(userAddress: string, ticketContractAddress: string): Promise<TicketInfo[]> {
    const balance = await this.makeContractCall(
      ticketContractAddress,
      TICKET_NFT_ABI,
      'balanceOf',
      [userAddress]
    );

    const tickets: TicketInfo[] = [];
    
    // This is simplified - you'd need to implement proper token enumeration
    // or maintain an off-chain index of token IDs
    for (let i = 0; i < parseInt(balance); i++) {
      // Get token ID by index (requires additional contract methods)
      // const tokenId = await this.getTokenByOwnerIndex(userAddress, i);
      
      // For demo purposes, assume sequential token IDs
      const tokenId = i + 1;
      
      const tokenURI = await this.makeContractCall(
        ticketContractAddress,
        TICKET_NFT_ABI,
        'tokenURI',
        [tokenId]
      );

      tickets.push({
        tokenId,
        owner: userAddress,
        tokenURI,
        eventContract: ticketContractAddress
      });
    }

    return tickets;
  }

  // Transfer ticket to another address
  async transferTicket(
    ticketContractAddress: string,
    fromAddress: string,
    toAddress: string,
    tokenId: number
  ): Promise<string> {
    return await this.makeContractCall(
      ticketContractAddress,
      TICKET_NFT_ABI,
      'transferFrom',
      [fromAddress, toAddress, tokenId]
    );
  }

  // Check if user owns a specific ticket
  async checkTicketOwnership(ticketContractAddress: string, tokenId: number): Promise<string> {
    return await this.makeContractCall(
      ticketContractAddress,
      TICKET_NFT_ABI,
      'ownerOf',
      [tokenId]
    );
  }
}

// Create singleton instance
export const contractService = new ContractService();

// Utility functions for contract interactions
export const contractUtils = {
  // Calculate total price for ticket purchase
  calculateTotalPrice: (pricePerTicket: string, quantity: number): string => {
    return (parseFloat(pricePerTicket) * quantity).toString();
  },

  // Format contract address for display
  formatContractAddress: (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  // Validate Ethereum address
  isValidAddress: (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  // Convert timestamp to date
  timestampToDate: (timestamp: number): Date => {
    return new Date(timestamp * 1000);
  },

  // Convert date to timestamp
  dateToTimestamp: (date: Date): number => {
    return Math.floor(date.getTime() / 1000);
  }
};

export default {
  ContractService,
  contractService,
  contractUtils,
  TICKET_FACTORY_ABI,
  TICKET_NFT_ABI,
  CONTRACT_ADDRESSES
};