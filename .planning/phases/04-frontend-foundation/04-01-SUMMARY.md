---
phase: 04-frontend-foundation
plan: 01
subsystem: ui
tags: [next.js, wagmi, rainbowkit, viem, tanstack-query, tailwind, typescript, web3, wallet-connect]

# Dependency graph
requires:
  - phase: 03-comprehensive-testing
    provides: Verified Pool.sol ABI with getReserves, token0, token1, getAmountOut, swap, mint, burn functions

provides:
  - Next.js 16 frontend app in frontend/ directory with App Router
  - wagmi v2 + RainbowKit v2 + viem v2 + TanStack Query v5 installed
  - WagmiProvider > QueryClientProvider > RainbowKitProvider provider chain
  - Wagmi config for foundry chain (Anvil chainId 31337) with ssr: true
  - Pool ABI TypeScript const with getReserves, token0, token1, getAmountOut, totalSupply, mint, burn, swap
  - ERC20 ABI re-exported from viem
  - Contract address constants with env var overrides (placeholder zero addresses)
  - RainbowKit ConnectButton component wrapper
  - Home page with SimpleDEX header and wallet connect button

affects: [05-pool-reads, 06-liquidity-ui, 07-swap-ui, 08-deployment]

# Tech tracking
tech-stack:
  added:
    - next@16.1.6 (App Router, React 19, Tailwind CSS v4)
    - wagmi@2.19.5
    - "@rainbow-me/rainbowkit@2.2.10"
    - viem@2.46.3
    - "@tanstack/react-query@5.90.21"
    - tailwindcss@4.x (via @tailwindcss/postcss)
  patterns:
    - providers.tsx client component wraps all Web3 providers (WagmiProvider > QueryClientProvider > RainbowKitProvider)
    - layout.tsx remains Server Component; Providers handles client boundary
    - getDefaultConfig from RainbowKit for wagmi v2 config (not createConfig directly)
    - QueryClient instantiated in useState to prevent SSR state leakage
    - ABI as TypeScript const for full wagmi type inference
    - Contract addresses centralized in lib/constants.ts with env var overrides
    - foundry chain only (chainId 31337) — no mainnet/testnet

key-files:
  created:
    - frontend/package.json
    - frontend/app/layout.tsx
    - frontend/app/page.tsx
    - frontend/app/providers.tsx
    - frontend/app/globals.css
    - frontend/lib/wagmi.ts
    - frontend/lib/constants.ts
    - frontend/abi/Pool.ts
    - frontend/abi/ERC20.ts
    - frontend/components/ConnectButton.tsx
    - frontend/tsconfig.json
    - frontend/next.config.ts
  modified: []

key-decisions:
  - "Next.js 16.1.6 with React 19 scaffolded (newer than planned 15.x but fully compatible)"
  - "Tailwind CSS v4 format used (@import tailwindcss instead of @tailwind directives)"
  - "Pool ABI uses actual contract signature: getAmountOut(amountIn, reserveIn, reserveOut) — 3 args, not 2 as plan specified"
  - "getAmountOut is pure not view (matches actual Pool.sol stateMutability)"
  - "Added mint, burn, swap to Pool ABI for Phase 5+ readiness per plan instructions"

patterns-established:
  - "Pattern: providers.tsx — all Web3 providers in a single 'use client' component, imported by Server Component layout"
  - "Pattern: ABI as const — always use TypeScript const assertion for wagmi type inference"
  - "Pattern: env var address constants — NEXT_PUBLIC_* env vars with zero address fallback"
  - "Pattern: ConnectButton wrapper — thin wrapper enables future customization without changing import sites"

requirements-completed: [FE-01]

# Metrics
duration: 6min
completed: 2026-02-26
---

# Phase 4 Plan 01: Frontend Foundation Summary

