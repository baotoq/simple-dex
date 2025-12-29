import { formatEther, parseEther } from "viem";

// Format a bigint to a readable string with decimals
export function formatTokenAmount(
  amount: bigint,
  decimals: number = 4,
): string {
  const formatted = formatEther(amount);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// Parse user input to bigint
export function parseTokenAmount(amount: string): bigint {
  if (!amount || amount === "") return 0n;
  try {
    return parseEther(amount);
  } catch {
    return 0n;
  }
}

// Shorten address for display
export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Calculate price from reserves
export function calculatePrice(reserve0: bigint, reserve1: bigint): string {
  if (reserve0 === 0n) return "0";
  const price = Number(reserve1) / Number(reserve0);
  return price.toFixed(6);
}

// Calculate slippage-adjusted minimum output
export function calculateMinOutput(
  expectedOutput: bigint,
  slippagePercent: number,
): bigint {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100)); // Convert to basis points
  return (expectedOutput * (10000n - slippageBps)) / 10000n;
}
