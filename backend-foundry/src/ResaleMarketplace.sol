// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TicketNFT.sol";

contract ResaleMarketplace is Ownable, ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;
    uint256 public constant PLATFORM_FEE_PERCENT = 1; // 1% platform fee
    uint256 public constant ROYALTY_FEE_PERCENT = 2; // 2% royalty fee

    event TicketListed(address indexed ticketContract, uint256 indexed tokenId, address seller, uint256 price);
    event TicketSold(
        address indexed ticketContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price,
        uint256 royaltyFee,
        uint256 platformFee
    );
    event ListingCancelled(address indexed ticketContract, uint256 indexed tokenId);

    constructor() Ownable(msg.sender) {}

    function listTicket(address ticketContract, uint256 tokenId, uint256 price) external nonReentrant {
        // Verify if ticket is transferable and past the event date
        require(block.timestamp > TicketNFT(ticketContract).eventDate(), "Event not ended");

        // Verify sender owns the ticket
        require(TicketNFT(ticketContract).ownerOf(tokenId) == msg.sender, "Not ticket owner");

        // Verify transfers are enabled for this ticket
        require(TicketNFT(ticketContract).transferEnabled(), "Transfers disabled for this ticket");

        listings[ticketContract][tokenId] = Listing(msg.sender, price);
        emit TicketListed(ticketContract, tokenId, msg.sender, price);
    }

    function buyTicket(address ticketContract, uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[ticketContract][tokenId];
        require(listing.price > 0, "Ticket not for sale");
        require(msg.value >= listing.price, "Insufficient payment");

        // Hardcoded fee calculations
        uint256 platformFee = (listing.price * PLATFORM_FEE_PERCENT) / 100;
        uint256 royaltyFee = (listing.price * ROYALTY_FEE_PERCENT) / 100;
        uint256 sellerAmount = listing.price - platformFee - royaltyFee;

        // Transfer payments
        payable(TicketNFT(ticketContract).owner()).transfer(royaltyFee); // Royalty to organizer
        payable(owner()).transfer(platformFee); // Platform fee
        payable(listing.seller).transfer(sellerAmount); // Seller amount

        // Transfer NFT
        TicketNFT(ticketContract).safeTransferFrom(listing.seller, msg.sender, tokenId);

        // Clean up
        delete listings[ticketContract][tokenId];

        emit TicketSold(ticketContract, tokenId, listing.seller, msg.sender, listing.price, royaltyFee, platformFee);
    }

    function cancelListing(address ticketContract, uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[ticketContract][tokenId];
        require(msg.sender == listing.seller, "Not seller");

        delete listings[ticketContract][tokenId];
        emit ListingCancelled(ticketContract, tokenId);
    }
}
