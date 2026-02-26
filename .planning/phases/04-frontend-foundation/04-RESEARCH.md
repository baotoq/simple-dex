# Phase 4: Frontend Foundation - Research

**Researched:** 2026-02-26
**Domain:** Web3 frontend — Next.js 15, wagmi v2, RainbowKit v2, viem v2, Tailwind CSS
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FE-01 | User can connect wallet (MetaMask) via wagmi/RainbowKit | RainbowKit v2 `ConnectButton` + wagmi `getDefaultConfig` with injected connector handles MetaMask natively |
| FE-07 | User can see their token balances for all relevant tokens | `useReadContracts` with `erc20Abi` for WETH, MockUSDC, and LP token balances; `useAccount` for connected address |
| FE-08 | User can see pool reserves and current exchange rate | `useReadContract` calling `getReserves()` + `token0()`/`token1()` on the Pool contract; rate = reserve1/reserve0 |
| FE-09 | User receives clear feedback on transaction status (pending/success/fail) | `useWaitForTransactionReceipt` with `isPending`/`isConfirming`/`isConfirmed`/`error` states — read-only phase only needs query loading states |
</phase_requirements>

---

## Summary

This phase bootstraps the frontend from scratch — no existing frontend code exists in the repo (only Foundry contracts). The project has a strong skill set registered (react-expert, nextjs-developer, nextjs-best-practices, typescript-expert, tailwind-design-system, vercel-react-best-practices) that defines the expected patterns for the implementation.

The technology choices are explicitly prescribed by the requirements: wagmi/RainbowKit for wallet connection, implied Next.js App Router based on the registered skills. The frontend will be a separate Next.js 15 application within the monorepo, talking to locally-deployed Anvil contracts. Phase 4 is intentionally read-only — no transactions execute, making it a safe foundation to validate the infrastructure before swap/liquidity phases build on top.

The key architectural decision is that wagmi v2 is a significant departure from v1: TanStack Query is now a required peer dependency, `configureChains` is removed, and `getDefaultConfig` (from RainbowKit) is the recommended config path. The Next.js App Router pattern requires all wagmi/RainbowKit providers in a `'use client'` wrapper component, not directly in `layout.tsx`.

**Primary recommendation:** Create a Next.js 15 app in a `frontend/` subdirectory. Use RainbowKit's `getDefaultConfig` to configure wagmi with the `foundry` chain (Anvil, chainId 31337). Wrap providers in a `providers.tsx` client component. Use `useReadContracts` to batch all contract reads. ABI files should be exported from `src/abi/` as TypeScript const assertions derived from the Foundry `out/` artifacts.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest) | React framework with App Router | Project skills explicitly reference App Router patterns; SSR + file-based routing |
| wagmi | 2.x (^2.19.3 known current) | React hooks for Ethereum | Required by FE-01; type-safe contract reads, account state |
| @rainbow-me/rainbowkit | 2.x | Wallet connection UI | Required by FE-01; wraps wagmi connectors with polished modal |
| viem | 2.x (2.38.0 known current) | Low-level Ethereum primitives | Peer dependency of wagmi; `formatUnits`, `erc20Abi`, chain definitions |
| @tanstack/react-query | 5.x | Async state management | Required peer dependency of wagmi v2; powers all contract reads |
| TypeScript | 5.x | Type safety | Project-wide standard; all skills require strict TypeScript |
| Tailwind CSS | 3.x or 4.x | Utility-first CSS | Project skills include tailwind-design-system, tailwind-patterns |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| wagmi/chains (includes `foundry`) | included with wagmi | Local Anvil chain definition | ChainId 31337, RPC http://127.0.0.1:8545 |
| viem `erc20Abi` | included with viem | Standard ERC20 ABI | Reading token balances and metadata without custom ABI |
| @tanstack/react-query DevTools | 5.x | Query debugging | Development only — observe cache states |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RainbowKit | Appkit (Reown/WalletConnect) | RainbowKit is explicitly required by FE-01 |
| Next.js | Vite + React | Next.js is the project skill, and SSR + file routing adds value |
| Tailwind | CSS Modules | Tailwind is the project design system skill |
| TanStack Query | SWR | TanStack Query is wagmi v2's required peer dep; no alternative |

