// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../tokens/LPToken.sol";
import "../tokens/ERC20Base.sol";

/**
 * @title LiquidityPool
 * @notice AMM (Automated Market Maker) pool using constant product formula
 * @dev Implements x * y = k formula like Uniswap V1/V2
 *
 * ============ HOW AN AMM WORKS ============
 *
 * Traditional exchanges use ORDER BOOKS (buyers and sellers set prices).
 * AMMs use a MATHEMATICAL FORMULA to determine prices automatically!
 *
 * THE FORMULA: x * y = k (constant product)
 * - x = amount of token0 in the pool
 * - y = amount of token1 in the pool
 * - k = constant (stays the same after every swap)
 *
 * EXAMPLE:
 * Pool has: 100 ETH (x) and 200,000 USDC (y)
 * k = 100 * 200,000 = 20,000,000
 *
 * Someone wants to buy ETH with 1,000 USDC:
 * - New y = 200,000 + 1,000 = 201,000 USDC
 * - k must stay 20,000,000
 * - New x = k / new y = 20,000,000 / 201,000 = 99.502... ETH
 * - ETH out = 100 - 99.502 = 0.498 ETH
 *
 * Notice: They got ~0.498 ETH for 1,000 USDC
 * That's about 2,008 USDC per ETH (price moved!)
 * This is called PRICE IMPACT - larger trades move the price more.
 *
 * ============ FEES ============
 *
 * We charge a 0.3% fee on swaps (like Uniswap).
 * This fee stays in the pool and benefits LP holders.
 * Over time, k actually INCREASES due to fees collected.
 *
 * ============ SLIPPAGE PROTECTION ============
 *
 * Because prices move during swaps, users specify a "minAmountOut".
 * If they would receive less than this, the transaction reverts.
 * This protects against front-running and large price movements.
 */
