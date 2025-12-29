import { network } from "hardhat";
import { parseEther } from "viem";

async function main() {
  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();

  console.log("Deploying contracts with account:", deployer.account.address);

  // Deploy test tokens
  console.log("\n1. Deploying test tokens...");
  const tokenA = await viem.deployContract("SimpleToken", [
    "Token A",
    "TKA",
    parseEther("1000000"),
  ]);
  console.log("   TokenA deployed to:", tokenA.address);

  const tokenB = await viem.deployContract("SimpleToken", [
    "Token B",
    "TKB",
    parseEther("1000000"),
  ]);
  console.log("   TokenB deployed to:", tokenB.address);

  // Deploy Factory
  console.log("\n2. Deploying Factory...");
  const factory = await viem.deployContract("Factory", []);
  console.log("   Factory deployed to:", factory.address);

  // Create a pool via Factory
  console.log("\n3. Creating TKA-TKB pool via Factory...");
  await factory.write.createPool([tokenA.address, tokenB.address]);
  const poolAddress = await factory.read.getPool([tokenA.address, tokenB.address]);
  console.log("   Pool deployed to:", poolAddress);

  // Get pool contract
  const pool = await viem.getContractAt("LiquidityPool", poolAddress);
  const lpTokenAddress = await pool.read.lpToken();
  console.log("   LP Token at:", lpTokenAddress);

  // Add initial liquidity
  // Note: Factory sorts tokens, so pool.token0 might be tokenB if tokenB.address < tokenA.address
  const poolToken0 = await pool.read.token0();
  const poolToken1 = await pool.read.token1();

  // Determine amounts based on which token is token0 in the pool
  const isTokenAFirst = poolToken0.toLowerCase() === tokenA.address.toLowerCase();
  const amount0 = isTokenAFirst ? parseEther("10000") : parseEther("20000");
  const amount1 = isTokenAFirst ? parseEther("20000") : parseEther("10000");

  console.log("\n4. Adding initial liquidity...");
  console.log(`   Pool token0: ${poolToken0}`);
  console.log(`   Pool token1: ${poolToken1}`);

  // Approve both tokens for the pool
  await tokenA.write.approve([poolAddress, parseEther("20000")]);
  await tokenB.write.approve([poolAddress, parseEther("20000")]);
  await pool.write.addLiquidity([amount0, amount1]);

  const [reserve0, reserve1] = await pool.read.getReserves();
  console.log("   Reserves - TKA:", reserve0.toString(), "TKB:", reserve1.toString());

  // Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("TokenA (TKA):", tokenA.address);
  console.log("TokenB (TKB):", tokenB.address);
  console.log("Factory:     ", factory.address);
  console.log("Pool:        ", poolAddress);
  console.log("LP Token:    ", lpTokenAddress);
  console.log("=========================================");

  console.log("\nYou can now interact with the contracts!");
  console.log("Run: npx hardhat console --network localhost");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
