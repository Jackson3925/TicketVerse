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