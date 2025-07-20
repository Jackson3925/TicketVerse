// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TicketNFT.sol";
import "../src/TicketFactory.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TestingTokenURI is Test {
    using Strings for uint256;
    
    TicketNFT public ticketNFTImpl;
    TicketFactory public factory;
    address owner = makeAddr("owner");
    address organizer = makeAddr("organizer");
    address buyer1 = makeAddr("buyer1");

    function setUp() public {
        // Deploy implementation and factory
        vm.prank(owner);
        ticketNFTImpl = new TicketNFT();
        
        vm.prank(owner);
        factory = new TicketFactory(address(ticketNFTImpl));
        
        // Give buyer1 some ETH
        vm.deal(buyer1, 10 ether);
    }

    function testTokenURIBasicStructure() public {
        // Create test ticket type
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType({
            name: "VIP",
            price: 0.1 ether,
            maxSupply: 100,
            currentSupply: 0,
            metadataURI: "https://gateway.pinata.cloud/ipfs/QmVIPticket"
        });

        // Create event
        vm.prank(owner);
        address ticketContract = factory.createEvent(
            "Summer Fest", 
            "FEST", 
            block.timestamp + 1 days, 
            organizer, 
            ticketTypes
        );
        
        // Mint ticket
        vm.prank(buyer1);
        uint256 tokenId = factory.mintTicket{value: 0.1 ether}(1, 0, buyer1);

        // Get ticket contract instance
        TicketNFT ticket = TicketNFT(ticketContract);

        // Test tokenURI
        string memory uri = ticket.tokenURI(tokenId);
        
        // Basic structure checks
        assertTrue(bytes(uri).length > 0, "URI should not be empty");
        assertTrue(contains(uri, "data:application/json;base64,"), "Should contain base64 prefix");
        
        // Decode and verify JSON content
        string memory json = decodeBase64JSON(uri);
        console.log("Decoded JSON:", json);
        
        // Verify JSON contains expected fields
        assertTrue(contains(json, '"name":"VIP #1"'), "Should contain correct name");
        assertTrue(contains(json, '"description":"Concert ticket for Summer Fest"'), "Should contain description");
        assertTrue(contains(json, '"image":"https://gateway.pinata.cloud/ipfs/QmVIPticket"'), "Should contain image URL");
        assertTrue(contains(json, '"attributes":['), "Should contain attributes array");
    }

    function testTokenURIAttributes() public {
        // Create multiple ticket types
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](2);
        ticketTypes[0] = TicketNFT.TicketType({
            name: "General",
            price: 0.05 ether,
            maxSupply: 500,
            currentSupply: 0,
            metadataURI: "ipfs://QmGeneralTicket"
        });
        ticketTypes[1] = TicketNFT.TicketType({
            name: "Premium",
            price: 0.15 ether,
            maxSupply: 50,
            currentSupply: 0,
            metadataURI: "ipfs://QmPremiumTicket"
        });

        // Create event
        vm.prank(owner);
        address ticketContract = factory.createEvent(
            "Music Festival", 
            "MUSIC", 
            block.timestamp + 2 days, 
            organizer, 
            ticketTypes
        );
        
        // Mint different ticket types
        vm.prank(buyer1);
        uint256 tokenId1 = factory.mintTicket{value: 0.05 ether}(1, 0, buyer1);
        
        vm.prank(buyer1);
        uint256 tokenId2 = factory.mintTicket{value: 0.15 ether}(1, 1, buyer1);

        // Get ticket contract instance
        TicketNFT ticket = TicketNFT(ticketContract);

        // Test first ticket (General)
        string memory uri1 = ticket.tokenURI(tokenId1);
        string memory json1 = decodeBase64JSON(uri1);
        
        assertTrue(contains(json1, '"name":"General #1"'), "General ticket should have correct name");
        assertTrue(contains(json1, '"Ticket Type","value":"General"'), "Should contain General ticket type");
        assertTrue(contains(json1, '"Price","value":"50000000000000000"'), "Should contain correct price");

        // Test second ticket (Premium)
        string memory uri2 = ticket.tokenURI(tokenId2);
        string memory json2 = decodeBase64JSON(uri2);
        
        assertTrue(contains(json2, '"name":"Premium #2"'), "Premium ticket should have correct name");
        assertTrue(contains(json2, '"Ticket Type","value":"Premium"'), "Should contain Premium ticket type");
        assertTrue(contains(json2, '"Price","value":"150000000000000000"'), "Should contain correct price");
    }

    function testTokenURIForNonExistentToken() public {
        // Create event with ticket types
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType({
            name: "Standard",
            price: 0.08 ether,
            maxSupply: 100,
            currentSupply: 0,
            metadataURI: "ipfs://QmStandardTicket"
        });

        vm.prank(owner);
        address ticketContract = factory.createEvent(
            "Test Event", 
            "TEST", 
            block.timestamp + 1 days, 
            organizer, 
            ticketTypes
        );
        
        TicketNFT ticket = TicketNFT(ticketContract);

        // Try to get URI for non-existent token
        vm.expectRevert("Token does not exist");
        ticket.tokenURI(999);
    }

    function testTokenURIJSONValidStructure() public {
        // Create ticket type
        TicketNFT.TicketType[] memory ticketTypes = new TicketNFT.TicketType[](1);
        ticketTypes[0] = TicketNFT.TicketType({
            name: "Early Bird",
            price: 0.03 ether,
            maxSupply: 200,
            currentSupply: 0,
            metadataURI: "https://example.com/early-bird.png"
        });

        vm.prank(owner);
        address ticketContract = factory.createEvent(
            "Concert 2024", 
            "CON24", 
            block.timestamp + 3 days, 
            organizer, 
            ticketTypes
        );
        
        vm.prank(buyer1);
        uint256 tokenId = factory.mintTicket{value: 0.03 ether}(1, 0, buyer1);

        TicketNFT ticket = TicketNFT(ticketContract);

        string memory uri = ticket.tokenURI(tokenId);
        string memory json = decodeBase64JSON(uri);
        
        // Check JSON structure
        assertTrue(contains(json, '{"name":"'), "Should start with name field");
        assertTrue(contains(json, '"description":"'), "Should contain description field");
        assertTrue(contains(json, '"image":"'), "Should contain image field");
        assertTrue(contains(json, '"attributes":['), "Should contain attributes array");
        assertTrue(contains(json, ']}'), "Should end with proper closing");
    }

    function testMultipleEventsTokenURI() public {
        // Create first event
        TicketNFT.TicketType[] memory ticketTypes1 = new TicketNFT.TicketType[](1);
        ticketTypes1[0] = TicketNFT.TicketType({
            name: "VIP",
            price: 0.2 ether,
            maxSupply: 50,
            currentSupply: 0,
            metadataURI: "ipfs://QmEvent1VIP"
        });

        vm.prank(owner);
        address ticketContract1 = factory.createEvent(
            "Event One", 
            "E1", 
            block.timestamp + 1 days, 
            organizer, 
            ticketTypes1
        );

        // Create second event
        TicketNFT.TicketType[] memory ticketTypes2 = new TicketNFT.TicketType[](1);
        ticketTypes2[0] = TicketNFT.TicketType({
            name: "General",
            price: 0.1 ether,
            maxSupply: 100,
            currentSupply: 0,
            metadataURI: "ipfs://QmEvent2General"
        });

        vm.prank(owner);
        address ticketContract2 = factory.createEvent(
            "Event Two", 
            "E2", 
            block.timestamp + 2 days, 
            organizer, 
            ticketTypes2
        );

        // Mint tickets from both events
        vm.prank(buyer1);
        uint256 tokenId1 = factory.mintTicket{value: 0.2 ether}(1, 0, buyer1);
        
        vm.prank(buyer1);
        uint256 tokenId2 = factory.mintTicket{value: 0.1 ether}(2, 0, buyer1);

        // Test both tickets have different metadata
        TicketNFT ticket1 = TicketNFT(ticketContract1);
        TicketNFT ticket2 = TicketNFT(ticketContract2);

        string memory uri1 = ticket1.tokenURI(tokenId1);
        string memory json1 = decodeBase64JSON(uri1);
        
        string memory uri2 = ticket2.tokenURI(tokenId2);
        string memory json2 = decodeBase64JSON(uri2);

        // Verify different event names
        assertTrue(contains(json1, '"description":"Concert ticket for Event One"'), "Should contain Event One");
        assertTrue(contains(json2, '"description":"Concert ticket for Event Two"'), "Should contain Event Two");
        
        // Verify different ticket types
        assertTrue(contains(json1, '"name":"VIP #1"'), "Should contain VIP name");
        assertTrue(contains(json2, '"name":"General #1"'), "Should contain General name");
    }

    // // Helper functions
    // function decodeBase64JSON(string memory uri) internal pure returns (string memory) {
    //     bytes memory uriBytes = bytes(uri);
    //     require(uriBytes.length > 29, "URI too short"); // "data:application/json;base64," is 29 chars
        
    //     // Extract base64 part (skip the prefix)
    //     bytes memory base64Part = new bytes(uriBytes.length - 29);
    //     for (uint i = 29; i < uriBytes.length; i++) {
    //         base64Part[i - 29] = uriBytes[i];
    //     }
        
    //     return string(Base64Decode.decode(string(base64Part)));
    // }

    // Updated decodeBase64JSON function
    function decodeBase64JSON(string memory uri) internal pure returns (string memory) {
        bytes memory uriBytes = bytes(uri);
        string memory prefix = "data:application/json;base64,";
        bytes memory prefixBytes = bytes(prefix);
        
        // Check that URI starts with expected prefix
        require(uriBytes.length > prefixBytes.length, "URI too short");
        for (uint i = 0; i < prefixBytes.length; i++) {
            require(uriBytes[i] == prefixBytes[i], "Invalid URI prefix");
        }
        
        // Extract base64 part
        bytes memory base64Part = new bytes(uriBytes.length - prefixBytes.length);
        for (uint i = prefixBytes.length; i < uriBytes.length; i++) {
            base64Part[i - prefixBytes.length] = uriBytes[i];
        }
        
        // Use the improved decoder
        return string(Base64Decoder.decode(base64Part));
    }

        function contains(string memory str, string memory substr) internal pure returns (bool) {
            bytes memory strBytes = bytes(str);
            bytes memory substrBytes = bytes(substr);
            
            if (substrBytes.length > strBytes.length) {
                return false;
            }
            
            for (uint i = 0; i <= strBytes.length - substrBytes.length; i++) {
                bool found = true;
                for (uint j = 0; j < substrBytes.length; j++) {
                    if (strBytes[i + j] != substrBytes[j]) {
                        found = false;
                        break;
                    }
                }
                if (found) {
                    return true;
                }
            }
            return false;
        }
    }