**Installation:**
```bash
# From project root, create frontend app
npx create-next-app@latest frontend --typescript --eslint --tailwind --app --no-src-dir

# Inside frontend/
npm install @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query
```

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout — imports Providers, NOT 'use client'
│   ├── page.tsx            # Home page — server component
│   ├── providers.tsx       # 'use client' — WagmiProvider + RainbowKitProvider wrapper
│   └── globals.css         # Tailwind base + RainbowKit CSS import
├── components/
│   ├── ConnectButton.tsx   # Thin wrapper around RainbowKit ConnectButton
│   ├── PoolStats.tsx       # Displays reserves and exchange rate (FE-08)
│   ├── TokenBalances.tsx   # Displays token balances for connected account (FE-07)
│   └── TxStatus.tsx        # Transaction status banner (FE-09)
├── lib/
│   ├── wagmi.ts            # wagmi createConfig / getDefaultConfig
│   └── constants.ts        # Contract addresses (populated after Phase 8 deployment)
├── abi/
│   ├── Pool.ts             # Pool ABI as TypeScript const
│   ├── Factory.ts          # Factory ABI as TypeScript const
│   └── ERC20.ts            # Standard ERC20 ABI (or re-export viem's erc20Abi)
└── package.json
```

### Pattern 1: Provider Wrapper (Critical for Next.js App Router)

**What:** All wagmi/RainbowKit context providers must live in a `'use client'` component. `layout.tsx` is a Server Component by default and cannot host these providers directly.

**When to use:** Always — this is mandatory for App Router compatibility.

```typescript
// Source: https://wagmi.sh/react/guides/ssr + rainbowkit.com/docs/installation
// frontend/app/providers.tsx
'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { foundry } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const config = getDefaultConfig({
  appName: 'SimpleDEX',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Can be any string for local dev
  chains: [foundry],
  ssr: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

