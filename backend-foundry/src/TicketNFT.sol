// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title TicketNFT - Represents a single concert event's tickets
contract TicketNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    struct TicketData {
        uint8 ticketType; // 0 = Standard, 1 = Premium, 2 = VIP
    }

    uint256 public eventId;
    uint256 public eventDate;
    string private _baseTokenURI;
    uint256 private _nextTokenId;
    bool public transfersLocked;

    mapping(uint256 => TicketData) public ticketInfo;
    mapping(address => uint256) public ticketsOwned;

    event TicketMinted(address to, uint256 tokenId, uint8 ticketType);

    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 eventId_,
        uint256 eventDate_,
        address initialOwner
    ) external initializer {
        __ERC721_init(name_, symbol_);
        __Ownable_init(initialOwner);
        _baseTokenURI = baseURI_;
        eventId = eventId_;
        eventDate = eventDate_;
        _nextTokenId = 1;
        transfersLocked = true;
    }

    function mint(address to, uint8 ticketType) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        ticketInfo[tokenId] = TicketData(ticketType);
        ticketsOwned[to]++;
        emit TicketMinted(to, tokenId, ticketType);
        return tokenId;
    }

    function toggleTransfers() external onlyOwner {
        transfersLocked = !transfersLocked;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            require(!transfersLocked || block.timestamp >= eventDate, "Transfers locked until after event");
            ticketsOwned[from]--;
            ticketsOwned[to]++;
        }

        return super._update(to, tokenId, auth);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}