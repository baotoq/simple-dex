---
phase: 02-core-amm-implementation
plan: 02
subsystem: core
tags: [solidity, factory, create2, ownable, integration-testing, cross-decimal]

# Dependency graph
requires:
  - phase: 02-core-amm-implementation
    plan: 01
    provides: Pool contract with AMM core (swap/mint/burn)
  - phase: 01-foundation-contracts
    provides: WETH and MockUSDC tokens for integration tests
provides:
  - Factory contract with CREATE2 deterministic pool deployment
  - Bidirectional getPair mapping for O(1) pool lookup
  - 8 Factory unit tests covering creation, duplicates, ordering, access control
  - 4 Integration tests proving end-to-end flow with real Phase 1 tokens
affects: [frontend-pool-creation, deployment-scripts, comprehensive-testing]

# Tech tracking
tech-stack:
  added: [Ownable, CREATE2 assembly]
  patterns: [factory-pattern, canonical-token-ordering, bidirectional-mapping, cross-decimal-testing]

key-files:
  created:
    - src/core/Factory.sol
    - test/core/Factory.t.sol
    - test/core/Integration.t.sol
  modified: []

key-decisions:
  - "Constructor params in CREATE2 bytecode instead of separate initialize() — cleaner pattern for Solidity 0.8.28"
  - "Owner-only pool creation via Ownable — deliberate simplification for learning project"
  - "No allPairs array — mapping-only registry per locked decision"

patterns-established:
  - "Factory creates pools via CREATE2 with canonical token ordering"
  - "Integration tests use actual Phase 1 tokens (WETH, MockUSDC) for cross-decimal validation"
  - "Multiple pool independence verified in tests"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 02 Plan 02: Factory Contract Summary

**Factory contract with CREATE2 pool deployment, pair registry, and end-to-end integration tests proving full AMM flow with cross-decimal tokens**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-02-16T10:35:01Z
- **Completed:** 2026-02-16T10:40:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Factory.sol creates Pool instances via CREATE2 for deterministic addresses
- Canonical token ordering prevents duplicate pairs regardless of input order
- Bidirectional getPair mapping provides O(1) lookup from either token order
- 8 Factory unit tests cover all edge cases: creation, duplicates, ordering, access control
- 4 Integration tests prove the complete flow works end-to-end with real Phase 1 tokens
- Cross-decimal compatibility verified (WETH 18 decimals + USDC 6 decimals)
- Fee accumulation verified: LPs receive more than deposited after multiple swaps

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Factory contract** - `68195d2` (feat)
2. **Task 2: Implement Factory and Integration tests** - `bc8d637` (test)

## Files Created/Modified
- `src/core/Factory.sol` - Pool factory with CREATE2, canonical ordering, owner-only creation
- `test/core/Factory.t.sol` - 8 unit tests for Factory contract
- `test/core/Integration.t.sol` - 4 end-to-end integration tests with WETH and MockUSDC

## Decisions Made

**CREATE2 with constructor params:**
- Encoded constructor arguments directly in creationCode (Solidity 0.8.28 pattern)
- Avoids the separate initialize() pattern used by Uniswap V2
- Cleaner and more secure (no front-running window)

**Event test pattern:**
- Used `expectEmit(true, true, false, false)` for PairCreated event
- Checks indexed params (token0, token1) but not non-indexed data (pool address unknown before creation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 2 complete. Ready for Phase 3 (Comprehensive Testing):**
- Pool contract with full AMM mechanics (swap, mint, burn)
- Factory contract creating pools via CREATE2
- 46 tests pass across all suites (0 failures)
- Cross-decimal token compatibility proven
- Security patterns (CEI, ReentrancyGuard, MINIMUM_LIQUIDITY) in place for Phase 3 attack testing

---
*Phase: 02-core-amm-implementation*
*Completed: 2026-02-16*

## Self-Check: PASSED

**Files verified:**
- src/core/Factory.sol: EXISTS
- test/core/Factory.t.sol: EXISTS
- test/core/Integration.t.sol: EXISTS

**Commits verified:**
- 68195d2: EXISTS (Task 1 - Factory contract)
- bc8d637: EXISTS (Task 2 - Factory and Integration tests)

**Tests verified:**
- `forge test` output: 46 tests passed, 0 failed, 0 skipped
- All verification criteria met
