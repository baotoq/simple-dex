# Phase 2: Core AMM Implementation - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Pool and Factory smart contracts implementing constant product AMM (x*y=k) with security patterns. Pool handles swaps, liquidity deposits/withdrawals, and LP token minting/burning. Factory creates and registers token pair pools. No frontend, no deployment scripts, no advanced testing — those are separate phases.

</domain>

<decisions>
## Implementation Decisions

### LP Token Design
- Pool contract inherits ERC20 — the Pool IS the LP token (Uniswap V2 pattern)
- LP token name/symbol auto-generated from pair: "SimpleDEX WETH-USDC LP" / "SLP-WETH-USDC"
- Pool only handles ERC20 tokens — no raw ETH, users must wrap to WETH first

### Fee Mechanics
- 0.3% fee taken from input before swap calculation: amountInWithFee = amountIn * 997 / 1000
- Fees stay in pool reserves — LP holders claim by withdrawing liquidity (proportional share grows)
- No protocol fee — all fees go to liquidity providers
- Fee rate hardcoded at 0.3% — not configurable

### First Deposit & Liquidity Math
- Initial LP tokens = sqrt(amount0 * amount1) — geometric mean (Uniswap V2 formula)
- MINIMUM_LIQUIDITY = 1000 wei permanently burned to address(0) on first deposit
- Proportional deposits only — users must deposit at current pool ratio, reverts otherwise
- Withdrawal by LP token amount — user specifies exact LP tokens to burn, receives proportional reserves

### Factory & Pool Creation
- CREATE2 deployment for deterministic pool addresses from token pair
- Canonical token ordering: token0 < token1 by address — prevents duplicate pairs
- Owner-only pool creation — only Factory deployer can call createPool
- Mapping-only registry: getPair(tokenA, tokenB) lookup, no allPairs enumeration array

### Claude's Discretion
- How closely to follow Uniswap V2 Pair design (core patterns required, but advanced features like price oracles and sync/skim are optional — balance learning value with simplicity)
- Exact event parameter design for Swap, Mint, Burn events
- Internal helper function organization
- Solidity version and optimizer settings
- Test structure within this phase (basic sanity tests vs deferring to Phase 3)

</decisions>

<specifics>
## Specific Ideas

- Follow Uniswap V2 as the primary reference architecture — this is the canonical AMM implementation
- Keep contracts focused on learning clarity: well-commented code explaining WHY each pattern exists (CEI, reentrancy guard, minimum liquidity burn)
- Use OpenZeppelin v5.5.0 contracts (already installed from Phase 1) for ERC20 and ReentrancyGuard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-amm-implementation*
*Context gathered: 2026-02-16*
