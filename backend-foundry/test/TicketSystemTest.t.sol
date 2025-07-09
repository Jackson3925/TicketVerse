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

    function setUp() public {
        vm.startPrank(owner);

        // Deploy all contracts
        ticketNFTImpl = new TicketNFT();
        ticketFactory = new TicketFactory(address(ticketNFTImpl));
        resaleMarketplace = new ResaleMarketplace();
        revenueSharing = new RevenueSharing(owner);

        vm.stopPrank();
    }

    function testCreateEvent() public {
        vm.startPrank(owner);

        // Prepare ticket types
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](2);
        ticketTypes[0] = TicketNFT.TicketType({
            name: "VIP",
            price: 0.1 ether,
            maxSupply: 100,
            currentSupply: 0,
            metadataURI: "ipfs://vip-ticket"
        });
        ticketTypes[1] = TicketNFT.TicketType({
            name: "General",
            price: 0.05 ether,
            maxSupply: 1000,
            currentSupply: 0,
            metadataURI: "ipfs://general-ticket"
        });

        uint256 eventDate = block.timestamp + 1 days;
        ticketFactory.createEvent(
            "Summer Concert",
            "Annual summer music festival",
            eventDate,
            organizer,
            ticketTypes
        );

        // Get event using the getter function
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(1);
        
        assertEq(eventInfo.id, 1);
        assertEq(eventInfo.organizer, organizer);
        assertEq(eventInfo.name, "Summer Concert");
        assertEq(eventInfo.eventDate, eventDate);
        assertTrue(eventInfo.isActive);

        vm.stopPrank();
    }

    function testMintTicket() public {
        // First create an event
        testCreateEvent();

        vm.startPrank(owner);

        // Mint a VIP ticket (type 0) to buyer1
        uint256 tokenId = ticketFactory.mintTicket{value: 0.1 ether}(
            1, // eventId
            0, // ticketTypeId
            buyer1
        );

        // Get ticket contract address
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(1);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);
        
        // Get ticket info as struct
        TicketNFT.TicketInfo memory ticketInfo = ticketContract.getTicketInfo(tokenId);
        
        assertEq(ticketInfo.ticketTypeId, 0);
        assertEq(ticketInfo.price, 0.1 ether);
        assertEq(ticketContract.ownerOf(tokenId), buyer1);

        // Verify factory stats
        eventInfo = ticketFactory.getEvent(1);
        assertEq(eventInfo.totalTicketsSold, 1);
        assertEq(eventInfo.totalRevenue, 0.1 ether);

        vm.stopPrank();
    }

    function testResaleMarketplace() public {
        // Setup: create event and mint ticket
        testMintTicket();

        vm.startPrank(buyer1);

        // Get ticket contract address
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(1);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);

        // Approve marketplace and list ticket
        ticketContract.approve(address(resaleMarketplace), 1);

        // Enable resale after event starts
        vm.warp(eventInfo.eventDate + 1); // Fast forward to after event starts

        // Set resale rules first
        resaleMarketplace.setResaleRules(
            address(ticketContract),
            2,    // maxPriceMultiplier
            10,   // royaltyPercentage
            eventInfo.eventDate, // resaleStartTime
            true   // resaleEnabled
        );

        // List ticket
        resaleMarketplace.listTicket(
            address(ticketContract),
            1,
            0.15 ether // 1.5x original price
        );

        // Verify listing - get the full Listing struct
        (address seller, uint256 price) = resaleMarketplace.listings(address(ticketContract), 1);
        assertEq(seller, buyer1);
        assertEq(price, 0.15 ether);

        // Buy the ticket
        vm.startPrank(buyer2);
        resaleMarketplace.buyTicket{value: 0.15 ether}(
            address(ticketContract),
            1
        );

        // Verify transfer
        assertEq(ticketContract.ownerOf(1), buyer2);
        (seller, price) = resaleMarketplace.listings(address(ticketContract), 1);
        assertEq(seller, address(0));

        vm.stopPrank();
    }

    function testRevenueSharing() public {
        vm.startPrank(owner);

        // Deposit revenue
        uint256 amount = 1 ether;
        revenueSharing.depositRevenue{value: amount}(organizer);

        // Verify balances
        assertEq(address(revenueSharing).balance, amount);
        assertEq(revenueSharing.balances(address(revenueSharing), owner), 0.1 ether); // 10% platform fee
        assertEq(revenueSharing.balances(address(revenueSharing), organizer), 0.9 ether); // 90% organizer

        // Withdraw organizer's share
        vm.startPrank(organizer);
        uint256 initialBalance = organizer.balance;
        revenueSharing.withdraw(organizer);
        assertEq(organizer.balance, initialBalance + 0.9 ether);
        assertEq(revenueSharing.balances(address(revenueSharing), organizer), 0);

        vm.stopPrank();
    }

    function testTransferRestrictions() public {
        testMintTicket();

        // Get ticket contract address
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(1);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);

        // Try to transfer before event (should fail)
        vm.startPrank(buyer1);
        vm.expectRevert("Transfers disabled before event");
        ticketContract.transferFrom(buyer1, buyer2, 1);

        // Fast forward to after event
        vm.warp(eventInfo.eventDate + 1);

        // Enable transfers
        ticketContract.setTransferEnabled(true);

        // Transfer should now succeed
        ticketContract.transferFrom(buyer1, buyer2, 1);
        assertEq(ticketContract.ownerOf(1), buyer2);

        vm.stopPrank();
    }
}