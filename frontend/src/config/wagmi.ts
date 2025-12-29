import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { cookieStorage, createStorage } from "wagmi";
import { hardhat } from "wagmi/chains";

// Get a free projectId at https://cloud.reown.com
// For localhost testing, you can use this demo ID (limited functionality)
export const projectId = "3fbb6bba6f1de962d911bb5b5c9dba88";

// Metadata for the dApp
export const metadata = {
  name: "Simple DEX",
  description: "A simple AMM-style DEX for learning",
  url: "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Supported chains
export const chains = [hardhat];

// Create wagmi adapter for Reown AppKit
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks: chains,
});

// Export the wagmi config
export const config = wagmiAdapter.wagmiConfig;
