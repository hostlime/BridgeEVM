// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyTokenForBridge is ERC20, AccessControl {
    // Роль моста
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    //constructor() ERC20("MyTokenForBridge", "MTK") {}
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(BRIDGE_ROLE, msg.sender);
        //_mint(msg.sender, 500_000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        _mint(to, amount);
    }

    function burn(address user, uint256 amount) external onlyRole(BRIDGE_ROLE) {
        _burn(user, amount);
    }
}
