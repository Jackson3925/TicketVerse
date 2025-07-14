export const NETWORK_CONFIG = {
  31337: { // Anvil chain ID
    name: "Anvil Local",
    rpcUrl: "http://127.0.0.1:8545",
    contracts: {
      TICKET_NFT_IMPL: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      TICKET_FACTORY: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      RESALE_MARKETPLACE: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      REVENUE_SHARING: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
    }
  }
};

export const getContractAddress = (chainId, contractName) => {
  return NETWORK_CONFIG[chainId]?.contracts[contractName];
};