import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

/**
 * Hardhat Ignition module for deploying the Simple DEX
 *
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/SimpleDex.ts --network localhost
 *
 * Features:
 *   - Declarative deployment
 *   - Auto-resumes if deployment fails midway
 *   - Tracks deployment history in ignition/deployments/
 */
const SimpleDexModule = buildModule("SimpleDex", (m) => {
  // Deploy test tokens
  const tokenA = m.contract("SimpleToken", [
    "Token A",
    "TKA",
    parseEther("1000000"),
  ]);

  const tokenB = m.contract("SimpleToken", [
    "Token B",
    "TKB",
    parseEther("1000000"),
  ], { id: "TokenB" }); // Need unique ID since same contract

  // Deploy Factory
  const factory = m.contract("Factory", []);

  // Note: Ignition is best for deploying contracts.
  // For contract interactions (createPool, addLiquidity),
  // use a separate script after deployment.

  return { tokenA, tokenB, factory };
});

export default SimpleDexModule;
