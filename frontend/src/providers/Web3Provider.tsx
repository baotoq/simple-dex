"use client";

import { hardhat } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type State, WagmiProvider } from "wagmi";
import { config, metadata, projectId, wagmiAdapter } from "@/config/wagmi";

// Initialize AppKit
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [hardhat],
  defaultNetwork: hardhat,
  metadata,
  features: {
    analytics: false, // Disable analytics to avoid 403 errors on localhost
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#3b82f6",
  },
});

const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: React.ReactNode;
  initialState?: State;
}

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
