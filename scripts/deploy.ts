// scripts/deploy.ts
// This script deploys the Lock contract to the blockchain

import hre from "hardhat";
import { parseEther } from "viem";

async function main() {
  // Get the current timestamp and add 60 seconds for unlock time
  const currentTime = Math.floor(Date.now() / 1000);
  const unlockTime = BigInt(currentTime + 60); // Unlock in 60 seconds

  // Amount of ETH to lock (0.001 ETH)
  const lockedAmount = parseEther("0.001");

  console.log("Deploying Lock contract...");
  console.log(`Unlock time: ${new Date(Number(unlockTime) * 1000).toLocaleString()}`);
  console.log(`Locked amount: 0.001 ETH`);

  // Deploy the contract using viem
  const lock = await hre.viem.deployContract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  console.log(`\n✅ Lock contract deployed to: ${lock.address}`);
}

// Run the script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
