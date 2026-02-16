# Requirements: SimpleDEX

**Defined:** 2026-02-16
**Core Value:** Users can swap tokens through liquidity pools using the constant product AMM formula, with the math and mechanics fully transparent and tested.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Smart Contracts

- [ ] **SC-01**: Pool contract implements constant product formula (x*y=k) for token swaps
- [ ] **SC-02**: Pool contract charges 0.3% swap fee distributed to liquidity providers
- [ ] **SC-03**: Pool contract supports adding liquidity with proportional token deposits and LP token minting
- [ ] **SC-04**: Pool contract supports removing liquidity by burning LP tokens for proportional withdrawal
- [ ] **SC-05**: Pool contract enforces slippage protection via minOutput parameter on swaps
- [ ] **SC-06**: Pool contract implements reentrancy protection (CEI pattern + ReentrancyGuard)
- [ ] **SC-07**: Pool contract burns MINIMUM_LIQUIDITY on first deposit to prevent inflation attack
- [ ] **SC-08**: Factory contract creates new token pair pools and maintains registry
- [ ] **SC-09**: Factory contract prevents duplicate pools for the same token pair
- [ ] **SC-10**: LP token implements ERC20 interface representing proportional pool ownership
- [ ] **SC-11**: Pool emits events for swaps, liquidity additions, and removals

### Test Tokens

- [ ] **TK-01**: ERC20 test token A with configurable name, symbol, and initial supply
- [ ] **TK-02**: ERC20 test token B with configurable name, symbol, and initial supply

### Frontend

- [ ] **FE-01**: User can connect wallet (MetaMask) via wagmi/RainbowKit
- [ ] **FE-02**: User can swap tokens through a clean swap interface
- [ ] **FE-03**: User can see price impact before confirming swap
- [ ] **FE-04**: User can approve tokens for DEX spending (exact amounts)
- [ ] **FE-05**: User can add liquidity to a pool with both tokens
- [ ] **FE-06**: User can remove liquidity by burning LP tokens
- [ ] **FE-07**: User can see their token balances for all relevant tokens
- [ ] **FE-08**: User can see pool reserves and current exchange rate
- [ ] **FE-09**: User receives clear feedback on transaction status (pending/success/fail)
- [ ] **FE-10**: User can see the x*y=k math behind each swap calculation (educational mode)
- [ ] **FE-11**: User can see before/after reserves when previewing a swap
- [ ] **FE-12**: User can calculate impermanent loss for different price scenarios

### Testing

- [ ] **TS-01**: Unit tests for pool swap function with various input amounts
- [ ] **TS-02**: Unit tests for add/remove liquidity with LP token accounting
- [ ] **TS-03**: Unit tests for factory pool creation and registry
- [ ] **TS-04**: Edge case tests (1 wei amounts, extreme reserve ratios, zero amounts)
- [ ] **TS-05**: Fuzz tests with 10,000+ runs for swap and liquidity functions
- [ ] **TS-06**: Tests verify x*y=k invariant holds after every operation
- [ ] **TS-07**: Tests verify reentrancy protection prevents callback attacks
- [ ] **TS-08**: Slither static analysis passes with no high-severity findings

### Deployment

- [ ] **DP-01**: Deploy script deploys factory, test tokens, and creates initial pool on Anvil
- [ ] **DP-02**: Frontend connects to locally deployed contracts on Anvil

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Transaction deadline enforcement (revert if too old)
- **ADV-02**: Interactive bonding curve visualization chart
- **ADV-03**: Transparent fee breakdown showing LP earnings
- **ADV-04**: Multi-hop routing for indirect token swaps
- **ADV-05**: LP performance analytics (fees earned, APR)
- **ADV-06**: TWAP price oracle implementation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Concentrated liquidity (v3) | Adds massive complexity, learn x*y=k first |
| Yield farming / staking rewards | Not core to AMM understanding |
| Governance token | Distracts from AMM mechanics |
| Flash loans | Complex security implications, defer |
| Limit orders | Contradicts AMM model |
| Mainnet deployment | Learning project, local only |
| Unlimited token approvals | Security anti-pattern |
| Cross-chain bridging | Outside AMM scope |
| Pool creation UI | Pools created via deploy scripts |
| Auto-compounding rewards | Adds complexity without learning value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TK-01 | Phase 1 | Pending |
| TK-02 | Phase 1 | Pending |
| SC-01 | Phase 2 | Pending |
| SC-02 | Phase 2 | Pending |
| SC-03 | Phase 2 | Pending |
| SC-04 | Phase 2 | Pending |
| SC-05 | Phase 2 | Pending |
| SC-06 | Phase 2 | Pending |
| SC-07 | Phase 2 | Pending |
| SC-08 | Phase 2 | Pending |
| SC-09 | Phase 2 | Pending |
| SC-10 | Phase 2 | Pending |
| SC-11 | Phase 2 | Pending |
| TS-01 | Phase 3 | Pending |
| TS-02 | Phase 3 | Pending |
| TS-03 | Phase 3 | Pending |
| TS-04 | Phase 3 | Pending |
| TS-05 | Phase 3 | Pending |
| TS-06 | Phase 3 | Pending |
| TS-07 | Phase 3 | Pending |
| TS-08 | Phase 3 | Pending |
| FE-01 | Phase 4 | Pending |
| FE-07 | Phase 4 | Pending |
| FE-08 | Phase 4 | Pending |
| FE-09 | Phase 4 | Pending |
| FE-02 | Phase 5 | Pending |
| FE-03 | Phase 5 | Pending |
| FE-04 | Phase 5 | Pending |
| FE-11 | Phase 5 | Pending |
| FE-05 | Phase 6 | Pending |
| FE-06 | Phase 6 | Pending |
| FE-10 | Phase 7 | Pending |
| FE-12 | Phase 7 | Pending |
| DP-01 | Phase 8 | Pending |
| DP-02 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after roadmap creation*
