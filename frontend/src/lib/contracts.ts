// Smart Contract Integration for Concert Platform
import { ethers } from 'ethers';
import { parseEther, formatEther } from '@/lib/web3';

// Import ABI files
import TicketFactoryABI from '@/abi/TicketFactory.json';
import TicketNFTABI from '@/abi/TicketNFT.json';
import ResaleMarketplaceABI from '@/abi/ResaleMarketplace.json';

// Export the imported ABIs
export const TICKET_FACTORY_ABI = TicketFactoryABI;
export const TICKET_NFT_ABI = TicketNFTABI;
export const RESALE_MARKETPLACE_ABI = ResaleMarketplaceABI;

// Contract addresses (loaded from environment variables)
export const CONTRACT_ADDRESSES = {
  TICKET_FACTORY: import.meta.env.VITE_TICKET_FACTORY_ADDRESS,
  TICKET_NFT_IMPLEMENTATION: import.meta.env.VITE_TICKET_NFT_IMPLEMENTATION_ADDRESS,
  RESALE_MARKETPLACE: import.meta.env.VITE_RESALE_MARKETPLACE_ADDRESS,
  REVENUE_SHARING: import.meta.env.VITE_REVENUE_SHARING_ADDRESS,
};

// Debug: Log contract addresses on load
console.log('Contract addresses loaded:', {
  TICKET_FACTORY: CONTRACT_ADDRESSES.TICKET_FACTORY,
  TICKET_NFT_IMPLEMENTATION: CONTRACT_ADDRESSES.TICKET_NFT_IMPLEMENTATION,
  RESALE_MARKETPLACE: CONTRACT_ADDRESSES.RESALE_MARKETPLACE,
  REVENUE_SHARING: CONTRACT_ADDRESSES.REVENUE_SHARING,
});


// Contract interaction interfaces
export interface EventData {
  id: number;
  ticketContract: string;
  organizer: string;
  name: string;
  description: string;
  eventDate: number;
  createdAt: number;
  isActive: boolean;
  totalTicketsSold: number;
  totalRevenue: string; // in ETH
}

export interface TicketType {
  name: string;
  price: string; // in ETH
  maxSupply: number;
  currentSupply: number;
  metadataURI: string;
}

export interface CreateEventParams {
  name: string;
  description: string;
  eventDate: number;
  organizer: string;
  ticketTypes: TicketType[];
}

export interface ContractEventResult {
  contractEventId: number;
  ticketContractAddress: string;
  transactionHash: string;
}

export interface TicketPurchaseParams {
  eventId: number;
  ticketTypeId: number;
  recipient: string;
  priceInEth: string;
}

export interface PurchaseTicketsParams {
  eventId: number;
  ticketType: number;
  quantity: number;
  pricePerTicket: string;
}

export interface TicketInfo {
  ticketTypeId: number;
  price: string; // in ETH
  mintTimestamp: number;
  isValidated: boolean;
  isUsed: boolean;
}

export interface NFTTicketInfo {
  tokenId: number;
  owner: string;
  tokenURI: string;
  eventContract: string;
  ticketInfo: TicketInfo;
  dbTicketId?: string; // Database ticket ID for creating resale listings
}

export interface ResaleListingInfo {
  ticketContract: string;
  tokenId: number;
  seller: string;
  price: string; // in ETH
  eventInfo?: EventData;
  ticketInfo?: NFTTicketInfo;
}

