---
phase: 01-foundation-contracts
plan: 01
subsystem: tokens
tags: [foundry, solidity, openzeppelin, erc20, weth, usdc, testing]

# Dependency graph
requires:
  - phase: project-initialization
    provides: Git repository and planning structure
provides:
  - Foundry project with Solidity 0.8.28 and OpenZeppelin v5.5.0
  - WETH ERC20 token with ETH wrapping (deposit/withdraw)
  - MockUSDC ERC20 token with 6 decimals
  - Comprehensive test suites for both tokens
  - Faucet functions for local development token distribution
affects: [02-core-pool, liquidity-provision, swap-execution]

# Tech tracking
tech-stack:
  added: [foundry, forge-std, openzeppelin-contracts v5.5.0, solc 0.8.28]
  patterns: [ERC20 inheritance, Ownable pattern, Foundry testing with vm.prank]

key-files:
  created:
    - foundry.toml
    - remappings.txt
    - src/tokens/WETH.sol
    - src/tokens/MockUSDC.sol
    - test/tokens/WETH.t.sol
    - test/tokens/MockUSDC.t.sol
  modified: []

key-decisions:
  - "Used OpenZeppelin v5.5.0 for battle-tested ERC20 implementation"
  - "WETH follows canonical WETH9 pattern with deposit/withdraw for ETH wrapping"
  - "MockUSDC uses 6 decimals to simulate real USDC token precision"
  - "Added unrestricted faucet() functions for local development convenience"
  - "All tokens include owner-only mint() for controlled token creation"

patterns-established:
  - "Foundry test pattern: setUp with labeled addresses, comprehensive event testing"
  - "ERC20 token pattern: inherit OpenZeppelin ERC20 + Ownable for access control"
  - "Development convenience: faucet functions marked with warning comments"

# Metrics
duration: 4min
completed: 2026-02-16
---

# Phase 01 Plan 01: Foundation Tokens Summary

**Foundry project with WETH (ETH wrapping) and MockUSDC (6-decimal stablecoin), both fully tested with OpenZeppelin ERC20**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-16T16:02:02Z
- **Completed:** 2026-02-16T16:06:36Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Initialized Foundry project with OpenZeppelin Contracts v5.5.0 dependency
- Implemented WETH with canonical deposit/withdraw pattern for ETH wrapping
- Implemented MockUSDC with 6 decimals (not 18) to match real USDC behavior
- Created comprehensive test suites: 12 WETH tests + 10 MockUSDC tests (22 total, 100% pass)
- Established development convenience pattern with faucet functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Foundry project with OpenZeppelin** - `61c516b` (chore)
2. **Task 2: Implement WETH contract and tests** - `1e18e68` (feat)
3. **Task 3: Implement MockUSDC contract and tests** - `0e49761` (feat)

## Files Created/Modified
- `foundry.toml` - Foundry configuration with Solidity 0.8.28 and OpenZeppelin remappings
- `remappings.txt` - Import path mapping for @openzeppelin dependencies
- `src/tokens/WETH.sol` - Wrapped Ether ERC20 with deposit/withdraw, mint, faucet
- `src/tokens/MockUSDC.sol` - USD Coin ERC20 with 6 decimals, mint, faucet
- `test/tokens/WETH.t.sol` - 12 comprehensive tests covering deposit, withdraw, receive, events
- `test/tokens/MockUSDC.t.sol` - 10 comprehensive tests verifying 6 decimals, transfer, mint
- `lib/forge-std/` - Foundry testing framework (submodule)
- `lib/openzeppelin-contracts/` - OpenZeppelin v5.5.0 (submodule)

## Decisions Made

**WETH Implementation:**
- Followed canonical WETH9 pattern with deposit() minting tokens and withdraw() burning tokens
- Used call{value}("") instead of transfer() for ETH sending (more gas-flexible, modern pattern)
- Implemented receive() fallback to auto-call deposit() for direct ETH transfers
- Initial supply: 1000 WETH to deployer for testing convenience

**MockUSDC Implementation:**
- Overrode decimals() to return 6 (not default 18) to match real USDC precision
- Initial supply: 2,000,000 USDC (using 10**6 multiplier) to deployer
- No blacklist/pause mechanisms (simplified for learning/testing purposes)

**Development Convenience:**
- Added unrestricted faucet() functions to both tokens for local testing
- Marked faucet functions with warning comments (LOCAL DEVELOPMENT ONLY)
- Added owner-only mint() functions for controlled token creation scenarios

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed Foundry toolchain**
- **Found during:** Task 1 (Foundry project initialization)
- **Issue:** `forge` command not found - Foundry not installed on system
- **Fix:** Installed Foundry using official installer: `curl -L https://foundry.paradigm.xyz | bash` followed by `foundryup`
- **Files modified:** System installation (no project files)
- **Verification:** `forge --version` shows 1.5.1-stable, `forge build` succeeds
- **Committed in:** Not applicable (system-level dependency)

**2. [Rule 1 - Bug] Fixed ERC20 Transfer event reference in tests**
- **Found during:** Task 2 (WETH test compilation)
- **Issue:** Attempted to emit `WETH.Transfer` event - Transfer is from ERC20 interface, not WETH contract
- **Fix:** Added `import "@openzeppelin/contracts/token/ERC20/IERC20.sol"` and changed event to `IERC20.Transfer`
- **Files modified:** test/tokens/WETH.t.sol
- **Verification:** `forge build` succeeds, `forge test` passes all tests
- **Committed in:** 1e18e68 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes required for execution. Foundry installation was environmental dependency. Event fix was correctness issue in Solidity compilation. No scope creep.

## Issues Encountered

**Foundry CLI flag confusion:** Plan specified `--no-commit` flag for `forge init` and `forge install`, but correct flag is `--force` for init (no git flag needed, works with existing repo) and no flag needed for install (automatically uses existing git). Adapted to actual Foundry CLI API.

## User Setup Required

None - no external service configuration required. All dependencies are local development tools (Foundry, OpenZeppelin contracts).

## Next Phase Readiness

**Ready for Phase 2 (Core Pool Contract):**
- Both test tokens (WETH and MockUSDC) are fully implemented and tested
- Foundry testing infrastructure established
- ERC20 patterns validated with comprehensive test coverage
- Tokens can be deployed in pool contract tests using faucet functions

**Foundation complete:**
- 22 tests pass (0 failures)
- WETH: 18 decimals, 1000 initial supply, deposit/withdraw verified
- MockUSDC: 6 decimals (critical), 2,000,000 initial supply
- OpenZeppelin imports resolve correctly
- Build and test infrastructure working

---
*Phase: 01-foundation-contracts*
*Completed: 2026-02-16*

## Self-Check: PASSED

**Files verified:**
- foundry.toml: EXISTS
- remappings.txt: EXISTS
- src/tokens/WETH.sol: EXISTS
- src/tokens/MockUSDC.sol: EXISTS
- test/tokens/WETH.t.sol: EXISTS
- test/tokens/MockUSDC.t.sol: EXISTS

**Commits verified:**
- 61c516b: EXISTS (Task 1 - Foundry initialization)
- 1e18e68: EXISTS (Task 2 - WETH implementation)
- 0e49761: EXISTS (Task 3 - MockUSDC implementation)

**Tests verified:**
- `forge test` output: 22 tests passed, 0 failed, 0 skipped
- All verification criteria met
