// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TicketNFT} from "../src/TicketNFT.sol";
import {TicketFactory} from "../src/TicketFactory.sol";
import {ResaleMarketplace} from "../src/ResaleMarketplace.sol";
import {RevenueSharing} from "../src/RevenueSharing.sol";

contract TicketSystemTest is Test {
    TicketNFT public ticketNFTImpl;
    TicketFactory public ticketFactory;
    ResaleMarketplace public resaleMarketplace;
    RevenueSharing public revenueSharing;

    address owner = makeAddr("owner");
    address organizer = makeAddr("organizer");
    address buyer1 = makeAddr("buyer1");
    address buyer2 = makeAddr("buyer2");
    address platform = makeAddr("platform");

    // Test constants
    uint256 public constant EVENT_FEE = 0.01 ether;
    uint256 public constant VIP_PRICE = 0.1 ether;
    uint256 public constant GENERAL_PRICE = 0.05 ether;
    uint256 public eventDate;

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.deal(organizer, 100 ether);
        vm.deal(buyer1, 100 ether);
        vm.deal(buyer2, 100 ether);
        vm.deal(platform, 100 ether);

        vm.startPrank(owner);
        ticketNFTImpl = new TicketNFT();
        ticketFactory = new TicketFactory(address(ticketNFTImpl));
        resaleMarketplace = new ResaleMarketplace();
        revenueSharing = new RevenueSharing(platform); // Platform gets fees
        vm.stopPrank();

        eventDate = block.timestamp + 1 days;
    }

    function _createEvent() internal returns (uint256) {
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](2);
        ticketTypes[0] = TicketNFT.TicketType({
            name: "VIP",
            price: VIP_PRICE,
            maxSupply: 100,
            currentSupply: 0,
            metadataURI: "ipfs://vip-ticket"
        });
        ticketTypes[1] = TicketNFT.TicketType({
            name: "General",
            price: GENERAL_PRICE,
            maxSupply: 1000,
            currentSupply: 0,
            metadataURI: "ipfs://general-ticket"
        });

        vm.prank(organizer);
        ticketFactory.createEvent{value: EVENT_FEE}(
            "Summer Concert",
            "Annual summer music festival",
            eventDate,
            organizer,
            ticketTypes
        );

        return 1; // First event gets ID 1
    }

    function testEventCreation() public {
        uint256 ownerBalanceBefore = owner.balance; // Fee goes to contract owner, not platform
        uint256 eventId = _createEvent();

        // Verify event data
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(eventId);
        assertEq(eventInfo.id, eventId);
        assertEq(eventInfo.organizer, organizer);
        assertEq(eventInfo.totalRevenue, 0);

        // Verify fee payment goes to contract owner
        assertEq(owner.balance, ownerBalanceBefore + EVENT_FEE);
    }

    function testTicketMinting() public {
        uint256 eventId = _createEvent();
        uint256 organizerBalanceBefore = organizer.balance;

        vm.prank(buyer1);
        uint256 tokenId = ticketFactory.mintTicket{value: VIP_PRICE}(
            eventId,
            0, // VIP ticket
            buyer1
        );

        // Verify NFT ownership
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(eventId);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);
        assertEq(ticketContract.ownerOf(tokenId), buyer1);

        // Verify payment to organizer
        assertEq(organizer.balance, organizerBalanceBefore + VIP_PRICE);

        // Verify event stats
        assertEq(eventInfo.totalTicketsSold, 1);
        assertEq(eventInfo.totalRevenue, VIP_PRICE);
    }

    function testTicketResale() public {
        uint256 eventId = _createEvent();
        
        // Mint initial ticket
        vm.prank(buyer1);
        uint256 tokenId = ticketFactory.mintTicket{value: VIP_PRICE}(
            eventId,
            0,
            buyer1
        );

        // Setup resale
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(eventId);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);

        // Enable resale after event starts
        vm.warp(eventDate + 1 hours);

        // Enable transfers first (required for resale)
        vm.prank(organizer);
        ticketContract.setTransferEnabled(true);

        // Set resale rules
        vm.prank(owner);
        resaleMarketplace.setResaleRules(
            address(ticketContract),
            2,    // max 2x price
            10,   // 10% royalty
            eventDate,
            true
        );

        // List ticket for resale
        uint256 resalePrice = VIP_PRICE * 15 / 10; // 1.5x original
        vm.startPrank(buyer1);
        ticketContract.approve(address(resaleMarketplace), tokenId);
        resaleMarketplace.listTicket(
            address(ticketContract),
            tokenId,
            resalePrice
        );
        vm.stopPrank();

        // Verify listing
        (address seller, uint256 price) = resaleMarketplace.listings(address(ticketContract), tokenId);
        assertEq(seller, buyer1);
        assertEq(price, resalePrice);

        // Buy the resale ticket - capture balances right before resale transaction
        uint256 buyer2BalanceBefore = buyer2.balance;
        uint256 organizerBalanceBefore = organizer.balance;
        uint256 buyer1BalanceBefore = buyer1.balance;

        vm.prank(buyer2);
        resaleMarketplace.buyTicket{value: resalePrice}(
            address(ticketContract),
            tokenId
        );

        // Verify transfers
        assertEq(ticketContract.ownerOf(tokenId), buyer2);
        assertEq(buyer2.balance, buyer2BalanceBefore - resalePrice);
        
        // 10% royalty (0.015 ether) should go to organizer
        assertEq(organizer.balance, organizerBalanceBefore + (resalePrice * 10 / 100));
        
        // 90% (0.135 ether) to original seller
        assertEq(buyer1.balance, buyer1BalanceBefore + (resalePrice * 90 / 100));
    }

    function testRevenueSharing() public {
        vm.prank(organizer);
        revenueSharing.depositRevenue{value: 1 ether}(organizer);

        // Verify 10% platform fee and 90% to organizer
        assertEq(revenueSharing.balances(address(revenueSharing), platform), 0.1 ether);
        assertEq(revenueSharing.balances(address(revenueSharing), organizer), 0.9 ether);

        // Test withdrawal
        uint256 organizerBalanceBefore = organizer.balance;
        vm.prank(organizer);
        revenueSharing.withdraw(organizer);

        assertEq(organizer.balance, organizerBalanceBefore + 0.9 ether);
        assertEq(revenueSharing.balances(address(revenueSharing), organizer), 0);
    }

    function testTransferRestrictions() public {
        uint256 eventId = _createEvent();
        
        vm.prank(buyer1);
        uint256 tokenId = ticketFactory.mintTicket{value: VIP_PRICE}(
            eventId,
            0,
            buyer1
        );

        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(eventId);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);

        // Should fail before event
        vm.prank(buyer1);
        vm.expectRevert("Transfers is NOT enabled or event has NOT ended");
        ticketContract.transferFrom(buyer1, buyer2, tokenId);

        // Fast forward to after event
        vm.warp(eventDate + 1 hours);

        // Still fails without enabling transfers
        vm.prank(buyer1);
        vm.expectRevert("Transfers is NOT enabled or event has NOT ended");
        ticketContract.transferFrom(buyer1, buyer2, tokenId);

        // Enable transfers
        vm.prank(organizer);
        ticketContract.setTransferEnabled(true);

        // Now succeeds
        vm.prank(buyer1);
        ticketContract.transferFrom(buyer1, buyer2, tokenId);
        assertEq(ticketContract.ownerOf(tokenId), buyer2);
    }

    function testCannotMintAfterEvent() public {
        uint256 eventId = _createEvent();
        
        // Fast forward past event
        vm.warp(eventDate + 1 days);

        vm.prank(buyer1);
        vm.expectRevert("Event has ended");
        ticketFactory.mintTicket{value: VIP_PRICE}(
            eventId,
            0,
            buyer1
        );
    }

    function testCannotMintSoldOut() public {
        uint256 eventId = _createEvent();
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(eventId);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);

        // Mint all VIP tickets (max 100)
        for (uint256 i = 0; i < 100; i++) {
            vm.prank(buyer1);
            ticketFactory.mintTicket{value: VIP_PRICE}(eventId, 0, buyer1);
        }

        // Attempt to mint one more
        vm.prank(buyer1);
        vm.expectRevert("Type sold out");
        ticketFactory.mintTicket{value: VIP_PRICE}(eventId, 0, buyer1);
    }
}