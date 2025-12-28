import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

/**
 * Tests specific to SimpleToken
 * (ERC20Base functionality is tested in ERC20Base.test.ts)
 */
describe("SimpleToken", async function () {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  describe("Constructor", function () {
    it("Should mint initial supply to deployer", async function () {
      const initialSupply = parseEther("500000");

      const token = await viem.deployContract("SimpleToken", [
        "My Token",
        "MTK",
        initialSupply,
      ]);

      assert.equal(await token.read.totalSupply(), initialSupply);
      assert.equal(
        await token.read.balanceOf([owner.account.address]),
        initialSupply
      );
    });

    it("Should set custom name and symbol", async function () {
      const token = await viem.deployContract("SimpleToken", [
        "Custom Name",
        "CUST",
        parseEther("1000"),
      ]);

      assert.equal(await token.read.name(), "Custom Name");
      assert.equal(await token.read.symbol(), "CUST");
    });

    it("Should allow zero initial supply", async function () {
      const token = await viem.deployContract("SimpleToken", [
        "Zero Token",
        "ZERO",
        0n,
      ]);

      assert.equal(await token.read.totalSupply(), 0n);
    });
  });
});