```typescript
// frontend/app/layout.tsx  (Server Component — no 'use client')
import { Providers } from './providers'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Pattern 2: Batched Contract Reads with useReadContracts

**What:** Use `useReadContracts` to batch multiple contract reads into a single multicall. Much more efficient than separate `useReadContract` calls.

**When to use:** Any time you need 2+ reads from contracts on the same network.

```typescript
// Source: https://wagmi.sh/react/api/hooks/useReadContracts
'use client'
import { useReadContracts } from 'wagmi'
import { erc20Abi } from 'viem'
import { useAccount } from 'wagmi'
import { POOL_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from '@/lib/constants'
import { poolAbi } from '@/abi/Pool'

export function TokenBalances() {
  const { address } = useAccount()

  const { data, isPending, error } = useReadContracts({
    contracts: [
      { address: WETH_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address!] },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address!] },
      { address: POOL_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address!] },
      { address: WETH_ADDRESS, abi: erc20Abi, functionName: 'decimals' },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'decimals' },
    ],
    query: { enabled: !!address },
  })
  // ...
}
```

### Pattern 3: Pool Reserves and Exchange Rate (FE-08)

**What:** Read `getReserves()` from the Pool contract and derive the exchange rate.

```typescript
// Source: wagmi.sh/react/api/hooks/useReadContracts + Pool.sol getReserves()
'use client'
import { useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { poolAbi } from '@/abi/Pool'
import { erc20Abi } from 'viem'
import { POOL_ADDRESS } from '@/lib/constants'

export function PoolStats() {
  const { data } = useReadContracts({
    contracts: [
      { address: POOL_ADDRESS, abi: poolAbi, functionName: 'getReserves' },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: 'token0' },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: 'token1' },
    ],
  })

  const [reserves, token0, token1] = data || []
  if (!reserves?.result) return null

  const [reserve0, reserve1] = reserves.result as [bigint, bigint]
  // Exchange rate: how much token1 you get per 1 token0
  // Note: must account for different decimals (WETH=18, USDC=6)
  const rate = Number(formatUnits(reserve1, 6)) / Number(formatUnits(reserve0, 18))
  return (
    <div>
      <p>Reserve0 (WETH): {formatUnits(reserve0, 18)}</p>
      <p>Reserve1 (USDC): {formatUnits(reserve1, 6)}</p>
      <p>Rate: 1 WETH = {rate.toFixed(2)} USDC</p>
    </div>
  )
}
```

### Pattern 4: ABI as TypeScript Const (Type Safety)

**What:** Export ABIs as `as const` TypeScript objects. This gives wagmi full type inference on function names and return values.

**When to use:** Always. Never use `any[]` for ABI arrays.

```typescript
// Source: wagmi.sh/react/api/hooks/useReadContract
// frontend/abi/Pool.ts
// Copy the relevant functions from out/Pool.sol/Pool.json
export const poolAbi = [
  {
    type: 'function',
    name: 'getReserves',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_reserve0', type: 'uint112' },
      { name: '_reserve1', type: 'uint112' },
    ],
  },
  {
    type: 'function',
    name: 'token0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'token1',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  // ... add other needed functions
] as const
```

### Pattern 5: Transaction Status Feedback (FE-09)

**What:** Phase 4 is read-only, but the TxStatus infrastructure should be built here for later phases to use. The pattern uses `useWaitForTransactionReceipt`.

```typescript
// Source: https://wagmi.sh/react/guides/write-to-contract
// For Phase 4: only loading states from useReadContracts are needed.
// This pattern is the foundation for Phase 5+.
const { isLoading: isConfirming, isSuccess: isConfirmed, error } =
  useWaitForTransactionReceipt({ hash })

