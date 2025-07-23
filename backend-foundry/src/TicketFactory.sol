// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TicketNFT.sol";

contract TicketFactory is Ownable {
    using Clones for address;

    struct Event {
        uint256 id;
        address ticketContract;
        address organizer;
        string name;
        string description;
        uint256 eventDate;
        uint256 createdAt;
        bool isActive;
        uint256 totalTicketsSold;
        uint256 totalRevenue;
    }

    uint256 public eventCounter;
    uint256 public constant EVENT_CREATION_FEE = 0.01 ether;
    mapping(uint256 => Event) public events;
    Event[] public eventList;
    address public immutable implementation;

    event EventCreated(uint256 indexed eventId, address indexed organizer, address ticketContract);
    event TicketMinted(uint256 indexed eventId, uint256 indexed tokenId, address recipient);
    event EventStatusChanged(uint256 indexed eventId, bool active);
    event FeeTransferred(address indexed recipient, uint256 amount);

    constructor(address _implementation) Ownable(msg.sender) {
        implementation = _implementation;
    }

    function createEvent(
        string memory name,
        string memory description,
        uint256 eventDate,
        address organizer,
        TicketNFT.TicketType[] memory ticketTypes
    ) external payable returns (address ticketContract) {
        require(msg.value >= EVENT_CREATION_FEE, "Insufficient creation fee");
        
        // Automatically transfer fee to platform owner
        (bool feeSent, ) = owner().call{value: msg.value}("");
        require(feeSent, "Fee transfer failed");
        emit FeeTransferred(owner(), msg.value);

        eventCounter++;

        address clone = implementation.clone();
        TicketNFT(clone).initialize(name, "TIX", eventDate, ticketTypes, organizer);

        Event storage newEvent = events[eventCounter];
        newEvent.id = eventCounter;
        newEvent.ticketContract = clone;
        newEvent.organizer = organizer;
        newEvent.name = name;
        newEvent.description = description;
        newEvent.eventDate = eventDate;
        newEvent.createdAt = block.timestamp;
        newEvent.isActive = true;

        eventList.push(newEvent);
        emit EventCreated(eventCounter, organizer, clone);
        return clone;
    }

    function mintTicket(
        uint256 eventId,
        uint256 ticketTypeId,
        address recipient
    ) external payable returns (uint256 tokenId) {
        Event storage e = events[eventId];
        require(e.isActive, "Event is not active");

        // Add this check to prevent minting after event date
        require(block.timestamp <= e.eventDate, "Event has ended");
        
        // Get ticket price from NFT contract
        TicketNFT ticketContract = TicketNFT(e.ticketContract);
        uint256 ticketPrice = ticketContract.getTicketTypePrice(ticketTypeId);
        require(msg.value >= ticketPrice, "Insufficient payment");
        
        // Mint ticket (no value forwarded)
        tokenId = ticketContract.mintTicket(ticketTypeId, recipient);
        
        // Transfer payment to organizer
        (bool success, ) = e.organizer.call{value: ticketPrice}("");
        require(success, "Payment transfer failed");
        
        // Refund any excess payment
        if (msg.value > ticketPrice) {
            (success, ) = msg.sender.call{value: msg.value - ticketPrice}("");
            require(success, "Refund failed");
        }

        emit FeeTransferred(e.organizer, ticketPrice);
        e.totalTicketsSold++;
        e.totalRevenue += ticketPrice;
        emit TicketMinted(eventId, tokenId, recipient);
        
        return tokenId;
    }

    // // In TicketFactory.sol
    // function mintTicketsMultiType(
    //     uint256 eventId,
    //     uint256[] calldata ticketTypeIds,
    //     uint256[] calldata quantities,
    //     address recipient
    // ) external payable returns (uint256[] memory) {
    //     require(ticketTypeIds.length == quantities.length, "Arrays length mismatch");
    //     require(ticketTypeIds.length > 0, "No ticket types specified");

    //     Event storage e = events[eventId];
    //     require(e.isActive, "Event is not active");

    //     TicketNFT ticketContract = TicketNFT(e.ticketContract);
    //     uint256 totalPrice;
        
    //     // Calculate total price and check supplies first
    //     for (uint256 i = 0; i < ticketTypeIds.length; i++) {
    //         uint256 ticketTypeId = ticketTypeIds[i];
    //         uint256 quantity = quantities[i];
            
    //         // Get ticket type details - this is the corrected approach
    //         (string memory name, uint256 price, uint256 maxSupply, uint256 currentSupply, string memory metadataURI) = 
    //             ticketContract.ticketTypes(ticketTypeId);
            
    //         require(price > 0, "Invalid ticket type"); // Check if ticket type exists
    //         require(currentSupply + quantity <= maxSupply, "Type sold out");
            
    //         totalPrice += price * quantity;
    //     }
        
    //     require(msg.value >= totalPrice, "Insufficient payment");

    //     // Mint all tickets
    //     uint256 totalTickets;
    //     for (uint256 i = 0; i < quantities.length; i++) {
    //         totalTickets += quantities[i];
    //     }
        
    //     uint256[] memory tokenIds = new uint256[](totalTickets);
    //     uint256 counter;
        
    //     for (uint256 i = 0; i < ticketTypeIds.length; i++) {
    //         for (uint256 j = 0; j < quantities[i]; j++) {
    //             uint256 tokenId = ticketContract.mintTicket(ticketTypeIds[i], recipient);
    //             tokenIds[counter] = tokenId;
    //             counter++;
    //             e.totalTicketsSold++;
    //             e.totalRevenue += ticketContract.getTicketTypePrice(ticketTypeIds[i]);
    //             emit TicketMinted(eventId, tokenId, recipient);
    //         }
    //     }

    //     // Handle payment
    //     (bool success, ) = e.organizer.call{value: totalPrice}("");
    //     require(success, "Payment transfer failed");
        
    //     if (msg.value > totalPrice) {
    //         (success, ) = msg.sender.call{value: msg.value - totalPrice}("");
    //         require(success, "Refund failed");
    //     }

    //     return tokenIds;
    // }

    function setEventActive(uint256 eventId, bool active) external onlyOwner {
        events[eventId].isActive = active;
        emit EventStatusChanged(eventId, active);
    }

    function getEvent(uint256 eventId) external view returns (Event memory) {
        return events[eventId];
    }

    function getAllEvents() external view returns (Event[] memory) {
        return eventList;
    }
}