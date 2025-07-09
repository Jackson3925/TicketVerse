// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITicketNFT {
    function getTicketInfo(uint256 tokenId) external view returns (uint256, uint256, uint256, bool, bool);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

contract ResaleMarketplace {
    struct Listing {
        address seller;
        uint256 price;
    }

    struct ResaleRules {
        uint256 maxPriceMultiplier;
        uint256 royaltyPercentage;
        bool resaleEnabled;
        uint256 resaleStartTime;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => ResaleRules) public resaleRules;

    event TicketListed(address indexed contractAddr, uint256 indexed tokenId, uint256 price);
    event TicketSold(address indexed contractAddr, uint256 indexed tokenId, address buyer, uint256 price);
    event ListingCancelled(address indexed contractAddr, uint256 indexed tokenId);

    function listTicket(address ticketContract, uint256 tokenId, uint256 price) external {
        require(resaleRules[ticketContract].resaleEnabled, "Resale not allowed");
        require(block.timestamp >= resaleRules[ticketContract].resaleStartTime, "Resale not started");

        listings[ticketContract][tokenId] = Listing(msg.sender, price);
        emit TicketListed(ticketContract, tokenId, price);
    }

    function buyTicket(address ticketContract, uint256 tokenId) external payable {
        Listing memory listing = listings[ticketContract][tokenId];
        require(msg.value >= listing.price, "Insufficient payment");

        uint256 royalty = (listing.price * resaleRules[ticketContract].royaltyPercentage) / 100;
        payable(listing.seller).transfer(listing.price - royalty);

        ITicketNFT(ticketContract).safeTransferFrom(listing.seller, msg.sender, tokenId);
        delete listings[ticketContract][tokenId];
        emit TicketSold(ticketContract, tokenId, msg.sender, listing.price);
    }

    function cancelListing(address ticketContract, uint256 tokenId) external {
        Listing memory listing = listings[ticketContract][tokenId];
        require(msg.sender == listing.seller, "Not seller");

        delete listings[ticketContract][tokenId];
        emit ListingCancelled(ticketContract, tokenId);
    }

    function setResaleRules(
        address ticketContract,
        uint256 maxPriceMultiplier,
        uint256 royaltyPercentage,
        uint256 resaleStartTime,
        bool resaleEnabled
    ) external {
        resaleRules[ticketContract] = ResaleRules(
            maxPriceMultiplier,
            royaltyPercentage,
            resaleEnabled,
            resaleStartTime
        );
    }
}