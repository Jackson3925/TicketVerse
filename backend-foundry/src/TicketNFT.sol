// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, Ownable {
    struct TicketType {
        string name;
        uint256 price;
        uint256 maxSupply;
        uint256 currentSupply;
        string metadataURI;
    }

    struct TicketInfo {
        uint256 ticketTypeId;
        uint256 price;
        uint256 mintTimestamp;
        bool isValidated;
        bool isUsed;
    }

    string private _eventName;
    string private _eventSymbol;
    uint256 public eventDate;
    bool public transferEnabled;
    uint256 public nextTokenId;
    bool public initialized;

    TicketType[] public ticketTypes;
    mapping(uint256 => TicketInfo) public ticketDetails;
    mapping(uint256 => bool) private _mintedTokens;

    event TicketMinted(uint256 indexed tokenId, address recipient, uint256 ticketTypeId);
    event TransfersToggled(bool enabled);

    // Constructor with required parameters for both ERC721 and Ownable
    constructor() ERC721("TEMP_NAME", "TEMP_SYMBOL") Ownable(msg.sender) {}

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 _eventDate,
        TicketType[] memory _types,
        address owner_
    ) external {
        require(!initialized, "Already initialized");
        initialized = true;

        _eventName = name_;
        _eventSymbol = symbol_;
        eventDate = _eventDate;
        nextTokenId = 1;
        transferEnabled = false;

        for (uint256 i = 0; i < _types.length; i++) {
            ticketTypes.push(_types[i]);
        }

        _transferOwnership(owner_);
    }

    function name() public view virtual override returns (string memory) {
        return _eventName;
    }

    function symbol() public view virtual override returns (string memory) {
        return _eventSymbol;
    }

    function mintTicket(uint256 ticketTypeId, address recipient) external payable returns (uint256) {
        require(ticketTypeId < ticketTypes.length, "Invalid ticket type");

        TicketType storage tt = ticketTypes[ticketTypeId];
        require(tt.currentSupply < tt.maxSupply, "Type sold out");
        require(msg.value >= tt.price, "Insufficient payment");

        uint256 tokenId = nextTokenId++;
        _safeMint(recipient, tokenId);

        ticketDetails[tokenId] = TicketInfo({
            ticketTypeId: ticketTypeId,
            price: tt.price,
            mintTimestamp: block.timestamp,
            isValidated: false,
            isUsed: false
        });

        _mintedTokens[tokenId] = true;
        tt.currentSupply++;
        emit TicketMinted(tokenId, recipient, ticketTypeId);
        return tokenId;
    }

    function setTransferEnabled(bool enabled) external onlyOwner {
        transferEnabled = enabled;
        emit TransfersToggled(enabled);
    }

    function validateTicket(uint256 tokenId) external view returns (bool) {
        require(_mintedTokens[tokenId], "Token does not exist");
        return !ticketDetails[tokenId].isUsed;
    }

    function getTicketInfo(uint256 tokenId) external view returns (TicketInfo memory) {
        require(_mintedTokens[tokenId], "Token does not exist");
        return ticketDetails[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_mintedTokens[tokenId], "Token does not exist");
        uint256 ticketTypeId = ticketDetails[tokenId].ticketTypeId;
        return ticketTypes[ticketTypeId].metadataURI;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Only check transfer restrictions for actual transfers (not minting/burning)
        if (from != address(0) && to != address(0)) {
            require(transferEnabled || block.timestamp > eventDate, "Transfers disabled before event");
        }

        return super._update(to, tokenId, auth);
    }
}