// Status display:
// isPending (from useWriteContract) → "Waiting for wallet approval..."
// isConfirming → "Transaction submitted, waiting for confirmation..."
// isConfirmed → "Transaction confirmed!"
// error → "Transaction failed: " + error.shortMessage
```

### Anti-Patterns to Avoid

- **Wagmi providers in Server Components:** `WagmiProvider`, `QueryClientProvider`, and `RainbowKitProvider` require browser APIs. They MUST be in a `'use client'` component. Placing them in `layout.tsx` directly will cause hydration errors.
- **Not setting `ssr: true` in wagmi config:** Without this, wagmi hydrates from localStorage causing a flash of "disconnected" state on first render in Next.js SSR.
- **Separate `useReadContract` calls per field:** This creates N network round trips. Always batch with `useReadContracts` for related data.
- **Using `token` param of `useBalance` for ERC20:** Deprecated in wagmi v2. Use `useReadContracts` with `erc20Abi` instead.
- **Hardcoded contract addresses in components:** Put all addresses in `lib/constants.ts` so Phase 8 deployment can update one file.
- **`QueryClient` instantiated outside component:** Creates a shared instance across all requests in SSR, leaking state between users. Use `useState(() => new QueryClient())` pattern.
- **Importing from barrel files:** The vercel-react-best-practices skill flags this as a bundle size issue. Import directly from `wagmi`, `viem`, etc.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wallet connection modal | Custom modal with wallet detection | `<ConnectButton />` from RainbowKit | Multi-wallet support, mobile WalletConnect, error states, network switching all built in |
| ERC20 ABI | Typed ABI manually | `erc20Abi` from viem | Covers all standard ERC20 functions; already typed correctly |
| BigInt → human amount conversion | Custom division math | `formatUnits(value, decimals)` from viem | Handles precision edge cases correctly |
| Transaction polling | setInterval + eth_getTransactionReceipt | `useWaitForTransactionReceipt` from wagmi | Handles replacement transactions, timeouts, network changes |
| Contract read caching | Custom React state + useEffect | `useReadContracts` via TanStack Query | Built-in deduplication, background refetch, stale-while-revalidate |
| Chain definitions | Custom chain object | `foundry` from `wagmi/chains` | Pre-configured with chainId 31337, correct explorer, RPC |

**Key insight:** In the wagmi/viem ecosystem, almost every low-level operation (encoding, BigInt math, chain config, polling) has a well-tested primitive. Using custom implementations introduces subtle bugs around BigInt precision, replay protection, and type safety.

---

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with Wallet State

**What goes wrong:** Next.js renders the page on the server (disconnected state), then React hydrates with wagmi reading localStorage (potentially connected state). The HTML mismatch causes a React hydration error or "flash of disconnected" UI.

**Why it happens:** wagmi uses localStorage by default for persisting connection state, which is not available during SSR.

**How to avoid:** Set `ssr: true` in `getDefaultConfig`. Optionally add cookie-based storage (`cookieStorage`) and pass `initialState` from server cookies for zero-flash hydration.

**Warning signs:** Console warning about hydration mismatch; connect button flickers between "Connect" and connected state on page load.

### Pitfall 2: WalletConnect projectId Required

**What goes wrong:** `getDefaultConfig` requires a `projectId` from WalletConnect Cloud. Without it, wallet connection may fail or throw console errors.

**Why it happens:** RainbowKit v2 uses WalletConnect v2 under the hood which requires a registered project ID.

**How to avoid:** For local development with Anvil + MetaMask, any non-empty string works as projectId (WalletConnect is not invoked for injected wallets). Use `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` env var so it's configurable.

**Warning signs:** Console errors mentioning "projectId"; wallet connection modal shows error for WalletConnect option.

### Pitfall 3: BigInt Formatting for Different Token Decimals

**What goes wrong:** WETH uses 18 decimals, MockUSDC uses 6 decimals (matching real USDC, per project decision). Displaying raw BigInt values or using wrong decimals produces wildly incorrect numbers.

**Why it happens:** Developers unfamiliar with ERC20 assume all tokens use 18 decimals.

**How to avoid:** Always read `decimals()` from the token contract (or know the hardcoded values: WETH=18, MockUSDC=6). Use `formatUnits(value, decimals)` from viem. Exchange rate calculation must account for different decimal scales.

**Warning signs:** Balances showing as 1000000x too large or too small; exchange rate showing as 1e-12 instead of a reasonable price.

### Pitfall 4: Pool Addresses Unknown Until Phase 8 Deployment

**What goes wrong:** Contract addresses are only known after `forge script` deploys to Anvil. The frontend build will fail or show empty data if addresses are hardcoded as empty strings.

**Why it happens:** Phase 8 hasn't run yet. Phase 4 builds the UI infrastructure; Phase 8 wires up real addresses.

**How to avoid:** Use placeholder address constants in `lib/constants.ts`. Gate `useReadContracts` calls with `query: { enabled: !!POOL_ADDRESS && POOL_ADDRESS !== '0x0' }`. The UI should gracefully show "Pool not deployed" when address is zero.

**Warning signs:** wagmi throwing "invalid address" errors; components rendering empty data with no loading state.

### Pitfall 5: foundry Chain Not Appearing in RainbowKit's Network Switcher

**What goes wrong:** Users can connect to mainnet but the UI doesn't know about the local Anvil chain, so MetaMask shows "Wrong Network."

**Why it happens:** RainbowKit only shows chains defined in `getDefaultConfig`. For local-only projects, only `foundry` should be in the `chains` array.

**How to avoid:** Set `chains: [foundry]` only (no mainnet/sepolia) in `getDefaultConfig`. RainbowKit will prompt users to switch to Foundry (Anvil) if they're on the wrong network.

**Warning signs:** "Wrong Network" badge in ConnectButton; reads returning null/empty.

---

## Code Examples

Verified patterns from official sources:

### Foundry/Anvil Chain Configuration

```typescript
// Source: wagmi.sh (foundry chain confirmed in wagmi/chains)
// frontend/app/providers.tsx
import { foundry } from 'wagmi/chains'
// foundry chain: chainId=31337, rpcUrl=http://127.0.0.1:8545
// This is the standard Anvil default — no custom configuration needed.

