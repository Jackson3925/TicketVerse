// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TicketNFT} from "../src/TicketNFT.sol";
import {TicketFactory} from "../src/TicketFactory.sol";
import {ResaleMarketplace} from "../src/ResaleMarketplace.sol";

contract TicketSystemTest is Test {
    TicketNFT public ticketNFTImpl;
    TicketFactory public ticketFactory;
    ResaleMarketplace public resaleMarketplace;

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
            "Summer Concert", "Annual summer music festival", eventDate, organizer, ticketTypes
        );

        return 1; // First event gets ID 1
    }

    function testTicketResale() public {
        uint256 eventId = _createEvent();

        // Mint initial ticket
        vm.prank(buyer1);
        uint256 tokenId = ticketFactory.mintTicket{value: VIP_PRICE}(eventId, 0, buyer1);

        // Setup resale
        TicketFactory.Event memory eventInfo = ticketFactory.getEvent(eventId);
        TicketNFT ticketContract = TicketNFT(eventInfo.ticketContract);

        // Enable resale after event starts
        vm.warp(eventDate + 1 hours);

        // Enable transfers first (required for resale)
        vm.prank(organizer);
        ticketContract.setTransferEnabled(true);

        // List ticket for resale (no need for setResaleRules)
        uint256 resalePrice = VIP_PRICE * 15 / 10; // 1.5x original
        vm.startPrank(buyer1);
        ticketContract.approve(address(resaleMarketplace), tokenId);
        resaleMarketplace.listTicket(address(ticketContract), tokenId, resalePrice);
        vm.stopPrank();

        // Verify listing
        (address seller, uint256 price) = resaleMarketplace.listings(address(ticketContract), tokenId);
        assertEq(seller, buyer1);
        assertEq(price, resalePrice);

        // Buy the resale ticket - capture balances right before resale transaction
        uint256 buyer2BalanceBefore = buyer2.balance;
        uint256 organizerBalanceBefore = organizer.balance;
        uint256 buyer1BalanceBefore = buyer1.balance;
        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(buyer2);
        resaleMarketplace.buyTicket{value: resalePrice}(address(ticketContract), tokenId);

        // Verify transfers
        assertEq(ticketContract.ownerOf(tokenId), buyer2);
        assertEq(buyer2.balance, buyer2BalanceBefore - resalePrice);

        // 2% royalty (0.003 ether) should go to organizer
        uint256 expectedRoyalty = (resalePrice * 2) / 100;
        assertEq(organizer.balance, organizerBalanceBefore + expectedRoyalty);

        // 1% platform fee (0.0015 ether) to owner
        uint256 expectedPlatformFee = (resalePrice * 1) / 100;
        assertEq(owner.balance, ownerBalanceBefore + expectedPlatformFee);

        // 97% (0.1455 ether) to original seller
        uint256 expectedSellerAmount = resalePrice - expectedRoyalty - expectedPlatformFee;
        assertEq(buyer1.balance, buyer1BalanceBefore + expectedSellerAmount);
    }

    function testTransferRestrictions() public {
        uint256 eventId = _createEvent();

        vm.prank(buyer1);
        uint256 tokenId = ticketFactory.mintTicket{value: VIP_PRICE}(eventId, 0, buyer1);

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
        ticketFactory.mintTicket{value: VIP_PRICE}(eventId, 0, buyer1);
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
