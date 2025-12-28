import { network } from "hardhat";
import { parseEther, formatEther } from "viem";

// Contract addresses from deployment
const ADDRESSES = {
  tokenA: "0x5fbdb2315678afecb367f032d93f642f64180aa3" as `0x${string}`,
  tokenB: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512" as `0x${string}`,
  factory: "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0" as `0x${string}`,
  pool: "0x75537828f2ce51be7289709686A69CbFDbB714F1" as `0x${string}`,
  lpToken: "0x98A01f8FF48B849CcaF4d8D987eE200683a1a11e" as `0x${string}`,
};

async function main() {
  const { viem } = await network.connect();
  const [owner, user1] = await viem.getWalletClients();

  // Get contract instances
  const tokenA = await viem.getContractAt("SimpleToken", ADDRESSES.tokenA);
  const tokenB = await viem.getContractAt("SimpleToken", ADDRESSES.tokenB);
  const pool = await viem.getContractAt("LiquidityPool", ADDRESSES.pool);
  const lpToken = await viem.getContractAt("LPToken", ADDRESSES.lpToken);

  console.log("========== DEMO: Interacting with Simple DEX ==========\n");

  // 1. Check initial state
  console.log("1. Initial State");
  const [reserve0, reserve1] = await pool.read.getReserves();
  console.log(`   Pool reserves: ${formatEther(reserve0)} TKA, ${formatEther(reserve1)} TKB`);
  console.log(`   Owner TKA balance: ${formatEther(await tokenA.read.balanceOf([owner.account.address]))}`);
  console.log(`   Owner TKB balance: ${formatEther(await tokenB.read.balanceOf([owner.account.address]))}`);
  console.log(`   Owner LP tokens: ${formatEther(await lpToken.read.balanceOf([owner.account.address]))}`);

  // 2. Perform a swap: 100 TKA -> TKB
  console.log("\n2. Swap: 100 TKA -> TKB");
  const swapAmount = parseEther("100");
  const expectedOut = await pool.read.getAmountOut([swapAmount, reserve0, reserve1]);
  console.log(`   Expected output: ~${formatEther(expectedOut)} TKB`);

  await tokenA.write.approve([ADDRESSES.pool, swapAmount]);
  await pool.write.swap0For1([swapAmount, 0n]); // 0 = no slippage protection for demo

  const [newReserve0, newReserve1] = await pool.read.getReserves();
  console.log(`   New reserves: ${formatEther(newReserve0)} TKA, ${formatEther(newReserve1)} TKB`);
  console.log(`   Owner TKB balance: ${formatEther(await tokenB.read.balanceOf([owner.account.address]))}`);

  // 3. Get price quote
  console.log("\n3. Price Quote: 1 TKA = ? TKB");
  const oneToken = parseEther("1");
  const priceOut = await pool.read.getAmountOut([oneToken, newReserve0, newReserve1]);
  console.log(`   1 TKA = ${formatEther(priceOut)} TKB`);

  // 4. Add more liquidity
  console.log("\n4. Add Liquidity: 1000 TKA + proportional TKB");
  const addAmount0 = parseEther("1000");
  // Calculate proportional amount1 based on current ratio
  const addAmount1 = (addAmount0 * newReserve1) / newReserve0;
  console.log(`   Adding: ${formatEther(addAmount0)} TKA + ${formatEther(addAmount1)} TKB`);

  await tokenA.write.approve([ADDRESSES.pool, addAmount0]);
  await tokenB.write.approve([ADDRESSES.pool, addAmount1]);
  await pool.write.addLiquidity([addAmount0, addAmount1]);

  console.log(`   New LP balance: ${formatEther(await lpToken.read.balanceOf([owner.account.address]))}`);

  // 5. Remove some liquidity
  console.log("\n5. Remove 10% of LP tokens");
  const lpBalance = await lpToken.read.balanceOf([owner.account.address]);
  const removeAmount = lpBalance / 10n;
  console.log(`   Removing: ${formatEther(removeAmount)} LP tokens`);

  const tkaBefore = await tokenA.read.balanceOf([owner.account.address]);
  const tkbBefore = await tokenB.read.balanceOf([owner.account.address]);

  await pool.write.removeLiquidity([removeAmount]);

  const tkaAfter = await tokenA.read.balanceOf([owner.account.address]);
  const tkbAfter = await tokenB.read.balanceOf([owner.account.address]);

  console.log(`   Received: ${formatEther(tkaAfter - tkaBefore)} TKA, ${formatEther(tkbAfter - tkbBefore)} TKB`);

  // Final state
  console.log("\n========== FINAL STATE ==========");
  const [finalR0, finalR1] = await pool.read.getReserves();
  console.log(`Pool reserves: ${formatEther(finalR0)} TKA, ${formatEther(finalR1)} TKB`);
  console.log(`Owner TKA: ${formatEther(await tokenA.read.balanceOf([owner.account.address]))}`);
  console.log(`Owner TKB: ${formatEther(await tokenB.read.balanceOf([owner.account.address]))}`);
  console.log(`Owner LP:  ${formatEther(await lpToken.read.balanceOf([owner.account.address]))}`);
  console.log("==================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
