import { ConnectButton } from '@/components/ConnectButton'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">SimpleDEX</h1>
          <ConnectButton />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-gray-600">Connect your wallet to view pool data and token balances.</p>
      </div>
    </main>
  )
}