// Contract interaction class
export class ContractService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor() {
    // Don't auto-initialize provider - wait for explicit initialization
  }

  private async initializeProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        console.log('Web3 provider initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize Web3 provider:', error);
        this.provider = null;
      }
    } else {
      console.warn('No window.ethereum found - Web3 provider not available');
    }
  }

  // Helper method to ensure provider is initialized
  private async ensureProvider(): Promise<void> {
    if (!this.provider) {
      await this.initializeProvider();
      if (!this.provider) {
        throw new Error('No Web3 provider found. Please connect your wallet.');
      }
    }
  }

  private async getSigner(): Promise<ethers.JsonRpcSigner> {
    await this.ensureProvider();
    
    if (!this.signer) {
      this.signer = await this.provider!.getSigner();
    }
    
    return this.signer;
  }

  // Get connected account
  async getConnectedAccount(): Promise<string> {
    const signer = await this.getSigner();
    return await signer.getAddress();
  }

  // Validate wallet address matches expected user
  private async validateWalletAddress(expectedAddress?: string): Promise<void> {
    const connectedAddress = await this.getConnectedAccount();
    
    if (expectedAddress && expectedAddress.toLowerCase() !== connectedAddress.toLowerCase()) {
      throw new Error(`Wallet mismatch: Expected ${expectedAddress.slice(0, 6)}...${expectedAddress.slice(-4)} but connected to ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`);
    }
  }

  // Helper method to validate network
  private async validateNetwork(): Promise<void> {
    await this.ensureProvider();

    try {
      const network = await this.provider!.getNetwork();
      const expectedChainId = parseInt(import.meta.env.VITE_CHAIN_ID) || 31337;
      
      if (Number(network.chainId) !== expectedChainId) {
        throw new Error(`Wrong network. Expected chain ID ${expectedChainId}, but connected to ${network.chainId}. Please switch to the correct network in your wallet.`);
      }

      // Check if wallet is actually connected (has accounts)
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
    } catch (error: any) {
      if (error.message.includes('Wrong network') || error.message.includes('Wallet not connected')) {
        throw error;
      }
      throw new Error('Failed to validate network connection. Please check your wallet connection.');
    }
  }

  // Helper method to get contract instance
  private async getContract(contractAddress: string, abi: any[], needsSigner: boolean = false): Promise<ethers.Contract> {
    await this.ensureProvider();

    // Validate network before contract interaction
    await this.validateNetwork();

    try {
      if (needsSigner) {
        const signer = await this.getSigner();
        return new ethers.Contract(contractAddress, abi, signer);
      } else {
        return new ethers.Contract(contractAddress, abi, this.provider!);
      }
    } catch (error: any) {
      console.error(`Failed to create contract instance for ${contractAddress}:`, error);
      throw new Error(`Failed to create contract instance: ${error.message}`);
    }
  }


  // Create a new event on the blockchain
  async createContractEvent(params: CreateEventParams): Promise<ContractEventResult> {
    const contract = await this.getContract(CONTRACT_ADDRESSES.TICKET_FACTORY, TICKET_FACTORY_ABI, true);
    
    // Get the creation fee from the contract
    // const creationFee = await contract.EVENT_CREATION_FEE();
    const creationFee = ethers.parseEther("0.01");
    
    const ticketTypesForContract = params.ticketTypes.map(type => ({
      name: type.name,
      price: ethers.parseEther(contractUtils.formatPriceForContract(type.price)),
      maxSupply: type.maxSupply,
      currentSupply: 0,
      metadataURI: type.metadataURI
    }));

    const tx = await contract.createEvent(
      params.name,
      params.description,
      params.eventDate,
      params.organizer,
      ticketTypesForContract,
      { value: creationFee } // Include the creation fee
    );
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Try to get the event counter (latest event ID)
    try {
      const eventCounter = await contract.eventCounter();
      const contractEventId = Number(eventCounter);
      
      // Get the specific event data directly from contract (raw data to avoid formatting issues)
      const rawEventData = await contract.getEvent(contractEventId);
      const ticketContractAddress = rawEventData.ticketContract;
      
      return {
        contractEventId,
        ticketContractAddress,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Failed to read from contract:', error);
      
      // Fallback: try to get event ID from transaction logs
      try {
        const eventCounter = await contract.eventCounter();
        const contractEventId = Number(eventCounter);
        
        return {
          contractEventId,
          ticketContractAddress: '', // Will be empty, but event creation succeeded
          transactionHash: tx.hash
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw new Error('Event created successfully but unable to retrieve event ID. Please check your contract deployment.');
      }
    }
  }

  // Legacy method for backward compatibility
  async createEvent(params: CreateEventParams): Promise<string> {
    const result = await this.createContractEvent(params);
    return result.transactionHash;
  }

  // Purchase tickets with validation - returns token ID
  async purchaseTicket(params: TicketPurchaseParams): Promise<{ tokenId: number; transactionHash: string }> {
    // Validate contract event first
    const eventStatus = await this.getContractEventStatus(params.eventId);
    if (!eventStatus.exists) {
      throw new Error('Contract event not found. Please check the event ID.');
    }
    if (!eventStatus.isActive) {
      throw new Error('Event is not active for ticket sales.');
    }

    const contract = await this.getContract(CONTRACT_ADDRESSES.TICKET_FACTORY, TICKET_FACTORY_ABI, true);
    
    // Validate parameters
    if (!params.recipient || !ethers.isAddress(params.recipient)) {
      throw new Error('Invalid recipient address.');
    }
    if (params.ticketTypeId < 0) {
      throw new Error('Invalid ticket type ID.');
    }
    if (parseFloat(params.priceInEth) <= 0) {
      throw new Error('Invalid ticket price.');
    }

    try {
      const tx = await contract.mintTicket(
        params.eventId,
        params.ticketTypeId,
        params.recipient,
        { value: ethers.parseEther(contractUtils.formatPriceForContract(params.priceInEth)) }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Extract token ID from the TicketMinted event
      let tokenId: number | null = null;
      
      // Look for TicketMinted event from either TicketFactory or TicketNFT contract
      for (const log of receipt.logs) {
        try {
          // Try parsing with TicketFactory ABI first
          const factoryInterface = new ethers.Interface(TICKET_FACTORY_ABI);
          const parsedLog = factoryInterface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog && parsedLog.name === 'TicketMinted') {
            tokenId = Number(parsedLog.args.tokenId);
            break;
          }
        } catch (error) {
          // Try parsing with TicketNFT ABI if TicketFactory fails
          try {
            const nftInterface = new ethers.Interface(TICKET_NFT_ABI);
            const parsedLog = nftInterface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            if (parsedLog && parsedLog.name === 'TicketMinted') {
              tokenId = Number(parsedLog.args.tokenId);
              break;
            }
          } catch (innerError) {
            // Continue to next log
            continue;
          }
        }
      }
      
      if (tokenId === null) {
        throw new Error('Could not extract token ID from transaction receipt');
      }
      
      return {
        tokenId,
        transactionHash: tx.hash
      };
    } catch (error: any) {
      // Enhanced error handling
      if (error.message?.includes('Type sold out')) {
        throw new Error('This ticket type is sold out.');
      }
      if (error.message?.includes('Insufficient payment')) {
        throw new Error('Insufficient payment amount.');
      }
      if (error.message?.includes('Event is not active')) {
        throw new Error('Event is not currently active for ticket sales.');
      }
      if (error.message?.includes('User denied transaction')) {
        throw new Error('Transaction was cancelled by user.');
      }
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient ETH balance for this transaction.');
      }
      
      // Re-throw original error if not handled
      throw error;
    }
  }

  // Purchase multiple tickets - supports quantity
  async purchaseTickets(params: PurchaseTicketsParams): Promise<string> {
    const results = [];
    const connectedAccount = await this.getConnectedAccount();
    
    for (let i = 0; i < params.quantity; i++) {
      const purchaseParams: TicketPurchaseParams = {
        eventId: params.eventId,
        ticketTypeId: params.ticketType,
        recipient: connectedAccount,
        priceInEth: params.pricePerTicket
      };
      
      // Validate wallet address before each purchase
      await this.validateWalletAddress(connectedAccount);
      
      const result = await this.purchaseTicket(purchaseParams);
      results.push(result);
    }
    
    // Return the last transaction hash
    return results[results.length - 1].transactionHash;
  }

  // Get event information
  async getEvent(eventId: number): Promise<EventData> {
    try {
      // Ensure provider is initialized
      await this.ensureProvider();

      // Check if contract is deployed at the address
      const code = await this.provider!.getCode(CONTRACT_ADDRESSES.TICKET_FACTORY);
      if (code === '0x') {
        throw new Error(`No contract deployed at address ${CONTRACT_ADDRESSES.TICKET_FACTORY}`);
      }

      const contract = await this.getContract(CONTRACT_ADDRESSES.TICKET_FACTORY, TICKET_FACTORY_ABI, false);
      
      // Check if the method exists before calling it
      if (typeof contract.getEvent !== 'function') {
        throw new Error('getEvent method not found on contract');
      }
      
      // First, try a simple call to check if the contract is responsive
      try {
        const eventCounter = await contract.eventCounter();
        console.log(`Contract eventCounter: ${eventCounter}`);
        
        if (eventId > Number(eventCounter)) {
          throw new Error(`Event ${eventId} does not exist. Current event count: ${eventCounter}`);
        }
      } catch (counterError: any) {
        console.error('Failed to get event counter:', counterError);
        throw new Error(`Contract is not responsive: ${counterError.message}`);
      }
      
      // Try to call the contract method with specific error handling
      let result;
      try {
        console.log(`Calling getEvent with eventId: ${eventId}`);
        
        // Try different ethers v6 approaches
        try {
          // First try: Use the contract interface directly with AbiCoder
          const iface = new ethers.Interface(TICKET_FACTORY_ABI);
          const callData = iface.encodeFunctionData('getEvent', [eventId]);
          
          console.log('Trying interface-based call with callData:', callData);
          
          // Ensure provider is initialized before direct call
          await this.ensureProvider();

          const rawResult = await this.provider!.call({
            to: CONTRACT_ADDRESSES.TICKET_FACTORY,
            data: callData
          });
          
          console.log('Raw provider call result:', rawResult);
          
          // Decode the result using the interface
          const decodedResult = iface.decodeFunctionResult('getEvent', rawResult);
          console.log('Decoded result:', decodedResult);
          
          // Extract the values from the decoded result
          const eventData = decodedResult[0]; // The tuple is the first element
          result = {
            id: Number(eventData.id),
            ticketContract: eventData.ticketContract,
            organizer: eventData.organizer,
            name: eventData.name,
            description: eventData.description,
            eventDate: Number(eventData.eventDate),
            createdAt: Number(eventData.createdAt),
            isActive: eventData.isActive,
            totalTicketsSold: Number(eventData.totalTicketsSold),
            totalRevenue: eventData.totalRevenue
          };
          
          console.log('Processed result:', result);
        } catch (interfaceCallError: any) {
          console.log('Interface call failed, trying regular call:', interfaceCallError.message);
          
          // Fallback to regular call (which will probably still fail)
          result = await contract.getEvent(eventId);
          console.log('Raw contract result (regular call):', result);
        }
      } catch (contractError: any) {
        console.error('Contract call failed:', contractError);
        
        // Check if it's a revert (event doesn't exist)
        if (contractError.message?.includes('revert') || contractError.message?.includes('execution reverted')) {
          throw new Error(`Event ${eventId} does not exist in the contract`);
        }
        
        // Check if it's the key.format error
        if (contractError.message?.includes('key.format')) {
          throw new Error(`Contract method returned invalid data format for event ${eventId}. This may be due to a version mismatch between the contract and ABI.`);
        }
        
        // Re-throw with more context
        throw new Error(`Contract call failed: ${contractError.message}`);
      }

    // Safe handling of totalRevenue formatting
    let totalRevenue = '0';
    try {
      if (result.totalRevenue) {
        totalRevenue = ethers.formatEther(result.totalRevenue);
      }
    } catch (error) {
      console.warn('Failed to format totalRevenue:', error);
      totalRevenue = '0';
    }

      return {
        id: Number(result.id),
        ticketContract: result.ticketContract,
        organizer: result.organizer,
        name: result.name,
        description: result.description,
        eventDate: Number(result.eventDate),
        createdAt: Number(result.createdAt),
        isActive: result.isActive,
        totalTicketsSold: Number(result.totalTicketsSold),
        totalRevenue
      };
    } catch (error: any) {
      console.error(`Failed to get event ${eventId} from contract:`, error);
      console.error('Contract address:', CONTRACT_ADDRESSES.TICKET_FACTORY);
      try {
        if (this.provider) {
          console.error('Network:', await this.provider.getNetwork());
        } else {
          console.error('Provider not initialized');
        }
      } catch (networkError) {
        console.error('Failed to get network info:', networkError);
      }
      
      // Provide more specific error messages
      if (error.message?.includes('call revert exception')) {
        throw new Error(`Event ${eventId} not found in contract. The event may not have been created on the blockchain yet.`);
      }
      if (error.message?.includes('contract not deployed')) {
        throw new Error('Contract not deployed at the specified address. Please check your configuration.');
      }
      if (error.message?.includes('network')) {
        throw new Error('Network connection error. Please check your wallet connection.');
      }
      
      throw new Error(`Failed to retrieve event from blockchain: ${error.message || 'Unknown error'}`);
    }
  }

  // Get ticket contract address from contract event ID
  async getTicketContractAddress(contractEventId: number): Promise<string> {
    const eventData = await this.getEvent(contractEventId);
    return eventData.ticketContract;
  }

  // Validate that a contract event exists and is active
  async validateContractEvent(contractEventId: number): Promise<boolean> {
    try {
      const eventData = await this.getEvent(contractEventId);
      return eventData.isActive;
    } catch (error) {
      console.error('Error validating contract event:', error);
      return false;
    }
  }

  // Get contract event status for error handling
  async getContractEventStatus(contractEventId: number): Promise<{
    exists: boolean;
    isActive: boolean;
    ticketContract: string | null;
    error: string | null;
  }> {
    try {
      const eventData = await this.getEvent(contractEventId);
      return {
        exists: true,
        isActive: eventData.isActive,
        ticketContract: eventData.ticketContract,
        error: null
      };
    } catch (error: any) {
      return {
        exists: false,
        isActive: false,
        ticketContract: null,
        error: error.message || 'Unknown error'
      };
    }
  }

  // Get all events
  async getAllEvents(): Promise<EventData[]> {
    const contract = await this.getContract(CONTRACT_ADDRESSES.TICKET_FACTORY, TICKET_FACTORY_ABI, false);
    const result = await contract.getAllEvents();

    return result.map((event: any) => ({
      id: Number(event.id),
      ticketContract: event.ticketContract,
      organizer: event.organizer,
      name: event.name,
      description: event.description,
      eventDate: Number(event.eventDate),
      createdAt: Number(event.createdAt),
      isActive: event.isActive,
      totalTicketsSold: Number(event.totalTicketsSold),
      totalRevenue: ethers.formatEther(event.totalRevenue)
    }));
  }

  // Get ticket types for an event
  async getTicketTypes(ticketContractAddress: string): Promise<TicketType[]> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    const types: TicketType[] = [];
    let index = 0;
    
    try {
      while (true) {
        const result = await contract.ticketTypes(index);
        
        if (!result || !result.name) break;
        
        types.push({
          name: result.name,
          price: ethers.formatEther(result.price),
          maxSupply: Number(result.maxSupply),
          currentSupply: Number(result.currentSupply),
          metadataURI: result.metadataURI
        });
        
        index++;
      }
    } catch (error) {
      // End of array reached
    }
    
    return types;
  }

  // Get ticket type price directly from contract
  async getTicketTypePrice(ticketContractAddress: string, ticketTypeId: number): Promise<string> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    const price = await contract.getTicketTypePrice(ticketTypeId);
    return ethers.formatEther(price);
  }

  // Get user's tickets for a specific event
  async getUserTickets(userAddress: string, ticketContractAddress: string): Promise<NFTTicketInfo[]> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    const tickets: NFTTicketInfo[] = [];
    
    try {
      // Get the next token ID to know the range of tokens to check
      const nextTokenId = await contract.nextTokenId();
      const maxTokenId = Number(nextTokenId) - 1; // nextTokenId is the next available ID, so current max is -1
      
      // Check each token from 1 to maxTokenId
      for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
        try {
          const owner = await contract.ownerOf(tokenId);
          
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const tokenURI = await contract.tokenURI(tokenId);
            const ticketInfo = await contract.getTicketInfo(tokenId);

            tickets.push({
              tokenId: tokenId,
              owner: userAddress,
              tokenURI,
              eventContract: ticketContractAddress,
              ticketInfo: {
                ticketTypeId: Number(ticketInfo.ticketTypeId),
                price: ethers.formatEther(ticketInfo.price),
                mintTimestamp: Number(ticketInfo.mintTimestamp),
                isValidated: ticketInfo.isValidated,
                isUsed: ticketInfo.isUsed
              }
            });
          }
        } catch (error) {
          // Token doesn't exist or access error, skip this token
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to get user tickets:', error);
      throw new Error('Failed to retrieve user tickets from contract');
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
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, true);
    const tx = await contract.transferFrom(fromAddress, toAddress, tokenId);
    return tx.hash;
  }

  // Check if user owns a specific ticket
  async checkTicketOwnership(ticketContractAddress: string, tokenId: number): Promise<string> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    return await contract.ownerOf(tokenId);
  }

  // Check if ticket is valid (view function)
  async isTicketValid(ticketContractAddress: string, tokenId: number): Promise<boolean> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    return await contract.validateTicket(tokenId);
  }

  // Check if transfers are enabled for a ticket contract
  async isTransferEnabled(ticketContractAddress: string): Promise<boolean> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    return await contract.transferEnabled();
  }

  // Set transfer enabled (only owner)
  async setTransferEnabled(ticketContractAddress: string, enabled: boolean): Promise<string> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, true);
    const tx = await contract.setTransferEnabled(enabled);
    return tx.hash;
  }

  // Get event date from ticket contract
  async getEventDate(ticketContractAddress: string): Promise<number> {
    const contract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    const result = await contract.eventDate();
    return Number(result);
  }

  // Get event creation fee
  async getEventCreationFee(): Promise<string> {
    const contract = await this.getContract(CONTRACT_ADDRESSES.TICKET_FACTORY, TICKET_FACTORY_ABI, false);
    const fee = await contract.EVENT_CREATION_FEE();
    return ethers.formatEther(fee);
  }

  // RESALE MARKETPLACE METHODS

  // List a ticket for resale
  async listTicketForResale(
    ticketContractAddress: string,
    tokenId: number,
    priceInEth: string
  ): Promise<string> {
    try {
      // First, approve the ResaleMarketplace to transfer the NFT
      const ticketContract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, true);
      console.log('Approving ResaleMarketplace to transfer NFT...', {
        ticketContract: ticketContractAddress,
        tokenId,
        resaleMarketplace: CONTRACT_ADDRESSES.RESALE_MARKETPLACE
      });
      
      const approveTx = await ticketContract.approve(CONTRACT_ADDRESSES.RESALE_MARKETPLACE, tokenId);
      console.log('Approval transaction sent, waiting for confirmation...', approveTx.hash);
      await approveTx.wait(); // Wait for approval to complete
      console.log('Approval completed successfully:', approveTx.hash);
      
      // Verify approval worked
      const approvedAddress = await ticketContract.getApproved(tokenId);
      console.log('Verification - NFT approved to:', approvedAddress);
      
      // Then list the ticket
      const contract = await this.getContract(CONTRACT_ADDRESSES.RESALE_MARKETPLACE, RESALE_MARKETPLACE_ABI, true);
      
      // Convert price to wei
      const priceInWei = ethers.parseEther(contractUtils.formatPriceForContract(priceInEth));
      console.log('Listing ticket with price:', priceInEth, 'wei:', priceInWei.toString());
      
      const tx = await contract.listTicket(ticketContractAddress, tokenId, priceInWei);
      console.log('Listing transaction sent:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error in listTicketForResale:', error);
      throw error;
    }
  }

  // Buy a ticket from resale marketplace
  async buyResaleTicket(
    ticketContractAddress: string,
    tokenId: number,
    priceInEth: string
  ): Promise<string> {
    const contract = await this.getContract(CONTRACT_ADDRESSES.RESALE_MARKETPLACE, RESALE_MARKETPLACE_ABI, true);
    
    // First check if the listing exists
    const listing = await this.getResaleListing(ticketContractAddress, tokenId);
    console.log('Current listing for buy:', listing);
    
    if (!listing) {
      throw new Error('Ticket is not listed for sale');
    }
    
    // Check if ResaleMarketplace is approved to transfer this NFT
    const ticketContract = await this.getContract(ticketContractAddress, TICKET_NFT_ABI, false);
    const approvedAddress = await ticketContract.getApproved(tokenId);
    const isApprovedForAll = await ticketContract.isApprovedForAll(listing.seller, CONTRACT_ADDRESSES.RESALE_MARKETPLACE);
    
    console.log('Transfer approval check:', {
      tokenId,
      seller: listing.seller,
      approvedAddress,
      resaleMarketplace: CONTRACT_ADDRESSES.RESALE_MARKETPLACE,
      isSpecificApproval: approvedAddress.toLowerCase() === CONTRACT_ADDRESSES.RESALE_MARKETPLACE.toLowerCase(),
      isApprovedForAll,
      canTransfer: approvedAddress.toLowerCase() === CONTRACT_ADDRESSES.RESALE_MARKETPLACE.toLowerCase() || isApprovedForAll
    });
    
    if (approvedAddress.toLowerCase() !== CONTRACT_ADDRESSES.RESALE_MARKETPLACE.toLowerCase() && !isApprovedForAll) {
      throw new Error('ResaleMarketplace is not approved to transfer this NFT. The seller needs to approve the marketplace first.');
    }
    
    // Convert price to wei
    const priceInWei = ethers.parseEther(contractUtils.formatPriceForContract(priceInEth));
    console.log('Buying ticket with price:', priceInEth, 'wei:', priceInWei.toString());
    
    const tx = await contract.buyTicket(ticketContractAddress, tokenId, {
      value: priceInWei
    });
    return tx.hash;
  }

  // Cancel a resale listing
  async cancelResaleListing(
    ticketContractAddress: string,
    tokenId: number
  ): Promise<string> {
    const contract = await this.getContract(CONTRACT_ADDRESSES.RESALE_MARKETPLACE, RESALE_MARKETPLACE_ABI, true);
    
    const tx = await contract.cancelListing(ticketContractAddress, tokenId);
    return tx.hash;
  }

  // Get listing information for a ticket
  async getResaleListing(
    ticketContractAddress: string,
    tokenId: number
  ): Promise<{ seller: string; price: string } | null> {
    console.log('getResaleListing called with:', { ticketContractAddress, tokenId });
    
    if (!CONTRACT_ADDRESSES.RESALE_MARKETPLACE) {
      console.warn('Resale marketplace address not configured');
      return null;
    }
    
    if (!ticketContractAddress) {
      console.error('Ticket contract address is null/undefined');
      return null;
    }
    
    const contract = await this.getContract(CONTRACT_ADDRESSES.RESALE_MARKETPLACE, RESALE_MARKETPLACE_ABI, false);
    
    try {
      const listing = await contract.listings(ticketContractAddress, tokenId);
      
      // If price is 0, ticket is not listed
      if (listing.price === 0n) {
        return null;
      }
      
      return {
        seller: listing.seller,
        price: ethers.formatEther(listing.price)
      };
    } catch (error) {
      console.error('Error getting resale listing:', error);
      return null;
    }
  }

  // Get all listed tickets for resale (requires event listening for efficiency)
  async getActiveResaleListings(): Promise<Array<{
    ticketContract: string;
    tokenId: number;
    seller: string;
    price: string;
  }>> {
    const contract = await this.getContract(CONTRACT_ADDRESSES.RESALE_MARKETPLACE, RESALE_MARKETPLACE_ABI, false);
    
    try {
      // Get all TicketListed events
      const filter = contract.filters.TicketListed();
      const events = await contract.queryFilter(filter, -10000); // Last 10k blocks
      
      const activeListings = [];
      
      for (const event of events) {
        const { contractAddr, tokenId, seller, price } = event.args;
        
        // Check if listing is still active
        const currentListing = await this.getResaleListing(contractAddr, Number(tokenId));
        
        if (currentListing && currentListing.seller === seller) {
          activeListings.push({
            ticketContract: contractAddr,
            tokenId: Number(tokenId),
            seller,
            price: ethers.formatEther(price)
          });
        }
      }
      
      return activeListings;
    } catch (error) {
      console.error('Error getting active resale listings:', error);
      return [];
    }
  }

  // Get enriched resale listings with event and ticket information
  async getEnrichedResaleListings(): Promise<ResaleListingInfo[]> {
    try {
      const basicListings = await this.getActiveResaleListings();
      const enrichedListings: ResaleListingInfo[] = [];
      
      for (const listing of basicListings) {
        try {
          // Get ticket info
          const ticketContract = await this.getContract(listing.ticketContract, TICKET_NFT_ABI, false);
          const tokenURI = await ticketContract.tokenURI(listing.tokenId);
          const ticketInfo = await ticketContract.getTicketInfo(listing.tokenId);
          
          // Try to get event information by looking up which event this ticket contract belongs to
          let eventInfo: EventData | undefined;
          try {
            // This is a simplified approach - in practice you might need to store this mapping
            const factoryContract = await this.getContract(CONTRACT_ADDRESSES.TICKET_FACTORY, TICKET_FACTORY_ABI, false);
            const eventCounter = await factoryContract.eventCounter();
            
            // Search through events to find the one with this ticket contract
            for (let eventId = 1; eventId <= Number(eventCounter); eventId++) {
              try {
                const event = await this.getEvent(eventId);
                if (event.ticketContract.toLowerCase() === listing.ticketContract.toLowerCase()) {
                  eventInfo = event;
                  break;
                }
              } catch (error) {
                // Continue searching
                continue;
              }
            }
          } catch (error) {
            console.warn('Could not fetch event info for ticket contract:', listing.ticketContract);
          }
          
          const nftTicketInfo: NFTTicketInfo = {
            tokenId: listing.tokenId,
            owner: listing.seller,
            tokenURI,
            eventContract: listing.ticketContract,
            ticketInfo: {
              ticketTypeId: Number(ticketInfo.ticketTypeId),
              price: ethers.formatEther(ticketInfo.price),
              mintTimestamp: Number(ticketInfo.mintTimestamp),
              isValidated: ticketInfo.isValidated,
              isUsed: ticketInfo.isUsed
            }
          };
          
          enrichedListings.push({
            ticketContract: listing.ticketContract,
            tokenId: listing.tokenId,
            seller: listing.seller,
            price: listing.price,
            eventInfo,
            ticketInfo: nftTicketInfo
          });
        } catch (error) {
          console.error('Error enriching listing:', listing, error);
          // Add basic listing without enrichment
          enrichedListings.push({
            ticketContract: listing.ticketContract,
            tokenId: listing.tokenId,
            seller: listing.seller,
            price: listing.price
          });
        }
      }
      
      return enrichedListings;
    } catch (error) {
      console.error('Error getting enriched resale listings:', error);
      return [];
    }
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
  },

  // Create ticket types for event creation
  createTicketType: (
    name: string,
    priceInEth: string,
    maxSupply: number,
    metadataURI: string = ""
  ): TicketType => {
    return {
      name,
      price: priceInEth,
      maxSupply,
      currentSupply: 0,
      metadataURI
    };
  },

  // Check if event is past
  isEventPast: (eventDate: number): boolean => {
    return eventDate < Math.floor(Date.now() / 1000);
  },

  // Check if ticket sales are open
  isTicketSalesOpen: (event: EventData): boolean => {
    return event.isActive && !contractUtils.isEventPast(event.eventDate);
  },

  // Check if transfers are allowed
  areTransfersAllowed: (eventDate: number, transferEnabled: boolean): boolean => {
    return transferEnabled || contractUtils.isEventPast(eventDate);
  },

  // Validate contract event ID
  isValidContractEventId: (contractEventId: number | null | undefined): boolean => {
    return contractEventId !== null && contractEventId !== undefined && contractEventId > 0;
  },

  // Format contract error messages for user display
  formatContractError: (error: any): string => {
    if (!error) return 'Unknown error occurred';
    
    const message = error.message || error.toString();
    
    // Common contract errors
    if (message.includes('User denied transaction')) {
      return 'Transaction was cancelled. Please approve the transaction to continue.';
    }
    if (message.includes('insufficient funds')) {
      return 'Insufficient ETH balance. Please add more ETH to your wallet.';
    }
    if (message.includes('execution reverted')) {
      return 'Transaction failed. Please check the transaction details and try again.';
    }
    if (message.includes('network error')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'Transaction timeout. Please try again.';
    }
    
    // Return cleaned up error message
    return message.replace(/^Error: /, '').replace(/execution reverted: /, '');
  },

  // Safely format price for contract to avoid floating-point precision issues
  formatPriceForContract: (price: number | string): string => {
    const priceStr = typeof price === 'string' ? price : price.toString();
    const priceNum = parseFloat(priceStr);
    
    if (isNaN(priceNum) || priceNum < 0) {
      throw new Error('Invalid price format');
    }
    
    // Round to 6 decimal places to avoid floating-point precision issues
    // This should be sufficient for ETH prices
    const roundedPrice = Math.round(priceNum * 1000000) / 1000000;
    
    // Convert to fixed decimal string to avoid scientific notation
    return roundedPrice.toFixed(6);
  },

  // Format event date for display
  formatEventDate: (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Get ticket type availability
  getTicketAvailability: (ticketType: TicketType): {
    available: number;
    percentageSold: number;
    isSoldOut: boolean;
  } => {
    const available = ticketType.maxSupply - ticketType.currentSupply;
    const percentageSold = (ticketType.currentSupply / ticketType.maxSupply) * 100;
    const isSoldOut = available === 0;
    
    return {
      available,
      percentageSold,
      isSoldOut
    };
  }
};

export default {
  ContractService,
  contractService,
  contractUtils,
  TICKET_FACTORY_ABI,
  TICKET_NFT_ABI,
  RESALE_MARKETPLACE_ABI,
  CONTRACT_ADDRESSES
};