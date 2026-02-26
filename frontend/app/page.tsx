import { ConnectButton } from '@/components/ConnectButton'
import { TokenBalances } from '@/components/TokenBalances'
import { PoolStats } from '@/components/PoolStats'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">SimpleDEX</h1>
          <ConnectButton />
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Data grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TokenBalances />
          <PoolStats />
        </div>

        {/* Informational note */}
        <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <strong>Local development:</strong> This app is configured for Anvil (chainId&nbsp;31337).
          Make sure your wallet is connected to a local Anvil network. Contract addresses will be
          populated after Phase&nbsp;8 deployment.
        </div>
      </div>
    </main>
  )
}