**Next.js 16 frontend app with wagmi v2/RainbowKit v2 provider infrastructure, Pool ABI const, and RainbowKit ConnectButton for MetaMask wallet connection on Foundry/Anvil chain**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-26T09:26:07Z
- **Completed:** 2026-02-26T09:32:43Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- Scaffolded Next.js 16 app in frontend/ with App Router, TypeScript strict mode, Tailwind CSS v4
- Installed and configured wagmi v2, RainbowKit v2, viem v2, TanStack Query v5 with foundry chain provider chain
- Created Pool ABI TypeScript const matching actual Pool.sol contract signatures (verified against Foundry out/ artifacts)
- Created contract address constants with env var overrides and centralized token metadata
- Implemented ConnectButton wrapper and SimpleDEX home page — build passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 app and configure Web3 providers** - `33f5267` (feat)
2. **Task 2: Extract ABIs, create constants, and build ConnectButton with page layout** - `241bc64` (feat)

## Files Created/Modified
- `frontend/package.json` - Next.js 16.1.6 with wagmi, RainbowKit, viem, TanStack Query dependencies
- `frontend/app/layout.tsx` - Server Component root layout wrapping children with Providers
- `frontend/app/providers.tsx` - Client component: WagmiProvider > QueryClientProvider > RainbowKitProvider
- `frontend/app/page.tsx` - Home page with SimpleDEX header and ConnectButton
- `frontend/app/globals.css` - Tailwind CSS v4 base styles
- `frontend/lib/wagmi.ts` - Wagmi config with foundry chain, ssr: true, getDefaultConfig
- `frontend/lib/constants.ts` - POOL_ADDRESS, WETH_ADDRESS, USDC_ADDRESS, FACTORY_ADDRESS from env vars
- `frontend/abi/Pool.ts` - Pool contract ABI as const (getReserves, token0, token1, getAmountOut, totalSupply, mint, burn, swap)
- `frontend/abi/ERC20.ts` - Re-export of viem erc20Abi
- `frontend/components/ConnectButton.tsx` - Thin wrapper around RainbowKit ConnectButton
- `frontend/tsconfig.json` - TypeScript strict mode with @/* path alias
- `frontend/next.config.ts` - Next.js config with React Compiler

## Decisions Made
- Next.js 16.1.6 with React 19 scaffolded (create-next-app@latest installed newest version — fully compatible with wagmi/RainbowKit v2)
- Tailwind CSS v4 format (@import "tailwindcss" instead of @tailwind directives) — installed by create-next-app, compatible with all components
- getAmountOut ABI corrected to 3 args matching actual Pool.sol: getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
- Added mint, burn, swap to Pool ABI per plan instruction to include Phase 5+ write functions
- .env.local not committed (correctly gitignored by Next.js template) — documented in plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected getAmountOut ABI signature to match actual Pool.sol**
- **Found during:** Task 2 (Extract ABIs)
- **Issue:** Plan specified getAmountOut with 2 inputs (amountIn, tokenIn) but actual Pool.sol has 3 inputs (amountIn, reserveIn, reserveOut) as a pure function
- **Fix:** Cross-referenced out/Pool.sol/Pool.json and used the correct 3-parameter signature with stateMutability: pure
- **Files modified:** frontend/abi/Pool.ts
- **Verification:** ABI matches output of `forge build` artifact
- **Committed in:** 241bc64 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect ABI signature in plan)
**Impact on plan:** Required fix for correctness. Wrong ABI would silently cause contract calls to fail when getAmountOut is used in Phase 5.

## Issues Encountered
- Next.js scaffolded as version 16.1.6 (newer than planned 15.x) — fully compatible, no issues
- Tailwind CSS v4 uses different import syntax (@import "tailwindcss") — kept v4 format, works correctly with postcss plugin
- .env.local gitignored by Next.js template — correct security behavior, not an issue

## User Setup Required
None - no external service configuration required. For WalletConnect wallets (non-MetaMask), a real projectId from WalletConnect Cloud is needed in Phase 8.

## Next Phase Readiness
- Frontend app builds and all provider infrastructure is in place
- Pool ABI and contract address constants ready for Phase 5 pool data reads
- ConnectButton renders — wallet connection flow will work once MetaMask is connected to Anvil network
- Contract addresses remain zero-address placeholders until Phase 8 deployment

---
*Phase: 04-frontend-foundation*
*Completed: 2026-02-26*
