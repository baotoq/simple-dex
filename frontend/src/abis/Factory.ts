export const FactoryABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token0", type: "address" },
      { indexed: true, name: "token1", type: "address" },
      { indexed: false, name: "pool", type: "address" },
      { indexed: false, name: "poolIndex", type: "uint256" },
    ],
    name: "PoolCreated",
    type: "event",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "allPools",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "allPoolsLength",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    name: "createPool",
    outputs: [{ name: "pool", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    name: "getPool",
    outputs: [{ name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
