"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { LiquidityPoolABI } from "@/abis";
import { CONTRACTS, getTokenInfo } from "@/config/contracts";
import { usePoolReserves } from "@/hooks/usePoolReserves";
import { useSwap } from "@/hooks/useSwap";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { calculateMinOutput, formatTokenAmount } from "@/utils/format";

export function SwapCard() {
  const { isConnected } = useAccount();
  const [inputAmount, setInputAmount] = useState("");
  const [direction, setDirection] = useState<"0for1" | "1for0">("0for1");
  const [slippage, setSlippage] = useState(0.5);

  // Use pool's token0/token1 for swap direction (these are sorted by address)
  // swap0For1 = swap token0 for token1
  // swap1For0 = swap token1 for token0
  const tokenIn = direction === "0for1" ? CONTRACTS.token0 : CONTRACTS.token1;
  const tokenOut = direction === "0for1" ? CONTRACTS.token1 : CONTRACTS.token0;
  const tokenInInfo = getTokenInfo(tokenIn);
  const tokenOutInfo = getTokenInfo(tokenOut);

  // Balances and reserves
  const { balance: balanceIn, refetch: refetchBalanceIn } =
    useTokenBalance(tokenIn);
  const { balance: balanceOut, refetch: refetchBalanceOut } =
    useTokenBalance(tokenOut);
  const { reserve0, reserve1, refetch: refetchReserves } = usePoolReserves();

  // Swap hook
  const {
    allowance0,
    allowance1,
    approve,
    swap,
    isSwapping,
    refetchAllowances,
  } = useSwap();

  // Calculate output amount
  const amountInBigInt = inputAmount ? parseEther(inputAmount) : 0n;
  const reserveIn = direction === "0for1" ? reserve0 : reserve1;
  const reserveOut = direction === "0for1" ? reserve1 : reserve0;
  const currentAllowance = direction === "0for1" ? allowance0 : allowance1;

  // Get expected output from contract
  const { data: expectedOutput } = useReadContract({
    address: CONTRACTS.pool,
    abi: LiquidityPoolABI,
    functionName: "getAmountOut",
    args: [amountInBigInt, reserveIn, reserveOut],
    query: {
      enabled: amountInBigInt > 0n && reserveIn > 0n,
    },
  });

  const needsApproval =
    amountInBigInt > 0n && currentAllowance < amountInBigInt;

  // Switch token direction
  const handleSwitch = () => {
    setDirection(direction === "0for1" ? "1for0" : "0for1");
    setInputAmount("");
  };

  // Handle approve
  const handleApprove = async () => {
    const success = await approve(tokenIn, amountInBigInt);
    if (success) {
      refetchAllowances();
    }
  };

  // Handle swap
  const handleSwap = async () => {
    if (!expectedOutput) return;
    const success = await swap(
      direction,
      amountInBigInt,
      expectedOutput,
      slippage,
    );
    if (success) {
      setInputAmount("");
      refetchBalanceIn();
      refetchBalanceOut();
      refetchReserves();
      refetchAllowances();
    }
  };

  // Set max input
  const handleMax = () => {
    setInputAmount(formatEther(balanceIn));
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 max-w-md mx-auto text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Swap</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Slippage:</span>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(Number(e.target.value))}
            className="w-16 bg-gray-800 rounded px-2 py-1 text-white"
            step="0.1"
            min="0.1"
            max="50"
          />
          <span>%</span>
        </div>
      </div>

      {/* Input Token */}
      <div className="bg-gray-800 rounded-xl p-4 mb-2">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>You pay</span>
          <span>
            Balance: {formatTokenAmount(balanceIn)}{" "}
            <button
              type="button"
              onClick={handleMax}
              className="text-blue-400 hover:text-blue-300"
            >
              MAX
            </button>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-white text-2xl outline-none"
          />
          <div className="bg-gray-700 text-white px-3 py-2 rounded-lg font-medium">
            {tokenInInfo.symbol}
          </div>
        </div>
      </div>

      {/* Switch Button */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          type="button"
          onClick={handleSwitch}
          className="bg-gray-800 border-4 border-gray-900 rounded-xl p-2 hover:bg-gray-700 transition"
          aria-label="Switch tokens"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* Output Token */}
      <div className="bg-gray-800 rounded-xl p-4 mt-2">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>You receive</span>
          <span>Balance: {formatTokenAmount(balanceOut)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-2xl text-gray-300">
            {expectedOutput ? formatTokenAmount(expectedOutput) : "0.0"}
          </div>
          <div className="bg-gray-700 text-white px-3 py-2 rounded-lg font-medium">
            {tokenOutInfo.symbol}
          </div>
        </div>
      </div>

      {/* Price Info */}
      {reserveIn > 0n && reserveOut > 0n && (
        <div className="mt-4 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Price</span>
            <span>
              1 {tokenInInfo.symbol} ={" "}
              {(Number(reserveOut) / Number(reserveIn)).toFixed(4)}{" "}
              {tokenOutInfo.symbol}
            </span>
          </div>
          {expectedOutput && amountInBigInt > 0n && (
            <div className="flex justify-between mt-1">
              <span>Minimum received</span>
              <span>
                {formatTokenAmount(
                  calculateMinOutput(expectedOutput, slippage),
                )}{" "}
                {tokenOutInfo.symbol}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4">
        {!isConnected ? (
          <button
            type="button"
            disabled
            className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 font-medium"
          >
            Connect Wallet
          </button>
        ) : needsApproval ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSwapping}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50"
          >
            Approve {tokenInInfo.symbol}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSwap}
            disabled={isSwapping || amountInBigInt === 0n || !expectedOutput}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50"
          >
            {isSwapping ? "Swapping..." : "Swap"}
          </button>
        )}
      </div>
    </div>
  );
}
