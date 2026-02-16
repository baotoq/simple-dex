---
phase: 02-core-amm-implementation
plan: 01
subsystem: core
tags: [solidity, amm, uniswap-v2, erc20, openzeppelin, reentrancy-guard, constant-product]

# Dependency graph
requires:
  - phase: 01-foundation-contracts
    provides: Foundry project with OpenZeppelin v5.5.0, WETH and MockUSDC tokens
provides:
  - Pool contract implementing constant product AMM (x*y=k) with 0.3% fee
  - LP token via ERC20 inheritance (Pool IS the LP token)
  - mint/burn/swap functions with reentrancy protection
  - getAmountOut helper for swap output calculation
  - 12 basic sanity tests covering all core mechanics
affects: [02-02-factory, core-amm-testing, frontend-swap, frontend-liquidity]

# Tech tracking
tech-stack:
  added: [SafeERC20, ReentrancyGuard, Math.sqrt]
  patterns: [constant-product-amm, pool-is-lp-token, CEI-pattern, minimum-liquidity-lock, transfer-then-call]

key-files:
  created:
    - src/core/Pool.sol
    - test/core/Pool.t.sol
  modified: []

key-decisions:
  - "Used 0xdEaD dead address instead of address(0) for MINIMUM_LIQUIDITY lock — OpenZeppelin v5 ERC20 rejects mint to address(0)"
  - "Followed Uniswap V2 swap pattern exactly: transfer-then-call with balance-diff input detection"
  - "Used SafeERC20 via 'using' directive instead of hand-rolling safe transfer helper"

patterns-established:
  - "Pool IS LP token: contract Pool is ERC20, ReentrancyGuard"
  - "nonReentrant on all state-changing functions (mint, burn, swap)"
  - "Educational comments explaining WHY each security pattern exists"
  - "uint112 reserves for storage packing and overflow safety"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 02 Plan 01: Pool Contract Summary

**Constant product AMM pool with x*y=k swaps (0.3% fee), ERC20 LP token inheritance, MINIMUM_LIQUIDITY lock, and CEI + ReentrancyGuard security**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-02-16T10:30:01Z
- **Completed:** 2026-02-16T10:35:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Implemented Pool.sol with full constant product AMM: mint, burn, swap, getAmountOut, getReserves
- Pool IS the LP token (inherits ERC20) following Uniswap V2 architecture
- All state-changing functions protected with nonReentrant + CEI pattern
- 12 basic sanity tests verify all core mechanics (100% pass rate)
- Educational comments explain WHY each security pattern exists

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Pool contract** - `6d4f9e5` (feat)
2. **Task 2: Implement basic sanity tests** - `d7ef0a9` (test)

## Files Created/Modified
- `src/core/Pool.sol` - Core AMM pool with swap/mint/burn, LP token, security patterns
- `test/core/Pool.t.sol` - 12 basic sanity tests for Pool contract

## Decisions Made

**MINIMUM_LIQUIDITY burn address:**
- OpenZeppelin v5 ERC20 rejects `_mint(address(0), ...)` with `ERC20InvalidReceiver`
- Used `address(0xdEaD)` as conventional dead address for permanent LP token lock
- Functionally identical to address(0) burn: tokens are permanently inaccessible

**SafeERC20 usage:**
- Used OpenZeppelin SafeERC20 via `using SafeERC20 for IERC20` instead of hand-rolling safe transfer helper
- Handles non-standard tokens (no return value, false instead of revert)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OpenZeppelin v5 ERC20 rejects mint to address(0)**
- **Found during:** Task 2 (Pool tests failing with ERC20InvalidReceiver)
- **Issue:** `_mint(address(0), MINIMUM_LIQUIDITY)` reverts in OZ v5 which validates receiver != address(0)
- **Fix:** Changed burn address from `address(0)` to `address(0xdEaD)` (conventional dead address)
- **Files modified:** src/core/Pool.sol
- **Verification:** All 12 Pool tests pass, `forge test` shows 34/34 tests passing
- **Committed in:** 6d4f9e5 (Task 1 commit, amended)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for OpenZeppelin v5 compatibility. No scope creep. Functionally equivalent to original design.

## Issues Encountered

None beyond the auto-fixed OZ v5 compatibility issue above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02-02 (Factory contract):**
- Pool.sol is complete and tested — Factory will deploy Pool instances via CREATE2
- Pool constructor accepts (token0, token1) parameters — Factory will pass sorted addresses
- getAmountOut helper available for integration test swap calculations
- All 34 tests pass (22 Phase 1 + 12 Phase 2 Pool)

---
*Phase: 02-core-amm-implementation*
*Completed: 2026-02-16*

## Self-Check: PASSED

**Files verified:**
- src/core/Pool.sol: EXISTS
- test/core/Pool.t.sol: EXISTS

**Commits verified:**
- 6d4f9e5: EXISTS (Task 1 - Pool contract)
- d7ef0a9: EXISTS (Task 2 - Pool tests)

**Tests verified:**
- `forge test` output: 34 tests passed, 0 failed, 0 skipped
- All verification criteria met
