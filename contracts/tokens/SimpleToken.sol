// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC20Base.sol";

/**
 * @title SimpleToken
 * @notice A simple ERC-20 token for testing purposes
 * @dev Inherits from ERC20Base and mints initial supply to deployer
 *
 * This is a "concrete" contract (not abstract) - it CAN be deployed.
 * We use this token for testing our DEX.
 *
 * INHERITANCE:
 * SimpleToken is ERC20Base
 * - SimpleToken gets ALL functions from ERC20Base (transfer, approve, etc.)
 * - SimpleToken can call internal functions like _mint()
 * - We only need to add the constructor and any extra functionality
 */
contract SimpleToken is ERC20Base {
    /**
     * @notice Deploy a new SimpleToken
     * @param _name Token name (e.g., "Token A")
     * @param _symbol Token symbol (e.g., "TKA")
     * @param _initialSupply How many tokens to mint (in base units)
     *
     * @dev The deployer receives all the initial tokens.
     * Remember: 1 token with 18 decimals = 1e18 = 1000000000000000000
     * So if you want 1 million tokens, pass 1_000_000 * 10**18
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20Base(_name, _symbol) {
        // Mint all initial tokens to whoever deployed the contract
        // msg.sender = the address that called this constructor
        _mint(msg.sender, _initialSupply);
    }
}
