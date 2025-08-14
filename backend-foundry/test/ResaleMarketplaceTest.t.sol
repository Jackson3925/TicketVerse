// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ResaleMarketplace.sol";
import "../src/TicketNFT.sol";
import "../src/TicketFactory.sol";

contract ResaleMarketplaceTest is Test {
    ResaleMarketplace marketplace;
    TicketNFT ticketNFT;
    TicketFactory ticketFactory;

    address owner = makeAddr("owner");
    address organizer = makeAddr("organizer");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");

    uint256 constant TICKET_PRICE = 1 ether;
    uint256 constant RESALE_PRICE = 1.5 ether;
    uint256 eventDate;

    function setUp() public {
        // Fund accounts first (no prank needed)
        vm.deal(owner, 100 ether);
        vm.deal(organizer, 100 ether);
        vm.deal(seller, 100 ether);
        vm.deal(buyer, 100 ether);

        // Set event date to 1 day in future
        eventDate = block.timestamp + 1 days;

        // Deploy contracts as owner
        vm.startPrank(owner);
        ticketNFT = new TicketNFT();
        ticketFactory = new TicketFactory(address(ticketNFT));
        marketplace = new ResaleMarketplace();
        vm.stopPrank(); // Clear prank

        // Create ticket types for event creation
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType({
            name: "General Admission",
            price: TICKET_PRICE,
            maxSupply: 100,
            currentSupply: 0,
            metadataURI: "ipfs://testuri"
        });

        // Create event through factory
        vm.prank(organizer);
        ticketFactory.createEvent{value: 0.01 ether}(
            "Test Event", "Test Description", block.timestamp + 1 days, organizer, ticketTypes
        );

        // Get deployed ticket contract
        address ticketAddr = ticketFactory.getEvent(1).ticketContract;
        ticketNFT = TicketNFT(ticketAddr);

        // Mint ticket to seller
        vm.prank(seller);
        ticketFactory.mintTicket{value: TICKET_PRICE}(1, 0, seller);

        vm.prank(seller);
        // Approve marketplace for tokenId 1
        ticketNFT.approve(address(marketplace), 1);

        // Enable transfers
        vm.prank(organizer);
        ticketNFT.setTransferEnabled(true);

        // After deployment checks
        assertEq(ticketNFT.owner(), organizer, "NFT owner not set correctly");
        assertTrue(ticketNFT.transferEnabled(), "Transfers should be enabled");
    }

    function testListTicket() public {
        // Fast forward past event date
        vm.warp(eventDate + 1);

        vm.prank(seller);
        marketplace.listTicket(address(ticketNFT), 1, RESALE_PRICE);

        (address listedSeller, uint256 listedPrice) = marketplace.listings(address(ticketNFT), 1);
        assertEq(listedSeller, seller);
        assertEq(listedPrice, RESALE_PRICE);
    }

    function testCannotListBeforeEventEnds() public {
        vm.prank(seller);
        vm.expectRevert("Event not ended");
        marketplace.listTicket(address(ticketNFT), 1, RESALE_PRICE);
    }

    function testBuyTicket() public {
        // Setup listing
        vm.warp(eventDate + 1);
        vm.prank(seller);
        marketplace.listTicket(address(ticketNFT), 1, RESALE_PRICE);

        // Calculate expected fees
        uint256 expectedPlatformFee = (RESALE_PRICE * 1) / 100;
        uint256 expectedRoyalty = (RESALE_PRICE * 2) / 100;
        uint256 expectedSellerAmount = RESALE_PRICE - expectedPlatformFee - expectedRoyalty;

        // Check balances before
        uint256 organizerBalanceBefore = organizer.balance;
        uint256 ownerBalanceBefore = owner.balance;
        uint256 sellerBalanceBefore = seller.balance;

        // Buy ticket
        vm.prank(buyer);
        marketplace.buyTicket{value: RESALE_PRICE}(address(ticketNFT), 1);

        // Check balances after
        assertEq(organizer.balance, organizerBalanceBefore + expectedRoyalty);
        assertEq(owner.balance, ownerBalanceBefore + expectedPlatformFee);
        assertEq(seller.balance, sellerBalanceBefore + expectedSellerAmount);

        // Check NFT transfer
        assertEq(ticketNFT.ownerOf(1), buyer);

        // Check listing removed
        (address listedSeller, uint256 listedPrice) = marketplace.listings(address(ticketNFT), 1);
        assertEq(listedSeller, address(0));
        assertEq(listedPrice, 0);
    }

    function testCancelListing() public {
        vm.warp(eventDate + 1);
        vm.prank(seller);
        marketplace.listTicket(address(ticketNFT), 1, RESALE_PRICE);

        vm.prank(seller);
        marketplace.cancelListing(address(ticketNFT), 1);

        (address listedSeller,) = marketplace.listings(address(ticketNFT), 1);
        assertEq(listedSeller, address(0));
    }

    function testCannotCancelOthersListing() public {
        vm.warp(eventDate + 1);
        vm.prank(seller);
        marketplace.listTicket(address(ticketNFT), 1, RESALE_PRICE);

        vm.prank(buyer);
        vm.expectRevert("Not seller");
        marketplace.cancelListing(address(ticketNFT), 1);
    }

    function testFeeDistribution() public {
        vm.warp(eventDate + 1);
        vm.prank(seller);
        marketplace.listTicket(address(ticketNFT), 1, 100 ether); // Easy to calculate

        // Record balances BEFORE the transaction
        uint256 buyerBalanceBefore = buyer.balance;
        uint256 ownerBalanceBefore = owner.balance;
        uint256 organizerBalanceBefore = organizer.balance;
        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        marketplace.buyTicket{value: 100 ether}(address(ticketNFT), 1);

        // Check balance CHANGES, not absolute balances
        // 1% platform fee = 1 ether
        assertEq(owner.balance, ownerBalanceBefore + 1 ether);
        // 2% royalty = 2 ether
        assertEq(organizer.balance, organizerBalanceBefore + 2 ether);
        // 97% to seller = 97 ether
        assertEq(seller.balance, sellerBalanceBefore + 97 ether);
        // Buyer spent exactly 100 ether
        assertEq(buyer.balance, buyerBalanceBefore - 100 ether);
    }

    function testCannotBuyWithInsufficientFunds() public {
        vm.warp(eventDate + 1);
        vm.prank(seller);
        marketplace.listTicket(address(ticketNFT), 1, RESALE_PRICE);

        vm.prank(buyer);
        vm.expectRevert("Insufficient payment");
        marketplace.buyTicket{value: RESALE_PRICE - 0.1 ether}(address(ticketNFT), 1);
    }
}
