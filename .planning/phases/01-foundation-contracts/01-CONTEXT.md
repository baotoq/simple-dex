# Phase 1: Foundation Contracts - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

ERC20 test tokens (WETH and USDC) that serve as building blocks for all pool and swap operations. Tokens implement standard ERC20 interface with light simulation of real-world behavior. Pool contracts, factory, and swap logic are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Token Identity
- Simulate real DeFi tokens: WETH and USDC
- WETH: 18 decimals (standard), named "Wrapped Ether" with symbol "WETH"
- USDC: 6 decimals (realistic, matching real USDC), named "USD Coin" with symbol "USDC"
- Light simulation: WETH includes real deposit/withdraw (wrapping ETH), USDC is standard ERC20 with 6 decimals

### Supply & Minting
- Owner-only mint function (deployer can mint new tokens, not open to everyone)
- Realistic initial supply at deployment: ~1,000 WETH + ~2,000,000 USDC
- All initial supply goes to deployer — they distribute as needed
- Faucet function included on both tokens — anyone can call, no cooldown (convenience for local testing)

### Token Pair Design
- WETH has real deposit/withdraw mechanism (send ETH → get WETH, burn WETH → get ETH back)
- Pool operates with WETH (ERC20) only — no auto-wrapping of raw ETH in the pool
- USDC is straightforward: standard ERC20 with 6 decimals, no blacklist/pause mechanisms
- Faucet has no cooldown or rate limiting — maximum convenience for local development

### Claude's Discretion
- Faucet drip amounts (how much per call)
- Exact contract structure and inheritance patterns
- Test helper utilities
- Event definitions beyond standard ERC20

</decisions>

<specifics>
## Specific Ideas

- Tokens should feel like interacting with real WETH/USDC — familiar to anyone who's used DeFi
- WETH wrapping mechanism matches the real WETH contract pattern (deposit/withdraw with ETH payable)
- 6 decimals on USDC is intentional — teaches handling different decimal tokens across the pool math

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-contracts*
*Context gathered: 2026-02-16*