// // previous Base64Decode library
// library Base64Decode {
//     function decode(string memory _data) internal pure returns (bytes memory) {
//         bytes memory data = bytes(_data);
        
//         if (data.length == 0) return new bytes(0);
//         require(data.length % 4 == 0, "invalid base64 decoder input");

//         // Load the table into memory
//         bytes memory table = bytes("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

//         // Decode...
//         uint256 decodedLen = (data.length / 4) * 3;
//         bytes memory result = new bytes(decodedLen);

//         for (uint256 i = 0; i < decodedLen; ) {
//             uint256 j = (i / 3) * 4;
//             uint256 k = i % 3;

//             uint256 b1 = uint8(data[j]);
//             uint256 b2 = uint8(data[j+1]);
//             uint256 b3 = uint8(data[j+2]);
//             uint256 b4 = uint8(data[j+3]);

//             uint256 n = (
//                 (_indexOf(table, b1) << 18) |
//                 (_indexOf(table, b2) << 12) |
//                 (_indexOf(table, b3) << 6) |
//                 _indexOf(table, b4)
//             );

//             result[i++] = bytes1(uint8(n >> 16));
//             if (k < 2) result[i++] = bytes1(uint8(n >> 8));
//             if (k < 1) result[i++] = bytes1(uint8(n));
//         }

//         return result;
//     }

//     function _indexOf(bytes memory _table, uint256 _value) private pure returns (uint256) {
//         for (uint256 i = 0; i < _table.length; i++) {
//             if (uint8(_table[i]) == _value) return i;
//         }
//         revert("invalid base64 value");
//     }
// }

// Updated Base64Decoder library
// Improved Base64 decoder library
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