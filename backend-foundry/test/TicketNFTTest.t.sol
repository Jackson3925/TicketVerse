// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TicketNFT.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TicketNFTTest is Test {
    TicketNFT public ticketNFT;
    address owner = makeAddr("owner");
    address organizer = makeAddr("organizer");
    address buyer = makeAddr("buyer");
    address factory = makeAddr("factory");

    function setUp() public {
        vm.prank(owner);
        vm.deal(buyer, 100 ether);
        ticketNFT = new TicketNFT();
    }

    function test_Initialize() public {
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType(
            "VIP",
            0.1 ether,
            100,
            0,
            "ipfs://QmVIP"
        );

        vm.prank(factory);
        ticketNFT.initialize(
            "Concert",
            "TIX",
            block.timestamp + 1 days,
            ticketTypes,
            organizer
        );

        assertEq(ticketNFT.name(), "Concert");
        assertEq(ticketNFT.symbol(), "TIX");
        assertEq(ticketNFT.owner(), organizer);
        assertEq(ticketNFT.getTicketTypePrice(0), 0.1 ether);
    }

    function test_RevertIfDoubleInitialize() public {
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType(
            "VIP",
            0.1 ether,
            100,
            0,
            "ipfs://QmVIP"
        );

        vm.prank(factory);
        ticketNFT.initialize(
            "Concert",
            "TIX",
            block.timestamp + 1 days,
            ticketTypes,
            organizer
        );

        vm.prank(factory);
        vm.expectRevert("Already initialized");
        ticketNFT.initialize(
            "Concert",
            "TIX",
            block.timestamp + 1 days,
            ticketTypes,
            organizer
        );
    }

    function test_MintTicket() public {
        // Setup initialized contract
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType(
            "VIP",
            0.1 ether,
            100,
            0,
            "ipfs://QmVIP"
        );

        vm.prank(factory);
        ticketNFT.initialize(
            "Concert",
            "TIX",
            block.timestamp + 1 days,
            ticketTypes,
            organizer
        );

        // Test minting
        vm.prank(factory);
        uint256 tokenId = ticketNFT.mintTicket(0, buyer);

        assertEq(ticketNFT.ownerOf(tokenId), buyer);
        (, , , uint256 currentSupply, ) = ticketNFT.ticketTypes(0);
        assertEq(currentSupply, 1);
    }

    function test_RevertMintIfNotFactory() public {
        // Setup initialized contract
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType(
            "VIP",
            0.1 ether,
            100,
            0,
            "ipfs://QmVIP"
        );

        vm.prank(factory);
        ticketNFT.initialize(
            "Concert",
            "TIX",
            block.timestamp + 1 days,
            ticketTypes,
            organizer
        );

        // Attempt mint from non-factory
        vm.prank(buyer);
        vm.expectRevert("Only factory can mint");
        ticketNFT.mintTicket(0, buyer);
    }

    function test_TransferRestrictions() public {
        // Setup initialized contract
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType(
            "VIP",
            0.1 ether,
            100,
            0,
            "ipfs://QmVIP"
        );

        vm.prank(factory);
        ticketNFT.initialize(
            "Concert",
            "TIX",
            block.timestamp + 1 days,
            ticketTypes,
            organizer
        );

        // Mint a ticket
        vm.prank(factory);
        uint256 tokenId = ticketNFT.mintTicket(0, buyer);

        // Try to transfer before event date
        vm.prank(buyer);
        vm.expectRevert("Transfers is NOT enabled or event has NOT ended");
        ticketNFT.transferFrom(buyer, organizer, tokenId);

        // Fast forward to after event date
        vm.warp(block.timestamp + 2 days);

        // Try to transfer before enabling transfers after event date
        vm.prank(buyer);
        vm.expectRevert("Transfers is NOT enabled or event has NOT ended");
        ticketNFT.transferFrom(buyer, organizer, tokenId);

        // Enable transfers
        vm.prank(organizer);
        ticketNFT.setTransferEnabled(true);

        // Transfer should now work
        vm.prank(buyer);
        ticketNFT.transferFrom(buyer, organizer, tokenId);
        assertEq(ticketNFT.ownerOf(tokenId), organizer);
    }

    function test_TokenURI() public {
        // Setup initialized contract
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType(
            "VIP",
            0.1 ether,
            100,
            0,
            "ipfs://QmVIP"
        );

        vm.prank(factory);
        ticketNFT.initialize(
            "Concert",
            "TIX",
            block.timestamp + 1 days,
            ticketTypes,
            organizer
        );

        // Mint a ticket
        vm.prank(factory);
        uint256 tokenId = ticketNFT.mintTicket(0, buyer);

        // Get token URI
        string memory uri = ticketNFT.tokenURI(tokenId);
        
        // 1. Verify URI structure
        assertTrue(bytes(uri).length > 0, "URI empty");
        assertTrue(startsWith(uri, "data:application/json;base64,"), "Invalid prefix");
        
        // 2. Verify JSON content
        string memory json = decodeBase64JSON(uri);
        
        // Check required fields exist
        assertTrue(
            contains(json, '"name":"VIP #1"') &&
            contains(json, '"description":"Concert ticket for Concert"') &&
            contains(json, '"image":"ipfs://QmVIP"'),
            "Missing required fields"
        );
        
        // Check attributes
        assertTrue(
            contains(json, '"trait_type":"Event","value":"Concert"') &&
            contains(json, '"trait_type":"Ticket Type","value":"VIP"') &&
            contains(json, '"trait_type":"Price","value":"100000000000000000"'),
            "Incorrect attributes"
        );
    }

    // debug
    function decodeBase64JSON(string memory uri) internal pure returns (string memory) {
        bytes memory uriBytes = bytes(uri);
        string memory prefix = "data:application/json;base64,";
        bytes memory prefixBytes = bytes(prefix);
        
        require(uriBytes.length > prefixBytes.length, "URI too short");
        
        // Extract prefix bytes manually
        bytes memory actualPrefix = new bytes(prefixBytes.length);
        for (uint i = 0; i < prefixBytes.length; i++) {
            actualPrefix[i] = uriBytes[i];
        }
        
        require(
            keccak256(actualPrefix) == keccak256(prefixBytes),
            "Invalid URI prefix"
        );

        bytes memory base64Data = new bytes(uriBytes.length - prefixBytes.length);
        for (uint i = 0; i < base64Data.length; i++) {
            base64Data[i] = uriBytes[i + prefixBytes.length];
        }
        
        return string(Base64Decoder.decode(base64Data));
    }

    function startsWith(string memory str, string memory prefix) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory prefixBytes = bytes(prefix);
        if (prefixBytes.length > strBytes.length) return false;
        for (uint i = 0; i < prefixBytes.length; i++) {
            if (strBytes[i] != prefixBytes[i]) return false;
        }
        return true;
    }

    function contains(string memory str, string memory substr) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);
        if (substrBytes.length > strBytes.length) return false;
        for (uint i = 0; i <= strBytes.length - substrBytes.length; i++) {
            bool matching = true;
            for (uint j = 0; j < substrBytes.length; j++) {
                if (strBytes[i+j] != substrBytes[j]) {
                    matching = false;
                    break;
                }
            }
            if (matching) return true;
        }
        return false;
    }
}

