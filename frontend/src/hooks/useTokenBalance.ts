"use client";

import { useAccount, useReadContract } from "wagmi";
import { ERC20ABI } from "@/abis";

export function useTokenBalance(tokenAddress: `0x${string}`) {
  const { address } = useAccount();

  const {
    data: balance,
    refetch,
    isLoading,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: balance ?? 0n,
    refetch,
    isLoading,
  };
}
