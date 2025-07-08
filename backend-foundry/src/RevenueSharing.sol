// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RevenueSharing {
    address public platform;
    mapping(address => mapping(address => uint256)) public balances;

    event RevenueDeposited(address indexed from, address indexed to, uint256 amount);
    event Withdrawn(address indexed payee, uint256 amount);

    constructor(address _platform) {
        platform = _platform;
    }

    function depositRevenue(address organizer) external payable {
        require(msg.value > 0, "No ETH sent");

        uint256 platformShare = (msg.value * 10) / 100;
        uint256 organizerShare = msg.value - platformShare;

        balances[address(this)][platform] += platformShare;
        balances[address(this)][organizer] += organizerShare;

        emit RevenueDeposited(msg.sender, organizer, organizerShare);
    }

    function withdraw(address to) external {
        uint256 amount = balances[address(this)][to];
        require(amount > 0, "Nothing to withdraw");
        balances[address(this)][to] = 0;
        payable(to).transfer(amount);

        emit Withdrawn(to, amount);
    }
}