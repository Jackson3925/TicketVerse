# Blockchain Concert Platform

A decentralized concert ticket platform that uses blockchain technology to create secure, verifiable tickets as NFTs. Users can purchase tickets, verify authenticity, and trade on a secure marketplace.

## 🚀 How to Run the Application

### Prerequisites
- **Node.js** (v18 or higher)
- **MetaMask** browser extension
- **Sepolia ETH** (for testing)
- **Supabase Account** (for web2 data storage)
- **Supabase CLI** (for schema migration)
- **Pinata Account** (for storing NFT images on IPFS)

### Quick Start

1. **Install Dependencies**
```bash
cd Blockchain-concertPlatform/frontend
npm install
```

2. **Configure Environment Variables**
- Create a `.env.local` file in the `/Blockchain-concertPlatform/frontend` directory
- replace `your_supabase_url`, `your_public_anon_key`, `https://your_rpc_url`, `your_pinata_jwt`, `your_gateway`
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_public_anon_key

# Contract Addresses
VITE_TICKET_NFT_IMPLEMENTATION_ADDRESS=0xb9a8b6C3313907e4C5A626cDBCB04c593747cfcB
VITE_TICKET_FACTORY_ADDRESS=0x2Cb5D511E3617d140F0d388409e43E74f74D555b
VITE_RESALE_MARKETPLACE_ADDRESS=0x83217bb9f432625Bd9C98107109231ea334cE8CA

# Network and RPC
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME="Sepolia"
VITE_RPC_URL=https://your_rpc_url

# Pinata IPFS Configuration
VITE_PINATA_JWT=your_pinata_jwt
VITE_PINATA_GATEWAY=your_gateway

# QR Code Security Configuration
VITE_QR_SECRET_KEY=concert-platform-qr-secret-2025-blockchain-tickets
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbXNmanpnaGZqdGJiemVvZ3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc4Njc4MiwiZXhwIjoyMDY2MzYyNzgyfQ.0k-24neE6vcfXwEesHg_R5XIwQfZ3ZlvbdZ1B6ZCIi4
```

3. **Import Supabase Schema**
- Replace `<project-ref>` with your Supabase project ID
- Import the `supabase_schema.sql` into your Supabase project
```bash
# Log in to Supabase CLI (only needed once)
supabase login

# Link to your project
supabase link --project-ref <project-ref>

# Push schema to your Supabase project
psql "$SUPABASE_DB_URL" < supabase_schema.sql
```

4. **Start the Application**
```bash
cd frontend/
npm run dev
```

5. **Access the Platform**
- Open http://localhost:8080 in your browser
- Connect your MetaMask wallet
- Switch to Sepolia testnet

### Getting Test ETH
- Visit [Sepolia Faucet](https://sepoliafaucet.com) to get free test ETH
- Connect your MetaMask wallet to receive funds

## ✨ Platform Features

### 🎭 For Artists
**Create Events**
- Register as an artist through the platform
- Create concert events with details (name, date, venue, description)
- Upload event images and set ticket prices
- Define seating categories and quantities

**Manage Tickets**
- Mint NFT tickets for your events
- Set resale price limits to prevent scalping
- Monitor ticket sales and revenue in real-time
- View detailed analytics and customer data

### 🎫 For Customers
**Browse & Purchase**
- Explore upcoming concerts and events
- View detailed event information and artist profiles
- Purchase tickets securely with cryptocurrency
- Receive NFT tickets in your wallet

**Ticket Management**
- View all owned tickets in "My Tickets" section
- Access QR codes for event entry
- Transfer tickets to other users
- Sell tickets on the resale marketplace

### 🏪 Resale Marketplace
**Buy & Sell**
- List tickets for resale at market prices
- Browse available resale tickets
- Purchase tickets from other users
- Automatic price limit enforcement

**Security Features**
- All transactions secured by smart contracts
- Anti-fraud protection with blockchain verification
- Transparent pricing and ownership history

## 📱 How to Use the Platform

### Getting Started
1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Choose Role**: Select whether you're an Artist or Customer
3. **Complete Profile**: Fill in your profile information

### For Artists
1. **Register**: Complete artist verification process
2. **Create Event**: Use "Create Event" to add new concerts
3. **Set Details**: Add event information, images, and pricing
4. **Launch Sales**: Tickets become available for purchase immediately

### For Customers
1. **Browse Events**: Explore the events page for upcoming concerts
2. **Select Tickets**: Choose your preferred seating and quantity
3. **Purchase**: Complete payment through MetaMask
4. **Access Tickets**: View tickets in your collection with QR codes

### Ticket Verification
1. **QR Scanner**: Event organizers can scan QR codes at venue
2. **Instant Verification**: System validates ticket authenticity in real-time
3. **Fraud Prevention**: Duplicate or invalid tickets are automatically detected

## 🛡️ Security Features

- **Blockchain-based**: All tickets are NFTs on Ethereum
- **Smart Contracts**: Automated and transparent transactions
- **QR Verification**: Secure ticket validation system
- **Anti-fraud**: Duplicate prevention and ownership verification
- **Decentralized Storage**: Event data stored on IPFS

## 💡 Key Benefits

### For Event Organizers
- **Eliminate Counterfeiting**: Blockchain verification prevents fake tickets
- **Control Resale**: Set maximum resale prices to prevent scalping
- **Direct Sales**: No intermediary fees, direct artist-to-fan sales
- **Real-time Analytics**: Track sales and revenue instantly

### For Ticket Buyers
- **Authentic Tickets**: Guaranteed authenticity through blockchain
- **Secure Transfers**: Safe ticket transfers between users
- **Resale Options**: Ability to resell tickets when needed
- **Digital Collectibles**: Tickets become permanent digital memorabilia

### For the Industry
- **Transparency**: All transactions visible on blockchain
- **Reduced Fraud**: Eliminates counterfeit ticket market
- **Fair Pricing**: Automated price controls prevent exploitation
- **Innovation**: Modern ticketing solution for digital age

## 🎯 User Journey Examples

### Artist Creating an Event
1. Register as artist → Profile verification → Create event → Set ticket details → Launch sales → Monitor performance

### Customer Buying Tickets
1. Browse events → Select concert → Choose seats → Connect wallet → Purchase → Receive NFT → Attend event

### Resale Transaction
1. List ticket → Set price → Buyer finds listing → Purchase → Automatic transfer → Original owner receives payment

## 📞 Support

- Check wallet connection and network settings
- Ensure sufficient ETH for transactions
- Verify event details before purchase
- Contact support through platform for assistance