const config = getDefaultConfig({
  appName: 'SimpleDEX',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'dev-project-id',
  chains: [foundry],
  ssr: true,
})
```

### Reading ERC20 Token Balances (FE-07)

```typescript
// Source: https://wagmi.sh/react/guides/migrate-from-v1-to-v2 (deprecated token param)
import { useReadContracts } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'

const { data } = useReadContracts({
  allowFailure: false,
  contracts: [
    { address: WETH_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [userAddress] },
    { address: WETH_ADDRESS, abi: erc20Abi, functionName: 'decimals' },
    { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [userAddress] },
    { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'decimals' },
  ],
  query: { enabled: !!userAddress },
})
const [wethBalance, wethDecimals, usdcBalance, usdcDecimals] = data ?? []
// Display: formatUnits(wethBalance, wethDecimals) → "1.5" (WETH)
// Display: formatUnits(usdcBalance, usdcDecimals) → "3000.00" (USDC with 6 decimals)
```

### Pool Reserves Read (FE-08)

```typescript
// Source: Pool.sol getReserves() + wagmi useReadContract
// getReserves returns (uint112 _reserve0, uint112 _reserve1)
const { data: reserves } = useReadContract({
  address: POOL_ADDRESS,
  abi: poolAbi,
  functionName: 'getReserves',
})
// reserves is [bigint, bigint] typed from the ABI const
```

### Transaction Status Pattern (FE-09 foundation)

```typescript
// Source: https://wagmi.sh/react/guides/write-to-contract
import { useWaitForTransactionReceipt, type BaseError } from 'wagmi'

