"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ERC20ABI, LiquidityPoolABI } from "@/abis";
import { CONTRACTS } from "@/config/contracts";

export function useLiquidity() {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Check allowances for pool's token0 and token1
  const { data: allowance0, refetch: refetchAllowance0 } = useReadContract({
    address: CONTRACTS.token0,
    abi: ERC20ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.pool] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance1, refetch: refetchAllowance1 } = useReadContract({
    address: CONTRACTS.token1,
    abi: ERC20ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.pool] : undefined,
    query: { enabled: !!address },
  });

  // Get LP token balance
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: CONTRACTS.lpToken,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Approve token
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

  // Add liquidity
  async function addLiquidity(
    amount0: bigint,
    amount1: bigint,
  ): Promise<boolean> {
    if (!address) return false;

    setIsProcessing(true);
    try {
      await writeContractAsync({
        address: CONTRACTS.pool,
        abi: LiquidityPoolABI,
        functionName: "addLiquidity",
        args: [amount0, amount1],
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    } catch (error) {
      console.error("Add liquidity failed:", error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  // Remove liquidity
  async function removeLiquidity(lpAmount: bigint): Promise<boolean> {
    if (!address) return false;

    setIsProcessing(true);
    try {
      await writeContractAsync({
        address: CONTRACTS.pool,
        abi: LiquidityPoolABI,
        functionName: "removeLiquidity",
        args: [lpAmount],
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    } catch (error) {
      console.error("Remove liquidity failed:", error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }

  return {
    allowance0: allowance0 ?? 0n,
    allowance1: allowance1 ?? 0n,
    lpBalance: lpBalance ?? 0n,
    approve,
    addLiquidity,
    removeLiquidity,
    isProcessing,
    refetchAllowances: () => {
      refetchAllowance0();
      refetchAllowance1();
    },
    refetchLpBalance,
  };
}
