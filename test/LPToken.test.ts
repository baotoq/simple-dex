import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

/**
 * Tests for LPToken - focusing on pool-only mint/burn functionality
 */
describe("LPToken", async function () {
  const { viem } = await network.connect();
  const [deployer, user1, user2] = await viem.getWalletClients();

  describe("Deployment", function () {
    it("Should set the pool to deployer address", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const poolAddress = await lpToken.read.pool();
      assert.equal(poolAddress.toLowerCase(), deployer.account.address.toLowerCase());
    });

    it("Should set correct name and symbol", async function () {
      const lpToken = await viem.deployContract("LPToken", [
        "TKA-TKB LP",
        "TKA-TKB-LP",
      ]);

      assert.equal(await lpToken.read.name(), "TKA-TKB LP");
      assert.equal(await lpToken.read.symbol(), "TKA-TKB-LP");
    });

    it("Should start with zero total supply", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      assert.equal(await lpToken.read.totalSupply(), 0n);
    });
  });

  describe("Mint (pool only)", function () {
    it("Should allow pool to mint tokens", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const amount = parseEther("100");

      await lpToken.write.mint([user1.account.address, amount]);

      assert.equal(await lpToken.read.balanceOf([user1.account.address]), amount);
      assert.equal(await lpToken.read.totalSupply(), amount);
    });

    it("Should emit Transfer event on mint", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const amount = parseEther("100");

      await viem.assertions.emit(
        lpToken.write.mint([user1.account.address, amount]),
        lpToken,
        "Transfer"
      );
    });

    it("Should reject mint from non-pool address", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const amount = parseEther("100");

      // user1 is not the pool
      const lpTokenAsUser = await viem.getContractAt("LPToken", lpToken.address, {
        client: { wallet: user1 },
      });

      try {
        await lpTokenAsUser.write.mint([user1.account.address, amount]);
        assert.fail("Should have thrown");
      } catch (error: unknown) {
        assert.ok(
          (error as Error).message.includes("LPToken: caller is not the pool"),
          "Should fail with not the pool"
        );
      }
    });
  });

  describe("Burn (pool only)", function () {
    it("Should allow pool to burn tokens", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const mintAmount = parseEther("100");
      const burnAmount = parseEther("40");

      await lpToken.write.mint([user1.account.address, mintAmount]);
      await lpToken.write.burn([user1.account.address, burnAmount]);

      assert.equal(
        await lpToken.read.balanceOf([user1.account.address]),
        mintAmount - burnAmount
      );
      assert.equal(await lpToken.read.totalSupply(), mintAmount - burnAmount);
    });

    it("Should emit Transfer event on burn", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const amount = parseEther("100");

      await lpToken.write.mint([user1.account.address, amount]);

      await viem.assertions.emit(
        lpToken.write.burn([user1.account.address, amount]),
        lpToken,
        "Transfer"
      );
    });

    it("Should reject burn from non-pool address", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const amount = parseEther("100");

      await lpToken.write.mint([user1.account.address, amount]);

      const lpTokenAsUser = await viem.getContractAt("LPToken", lpToken.address, {
        client: { wallet: user1 },
      });

      try {
        await lpTokenAsUser.write.burn([user1.account.address, amount]);
        assert.fail("Should have thrown");
      } catch (error: unknown) {
        assert.ok(
          (error as Error).message.includes("LPToken: caller is not the pool"),
          "Should fail with not the pool"
        );
      }
    });

    it("Should reject burn if balance insufficient", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const mintAmount = parseEther("50");
      const burnAmount = parseEther("100");

      await lpToken.write.mint([user1.account.address, mintAmount]);

      try {
        await lpToken.write.burn([user1.account.address, burnAmount]);
        assert.fail("Should have thrown");
      } catch (error: unknown) {
        assert.ok(
          (error as Error).message.includes("ERC20: insufficient balance to burn"),
          "Should fail with insufficient balance"
        );
      }
    });
  });

  describe("LP Token still has ERC20 transfer functionality", function () {
    it("Should allow users to transfer LP tokens", async function () {
      const lpToken = await viem.deployContract("LPToken", ["LP Token", "LP"]);
      const amount = parseEther("100");
      const transferAmount = parseEther("30");

      // Pool (deployer) mints to user1
      await lpToken.write.mint([user1.account.address, amount]);

      // user1 transfers to user2
      const lpTokenAsUser1 = await viem.getContractAt("LPToken", lpToken.address, {
        client: { wallet: user1 },
      });
      await lpTokenAsUser1.write.transfer([user2.account.address, transferAmount]);

      assert.equal(
        await lpToken.read.balanceOf([user1.account.address]),
        amount - transferAmount
      );
      assert.equal(
        await lpToken.read.balanceOf([user2.account.address]),
        transferAmount
      );
    });
  });
});
