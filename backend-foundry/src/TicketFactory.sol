// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TicketNFT.sol";

/// @title TicketFactory - Manages creation of events and TicketNFT contracts
contract TicketFactory is Ownable {
    using Clones for address;

    struct Event {
        uint256 id;
        string name;
        uint256 date;
        uint256 totalSupply;
        uint256 minted;
        address nftAddress;
        mapping(uint8 => uint256) ticketTypeCaps;
        mapping(uint8 => uint256) ticketTypeMinted;
    }

    uint256 public eventCounter;
    mapping(uint256 => Event) public events;

    address public immutable implementation;

    event EventCreated(uint256 indexed eventId, address indexed nftAddress);
    event TicketIssued(uint256 indexed eventId, address indexed to, uint256 tokenId, uint8 ticketType);

    constructor(address _implementation) Ownable(msg.sender) {
        implementation = _implementation;
    }


    function createEvent(
        string memory name,
        uint256 date,
        uint256 totalSupply,
        string memory baseURI,
        uint256[3] memory ticketTypeCaps
    ) external onlyOwner {
        eventCounter++;

        address clone = implementation.clone();
        TicketNFT(clone).initialize(name, "TIX", baseURI, eventCounter, date, owner());

        Event storage newEvent = events[eventCounter];
        newEvent.id = eventCounter;
        newEvent.name = name;
        newEvent.date = date;
        newEvent.totalSupply = totalSupply;
        newEvent.nftAddress = clone;

        for (uint8 i = 0; i < 3; i++) {
            newEvent.ticketTypeCaps[i] = ticketTypeCaps[i];
        }

        emit EventCreated(eventCounter, clone);
    }

    function mintTicket(uint256 eventId, uint8 ticketType, address to) external onlyOwner {
        Event storage e = events[eventId];
        require(e.minted < e.totalSupply, "Sold out");
        require(e.ticketTypeMinted[ticketType] < e.ticketTypeCaps[ticketType], "Type sold out");

        uint256 tokenId = TicketNFT(e.nftAddress).mint(to, ticketType);
        e.minted++;
        e.ticketTypeMinted[ticketType]++;

        emit TicketIssued(eventId, to, tokenId, ticketType);
    }

    function getNFTAddress(uint256 eventId) external view returns (address) {
        return events[eventId].nftAddress;
    }
}