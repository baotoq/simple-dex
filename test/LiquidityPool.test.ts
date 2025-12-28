import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

/**
 * Tests for LiquidityPool - the core AMM contract
 */
describe("LiquidityPool", async function () {
  const { viem } = await network.connect();
  const [owner, user1, user2] = await viem.getWalletClients();

  const INITIAL_SUPPLY = parseEther("1000000");
  const MINIMUM_LIQUIDITY = 1000n;

  /**
   * Helper to deploy tokens and pool
   */
  async function deployPoolFixture() {
    // Deploy two test tokens
    const tokenA = await viem.deployContract("SimpleToken", [
      "Token A",
      "TKA",
      INITIAL_SUPPLY,
    ]);

    const tokenB = await viem.deployContract("SimpleToken", [
      "Token B",
      "TKB",
      INITIAL_SUPPLY,
    ]);

    // Deploy pool
    const pool = await viem.deployContract("LiquidityPool", [
      tokenA.address,
      tokenB.address,
      "TKA-TKB LP",
      "LP",
    ]);

    // Get LP token
    const lpTokenAddress = await pool.read.lpToken();
    const lpToken = await viem.getContractAt("LPToken", lpTokenAddress);

    return { tokenA, tokenB, pool, lpToken };
  }

  /**
   * Helper to add initial liquidity
   */
  async function addInitialLiquidity(
    tokenA: Awaited<ReturnType<typeof viem.deployContract>>,
    tokenB: Awaited<ReturnType<typeof viem.deployContract>>,
    pool: Awaited<ReturnType<typeof viem.deployContract>>,
    amount0: bigint,
    amount1: bigint
  ) {
    await tokenA.write.approve([pool.address, amount0]);
    await tokenB.write.approve([pool.address, amount1]);
    await pool.write.addLiquidity([amount0, amount1]);
  }

  describe("Deployment", function () {
    it("Should set correct token addresses", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      assert.equal(
        getAddress(await pool.read.token0()),
        getAddress(tokenA.address)
      );
      assert.equal(
        getAddress(await pool.read.token1()),
        getAddress(tokenB.address)
      );
    });

    it("Should deploy LP token", async function () {
      const { pool, lpToken } = await deployPoolFixture();

      const lpTokenAddress = await pool.read.lpToken();
      assert.equal(getAddress(lpTokenAddress), getAddress(lpToken.address));
      assert.equal(await lpToken.read.name(), "TKA-TKB LP");
    });

    it("Should start with zero reserves", async function () {
      const { pool } = await deployPoolFixture();

      const [reserve0, reserve1] = await pool.read.getReserves();
      assert.equal(reserve0, 0n);
      assert.equal(reserve1, 0n);
    });

    it("Should reject identical tokens", async function () {
      const tokenA = await viem.deployContract("SimpleToken", [
        "Token A",
        "TKA",
        INITIAL_SUPPLY,
      ]);

      await assert.rejects(
        viem.deployContract("LiquidityPool", [
          tokenA.address,
          tokenA.address,
          "LP",
          "LP",
        ]),
        /Pool: identical tokens/
      );
    });
  });

  describe("Add Liquidity", function () {
    it("Should add initial liquidity correctly", async function () {
      const { tokenA, tokenB, pool, lpToken } = await deployPoolFixture();
      const amount0 = parseEther("1000");
      const amount1 = parseEther("2000");

      await addInitialLiquidity(tokenA, tokenB, pool, amount0, amount1);

      const [reserve0, reserve1] = await pool.read.getReserves();
      assert.equal(reserve0, amount0);
      assert.equal(reserve1, amount1);

      // LP tokens = sqrt(1000 * 2000) - MINIMUM_LIQUIDITY
      // sqrt(2000000) ≈ 1414.21... in ether terms
      const expectedLp = 1414213562373095048801n - MINIMUM_LIQUIDITY;
      assert.equal(
        await lpToken.read.balanceOf([owner.account.address]),
        expectedLp
      );
    });

    it("Should lock MINIMUM_LIQUIDITY on first deposit", async function () {
      const { tokenA, tokenB, pool, lpToken } = await deployPoolFixture();
      const amount0 = parseEther("1000");
      const amount1 = parseEther("2000");

      await addInitialLiquidity(tokenA, tokenB, pool, amount0, amount1);

      // MINIMUM_LIQUIDITY is sent to address(1)
      const burnAddress = "0x0000000000000000000000000000000000000001";
      assert.equal(
        await lpToken.read.balanceOf([burnAddress]),
        MINIMUM_LIQUIDITY
      );
    });

    it("Should emit LiquidityAdded event", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();
      const amount0 = parseEther("1000");
      const amount1 = parseEther("2000");

      await tokenA.write.approve([pool.address, amount0]);
      await tokenB.write.approve([pool.address, amount1]);

      await viem.assertions.emit(
        pool.write.addLiquidity([amount0, amount1]),
        pool,
        "LiquidityAdded"
      );
    });

    it("Should add subsequent liquidity proportionally", async function () {
      const { tokenA, tokenB, pool, lpToken } = await deployPoolFixture();

      // First liquidity
      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      // Transfer tokens to user1
      await tokenA.write.transfer([user1.account.address, parseEther("500")]);
      await tokenB.write.transfer([user1.account.address, parseEther("1000")]);

      // user1 adds liquidity
      const tokenAAsUser1 = await viem.getContractAt("SimpleToken", tokenA.address, {
        client: { wallet: user1 },
      });
      const tokenBAsUser1 = await viem.getContractAt("SimpleToken", tokenB.address, {
        client: { wallet: user1 },
      });
      const poolAsUser1 = await viem.getContractAt("LiquidityPool", pool.address, {
        client: { wallet: user1 },
      });

      await tokenAAsUser1.write.approve([pool.address, parseEther("500")]);
      await tokenBAsUser1.write.approve([pool.address, parseEther("1000")]);
      await poolAsUser1.write.addLiquidity([parseEther("500"), parseEther("1000")]);

      // user1 should get 50% of owner's LP tokens (half the amounts)
      const ownerLp = await lpToken.read.balanceOf([owner.account.address]);
      const user1Lp = await lpToken.read.balanceOf([user1.account.address]);

      // Should be approximately half (allowing for rounding)
      assert.ok(
        user1Lp >= (ownerLp * 49n) / 100n && user1Lp <= (ownerLp * 51n) / 100n
      );
    });

    it("Should reject liquidity with zero amounts", async function () {
      const { pool } = await deployPoolFixture();

      await assert.rejects(
        pool.write.addLiquidity([0n, parseEther("100")]),
        /Pool: insufficient amounts/
      );
    });
  });

  describe("Remove Liquidity", function () {
    it("Should remove liquidity and return tokens", async function () {
      const { tokenA, tokenB, pool, lpToken } = await deployPoolFixture();
      const amount0 = parseEther("1000");
      const amount1 = parseEther("2000");

      await addInitialLiquidity(tokenA, tokenB, pool, amount0, amount1);

      const lpBalance = await lpToken.read.balanceOf([owner.account.address]);
      const halfLp = lpBalance / 2n;

      // Approve pool to burn LP tokens
      await lpToken.write.approve([pool.address, halfLp]);
      await pool.write.removeLiquidity([halfLp]);

      // Should get back approximately half the tokens
      const [reserve0, reserve1] = await pool.read.getReserves();
      assert.ok(reserve0 < amount0);
      assert.ok(reserve1 < amount1);
    });

    it("Should emit LiquidityRemoved event", async function () {
      const { tokenA, tokenB, pool, lpToken } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      const lpBalance = await lpToken.read.balanceOf([owner.account.address]);

      await viem.assertions.emit(
        pool.write.removeLiquidity([lpBalance]),
        pool,
        "LiquidityRemoved"
      );
    });

    it("Should reject removing zero LP tokens", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      await assert.rejects(
        pool.write.removeLiquidity([0n]),
        /Pool: insufficient LP amount/
      );
    });
  });

  describe("Swap", function () {
    it("Should swap token0 for token1", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      // Add liquidity: 1000 TKA and 2000 TKB
      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      // Swap 10 TKA for TKB
      const swapAmount = parseEther("10");
      await tokenA.write.approve([pool.address, swapAmount]);

      const balanceBefore = await tokenB.read.balanceOf([owner.account.address]);
      await pool.write.swap0For1([swapAmount, 0n]);
      const balanceAfter = await tokenB.read.balanceOf([owner.account.address]);

      const received = balanceAfter - balanceBefore;
      // With 0.3% fee and x*y=k formula, should receive ~19.74 TKB
      assert.ok(received > parseEther("19") && received < parseEther("20"));
    });

    it("Should swap token1 for token0", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      // Swap 20 TKB for TKA
      const swapAmount = parseEther("20");
      await tokenB.write.approve([pool.address, swapAmount]);

      const balanceBefore = await tokenA.read.balanceOf([owner.account.address]);
      await pool.write.swap1For0([swapAmount, 0n]);
      const balanceAfter = await tokenA.read.balanceOf([owner.account.address]);

      const received = balanceAfter - balanceBefore;
      // Should receive ~9.87 TKA
      assert.ok(received > parseEther("9") && received < parseEther("10"));
    });

    it("Should emit Swap event", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      const swapAmount = parseEther("10");
      await tokenA.write.approve([pool.address, swapAmount]);

      await viem.assertions.emit(
        pool.write.swap0For1([swapAmount, 0n]),
        pool,
        "Swap"
      );
    });

    it("Should charge 0.3% fee", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      // Get expected output
      const amountIn = parseEther("100");
      const amountOut = await pool.read.getAmountOut([
        amountIn,
        parseEther("1000"),
        parseEther("2000"),
      ]);

      // Without fee: 100 * 2000 / (1000 + 100) = 181.81...
      // With 0.3% fee: should be less
      assert.ok(amountOut < parseEther("181.82"));
      assert.ok(amountOut > parseEther("180")); // But not too much less
    });

    it("Should reject swap if slippage exceeded", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      const swapAmount = parseEther("10");
      await tokenA.write.approve([pool.address, swapAmount]);

      // Set minAmountOut too high
      const minAmountOut = parseEther("100"); // Way more than we'd get

      await assert.rejects(
        pool.write.swap0For1([swapAmount, minAmountOut]),
        /Pool: slippage exceeded/
      );
    });

    it("Should reject swap with zero amount", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      await assert.rejects(
        pool.write.swap0For1([0n, 0n]),
        /Pool: insufficient input amount/
      );
    });

    it("Should update reserves after swap", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      const [reserve0Before, reserve1Before] = await pool.read.getReserves();

      const swapAmount = parseEther("10");
      await tokenA.write.approve([pool.address, swapAmount]);
      await pool.write.swap0For1([swapAmount, 0n]);

      const [reserve0After, reserve1After] = await pool.read.getReserves();

      // reserve0 should increase (we added TKA)
      assert.ok(reserve0After > reserve0Before);
      // reserve1 should decrease (we removed TKB)
      assert.ok(reserve1After < reserve1Before);
    });
  });

  describe("Price Impact", function () {
    it("Larger swaps should have more price impact", async function () {
      const { tokenA, tokenB, pool } = await deployPoolFixture();

      await addInitialLiquidity(
        tokenA,
        tokenB,
        pool,
        parseEther("1000"),
        parseEther("2000")
      );

      // Small swap - 1 token
      const smallSwap = parseEther("1");
      const smallOutput = await pool.read.getAmountOut([
        smallSwap,
        parseEther("1000"),
        parseEther("2000"),
      ]);

      // Large swap - 100 tokens
      const largeSwap = parseEther("100");
      const largeOutput = await pool.read.getAmountOut([
        largeSwap,
        parseEther("1000"),
        parseEther("2000"),
      ]);

      // Compare rates using cross multiplication to avoid precision loss
      // smallOutput / smallSwap > largeOutput / largeSwap
      // smallOutput * largeSwap > largeOutput * smallSwap
      assert.ok(
        smallOutput * largeSwap > largeOutput * smallSwap,
        "Small swap should have better rate than large swap"
      );
    });
  });
});
