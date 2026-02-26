---
phase: 04-frontend-foundation
plan: 02
subsystem: ui
tags: [react, wagmi, viem, tailwind, typescript, web3, erc20, token-balances, pool-stats, transaction-status]

# Dependency graph
requires:
  - phase: 04-frontend-foundation
    plan: 01
    provides: wagmi v2 + viem v2 providers, Pool ABI const, ERC20 ABI re-export, contract address constants

provides:
  - TokenBalances component: batched useReadContracts for WETH/USDC/LP balances with proper decimal formatting
  - PoolStats component: batched useReadContracts for reserves, token0/1, totalSupply with exchange rates in both directions
  - TxStatus component: pending/confirming/confirmed/error feedback with aria-live for accessibility
  - QueryStatus helper component for read query loading/error states
  - Home page composing all components in responsive grid layout (1-col mobile, 2-col desktop)

affects: [05-pool-reads, 06-liquidity-ui, 07-swap-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useReadContracts for batched multicall reads (not individual useReadContract per token)
    - Gate reads with query.enabled: !!address && address !== zeroAddress to prevent unnecessary RPC calls
    - formatUnits from viem for on-chain bigint to human-readable decimals
    - Token order determination: compare token0/token1 addresses against WETH_ADDRESS to find correct reserve
    - aria-live="polite" + role="status" on TxStatus for screen reader accessibility
    - page.tsx stays Server Component; 'use client' only on components using wagmi hooks

key-files:
  created:
    - frontend/components/TokenBalances.tsx
    - frontend/components/PoolStats.tsx
    - frontend/components/TxStatus.tsx
  modified:
    - frontend/app/page.tsx
    - frontend/tsconfig.json

key-decisions:
  - "tsconfig target updated ES2017->ES2020 to support BigInt literals (0n) required by wagmi/viem"
  - "PoolStats determines token order at runtime by comparing token0/token1 addresses to WETH_ADDRESS constant"
  - "TxStatus also exports QueryStatus for read query loading/error display — reusable across Phase 4 data components"
  - "Exchange rate calculation: parseFloat(formatUnits(reserveUsdc, 6)) / parseFloat(formatUnits(reserveWeth, 18)) — avoids integer division truncation"

patterns-established:
  - "Pattern: batched reads — always use useReadContracts (not multiple useReadContract) for co-located data"
  - "Pattern: gate with enabled — always disable queries on zero address or disconnected wallet"
  - "Pattern: runtime token order — compare addresses to determine reserve slot, never assume token0=WETH"
  - "Pattern: separate decimal handling — always use correct decimals per token (WETH=18, USDC=6)"

requirements-completed: [FE-07, FE-08, FE-09]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 4 Plan 02: Read-Only Data Display Components Summary

**TokenBalances, PoolStats, and TxStatus components with batched useReadContracts, correct decimal handling (18 vs 6), and runtime token-order determination wired into a responsive Next.js home page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T09:36:41Z
- **Completed:** 2026-02-26T09:39:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- TokenBalances component batches WETH/USDC/LP balance reads into single multicall, handles loading/error/disconnected/not-deployed states with proper decimal formatting (18/6/18 decimals)
- PoolStats component batches reserves + token0/1 + totalSupply, determines WETH/USDC order at runtime by address comparison, calculates exchange rates in both directions with correct decimal math
- TxStatus component provides accessible transaction feedback (aria-live="polite") for pending/confirming/confirmed/error states with additional QueryStatus helper for read queries
- Home page updated to responsive 2-column grid composing all components while remaining a Server Component

## Task Commits

Each task was committed atomically:

1. **Task 1: Build TokenBalances and PoolStats components** - `ec06da9` (feat)
2. **Task 2: Build TxStatus and wire all components into home page** - `c55d459` (feat)

## Files Created/Modified
- `frontend/components/TokenBalances.tsx` - Batched balanceOf reads for WETH/USDC/LP with decimal formatting and full state handling
- `frontend/components/PoolStats.tsx` - Batched pool reads (getReserves, token0, token1, totalSupply) with exchange rate calculation
- `frontend/components/TxStatus.tsx` - Transaction status feedback + QueryStatus helper, accessible with aria-live regions
- `frontend/app/page.tsx` - Responsive grid layout composing ConnectButton, TokenBalances, PoolStats; Server Component
- `frontend/tsconfig.json` - Updated target from ES2017 to ES2020 to support BigInt literals

## Decisions Made
- Updated tsconfig target ES2017->ES2020 to support BigInt literals (0n syntax) required by wagmi/viem — necessary for correctness
- PoolStats determines token order at runtime by comparing token0/token1 addresses against WETH_ADDRESS from constants, avoiding hardcoded slot assumptions that would break if token sort order differs
- Exchange rate uses parseFloat(formatUnits(...)) division to avoid integer overflow and get correct decimal math
- TxStatus also exports QueryStatus for read-query loading/error display — reusable pattern for Phase 4+ components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated tsconfig target ES2017 -> ES2020 for BigInt literal support**
- **Found during:** Task 1 (TokenBalances/PoolStats creation)
- **Issue:** TypeScript strict mode with target ES2017 rejects BigInt literals (0n) used in comparisons with wagmi/viem data. Error: "BigInt literals are not available when targeting lower than ES2020"
- **Fix:** Updated `tsconfig.json` target from "ES2017" to "ES2020". Both targets are fully supported by Next.js 16/Turbopack; ES2020 is the standard minimum for modern Web3 tooling
- **Files modified:** frontend/tsconfig.json
- **Verification:** `npx tsc --noEmit` exits 0 after clearing tsbuildinfo cache
- **Committed in:** ec06da9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — tsconfig target incompatibility)
**Impact on plan:** Necessary fix for correctness. ES2017 target incompatible with BigInt literal syntax ubiquitous in wagmi/viem. ES2020 target is the correct baseline for modern Web3 React apps.

## Issues Encountered
- tsbuildinfo cache preserved stale TypeScript diagnostics after tsconfig change — resolved by deleting cache file and re-running type check

## User Setup Required
None - no external service configuration required. Components display "not deployed yet" when addresses are zero.

## Next Phase Readiness
- TokenBalances and PoolStats display live data when wallet is connected to Anvil with deployed contracts
- TxStatus ready for Phase 5+ swap transactions — import and pass hash prop
- QueryStatus helper available for any component needing read query loading/error states
- Contract addresses remain zero-address placeholders until Phase 8 deployment

---
*Phase: 04-frontend-foundation*
*Completed: 2026-02-26*
