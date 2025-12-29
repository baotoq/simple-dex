// Contract addresses - update these after deploying to localhost
// Run: npx hardhat run scripts/deploy.ts --network localhost
export const CONTRACTS = {
  // Default addresses from deploy script (Hardhat localhost)
  factory: "0x3aa5ebb10dc797cac828524e59a333d0a371443c" as `0x${string}`,
  tokenA: "0x9a9f2ccfde556a7e9ff0848998aa4a0cfd8863ae" as `0x${string}`,
  tokenB: "0x68b1d87f95878fe05b998f19b66f4baba5de1aed" as `0x${string}`,
  pool: "0xeC4cFde48EAdca2bC63E94BB437BbeAcE1371bF3" as `0x${string}`,
  lpToken: "0x22DB998aB7978F9962a2D5d63a9951DA15663EA6" as `0x${string}`,
  // Pool's token order (sorted by address) - token0 < token1
  // In this case: tokenB (0x68...) < tokenA (0x9a...)
  token0: "0x68b1d87f95878fe05b998f19b66f4baba5de1aed" as `0x${string}`, // TKB
  token1: "0x9a9f2ccfde556a7e9ff0848998aa4a0cfd8863ae" as `0x${string}`, // TKA
} as const;

// Token metadata for display - use lowercase for consistent lookup
export const TOKENS: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  "0x9a9f2ccfde556a7e9ff0848998aa4a0cfd8863ae": {
    symbol: "TKA",
    name: "Token A",
    decimals: 18,
  },
  "0x68b1d87f95878fe05b998f19b66f4baba5de1aed": {
    symbol: "TKB",
    name: "Token B",
    decimals: 18,
  },
};

// Helper to get token info with case-insensitive lookup
export function getTokenInfo(address: string) {
  return (
    TOKENS[address.toLowerCase()] || {
      symbol: "???",
      name: "Unknown",
      decimals: 18,
    }
  );
}