// debug
library Base64Decoder {
    bytes constant private BASE64_TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    function decode(bytes memory _data) internal pure returns (bytes memory) {
        if (_data.length == 0) return new bytes(0);
        
        // Load the table into memory
        bytes memory table = BASE64_TABLE;

        uint256 decodedLen = (_data.length / 4) * 3;
        
        // Add extra 2 bytes for padding
        if (_data.length > 0 && _data[_data.length - 1] == "=") {
            decodedLen--;
            if (_data.length > 1 && _data[_data.length - 2] == "=") {
                decodedLen--;
            }
        }
        
        bytes memory result = new bytes(decodedLen);
        uint256 resultPtr;
        uint256 dataPtr;
        
        for (uint256 i = 0; i < _data.length; ) {
            uint256 b1 = _charToValue(_data[i++]);
            uint256 b2 = _charToValue(_data[i++]);
            uint256 b3 = _charToValue(_data[i++]);
            uint256 b4 = _charToValue(_data[i++]);
            
            uint256 n = (b1 << 18) | (b2 << 12) | (b3 << 6) | b4;
            
            result[resultPtr++] = bytes1(uint8(n >> 16));
            if (resultPtr < decodedLen) {
                result[resultPtr++] = bytes1(uint8(n >> 8));
                if (resultPtr < decodedLen) {
                    result[resultPtr++] = bytes1(uint8(n));
                }
            }
        }
        
        return result;
    }
    
    function _charToValue(bytes1 char) private pure returns (uint256) {
        if (char >= "A" && char <= "Z") return uint8(char) - uint8(bytes1("A"));
        if (char >= "a" && char <= "z") return uint8(char) - uint8(bytes1("a")) + 26;
        if (char >= "0" && char <= "9") return uint8(char) - uint8(bytes1("0")) + 52;
        if (char == "+") return 62;
        if (char == "/") return 63;
        if (char == "=") return 0; // Padding
        revert("Invalid base64 character");
    }
}