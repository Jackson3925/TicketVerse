// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {TicketNFT} from "../src/TicketNFT.sol";
import {TicketFactory} from "../src/TicketFactory.sol";
import {ResaleMarketplace} from "../src/ResaleMarketplace.sol";
import {RevenueSharing} from "../src/RevenueSharing.sol";

contract DeployContracts is Script {
    function run()
        public
        returns (address ticketNFTImpl, address ticketFactory, address resaleMarketplace, address revenueSharing)
    {
        vm.startBroadcast();

        // 1. Deploy TicketNFT implementation
        TicketNFT ticketNFT = new TicketNFT();
        ticketNFTImpl = address(ticketNFT);

        // 2. Deploy TicketFactory
        TicketFactory factory = new TicketFactory(ticketNFTImpl);
        ticketFactory = address(factory);

        // 3. Deploy ResaleMarketplace
        ResaleMarketplace marketplace = new ResaleMarketplace();
        resaleMarketplace = address(marketplace);

        // 4. Deploy RevenueSharing
        RevenueSharing revenue = new RevenueSharing(msg.sender);
        revenueSharing = address(revenue);

        vm.stopBroadcast();

        // Log addresses
        console.log("TicketNFT Implementation:", ticketNFTImpl);
        console.log("TicketFactory:", ticketFactory);
        console.log("ResaleMarketplace:", resaleMarketplace);
        console.log("RevenueSharing:", revenueSharing);
    }
}
