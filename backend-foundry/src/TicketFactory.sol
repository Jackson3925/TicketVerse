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
    mapping(uint256 => Event) public events;
    Event[] public eventList;
    address public immutable implementation;

    event EventCreated(uint256 indexed eventId, address indexed organizer, address ticketContract);
    event TicketMinted(uint256 indexed eventId, uint256 indexed tokenId, address recipient);
    event EventStatusChanged(uint256 indexed eventId, bool active);

    constructor(address _implementation) Ownable(msg.sender) {
        implementation = _implementation;
    }

    function createEvent(
        string memory name,
        string memory description,
        uint256 eventDate,
        address organizer,
        TicketNFT.TicketType[] memory ticketTypes
    ) external onlyOwner returns (address ticketContract) {
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
        tokenId = TicketNFT(e.ticketContract).mintTicket{value: msg.value}(ticketTypeId, recipient);
        e.totalTicketsSold++;
        e.totalRevenue += msg.value;
        emit TicketMinted(eventId, tokenId, recipient);
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
