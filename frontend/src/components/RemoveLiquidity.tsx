"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ERC20ABI } from "@/abis";
import { CONTRACTS, getTokenInfo } from "@/config/contracts";
import { useLiquidity } from "@/hooks/useLiquidity";
import { usePoolReserves } from "@/hooks/usePoolReserves";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { formatTokenAmount } from "@/utils/format";

export function RemoveLiquidity() {
  const { isConnected } = useAccount();
  const [lpAmount, setLpAmount] = useState("");

  const token0Info = getTokenInfo(CONTRACTS.token0);
  const token1Info = getTokenInfo(CONTRACTS.token1);

  const { refetch: refetchBalance0 } = useTokenBalance(CONTRACTS.token0);
  const { refetch: refetchBalance1 } = useTokenBalance(CONTRACTS.token1);
  const { reserve0, reserve1, refetch: refetchReserves } = usePoolReserves();

  const { lpBalance, removeLiquidity, isProcessing, refetchLpBalance } =
    useLiquidity();

  // Get LP total supply
  const { data: lpTotalSupply } = useReadContract({
    address: CONTRACTS.lpToken,
    abi: ERC20ABI,
    functionName: "totalSupply",
  });

  const lpAmountBigInt = lpAmount ? parseEther(lpAmount) : 0n;

  // Calculate expected tokens to receive
  const expectedToken0 =
    lpTotalSupply && lpTotalSupply > 0n
      ? (lpAmountBigInt * reserve0) / lpTotalSupply
      : 0n;
  const expectedToken1 =
    lpTotalSupply && lpTotalSupply > 0n
      ? (lpAmountBigInt * reserve1) / lpTotalSupply
      : 0n;

  // Pool share percentage
  const poolShare =
    lpTotalSupply && lpTotalSupply > 0n
      ? (Number(lpBalance) / Number(lpTotalSupply)) * 100
      : 0;

  const handleMax = () => {
    setLpAmount(formatEther(lpBalance));
  };

  const handleRemoveLiquidity = async () => {
    const success = await removeLiquidity(lpAmountBigInt);
    if (success) {
      setLpAmount("");
      refetchBalance0();
      refetchBalance1();
      refetchReserves();
      refetchLpBalance();
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 text-white">
      <h3 className="text-lg font-semibold mb-4">Remove Liquidity</h3>

      {/* LP Token Balance */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>LP Tokens</span>
          <span>
            Balance: {formatTokenAmount(lpBalance)}{" "}
            <button
              type="button"
              onClick={handleMax}
              className="text-blue-400 hover:text-blue-300"
            >
              MAX
            </button>
          </span>
        </div>
        <input
          type="number"
          value={lpAmount}
          onChange={(e) => setLpAmount(e.target.value)}
          placeholder="0.0"
          className="w-full bg-transparent text-xl text-white outline-none"
        />
        {poolShare > 0 && (
          <div className="text-sm text-gray-400 mt-2">
            Your pool share: {poolShare.toFixed(4)}%
          </div>
        )}
      </div>

      {/* Expected Output */}
      {lpAmountBigInt > 0n && (
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <div className="text-sm text-gray-400 mb-2">You will receive:</div>
          <div className="space-y-2 font-medium">
            <div className="flex justify-between">
              <span>{token0Info.symbol}</span>
              <span>{formatTokenAmount(expectedToken0)}</span>
            </div>
            <div className="flex justify-between">
              <span>{token1Info.symbol}</span>
              <span>{formatTokenAmount(expectedToken1)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!isConnected ? (
        <button
          type="button"
          disabled
          className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 font-medium"
        >
          Connect Wallet
        </button>
      ) : (
        <button
          type="button"
          onClick={handleRemoveLiquidity}
          disabled={
            isProcessing || lpAmountBigInt === 0n || lpAmountBigInt > lpBalance
          }
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition disabled:opacity-50"
        >
          {isProcessing ? "Removing..." : "Remove Liquidity"}
        </button>
      )}
    </div>
  );
}
