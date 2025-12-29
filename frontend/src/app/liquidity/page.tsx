import { AddLiquidity } from "@/components/AddLiquidity";
import { PoolInfo } from "@/components/PoolInfo";
import { RemoveLiquidity } from "@/components/RemoveLiquidity";

export default function LiquidityPage() {
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Liquidity</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <AddLiquidity />
            <RemoveLiquidity />
          </div>
          <div>
            <PoolInfo />
          </div>
        </div>
      </div>
    </div>
  );
}