contract LiquidityPool {
    // ============ State Variables ============

    /// @notice First token in the pair
    ERC20Base public token0;

    /// @notice Second token in the pair
    ERC20Base public token1;

    /// @notice LP token for this pool
    LPToken public lpToken;

    /// @notice Current reserve of token0 in the pool
    uint256 public reserve0;

    /// @notice Current reserve of token1 in the pool
    uint256 public reserve1;

    /// @notice Swap fee in basis points (30 = 0.3%)
    /// @dev Basis points: 10000 = 100%, so 30 = 0.3%
    uint256 public constant FEE_BPS = 30;

    /// @notice Minimum liquidity locked forever to prevent division by zero
    /// @dev When first LP adds liquidity, this amount is "burned"
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    // ============ Events ============

    /// @notice Emitted when liquidity is added
    event LiquidityAdded(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 lpTokensMinted
    );

    /// @notice Emitted when liquidity is removed
    event LiquidityRemoved(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 lpTokensBurned
    );

    /// @notice Emitted when a swap occurs
    event Swap(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        address indexed tokenOut,
        uint256 amountOut
    );

    // ============ Constructor ============

    /**
     * @notice Create a new liquidity pool
     * @param _token0 Address of first token
     * @param _token1 Address of second token
     * @param _lpName Name for the LP token
     * @param _lpSymbol Symbol for the LP token
     */
    constructor(
        address _token0,
        address _token1,
        string memory _lpName,
        string memory _lpSymbol
    ) {
        require(_token0 != address(0) && _token1 != address(0), "Pool: zero address");
        require(_token0 != _token1, "Pool: identical tokens");

        token0 = ERC20Base(_token0);
        token1 = ERC20Base(_token1);

        // Deploy the LP token - this pool becomes the "pool" in LPToken
        lpToken = new LPToken(_lpName, _lpSymbol);
    }

    // ============ View Functions ============

    /**
     * @notice Get current reserves
     * @return _reserve0 Amount of token0 in pool
     * @return _reserve1 Amount of token1 in pool
     */
    function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1) {
        return (reserve0, reserve1);
    }

    /**
     * @notice Calculate output amount for a swap (before fees)
     * @param amountIn Amount of input token
     * @param reserveIn Reserve of input token
     * @param reserveOut Reserve of output token
     * @return amountOut Amount of output token user will receive
     *
     * @dev Uses the constant product formula with 0.3% fee
     *
     * Math explanation:
     * x * y = k (must stay constant)
     * (x + amountIn * 0.997) * (y - amountOut) = k
     *
     * Solving for amountOut:
     * amountOut = (y * amountIn * 0.997) / (x + amountIn * 0.997)
     *
     * We use basis points to avoid decimals:
     * amountInWithFee = amountIn * (10000 - 30) = amountIn * 9970
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Pool: insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Pool: insufficient liquidity");

        // Apply 0.3% fee: multiply by 9970 (10000 - 30 bps)
        uint256 amountInWithFee = amountIn * (10000 - FEE_BPS);

        // Numerator: reserveOut * amountInWithFee
        uint256 numerator = reserveOut * amountInWithFee;

        // Denominator: reserveIn * 10000 + amountInWithFee
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;

        // Calculate output amount
        amountOut = numerator / denominator;
    }

    // ============ Liquidity Functions ============

    /**
     * @notice Add liquidity to the pool
     * @param amount0Desired Amount of token0 to add
     * @param amount1Desired Amount of token1 to add
     * @return amount0 Actual amount of token0 added
     * @return amount1 Actual amount of token1 added
     * @return liquidity Amount of LP tokens minted
     *
     * @dev Users must approve this contract to spend their tokens first!
     *
     * For the FIRST deposit:
     * - LP tokens = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
     * - MINIMUM_LIQUIDITY is burned (sent to address(0)) to prevent manipulation
     *
     * For subsequent deposits:
     * - Must add tokens in the same ratio as current reserves
     * - LP tokens = min(amount0/reserve0, amount1/reserve1) * totalSupply
     */
    function addLiquidity(
        uint256 amount0Desired,
        uint256 amount1Desired
    ) external returns (uint256 amount0, uint256 amount1, uint256 liquidity) {
        require(amount0Desired > 0 && amount1Desired > 0, "Pool: insufficient amounts");

        uint256 _totalSupply = lpToken.totalSupply();

        if (_totalSupply == 0) {
            // ========== FIRST LIQUIDITY PROVIDER ==========
            // Initial LP tokens = sqrt(amount0 * amount1)
            // This makes the initial price = amount1 / amount0
            amount0 = amount0Desired;
            amount1 = amount1Desired;

            liquidity = sqrt(amount0 * amount1);
            require(liquidity > MINIMUM_LIQUIDITY, "Pool: insufficient initial liquidity");

            // Lock MINIMUM_LIQUIDITY forever by minting to address(1)
            // This prevents the pool from being emptied completely
            // and protects against certain attack vectors
            lpToken.mint(address(1), MINIMUM_LIQUIDITY);
            liquidity -= MINIMUM_LIQUIDITY;
        } else {
            // ========== SUBSEQUENT LIQUIDITY PROVIDERS ==========
            // Must add in same ratio as current reserves

            // Calculate optimal amount1 for given amount0
            uint256 amount1Optimal = (amount0Desired * reserve1) / reserve0;

            if (amount1Optimal <= amount1Desired) {
                // Use amount0Desired and calculated amount1
                amount0 = amount0Desired;
                amount1 = amount1Optimal;
            } else {
                // Calculate optimal amount0 for given amount1
                uint256 amount0Optimal = (amount1Desired * reserve0) / reserve1;
                require(amount0Optimal <= amount0Desired, "Pool: invalid amounts");
                amount0 = amount0Optimal;
                amount1 = amount1Desired;
            }

            // Calculate LP tokens to mint proportionally
            // liquidity = min(amount0/reserve0, amount1/reserve1) * totalSupply
            uint256 liquidity0 = (amount0 * _totalSupply) / reserve0;
            uint256 liquidity1 = (amount1 * _totalSupply) / reserve1;
            liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        }

        require(liquidity > 0, "Pool: insufficient liquidity minted");

        // Transfer tokens from user to pool
        // User must have called approve() on both tokens first!
        token0.transferFrom(msg.sender, address(this), amount0);
        token1.transferFrom(msg.sender, address(this), amount1);

        // Update reserves
        reserve0 += amount0;
        reserve1 += amount1;

        // Mint LP tokens to user
        lpToken.mint(msg.sender, liquidity);

        emit LiquidityAdded(msg.sender, amount0, amount1, liquidity);
    }

    /**
     * @notice Remove liquidity from the pool
     * @param lpAmount Amount of LP tokens to burn
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     *
     * @dev Burns LP tokens and returns proportional share of both tokens.
     * If you own 10% of LP tokens, you get 10% of each reserve.
     */
    function removeLiquidity(
        uint256 lpAmount
    ) external returns (uint256 amount0, uint256 amount1) {
        require(lpAmount > 0, "Pool: insufficient LP amount");

        uint256 _totalSupply = lpToken.totalSupply();

        // Calculate proportional amounts
        // Your share = lpAmount / totalSupply
        amount0 = (lpAmount * reserve0) / _totalSupply;
        amount1 = (lpAmount * reserve1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, "Pool: insufficient amounts returned");

        // Burn LP tokens from user
        lpToken.burn(msg.sender, lpAmount);

        // Update reserves
        reserve0 -= amount0;
        reserve1 -= amount1;

        // Transfer tokens back to user
        token0.transfer(msg.sender, amount0);
        token1.transfer(msg.sender, amount1);

        emit LiquidityRemoved(msg.sender, amount0, amount1, lpAmount);
    }

    // ============ Swap Functions ============

    /**
     * @notice Swap token0 for token1
     * @param amountIn Amount of token0 to swap
     * @param minAmountOut Minimum amount of token1 to receive (slippage protection)
     * @return amountOut Actual amount of token1 received
     *
     * @dev User must approve this contract to spend token0 first!
     */
    function swap0For1(
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Pool: insufficient input amount");

        // Calculate output using AMM formula
        amountOut = getAmountOut(amountIn, reserve0, reserve1);

        // Slippage check - revert if output too low
        require(amountOut >= minAmountOut, "Pool: slippage exceeded");

        // Take input tokens from user
        token0.transferFrom(msg.sender, address(this), amountIn);

        // Give output tokens to user
        token1.transfer(msg.sender, amountOut);

        // Update reserves
        reserve0 += amountIn;
        reserve1 -= amountOut;

        emit Swap(msg.sender, address(token0), amountIn, address(token1), amountOut);
    }

    /**
     * @notice Swap token1 for token0
     * @param amountIn Amount of token1 to swap
     * @param minAmountOut Minimum amount of token0 to receive (slippage protection)
     * @return amountOut Actual amount of token0 received
     *
     * @dev User must approve this contract to spend token1 first!
     */
    function swap1For0(
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Pool: insufficient input amount");

        // Calculate output using AMM formula
        amountOut = getAmountOut(amountIn, reserve1, reserve0);

        // Slippage check
        require(amountOut >= minAmountOut, "Pool: slippage exceeded");

        // Take input tokens from user
        token1.transferFrom(msg.sender, address(this), amountIn);

        // Give output tokens to user
        token0.transfer(msg.sender, amountOut);

        // Update reserves
        reserve1 += amountIn;
        reserve0 -= amountOut;

        emit Swap(msg.sender, address(token1), amountIn, address(token0), amountOut);
    }

    // ============ Internal Helpers ============

    /**
     * @notice Calculate square root using Babylonian method
     * @dev Used to calculate initial LP tokens: sqrt(amount0 * amount1)
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
