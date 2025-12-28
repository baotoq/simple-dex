// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC20Base.sol";

/**
 * @title LPToken
 * @notice Liquidity Provider token - represents ownership of pool liquidity
 * @dev Only the pool contract can mint and burn these tokens
 *
 * WHAT ARE LP TOKENS?
 * When you add liquidity to a pool (deposit both tokens), you receive LP tokens.
 * These LP tokens represent YOUR SHARE of the pool.
 *
 * Example:
 * - Pool has 1000 ETH + 2,000,000 USDC (total 1000 LP tokens exist)
 * - You add 100 ETH + 200,000 USDC
 * - You receive 100 LP tokens (10% of pool = 100/1000)
 * - Later, pool grows to 1500 ETH + 3,000,000 USDC from fees
 * - You burn your 100 LP tokens (still 10% of pool)
 * - You get back 150 ETH + 300,000 USDC (profit from fees!)
 *
 * SECURITY:
 * Only the pool contract should be able to mint/burn LP tokens.
 * That's why we have the "pool" address and onlyPool modifier.
 */
contract LPToken is ERC20Base {
    /// @notice The pool contract that controls this LP token
    /// @dev Only this address can call mint() and burn()
    address public pool;

    /// @notice Restricts function access to only the pool contract
    modifier onlyPool() {
        require(msg.sender == pool, "LPToken: caller is not the pool");
        _;
    }

    /**
     * @notice Deploy a new LP token
     * @param _name Token name (e.g., "TKA-TKB LP")
     * @param _symbol Token symbol (e.g., "TKA-TKB-LP")
     *
     * @dev The deployer (msg.sender) becomes the pool.
     * This means the LiquidityPool contract deploys this token
     * and automatically becomes the only address that can mint/burn.
     */
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20Base(_name, _symbol) {
        // The contract that deploys this LP token becomes the pool
        pool = msg.sender;
    }

    /**
     * @notice Mint new LP tokens (only callable by pool)
     * @param to Address to receive the LP tokens
     * @param amount Amount of LP tokens to mint
     *
     * @dev Called when users add liquidity to the pool
     */
    function mint(address to, uint256 amount) external onlyPool {
        _mint(to, amount);
    }

    /**
     * @notice Burn LP tokens (only callable by pool)
     * @param from Address to burn LP tokens from
     * @param amount Amount of LP tokens to burn
     *
     * @dev Called when users remove liquidity from the pool
     */
    function burn(address from, uint256 amount) external onlyPool {
        _burn(from, amount);
    }
}
