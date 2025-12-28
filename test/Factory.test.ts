import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

/**
 * Tests for Factory - the pool creation contract
 */
describe("Factory", async function () {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const INITIAL_SUPPLY = parseEther("1000000");
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  /**
   * Helper to deploy factory and tokens
   */
  async function deployFixture() {
    const factory = await viem.deployContract("Factory", []);

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

    const tokenC = await viem.deployContract("SimpleToken", [
      "Token C",
      "TKC",
      INITIAL_SUPPLY,
    ]);

    return { factory, tokenA, tokenB, tokenC };
  }

  describe("Deployment", function () {
    it("Should start with zero pools", async function () {
      const { factory } = await deployFixture();

      assert.equal(await factory.read.allPoolsLength(), 0n);
    });
  });

  describe("Create Pool", function () {
    it("Should create a new pool", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      const tx = await factory.write.createPool([tokenA.address, tokenB.address]);

      // Wait for transaction
      await publicClient.waitForTransactionReceipt({ hash: tx });

      assert.equal(await factory.read.allPoolsLength(), 1n);

      const poolAddress = await factory.read.getPool([
        tokenA.address,
        tokenB.address,
      ]);
      assert.notEqual(poolAddress, ZERO_ADDRESS);
    });

    it("Should emit PoolCreated event", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      await viem.assertions.emit(
        factory.write.createPool([tokenA.address, tokenB.address]),
        factory,
        "PoolCreated"
      );
    });

    it("Should get pool regardless of token order", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      await factory.write.createPool([tokenA.address, tokenB.address]);

      const poolAB = await factory.read.getPool([tokenA.address, tokenB.address]);
      const poolBA = await factory.read.getPool([tokenB.address, tokenA.address]);

      assert.equal(getAddress(poolAB), getAddress(poolBA));
    });

    it("Should create pool with correct token addresses", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      await factory.write.createPool([tokenA.address, tokenB.address]);

      const poolAddress = await factory.read.getPool([
        tokenA.address,
        tokenB.address,
      ]);
      const pool = await viem.getContractAt("LiquidityPool", poolAddress);

      // Tokens are sorted by address, so check both possibilities
      const token0 = await pool.read.token0();
      const token1 = await pool.read.token1();

      // One should be tokenA, one should be tokenB
      const addresses = [getAddress(token0), getAddress(token1)];
      assert.ok(addresses.includes(getAddress(tokenA.address)));
      assert.ok(addresses.includes(getAddress(tokenB.address)));
    });

    it("Should create multiple pools", async function () {
      const { factory, tokenA, tokenB, tokenC } = await deployFixture();

      await factory.write.createPool([tokenA.address, tokenB.address]);
      await factory.write.createPool([tokenA.address, tokenC.address]);
      await factory.write.createPool([tokenB.address, tokenC.address]);

      assert.equal(await factory.read.allPoolsLength(), 3n);
    });

    it("Should reject duplicate pool", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      await factory.write.createPool([tokenA.address, tokenB.address]);

      // Try creating same pool again
      await assert.rejects(
        factory.write.createPool([tokenA.address, tokenB.address]),
        /Factory: pool already exists/
      );

      // Try with reversed order
      await assert.rejects(
        factory.write.createPool([tokenB.address, tokenA.address]),
        /Factory: pool already exists/
      );
    });

    it("Should reject identical tokens", async function () {
      const { factory, tokenA } = await deployFixture();

      await assert.rejects(
        factory.write.createPool([tokenA.address, tokenA.address]),
        /Factory: identical tokens/
      );
    });

    it("Should reject zero address", async function () {
      const { factory, tokenA } = await deployFixture();

      await assert.rejects(
        factory.write.createPool([tokenA.address, ZERO_ADDRESS]),
        /Factory: zero address/
      );

      await assert.rejects(
        factory.write.createPool([ZERO_ADDRESS, tokenA.address]),
        /Factory: zero address/
      );
    });
  });

  describe("Get Pool", function () {
    it("Should return zero address for non-existent pool", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      const poolAddress = await factory.read.getPool([
        tokenA.address,
        tokenB.address,
      ]);

      assert.equal(poolAddress, ZERO_ADDRESS);
    });

    it("Should return correct pool address", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      await factory.write.createPool([tokenA.address, tokenB.address]);

      const poolAddress = await factory.read.getPool([
        tokenA.address,
        tokenB.address,
      ]);

      assert.notEqual(poolAddress, ZERO_ADDRESS);

      // Verify it's a valid pool
      const pool = await viem.getContractAt("LiquidityPool", poolAddress);
      const lpTokenAddress = await pool.read.lpToken();
      assert.notEqual(lpTokenAddress, ZERO_ADDRESS);
    });
  });

  describe("All Pools Array", function () {
    it("Should track all created pools", async function () {
      const { factory, tokenA, tokenB, tokenC } = await deployFixture();

      await factory.write.createPool([tokenA.address, tokenB.address]);
      await factory.write.createPool([tokenA.address, tokenC.address]);

      const pool0 = await factory.read.allPools([0n]);
      const pool1 = await factory.read.allPools([1n]);

      assert.notEqual(pool0, ZERO_ADDRESS);
      assert.notEqual(pool1, ZERO_ADDRESS);
      assert.notEqual(pool0, pool1);
    });
  });

  describe("Integration: Full Flow", function () {
    it("Should create pool and allow trading", async function () {
      const { factory, tokenA, tokenB } = await deployFixture();

      // Create pool via factory
      await factory.write.createPool([tokenA.address, tokenB.address]);

      const poolAddress = await factory.read.getPool([
        tokenA.address,
        tokenB.address,
      ]);
      const pool = await viem.getContractAt("LiquidityPool", poolAddress);

      // Add liquidity
      const amount = parseEther("1000");
      await tokenA.write.approve([poolAddress, amount]);
      await tokenB.write.approve([poolAddress, amount]);
      await pool.write.addLiquidity([amount, amount]);

      // Verify reserves
      const [reserve0, reserve1] = await pool.read.getReserves();
      assert.equal(reserve0, amount);
      assert.equal(reserve1, amount);

      // Perform swap
      const swapAmount = parseEther("10");
      // Need to determine which token is token0
      const token0Address = await pool.read.token0();
      if (getAddress(token0Address) === getAddress(tokenA.address)) {
        await tokenA.write.approve([poolAddress, swapAmount]);
        await pool.write.swap0For1([swapAmount, 0n]);
      } else {
        await tokenB.write.approve([poolAddress, swapAmount]);
        await pool.write.swap0For1([swapAmount, 0n]);
      }

      // Verify reserves changed
      const [newReserve0, newReserve1] = await pool.read.getReserves();
      assert.ok(newReserve0 !== reserve0 || newReserve1 !== reserve1);
    });
  });
});
