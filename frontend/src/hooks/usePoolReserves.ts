"use client";

import { useReadContract } from "wagmi";
import { LiquidityPoolABI } from "@/abis";
import { CONTRACTS } from "@/config/contracts";

export function usePoolReserves() {
  const { data, refetch, isLoading } = useReadContract({
    address: CONTRACTS.pool,
    abi: LiquidityPoolABI,
    functionName: "getReserves",
  });

  return {
    reserve0: data?.[0] ?? 0n,
    reserve1: data?.[1] ?? 0n,
    refetch,
    isLoading,
  };
}
