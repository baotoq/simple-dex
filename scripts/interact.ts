// scripts/interact.ts
// This script shows how to interact with a deployed contract

import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  // The address where Lock contract was deployed
  // (Use the address from your deploy output!)
  const lockAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

  console.log("=".repeat(50));
  console.log("Interacting with Lock contract");
  console.log("Address:", lockAddress);
  console.log("=".repeat(50));

  // Get the contract instance
  // This connects to the deployed contract so we can call its functions
  const lock = await hre.viem.getContractAt("Lock", lockAddress);

  // ============================================================
  // READ FUNCTIONS (free, no gas needed)
  // These just read data from the blockchain
  // ============================================================

  // Read the unlock time
  const unlockTime = await lock.read.unlockTime();
  const unlockDate = new Date(Number(unlockTime) * 1000);
  console.log("\n📅 Unlock Time:", unlockDate.toLocaleString());

  // Read the owner
  const owner = await lock.read.owner();
  console.log("👤 Owner:", owner);

  // Read contract balance (how much ETH is locked)
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: lockAddress });
  console.log("💰 Locked ETH:", formatEther(balance), "ETH");

  // ============================================================
  // CHECK IF WE CAN WITHDRAW
  // ============================================================

  const now = Math.floor(Date.now() / 1000);
  const canWithdraw = now >= Number(unlockTime);

  console.log("\n⏰ Current Time:", new Date().toLocaleString());
  console.log("🔓 Can Withdraw?:", canWithdraw ? "YES" : "NO (wait for unlock time)");

  // ============================================================
  // WRITE FUNCTION (costs gas, changes blockchain state)
  // ============================================================

  if (canWithdraw) {
    console.log("\n🎉 Attempting to withdraw...");

    // Get the wallet client (signer) to send transactions
    const [walletClient] = await hre.viem.getWalletClients();

    try {
      // Call the withdraw function
      const hash = await lock.write.withdraw();
      console.log("✅ Withdraw successful!");
      console.log("📝 Transaction hash:", hash);
    } catch (error: any) {
      console.log("❌ Withdraw failed:", error.message);
    }
  } else {
    const secondsLeft = Number(unlockTime) - now;
    console.log(`\n⏳ Wait ${secondsLeft} more seconds to withdraw`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
