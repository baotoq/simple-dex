"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { CONTRACTS, getTokenInfo } from "@/config/contracts";
import { useLiquidity } from "@/hooks/useLiquidity";
import { usePoolReserves } from "@/hooks/usePoolReserves";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { formatTokenAmount } from "@/utils/format";

export function AddLiquidity() {
  const { isConnected } = useAccount();
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");

  const token0Info = getTokenInfo(CONTRACTS.token0);
  const token1Info = getTokenInfo(CONTRACTS.token1);

  const { balance: balance0, refetch: refetchBalance0 } = useTokenBalance(
    CONTRACTS.token0,
  );
  const { balance: balance1, refetch: refetchBalance1 } = useTokenBalance(
    CONTRACTS.token1,
  );
  const { reserve0, reserve1, refetch: refetchReserves } = usePoolReserves();

  const {
    allowance0,
    allowance1,
    approve,
    addLiquidity,
    isProcessing,
    refetchAllowances,
    refetchLpBalance,
  } = useLiquidity();

  const amount0BigInt = amount0 ? parseEther(amount0) : 0n;
  const amount1BigInt = amount1 ? parseEther(amount1) : 0n;

  const needsApproval0 = amount0BigInt > 0n && allowance0 < amount0BigInt;
  const needsApproval1 = amount1BigInt > 0n && allowance1 < amount1BigInt;

  // Auto-calculate proportional amount when pool has liquidity
  const handleAmount0Change = (value: string) => {
    setAmount0(value);
    if (reserve0 > 0n && reserve1 > 0n && value) {
      const amt0 = parseEther(value);
      const proportionalAmt1 = (amt0 * reserve1) / reserve0;
      setAmount1(formatEther(proportionalAmt1));
    }
  };

  const handleAmount1Change = (value: string) => {
    setAmount1(value);
    if (reserve0 > 0n && reserve1 > 0n && value) {
      const amt1 = parseEther(value);
      const proportionalAmt0 = (amt1 * reserve0) / reserve1;
      setAmount0(formatEther(proportionalAmt0));
    }
  };

  const handleApprove0 = async () => {
    await approve(CONTRACTS.token0, amount0BigInt);
  };

  const handleApprove1 = async () => {
    await approve(CONTRACTS.token1, amount1BigInt);
  };

  const handleAddLiquidity = async () => {
    const success = await addLiquidity(amount0BigInt, amount1BigInt);
    if (success) {
      setAmount0("");
      setAmount1("");
      refetchBalance0();
      refetchBalance1();
      refetchReserves();
      refetchAllowances();
      refetchLpBalance();
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 text-white">
      <h3 className="text-lg font-semibold mb-4">Add Liquidity</h3>

      {/* Token 0 Input */}
      <div className="bg-gray-800 rounded-xl p-4 mb-3">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{token0Info.symbol}</span>
          <span>Balance: {formatTokenAmount(balance0)}</span>
        </div>
        <input
          type="number"
          value={amount0}
          onChange={(e) => handleAmount0Change(e.target.value)}
          placeholder="0.0"
          className="w-full bg-transparent text-xl text-white outline-none"
        />
      </div>

      {/* Token 1 Input */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{token1Info.symbol}</span>
          <span>Balance: {formatTokenAmount(balance1)}</span>
        </div>
        <input
          type="number"
          value={amount1}
          onChange={(e) => handleAmount1Change(e.target.value)}
          placeholder="0.0"
          className="w-full bg-transparent text-xl text-white outline-none"
        />
      </div>

      {/* Pool Ratio Info */}
      {reserve0 > 0n && (
        <div className="text-sm text-gray-400 mb-4">
          Current ratio: 1 {token0Info.symbol} ={" "}
          {(Number(reserve1) / Number(reserve0)).toFixed(4)} {token1Info.symbol}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {!isConnected ? (
          <button
            type="button"
            disabled
            className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 font-medium"
          >
            Connect Wallet
          </button>
        ) : needsApproval0 ? (
          <button
            type="button"
            onClick={handleApprove0}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50"
          >
            Approve {token0Info.symbol}
          </button>
        ) : needsApproval1 ? (
          <button
            type="button"
            onClick={handleApprove1}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50"
          >
            Approve {token1Info.symbol}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddLiquidity}
            disabled={
              isProcessing || amount0BigInt === 0n || amount1BigInt === 0n
            }
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition disabled:opacity-50"
          >
            {isProcessing ? "Adding..." : "Add Liquidity"}
          </button>
        )}
      </div>
    </div>
  );
}
