"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ERC20ABI, LiquidityPoolABI } from "@/abis";
import { CONTRACTS } from "@/config/contracts";
import { calculateMinOutput } from "@/utils/format";

export function useSwap() {
  const { address } = useAccount();
  const [isSwapping, setIsSwapping] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Check allowance for token0 (pool's token0)
  const { data: allowance0, refetch: refetchAllowance0 } = useReadContract({
    address: CONTRACTS.token0,
    abi: ERC20ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.pool] : undefined,
    query: { enabled: !!address },
  });

  // Check allowance for token1 (pool's token1)
  const { data: allowance1, refetch: refetchAllowance1 } = useReadContract({
    address: CONTRACTS.token1,
    abi: ERC20ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.pool] : undefined,
    query: { enabled: !!address },
  });

  // Approve token spending
  async function approve(
    tokenAddress: `0x${string}`,
    amount: bigint,
  ): Promise<boolean> {
    try {
      await writeContractAsync({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: "approve",
        args: [CONTRACTS.pool, amount],
      });
      // Wait for confirmation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (tokenAddress.toLowerCase() === CONTRACTS.token0.toLowerCase()) {
        await refetchAllowance0();
      } else {
        await refetchAllowance1();
      }
      return true;
    } catch (error) {
      console.error("Approve failed:", error);
      return false;
    }
  }

  // Execute swap
  async function swap(
    direction: "0for1" | "1for0",
    amountIn: bigint,
    expectedOut: bigint,
    slippagePercent: number = 0.5,
  ): Promise<boolean> {
    if (!address) return false;

    setIsSwapping(true);
    try {
      const minAmountOut = calculateMinOutput(expectedOut, slippagePercent);
      const functionName = direction === "0for1" ? "swap0For1" : "swap1For0";

      await writeContractAsync({
        address: CONTRACTS.pool,
        abi: LiquidityPoolABI,
        functionName,
        args: [amountIn, minAmountOut],
      });

      // Wait for confirmation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    } catch (error) {
      console.error("Swap failed:", error);
      return false;
    } finally {
      setIsSwapping(false);
    }
  }

  return {
    allowance0: allowance0 ?? 0n,
    allowance1: allowance1 ?? 0n,
    approve,
    swap,
    isSwapping,
    refetchAllowances: () => {
      refetchAllowance0();
      refetchAllowance1();
    },
  };
}
