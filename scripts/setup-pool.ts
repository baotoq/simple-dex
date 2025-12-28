import { network } from "hardhat";
import { parseEther, formatEther } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Post-deployment script to create pool and add initial liquidity
 *
 * Run after Ignition deployment:
 *   npx hardhat ignition deploy ignition/modules/SimpleDex.ts --network localhost
 *   npx hardhat run scripts/setup-pool.ts --network localhost
 */
async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();

  // Read deployed addresses from Ignition
  const deploymentPath = path.join(
    __dirname,
    "../ignition/deployments/chain-31337/deployed_addresses.json"
  );

  if (!fs.existsSync(deploymentPath)) {
    console.error("No Ignition deployment found. Run:");
    console.error("  npx hardhat ignition deploy ignition/modules/SimpleDex.ts --network localhost");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const tokenAAddress = addresses["SimpleDex#SimpleToken"] as `0x${string}`;
  const tokenBAddress = addresses["SimpleDex#TokenB"] as `0x${string}`;
  const factoryAddress = addresses["SimpleDex#Factory"] as `0x${string}`;

  console.log("========== Setting up Pool ==========");
  console.log("TokenA:", tokenAAddress);
  console.log("TokenB:", tokenBAddress);
  console.log("Factory:", factoryAddress);

  // Get contract instances
  const tokenA = await viem.getContractAt("SimpleToken", tokenAAddress);
  const tokenB = await viem.getContractAt("SimpleToken", tokenBAddress);
  const factory = await viem.getContractAt("Factory", factoryAddress);

  // Create pool
  console.log("\n1. Creating TKA-TKB pool...");
  await factory.write.createPool([tokenAAddress, tokenBAddress]);
  const poolAddress = await factory.read.getPool([tokenAAddress, tokenBAddress]);
  console.log("   Pool deployed to:", poolAddress);

  // Get pool and LP token
  const pool = await viem.getContractAt("LiquidityPool", poolAddress);
  const lpTokenAddress = await pool.read.lpToken();
  console.log("   LP Token at:", lpTokenAddress);

  // Add initial liquidity
  console.log("\n2. Adding initial liquidity (10,000 TKA + 20,000 TKB)...");
  await tokenA.write.approve([poolAddress, parseEther("10000")]);
  await tokenB.write.approve([poolAddress, parseEther("20000")]);
  await pool.write.addLiquidity([parseEther("10000"), parseEther("20000")]);

  const [reserve0, reserve1] = await pool.read.getReserves();
  console.log(`   Reserves: ${formatEther(reserve0)} TKA, ${formatEther(reserve1)} TKB`);

  console.log("\n========== Setup Complete ==========");
  console.log("Pool:", poolAddress);
  console.log("LP Token:", lpTokenAddress);
  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
