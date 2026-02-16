# Roadmap: SimpleDEX

## Overview

SimpleDEX implements a constant product AMM (x*y=k) from smart contracts to frontend, prioritizing understanding over production features. The journey starts with foundational token contracts, builds secure pool and factory contracts with comprehensive testing, creates a user-facing swap and liquidity interface, enhances with educational features that show the math behind trades, and finishes with local deployment integration. Each phase delivers verifiable capabilities that enable the next, with security patterns (CEI, reentrancy guards, minimum liquidity burn) built in from day one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation Contracts** - ERC20 test tokens for pool operations (2026-02-16)
- [x] **Phase 2: Core AMM Implementation** - Pool and Factory contracts with x*y=k formula (2026-02-16)
- [ ] **Phase 3: Comprehensive Testing** - Security validation and edge case coverage
- [ ] **Phase 4: Frontend Foundation** - Wallet connection and read-only pool data
- [ ] **Phase 5: Swap Functionality** - User can execute token swaps with price impact
- [ ] **Phase 6: Liquidity Management** - User can add/remove liquidity with LP tokens
- [ ] **Phase 7: Educational Features** - Learning-focused UI showing AMM mechanics
- [ ] **Phase 8: Deployment Integration** - Local deployment with Anvil and frontend connection

## Phase Details

### Phase 1: Foundation Contracts
**Goal**: Test tokens exist for all pool and swap operations
**Depends on**: Nothing (first phase)
**Requirements**: TK-01, TK-02
**Success Criteria** (what must be TRUE):
  1. Token A exists with configurable name, symbol, and initial supply
  2. Token B exists with configurable name, symbol, and initial supply
  3. Tokens implement standard ERC20 interface (transfer, approve, balanceOf)
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Initialize Foundry project, implement WETH and MockUSDC tokens with tests

### Phase 2: Core AMM Implementation
**Goal**: Pool and Factory contracts implement constant product AMM with security patterns
**Depends on**: Phase 1
**Requirements**: SC-01, SC-02, SC-03, SC-04, SC-05, SC-06, SC-07, SC-08, SC-09, SC-10, SC-11
**Success Criteria** (what must be TRUE):
  1. Pool contract executes swaps using x*y=k formula with 0.3% fee
  2. Pool contract supports proportional liquidity deposits and withdrawals
  3. Pool contract mints LP tokens representing pool ownership
  4. Pool contract enforces slippage protection on swaps via minOutput parameter
  5. Pool contract implements reentrancy protection (CEI pattern + ReentrancyGuard)
  6. Pool contract burns minimum liquidity on first deposit to prevent inflation attack
  7. Factory contract creates pools for token pairs and prevents duplicates
  8. Pool emits events for swaps, liquidity additions, and removals
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Pool contract with AMM core (swap/mint/burn), LP token, security patterns, and basic sanity tests
- [x] 02-02-PLAN.md — Factory contract with CREATE2 deployment, pair registry, and end-to-end integration tests

### Phase 3: Comprehensive Testing
**Goal**: Smart contracts validated against edge cases, attacks, and invariant violations
**Depends on**: Phase 2
**Requirements**: TS-01, TS-02, TS-03, TS-04, TS-05, TS-06, TS-07, TS-08
**Success Criteria** (what must be TRUE):
  1. Unit tests pass for swap, liquidity, and factory functions with various inputs
  2. Edge case tests pass (1 wei amounts, extreme ratios, zero amounts)
  3. Fuzz tests run 10,000+ iterations without finding violations
  4. x*y=k invariant verified to hold after every swap and liquidity operation
  5. Reentrancy tests confirm protection prevents callback attacks
  6. Slither static analysis shows no high-severity findings
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Comprehensive Pool unit tests with edge cases and x*y=k invariant assertions
- [ ] 03-02-PLAN.md — Fuzz tests (10,000+ runs), stateful invariant tests, and reentrancy attack tests
- [ ] 03-03-PLAN.md — Slither static analysis configuration and security validation

### Phase 4: Frontend Foundation
**Goal**: User can connect wallet and view pool data without executing transactions
**Depends on**: Phase 3
**Requirements**: FE-01, FE-07, FE-08, FE-09
**Success Criteria** (what must be TRUE):
  1. User can connect MetaMask wallet via wagmi/RainbowKit
  2. User can see their token balances for all relevant tokens
  3. User can see pool reserves and current exchange rate
  4. User receives clear feedback on transaction status (pending/success/fail)
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 5: Swap Functionality
**Goal**: User can execute token swaps through clean interface with price impact awareness
**Depends on**: Phase 4
**Requirements**: FE-02, FE-03, FE-04, FE-11
**Success Criteria** (what must be TRUE):
  1. User can swap tokens through a clean swap interface
  2. User can see price impact before confirming swap
  3. User can approve tokens for DEX spending (exact amounts)
  4. User can see before/after reserves when previewing a swap
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 6: Liquidity Management
**Goal**: User can provide and remove liquidity with LP token tracking
**Depends on**: Phase 5
**Requirements**: FE-05, FE-06
**Success Criteria** (what must be TRUE):
  1. User can add liquidity to a pool with both tokens
  2. User can remove liquidity by burning LP tokens
  3. User receives LP tokens when adding liquidity
  4. User sees their LP token balance update after liquidity operations
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 7: Educational Features
**Goal**: User understands x*y=k mechanics through transparent calculations and educational tools
**Depends on**: Phase 6
**Requirements**: FE-10, FE-12
**Success Criteria** (what must be TRUE):
  1. User can see the x*y=k math behind each swap calculation (educational mode)
  2. User can calculate impermanent loss for different price scenarios
  3. User sees step-by-step formula breakdowns when enabled
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 8: Deployment Integration
**Goal**: Complete SimpleDEX system runs locally with frontend connected to deployed contracts
**Depends on**: Phase 7
**Requirements**: DP-01, DP-02
**Success Criteria** (what must be TRUE):
  1. Deploy script successfully deploys factory, test tokens, and creates initial pool on Anvil
  2. Frontend connects to locally deployed contracts on Anvil
  3. User can execute full swap and liquidity workflows end-to-end on local chain
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Contracts | 1/1 | Complete | 2026-02-16 |
| 2. Core AMM Implementation | 2/2 | Complete | 2026-02-16 |
| 3. Comprehensive Testing | 0/3 | Not started | - |
| 4. Frontend Foundation | 0/TBD | Not started | - |
| 5. Swap Functionality | 0/TBD | Not started | - |
| 6. Liquidity Management | 0/TBD | Not started | - |
| 7. Educational Features | 0/TBD | Not started | - |
| 8. Deployment Integration | 0/TBD | Not started | - |
