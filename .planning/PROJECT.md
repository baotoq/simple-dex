# SimpleDEX

## What This Is

A decentralized exchange (DEX) built on the automated market maker (AMM) model using the constant product formula (x*y=k). Users can swap ERC-20 tokens and provide/remove liquidity through a full web frontend connected to smart contracts running locally on an EVM-compatible chain. This is a learning project to deeply understand how AMMs and DeFi protocols work under the hood.

## Core Value

Users can swap tokens through liquidity pools using the constant product AMM formula, with the math and mechanics fully transparent and tested.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Constant product AMM (x*y=k) smart contracts
- [ ] Token swapping through liquidity pools
- [ ] Liquidity provision (add/remove liquidity)
- [ ] Factory contract for creating token pair pools
- [ ] ERC-20 token contracts for testing
- [ ] Full React/Next.js frontend with wallet connection
- [ ] Swap interface with price impact display
- [ ] Liquidity management UI
- [ ] Comprehensive Solidity tests validating AMM math
- [ ] Local deployment with Anvil

### Out of Scope

- Concentrated liquidity (Uniswap v3 style) — adds significant complexity, learn x*y=k first
- Farming/staking rewards — not core to understanding AMMs
- Pool creation UI — pools created via scripts/tests
- Mainnet deployment — learning project, local only
- Multi-chain support — single EVM chain is sufficient for learning
- Order book mechanics — AMM model only
- Governance tokens — not relevant to core AMM learning
- Flash loans — advanced feature, defer

## Context

- Learning-focused project — understanding AMM mechanics is the priority over production readiness
- Constant product formula (x*y=k) is the foundation used by Uniswap v2 and many other DEXs
- Key concepts to internalize: price impact, slippage, impermanent loss, LP token math
- Foundry for smart contract development and testing (Solidity tests, fast compilation)
- Next.js + wagmi/viem for frontend wallet integration
- Local development with Anvil (Foundry's local EVM node)

## Constraints

- **Tech stack**: Foundry for contracts, Next.js for frontend — chosen for learning value
- **Scope**: Local development only — no testnet/mainnet deployment infrastructure needed
- **AMM model**: Constant product (x*y=k) only — simpler model to deeply understand first

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Constant product over concentrated liquidity | Simpler to understand, foundational to all AMMs | — Pending |
| Foundry over Hardhat | Solidity-native tests, faster compilation, modern tooling | — Pending |
| Local only, no testnet | Reduces deployment complexity, focuses on learning | — Pending |

---
*Last updated: 2026-02-16 after initialization*
