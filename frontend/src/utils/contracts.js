import { ethers } from 'ethers';
import { getContractAddress } from '../config/contracts';
import TicketNFTABI from '../abi/TicketNFT.json';
import TicketFactoryABI from '../abi/TicketFactory.json';
import TicketMarketplaceABI from '../abi/TicketMarketplace.json';
import RevenueSharingABI from '../abi/RevenueSharing.json';

// Get provider and signer
export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('No wallet found');
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

// Get contract address based on current network
const getContractAddressForNetwork = async (contractName) => {
  const provider = getProvider();
  const network = await provider.getNetwork();
  const address = getContractAddress(Number(network.chainId), contractName);
  
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on network ${network.chainId}`);
  }
  
  return address;
};

// Contract instances
export const getTicketFactoryContract = async () => {
  const signer = await getSigner();
  const address = await getContractAddressForNetwork('TICKET_FACTORY');
  return new ethers.Contract(address, TicketFactoryABI, signer);
};

export const getTicketMarketplaceContract = async () => {
  const signer = await getSigner();
  const address = await getContractAddressForNetwork('RESALE_MARKETPLACE');
  return new ethers.Contract(address, TicketMarketplaceABI, signer);
};

export const getRevenueSharingContract = async () => {
  const signer = await getSigner();
  const address = await getContractAddressForNetwork('REVENUE_SHARING');
  return new ethers.Contract(address, RevenueSharingABI, signer);
};

export const getTicketNFTContract = async (contractAddress) => {
  const signer = await getSigner();
  return new ethers.Contract(contractAddress, TicketNFTABI, signer);
};

export const getTicketNFTContractReadOnly = (contractAddress) => {
  const provider = getProvider();
  return new ethers.Contract(contractAddress, TicketNFTABI, provider);
};