# Simple DEX - Learning Project

A simple AMM-style DEX (Decentralized Exchange) built with Hardhat v3 to learn blockchain and smart contract development.

## Overview

This project implements a basic constant product AMM (like Uniswap V1) with:
- ERC-20 token contracts
- Liquidity pools with LP tokens
- Token swaps using the x*y=k formula
- Factory pattern for pool creation
- **Frontend UI** for swapping and liquidity management

## Tech Stack

### Smart Contracts
- **Solidity** ^0.8.28 - Smart contract language
- **Hardhat v3** - Development framework
- **viem** - Ethereum interactions
- **TypeScript** - Test language

### Frontend
- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **wagmi v3** - React hooks for Ethereum
- **RainbowKit** - Wallet connection

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run all tests (113 tests)
npx hardhat test

# Start local blockchain + deploy + frontend
npx hardhat node                                          # Terminal 1
npx hardhat run scripts/deploy.ts --network localhost     # Terminal 2
cd frontend && npm install && npm run dev                 # Terminal 3
```

Then open http://localhost:3000, connect MetaMask to localhost:8545, and import a test account.

### Other Commands

```bash
# Run only Solidity tests (51 tests)
npx hardhat test solidity

# Run only TypeScript tests (62 tests)
npx hardhat test nodejs

# Run interactive demo
npx hardhat run scripts/demo.ts --network localhost
```

## Project Structure

```
simple-dex/
├── contracts/
│   ├── tokens/
│   │   ├── ERC20Base.sol       # Abstract base ERC-20
│   │   ├── SimpleToken.sol     # Test token
│   │   └── LPToken.sol         # LP token
│   ├── core/
│   │   └── LiquidityPool.sol   # AMM logic
│   └── Factory.sol             # Pool factory
├── test/                       # TypeScript tests
├── scripts/                    # Deployment scripts
├── frontend/                   # Next.js frontend
│   ├── src/app/                # Pages (swap, liquidity)
│   ├── src/components/         # React components
│   └── src/hooks/              # Web3 hooks
├── docs/                       # Concept guides
└── hardhat.config.ts
```

## Contracts

| Contract | Description |
|----------|-------------|
| **ERC20Base** | Abstract base with transfer, approve, transferFrom |
| **SimpleToken** | Test token that mints initial supply to deployer |
| **LPToken** | LP token with pool-only mint/burn |
| **LiquidityPool** | AMM with addLiquidity, removeLiquidity, swap |
| **Factory** | Creates and tracks liquidity pools |

## Testing

This project demonstrates two testing approaches:

### Solidity Tests
- Located alongside contracts (`*.t.sol`)
- Uses Hardhat v3's native Solidity test runner
- Includes fuzz testing with random inputs

### TypeScript Tests
- Located in `test/` folder (`*.test.ts`)
- Uses Node.js native test runner (`node:test`)
- Uses `viem` for contract interactions

## Documentation

See the `docs/` folder for concept explanations:
- [01-amm-formula.md](docs/01-amm-formula.md) - x*y=k explained
- [02-liquidity-provider.md](docs/02-liquidity-provider.md) - LP tokens
- [03-approve-pattern.md](docs/03-approve-pattern.md) - Token spending
- [04-slippage.md](docs/04-slippage.md) - Slippage protection
- [05-testing-approaches.md](docs/05-testing-approaches.md) - Test comparison

## Key Concepts

- **ERC-20 Standard**: Fungible token interface
- **Approve Pattern**: How DeFi protocols spend your tokens
- **AMM Formula**: x * y = k (constant product)
- **LP Tokens**: Represent pool ownership
- **Slippage Protection**: minAmountOut parameter
- **Factory Pattern**: Contract creating contracts

## Resources

- [Solidity Docs](https://docs.soliditylang.org)
- [Hardhat v3 Docs](https://hardhat.org/docs)
- [viem Documentation](https://viem.sh/)
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf)
