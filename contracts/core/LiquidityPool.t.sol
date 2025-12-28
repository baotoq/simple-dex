// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./LiquidityPool.sol";
import "../tokens/SimpleToken.sol";

/**
 * @title LiquidityPoolTest
 * @notice Solidity tests for the AMM liquidity pool
 */
contract LiquidityPoolTest {
    SimpleToken tokenA;
    SimpleToken tokenB;
    LiquidityPool pool;
    LPToken lpToken;

    address user1;

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        user1 = address(0x1);

        // Deploy tokens
        tokenA = new SimpleToken("Token A", "TKA", INITIAL_SUPPLY);
        tokenB = new SimpleToken("Token B", "TKB", INITIAL_SUPPLY);

        // Deploy pool
        pool = new LiquidityPool(
            address(tokenA),
            address(tokenB),
            "TKA-TKB LP",
            "LP"
        );

        lpToken = LPToken(pool.lpToken());
    }

    // ============ Deployment Tests ============

    function test_DeploymentSetsTokens() public view {
        require(address(pool.token0()) == address(tokenA), "Token0 mismatch");
        require(address(pool.token1()) == address(tokenB), "Token1 mismatch");
    }

    function test_DeploymentCreatesLPToken() public view {
        require(address(lpToken) != address(0), "LP token should exist");
    }

    function test_DeploymentStartsWithZeroReserves() public view {
        (uint256 reserve0, uint256 reserve1) = pool.getReserves();
        require(reserve0 == 0 && reserve1 == 0, "Reserves should be zero");
    }

    function test_DeploymentFailsWithIdenticalTokens() public {
        try new LiquidityPool(address(tokenA), address(tokenA), "LP", "LP") {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Pool: identical tokens")),
                "Wrong error"
            );
        }
    }

    // ============ Add Liquidity Tests ============

    function test_AddInitialLiquidity() public {
        uint256 amount0 = 1000 ether;
        uint256 amount1 = 2000 ether;

        tokenA.approve(address(pool), amount0);
        tokenB.approve(address(pool), amount1);
        pool.addLiquidity(amount0, amount1);

        (uint256 reserve0, uint256 reserve1) = pool.getReserves();
        require(reserve0 == amount0, "Reserve0 should equal amount0");
        require(reserve1 == amount1, "Reserve1 should equal amount1");
    }

    function test_AddLiquidityMintsLPTokens() public {
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 1000 ether);
        pool.addLiquidity(1000 ether, 1000 ether);

        require(lpToken.balanceOf(address(this)) > 0, "Should receive LP tokens");
    }

    function test_AddLiquidityLocksMinimumLiquidity() public {
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 1000 ether);
        pool.addLiquidity(1000 ether, 1000 ether);

        // MINIMUM_LIQUIDITY (1000) is locked at address(1)
        require(lpToken.balanceOf(address(1)) == 1000, "Minimum liquidity not locked");
    }

    // ============ Swap Tests ============

    function test_Swap0For1() public {
        // Add liquidity first
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 2000 ether);
        pool.addLiquidity(1000 ether, 2000 ether);

        // Swap
        uint256 swapAmount = 10 ether;
        tokenA.approve(address(pool), swapAmount);

        uint256 balanceBefore = tokenB.balanceOf(address(this));
        pool.swap0For1(swapAmount, 0);
        uint256 balanceAfter = tokenB.balanceOf(address(this));

        require(balanceAfter > balanceBefore, "Should receive tokenB");
    }

    function test_Swap1For0() public {
        // Add liquidity
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 2000 ether);
        pool.addLiquidity(1000 ether, 2000 ether);

        // Swap
        uint256 swapAmount = 20 ether;
        tokenB.approve(address(pool), swapAmount);

        uint256 balanceBefore = tokenA.balanceOf(address(this));
        pool.swap1For0(swapAmount, 0);
        uint256 balanceAfter = tokenA.balanceOf(address(this));

        require(balanceAfter > balanceBefore, "Should receive tokenA");
    }

    function test_SwapChargesFee() public {
        // Add liquidity: 1:1 ratio
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 1000 ether);
        pool.addLiquidity(1000 ether, 1000 ether);

        // Calculate expected output
        uint256 amountIn = 100 ether;
        uint256 amountOut = pool.getAmountOut(amountIn, 1000 ether, 1000 ether);

        // Without fee, output would be: 100 * 1000 / (1000 + 100) = 90.909...
        // With 0.3% fee, it should be less
        require(amountOut < 90909090909090909091, "Fee should reduce output");
    }

    function test_SwapFailsWithSlippageExceeded() public {
        // Add liquidity
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 2000 ether);
        pool.addLiquidity(1000 ether, 2000 ether);

        // Try swap with unrealistic minAmountOut
        tokenA.approve(address(pool), 10 ether);

        try pool.swap0For1(10 ether, 100 ether) {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Pool: slippage exceeded")),
                "Wrong error"
            );
        }
    }

    function test_SwapUpdatesReserves() public {
        // Add liquidity
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 2000 ether);
        pool.addLiquidity(1000 ether, 2000 ether);

        (uint256 reserve0Before, uint256 reserve1Before) = pool.getReserves();

        // Swap
        tokenA.approve(address(pool), 10 ether);
        pool.swap0For1(10 ether, 0);

        (uint256 reserve0After, uint256 reserve1After) = pool.getReserves();

        require(reserve0After > reserve0Before, "Reserve0 should increase");
        require(reserve1After < reserve1Before, "Reserve1 should decrease");
    }

    // ============ Remove Liquidity Tests ============

    function test_RemoveLiquidity() public {
        // Add liquidity
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 1000 ether);
        pool.addLiquidity(1000 ether, 1000 ether);

        uint256 lpBalance = lpToken.balanceOf(address(this));
        uint256 halfLp = lpBalance / 2;

        uint256 tokenABefore = tokenA.balanceOf(address(this));
        uint256 tokenBBefore = tokenB.balanceOf(address(this));

        pool.removeLiquidity(halfLp);

        require(tokenA.balanceOf(address(this)) > tokenABefore, "Should receive tokenA");
        require(tokenB.balanceOf(address(this)) > tokenBBefore, "Should receive tokenB");
    }

    // ============ Constant Product Tests ============

    function test_ConstantProductMaintained() public {
        // Add liquidity
        tokenA.approve(address(pool), 1000 ether);
        tokenB.approve(address(pool), 2000 ether);
        pool.addLiquidity(1000 ether, 2000 ether);

        (uint256 reserve0Before, uint256 reserve1Before) = pool.getReserves();
        uint256 kBefore = reserve0Before * reserve1Before;

        // Swap
        tokenA.approve(address(pool), 100 ether);
        pool.swap0For1(100 ether, 0);

        (uint256 reserve0After, uint256 reserve1After) = pool.getReserves();
        uint256 kAfter = reserve0After * reserve1After;

        // k should increase due to fees
        require(kAfter >= kBefore, "k should not decrease (fees add to reserves)");
    }

    // ============ Fuzz Tests ============

    function test_SwapAnyAmount(uint256 amount) public {
        // Setup liquidity
        tokenA.approve(address(pool), 10000 ether);
        tokenB.approve(address(pool), 10000 ether);
        pool.addLiquidity(10000 ether, 10000 ether);

        // Bound swap amount to reasonable values
        // Very small amounts (< 1e15 wei) may result in 0 output due to rounding
        if (amount > 1000 ether) amount = 1000 ether;
        if (amount < 1e15) amount = 1e15; // Minimum ~0.001 tokens to avoid rounding to 0

        tokenA.approve(address(pool), amount);

        uint256 balanceBefore = tokenB.balanceOf(address(this));
        pool.swap0For1(amount, 0);
        uint256 balanceAfter = tokenB.balanceOf(address(this));

        require(balanceAfter > balanceBefore, "Should receive tokens");
    }
}