function TxStatus({ hash }: { hash?: `0x${string}` }) {
  const { isLoading: isConfirming, isSuccess: isConfirmed, error } =
    useWaitForTransactionReceipt({ hash })

  if (!hash) return null
  if (isConfirming) return <div className="text-yellow-500">Confirming transaction...</div>
  if (isConfirmed) return <div className="text-green-500">Transaction confirmed!</div>
  if (error) return <div className="text-red-500">{(error as BaseError).shortMessage}</div>
  return null
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wagmi v1 + configureChains | wagmi v2 + createConfig directly | wagmi v2 (2024) | `configureChains` removed; chains go directly in `createConfig` |
| wagmi v1 useBalance with `token` param | useReadContracts with erc20Abi | wagmi v2 migration | Must use explicit `erc20Abi` reads for ERC20 tokens |
| getDefaultWallets / connectorsForWallets | getDefaultConfig (from RainbowKit) | RainbowKit v2 | Single config function replaces two-step wallet setup |
| No chains passed to RainbowKitProvider | Chains are in wagmi config, not RainbowKit | RainbowKit v2 | RainbowKit reads chain config from WagmiProvider |
| Manual QueryClient setup | QueryClient as required peer dep | wagmi v2 | TanStack Query is now explicit, not internal |

**Deprecated/outdated:**
- `configureChains` from wagmi: Removed in v2. Use `createConfig` with `chains` array directly.
- `useBalance({ token: '0x...' })`: The `token` parameter is deprecated in wagmi v2. Use `useReadContracts` with `erc20Abi`.
- `getDefaultWallets` + `connectorsForWallets`: Replaced by `getDefaultConfig` in RainbowKit v2.
- Pages Router (`pages/` directory): Project skills mandate App Router. Do not use.

---

## Contract Interface Summary

The Phase 4 frontend needs to read from these contracts (all read-only for this phase):

**Pool contract** (key read functions for FE-07, FE-08):
- `getReserves() → (uint112 reserve0, uint112 reserve1)` — pool reserves
- `token0() → address` — address of token0
- `token1() → address` — address of token1
- `balanceOf(address) → uint256` — LP token balance (Pool IS the LP token)
- `totalSupply() → uint256` — total LP tokens (for future phases)

**WETH contract** (ERC20, FE-07):
- `balanceOf(address) → uint256`
- `decimals() → uint8` — always 18

**MockUSDC contract** (ERC20 with 6 decimals per project decision, FE-07):
- `balanceOf(address) → uint256`
- `decimals() → uint8` — 6 (matches real USDC, per project decision)

All of these can use `erc20Abi` from viem except `getReserves`, `token0`, `token1` which need the custom Pool ABI.

---

## Open Questions

1. **Frontend directory structure — flat vs subdirectory?**
   - What we know: No frontend exists yet; project root has only Foundry artifacts
   - What's unclear: Should the Next.js app be in `frontend/` subdirectory or at project root?
   - Recommendation: Use `frontend/` subdirectory. The project root is a Foundry workspace. Mixing Next.js at root would conflict with `package.json`, `node_modules`, and `.gitignore` conventions.

2. **Contract addresses for Phase 4 testing**
   - What we know: Addresses are not known until Phase 8 deployment; Anvil resets on each restart
   - What's unclear: Should Phase 4 use hardcoded addresses from a manual `forge script` run, or mock data?
   - Recommendation: Use environment variables (`NEXT_PUBLIC_POOL_ADDRESS`, etc.) with graceful "not deployed" fallback. Document in README how to populate after Anvil deployment. Phase 4 success criteria don't require live data — the infrastructure just needs to be wired correctly.

3. **WalletConnect projectId for local development**
   - What we know: `getDefaultConfig` requires a `projectId`; for MetaMask (injected), any string works
   - What's unclear: Whether CI/testing will need a real projectId
   - Recommendation: Use a placeholder for now; document that a real projectId is needed for WalletConnect wallets in Phase 8.

---

## Sources

### Primary (HIGH confidence)

- `/websites/wagmi_sh_react` (Context7) — useReadContracts, useReadContract, useWaitForTransactionReceipt, useBalance deprecation, createConfig, SSR guide
- `/rainbow-me/rainbowkit` (Context7) — getDefaultConfig, ConnectButton, provider wrapping, theming, installation
- `wagmi.sh/react/guides/ssr` (Official docs WebFetch) — SSR configuration, ssr: true, cookie storage pattern
- `rainbowkit.com/docs/installation` (Official docs WebFetch) — Installation command, provider setup, SSR note
- `/vercel/next.js` (Context7) — 'use client' directive, providers pattern, App Router layout

### Secondary (MEDIUM confidence)

- WebSearch: wagmi v2 foundry chain import confirmed as `import { foundry } from 'wagmi/chains'`, chainId 31337
- WebSearch: wagmi v2 current version ^2.19.3, viem 2.38.0, confirmed via multiple sources
- WebSearch: `npm install @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query` — confirmed install command from official docs + search results
- Project skill files (react-expert, nextjs-developer, nextjs-best-practices, typescript-expert) — verify TypeScript strict mode, App Router patterns, Server/Client component split

### Tertiary (LOW confidence)

- WebSearch: Next.js 15 as current version — from `create-next-app@latest` producing Next.js 15 as of 2025, unverified exact version

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — wagmi/RainbowKit versions confirmed via official docs and npm; viem confirmed as peer dep
- Architecture: HIGH — patterns verified against wagmi and RainbowKit official documentation; Next.js App Router patterns from project skills + official docs
- Pitfalls: HIGH — SSR hydration pitfall verified in official wagmi SSR guide; decimal pitfall grounded in contract source (MockUSDC 6 decimals is a project decision in STATE.md); address pitfall is a logical consequence of Phase 8 dependency
- Contract interface: HIGH — derived directly from Pool.sol and Factory.sol source code in this repo

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (wagmi/RainbowKit move fast; recheck if >30 days old)
