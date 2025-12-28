// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./core/LiquidityPool.sol";

/**
 * @title Factory
 * @notice Factory contract that creates and tracks liquidity pools
 * @dev Implements the Factory Pattern - a contract that creates other contracts
 *
 * ============ WHY USE A FACTORY? ============
 *
 * 1. SINGLE ENTRY POINT
 *    Instead of deploying pools manually, users go through one factory.
 *    This ensures all pools are created consistently.
 *
 * 2. POOL DISCOVERY
 *    The factory keeps track of all pools it created.
 *    Anyone can call getPool(tokenA, tokenB) to find the pool address.
 *
 * 3. PREVENT DUPLICATES
 *    Only ONE pool can exist for each token pair.
 *    getPool(A, B) and getPool(B, A) return the same pool.
 *
 * 4. STANDARDIZATION
 *    All pools created by this factory have the same code and behavior.
 *
 * This is how Uniswap, SushiSwap, and most DEXes work!
 */
contract Factory {
    // ============ State Variables ============

    /// @notice Mapping from token pair to pool address
    /// @dev pools[token0][token1] = pool address
    /// We always store with token0 < token1 to ensure consistency
    mapping(address => mapping(address => address)) public pools;

    /// @notice Array of all pool addresses created by this factory
    address[] public allPools;

    // ============ Events ============

    /// @notice Emitted when a new pool is created
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        uint256 poolIndex
    );

    // ============ View Functions ============

    /**
     * @notice Get the number of pools created
     * @return The total number of pools
     */
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    /**
     * @notice Get the pool address for a token pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pool The pool address (or address(0) if no pool exists)
     *
     * @dev Order doesn't matter - getPool(A,B) == getPool(B,A)
     */
    function getPool(address tokenA, address tokenB) external view returns (address pool) {
        // Sort tokens to ensure consistent lookup
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        return pools[token0][token1];
    }

    // ============ Pool Creation ============

    /**
     * @notice Create a new liquidity pool for a token pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pool The address of the newly created pool
     *
     * @dev This deploys a new LiquidityPool contract.
     * Only one pool can exist per token pair.
     *
     * HOW THIS WORKS:
     * 1. Sort tokens (lower address becomes token0)
     * 2. Check no pool exists yet
     * 3. Deploy new LiquidityPool contract using "new" keyword
     * 4. Store the pool address in mappings
     * 5. Emit event
     */
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        // Validation
        require(tokenA != tokenB, "Factory: identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Factory: zero address");

        // Sort tokens so token0 < token1 (by address value)
        // This ensures getPool(A,B) and getPool(B,A) return the same result
        (address token0, address token1) = _sortTokens(tokenA, tokenB);

        // Check pool doesn't already exist
        require(pools[token0][token1] == address(0), "Factory: pool already exists");

        // Create LP token name and symbol
        // In production, you'd use token symbols, but we keep it simple
        string memory lpName = "LP Token";
        string memory lpSymbol = "LP";

        // Deploy new pool contract
        // The "new" keyword deploys a new contract and returns its address
        LiquidityPool newPool = new LiquidityPool(
            token0,
            token1,
            lpName,
            lpSymbol
        );

        pool = address(newPool);

        // Store pool address (both directions for easy lookup)
        pools[token0][token1] = pool;
        pools[token1][token0] = pool;

        // Add to array of all pools
        allPools.push(pool);

        // Emit event
        emit PoolCreated(token0, token1, pool, allPools.length - 1);
    }

    // ============ Internal Helpers ============

    /**
     * @notice Sort two token addresses
     * @dev Ensures token0 < token1 for consistent mapping keys
     */
    function _sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        // Compare addresses as numbers
        // Addresses are basically 160-bit integers
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }
}
