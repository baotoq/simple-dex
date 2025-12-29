"use client";

import { useReadContract } from "wagmi";
import { ERC20ABI } from "@/abis";
import { CONTRACTS, getTokenInfo } from "@/config/contracts";
import { useLiquidity } from "@/hooks/useLiquidity";
import { usePoolReserves } from "@/hooks/usePoolReserves";
import { formatTokenAmount } from "@/utils/format";

export function PoolInfo() {
  const token0Info = getTokenInfo(CONTRACTS.token0);
  const token1Info = getTokenInfo(CONTRACTS.token1);

  const { reserve0, reserve1 } = usePoolReserves();
  const { lpBalance } = useLiquidity();

  // Get LP total supply
  const { data: lpTotalSupply } = useReadContract({
    address: CONTRACTS.lpToken,
    abi: ERC20ABI,
    functionName: "totalSupply",
  });

  const poolShare =
    lpTotalSupply && lpTotalSupply > 0n
      ? (Number(lpBalance) / Number(lpTotalSupply)) * 100
      : 0;

  const price01 = reserve0 > 0n ? Number(reserve1) / Number(reserve0) : 0;
  const price10 = reserve1 > 0n ? Number(reserve0) / Number(reserve1) : 0;

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Pool Information
      </h3>

      <div className="space-y-3 text-white">
        <div className="flex justify-between">
          <span className="text-gray-400">Pool Pair</span>
          <span className="font-medium">
            {token0Info.symbol} / {token1Info.symbol}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">{token0Info.symbol} Reserve</span>
          <span className="font-medium">{formatTokenAmount(reserve0)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">{token1Info.symbol} Reserve</span>
          <span className="font-medium">{formatTokenAmount(reserve1)}</span>
        </div>

        <div className="border-t border-gray-800 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Price</span>
            <span className="font-medium">
              1 {token0Info.symbol} = {price01.toFixed(4)} {token1Info.symbol}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-400"></span>
            <span className="font-medium">
              1 {token1Info.symbol} = {price10.toFixed(4)} {token0Info.symbol}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Your LP Tokens</span>
            <span className="font-medium">{formatTokenAmount(lpBalance)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-400">Your Pool Share</span>
            <span className="font-medium">{poolShare.toFixed(4)}%</span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Swap Fee</span>
            <span className="font-medium">0.3%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
