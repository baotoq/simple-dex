# CLAUDE.md - Project Instructions for Claude Code

## Project Overview
This is a **learning project** to build a simple DEX (Decentralized Exchange) for understanding blockchain and smart contract development.

**User level**: Complete beginner to blockchain/Solidity
**Goal**: Learn by building a basic AMM-style DEX with token swaps

## Tech Stack
- **Smart Contracts**: Solidity (^0.8.28)
- **Framework**: Hardhat with TypeScript
- **Testing**: Chai + Hardhat toolbox
- **Local Blockchain**: Hardhat Node

## Project Structure
```
simple-dex/
├── contracts/          # Solidity smart contracts (.sol)
│   ├── tokens/         # ERC-20 tokens (SimpleToken, LPToken)
│   ├── core/           # DEX logic (LiquidityPool)
│   └── Factory.sol     # Pool factory
├── test/               # TypeScript test files
├── scripts/            # Deployment scripts
└── hardhat.config.ts   # Hardhat configuration
```

## Key Commands
```bash
npx hardhat compile          # Compile contracts
npx hardhat test             # Run tests
npx hardhat node             # Start local blockchain
npx hardhat run scripts/deploy.ts --network localhost  # Deploy
```

## Teaching Guidelines
Since this is a learning project:
1. **Explain concepts** - Add detailed comments in code
2. **Go slow** - One step at a time, verify understanding
3. **Use simple examples** - Avoid over-engineering
4. **Show the "why"** - Explain purpose, not just syntax

## Current Phase
Building core DEX contracts:
1. ✅ Environment setup (Hardhat)
2. 🔄 SimpleToken.sol (ERC-20)
3. ⬜ LPToken.sol (Liquidity Provider tokens)
4. ⬜ LiquidityPool.sol (AMM with x*y=k)
5. ⬜ Factory.sol (Create trading pairs)

## Important Concepts to Teach
- ERC-20 token standard
- approve/transferFrom pattern (critical for DeFi)
- AMM formula: x * y = k
- Liquidity pools and LP tokens
- Slippage protection
