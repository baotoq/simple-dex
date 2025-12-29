"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function Header() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
      setShowWalletModal(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Get wallet icon/name
  const getWalletInfo = (id: string, name: string) => {
    const wallets: Record<string, { name: string; icon: string }> = {
      metaMask: { name: "MetaMask", icon: "🦊" },
      injected: { name: name || "Browser Wallet", icon: "🌐" },
      walletConnect: { name: "WalletConnect", icon: "🔗" },
      coinbaseWallet: { name: "Coinbase", icon: "🔵" },
      safe: { name: "Safe", icon: "🔒" },
    };
    return wallets[id] || { name, icon: "💳" };
  };

  return (
    <>
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-white">
              Simple DEX
            </Link>
            <nav className="flex gap-6">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Swap
              </Link>
              <Link
                href="/liquidity"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Liquidity
              </Link>
            </nav>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">{connector?.name}</span>
              <span className="text-gray-300 bg-gray-800 px-3 py-2 rounded-lg text-sm">
                {address && shortenAddress(address)}
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {isPending ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Connect Wallet
              </h3>
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {connectors.map((connector) => {
                const info = getWalletInfo(connector.id, connector.name);
                return (
                  <button
                    type="button"
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition disabled:opacity-50"
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <span className="text-white font-medium">{info.name}</span>
                    {connector.id === "injected" && (
                      <span className="text-xs text-gray-500 ml-auto">
                        Detected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Select a wallet that you have installed
            </p>
          </div>
        </div>
      )}
    </>
  );
}
