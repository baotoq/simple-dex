import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

/**
 * Tests for ERC20Base functionality
 * We use SimpleToken to test since ERC20Base is abstract
 */
describe("ERC20Base", async function () {
  const { viem } = await network.connect();
  const [owner, user1, user2] = await viem.getWalletClients();

  const INITIAL_SUPPLY = parseEther("1000000"); // 1 million tokens

  /**
   * Helper to deploy a fresh token for each test
   */
  async function deployToken() {
    return viem.deployContract("SimpleToken", [
      "Test Token",
      "TEST",
      INITIAL_SUPPLY,
    ]);
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const token = await deployToken();

      assert.equal(await token.read.name(), "Test Token");
      assert.equal(await token.read.symbol(), "TEST");
    });

    it("Should set decimals to 18", async function () {
      const token = await deployToken();
      assert.equal(await token.read.decimals(), 18);
    });

    it("Should mint initial supply to deployer", async function () {
      const token = await deployToken();

      assert.equal(await token.read.totalSupply(), INITIAL_SUPPLY);
      assert.equal(
        await token.read.balanceOf([owner.account.address]),
        INITIAL_SUPPLY
      );
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const token = await deployToken();
      const amount = parseEther("100");

      await token.write.transfer([user1.account.address, amount]);

      assert.equal(await token.read.balanceOf([user1.account.address]), amount);
      assert.equal(
        await token.read.balanceOf([owner.account.address]),
        INITIAL_SUPPLY - amount
      );
    });

    it("Should emit Transfer event", async function () {
      const token = await deployToken();
      const amount = parseEther("100");

      // Just check event is emitted (simpler assertion)
      await viem.assertions.emit(
        token.write.transfer([user1.account.address, amount]),
        token,
        "Transfer"
      );
    });

    it("Should fail if sender has insufficient balance", async function () {
      const token = await deployToken();
      const amount = parseEther("100");

      // user1 has no tokens - deploy a fresh token where user1 has nothing
      const tokenAsUser1 = await viem.getContractAt("SimpleToken", token.address, {
        client: { wallet: user1 },
      });

      try {
        await tokenAsUser1.write.transfer([user2.account.address, amount]);
        assert.fail("Should have thrown");
      } catch (error: unknown) {
        assert.ok(
          (error as Error).message.includes("ERC20: insufficient balance"),
          "Should fail with insufficient balance"
        );
      }
    });

    it("Should fail when transferring to zero address", async function () {
      const token = await deployToken();
      const amount = parseEther("100");
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

      try {
        await token.write.transfer([ZERO_ADDRESS, amount]);
        assert.fail("Should have thrown");
      } catch (error: unknown) {
        assert.ok(
          (error as Error).message.includes("ERC20: transfer to zero address"),
          "Should fail with zero address"
        );
      }
    });
  });

  describe("Approve and Allowance", function () {
    it("Should approve tokens for spender", async function () {
      const token = await deployToken();
      const amount = parseEther("100");

      await token.write.approve([user1.account.address, amount]);

      assert.equal(
        await token.read.allowance([owner.account.address, user1.account.address]),
        amount
      );
    });

    it("Should emit Approval event", async function () {
      const token = await deployToken();
      const amount = parseEther("100");

      await viem.assertions.emit(
        token.write.approve([user1.account.address, amount]),
        token,
        "Approval"
      );
    });

    it("Should update allowance on multiple approvals", async function () {
      const token = await deployToken();

      await token.write.approve([user1.account.address, parseEther("100")]);
      await token.write.approve([user1.account.address, parseEther("200")]);

      assert.equal(
        await token.read.allowance([owner.account.address, user1.account.address]),
        parseEther("200")
      );
    });
  });

  describe("TransferFrom", function () {
    it("Should transfer tokens using allowance", async function () {
      const token = await deployToken();
      const amount = parseEther("100");

      // Owner approves user1 to spend tokens
      await token.write.approve([user1.account.address, amount]);

      // user1 transfers from owner to user2
      const tokenAsUser1 = await viem.getContractAt("SimpleToken", token.address, {
        client: { wallet: user1 },
      });
      await tokenAsUser1.write.transferFrom([
        owner.account.address,
        user2.account.address,
        amount,
      ]);

      assert.equal(await token.read.balanceOf([user2.account.address]), amount);
      assert.equal(
        await token.read.allowance([owner.account.address, user1.account.address]),
        0n
      );
    });

    it("Should fail if allowance is insufficient", async function () {
      const token = await deployToken();
      const approvedAmount = parseEther("50");
      const transferAmount = parseEther("100");

      await token.write.approve([user1.account.address, approvedAmount]);

      const tokenAsUser1 = await viem.getContractAt("SimpleToken", token.address, {
        client: { wallet: user1 },
      });

      try {
        await tokenAsUser1.write.transferFrom([
          owner.account.address,
          user2.account.address,
          transferAmount,
        ]);
        assert.fail("Should have thrown");
      } catch (error: unknown) {
        assert.ok(
          (error as Error).message.includes("ERC20: insufficient allowance"),
          "Should fail with insufficient allowance"
        );
      }
    });

    it("Should reduce allowance after transferFrom", async function () {
      const token = await deployToken();
      const approvedAmount = parseEther("100");
      const transferAmount = parseEther("40");

      await token.write.approve([user1.account.address, approvedAmount]);

      const tokenAsUser1 = await viem.getContractAt("SimpleToken", token.address, {
        client: { wallet: user1 },
      });
      await tokenAsUser1.write.transferFrom([
        owner.account.address,
        user2.account.address,
        transferAmount,
      ]);

      assert.equal(
        await token.read.allowance([owner.account.address, user1.account.address]),
        approvedAmount - transferAmount
      );
    });
  });
});
