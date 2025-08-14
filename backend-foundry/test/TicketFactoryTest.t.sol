// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TicketFactory.sol";
import "../src/TicketNFT.sol";

contract TicketFactoryTest is Test {
    TicketFactory public ticketFactory;
    TicketNFT public ticketNFTImplementation;

    address owner = makeAddr("owner");
    address organizer = makeAddr("organizer");
    address buyer = makeAddr("buyer");

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.deal(organizer, 100 ether);
        vm.deal(buyer, 100 ether);

        vm.prank(owner);
        ticketNFTImplementation = new TicketNFT();

        vm.prank(owner);
        ticketFactory = new TicketFactory(address(ticketNFTImplementation));
    }

    function test_CreateEventAndTransferFee() public {
        uint256 creationFee = ticketFactory.EVENT_CREATION_FEE();
        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(organizer);
        vm.expectEmit(true, true, false, true);
        emit TicketFactory.FeeTransferred(owner, creationFee);
        address ticketContract = ticketFactory.createEvent{value: creationFee}(
            "Test Event", "Test Description", block.timestamp + 1 days, organizer, _createDummyTicketTypes()
        );

        // Check event creation
        (uint256 id,, address org,,,,, bool isActive,,) = ticketFactory.events(1);
        assertEq(id, 1);
        assertEq(org, organizer);
        assertEq(isActive, true);

        // Check fee transfer
        assertEq(owner.balance, ownerBalanceBefore + creationFee);
    }

    function test_RevertIfInsufficientCreationFee() public {
        uint256 insufficientFee = ticketFactory.EVENT_CREATION_FEE() - 0.001 ether;

        vm.prank(organizer);
        vm.expectRevert("Insufficient creation fee");
        ticketFactory.createEvent{value: insufficientFee}(
            "Test Event", "Test Description", block.timestamp + 1 days, organizer, _createDummyTicketTypes()
        );
    }

    function test_MintTicketAndTransferPayment() public {
        uint256 creationFee = ticketFactory.EVENT_CREATION_FEE();
        uint256 ticketPrice = 0.1 ether;

        // Create event first, then get organizer balance after creation fee is paid
        vm.prank(organizer);
        address ticketContract = ticketFactory.createEvent{value: creationFee}(
            "Test Event",
            "Test Description",
            block.timestamp + 1 days,
            organizer,
            _createTicketTypesWithPrice(ticketPrice)
        );

        // Get organizer balance after event creation (after paying creation fee)
        uint256 organizerBalanceBefore = organizer.balance;

        // Mint ticket
        vm.prank(buyer);
        vm.expectEmit(true, true, false, true);
        emit TicketFactory.FeeTransferred(organizer, ticketPrice);
        uint256 tokenId = ticketFactory.mintTicket{value: ticketPrice}(
            1, // eventId
            0, // ticketTypeId
            buyer
        );

        // Verify ticket was minted
        TicketNFT ticketNFT = TicketNFT(ticketContract);
        assertEq(ticketNFT.ownerOf(tokenId), buyer);

        // Verify payment was transferred (organizer should receive ticket price)
        assertEq(organizer.balance, organizerBalanceBefore + ticketPrice);

        // Verify event stats
        (,,,,,,,, uint256 totalTicketsSold, uint256 totalRevenue) = ticketFactory.events(1);
        assertEq(totalTicketsSold, 1);
        assertEq(totalRevenue, ticketPrice);
    }

    function test_RevertIfInsufficientTicketPayment() public {
        uint256 creationFee = ticketFactory.EVENT_CREATION_FEE();
        uint256 ticketPrice = 0.1 ether;

        // Create event
        vm.prank(organizer);
        ticketFactory.createEvent{value: creationFee}(
            "Test Event",
            "Test Description",
            block.timestamp + 1 days,
            organizer,
            _createTicketTypesWithPrice(ticketPrice)
        );

        // Attempt to mint with insufficient payment
        vm.prank(buyer);
        vm.expectRevert("Insufficient payment");
        ticketFactory.mintTicket{value: ticketPrice - 0.01 ether}(
            1, // eventId
            0, // ticketTypeId
            buyer
        );
    }

    function test_RevertIfEventNotActive() public {
        uint256 creationFee = ticketFactory.EVENT_CREATION_FEE();
        uint256 ticketPrice = 0.1 ether;

        // Create event
        vm.prank(organizer);
        ticketFactory.createEvent{value: creationFee}(
            "Test Event",
            "Test Description",
            block.timestamp + 1 days,
            organizer,
            _createTicketTypesWithPrice(ticketPrice)
        );

        // Deactivate event
        vm.prank(owner);
        ticketFactory.setEventActive(1, false);

        // Attempt to mint
        vm.prank(buyer);
        vm.expectRevert("Event is not active");
        ticketFactory.mintTicket{value: ticketPrice}(
            1, // eventId
            0, // ticketTypeId
            buyer
        );
    }

    function test_OnlyOwnerCanChangeEventStatus() public {
        uint256 creationFee = ticketFactory.EVENT_CREATION_FEE();

        // Create event
        vm.prank(organizer);
        ticketFactory.createEvent{value: creationFee}(
            "Test Event", "Test Description", block.timestamp + 1 days, organizer, _createDummyTicketTypes()
        );

        // Non-owner cannot change status
        vm.prank(organizer);
        vm.expectRevert();
        ticketFactory.setEventActive(1, false);

        // Owner can change status
        vm.prank(owner);
        ticketFactory.setEventActive(1, false);

        (,,,,,,, bool isActive,,) = ticketFactory.events(1);
        assertEq(isActive, false);
    }

    // Helper functions
    function _createDummyTicketTypes() private pure returns (TicketNFT.TicketType[] memory) {
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType("VIP", 0.1 ether, 100, 0, "ipfs://QmVIP");
        return ticketTypes;
    }

    function _createTicketTypesWithPrice(uint256 price) private pure returns (TicketNFT.TicketType[] memory) {
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType("VIP", price, 100, 0, "ipfs://QmVIP");
        return ticketTypes;
    }
}
