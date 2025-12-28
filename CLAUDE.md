# CLAUDE.md - Project Instructions for Claude Code

## Project Overview
This is a **learning project** to build a simple DEX (Decentralized Exchange) for understanding blockchain and smart contract development.

**User level**: Complete beginner to blockchain/Solidity
**Goal**: Learn by building a basic AMM-style DEX with token swaps

## Tech Stack
- **Smart Contracts**: Solidity (^0.8.28)
- **Framework**: Hardhat v3 with TypeScript
- **Testing**: Solidity tests (Hardhat v3 native)
- **Local Blockchain**: Hardhat Node

## Project Structure
```
simple-dex/
├── contracts/
│   ├── tokens/
│   │   ├── ERC20Base.sol       # Abstract base ERC-20 (shared logic)
│   │   ├── SimpleToken.sol     # Test token (mints on deploy)
│   │   └── LPToken.sol         # LP token (pool-only mint/burn)
│   ├── core/
│   │   └── LiquidityPool.sol   # AMM with x*y=k formula
│   └── Factory.sol             # Creates and tracks pools
├── test/
│   └── solidity/*.t.sol        # Solidity tests (26 tests)
├── docs/                       # Concept explanations
│   ├── 01-amm-formula.md
│   ├── 02-liquidity-provider.md
│   ├── 03-approve-pattern.md
│   ├── 04-slippage.md
│   └── 05-testing-approaches.md
├── scripts/
│   └── deploy.ts
├── hardhat.config.ts
└── package.json
```

## Key Commands
```bash
npx hardhat compile          # Compile contracts
npx hardhat test             # Run Solidity tests (26 tests)
npx hardhat test solidity    # Run Solidity tests only
npx hardhat node             # Start local blockchain
npx hardhat run scripts/deploy.ts --network localhost  # Deploy
```

## Contracts Summary

| Contract | Purpose |
|----------|---------|
| ERC20Base.sol | Abstract base with transfer/approve/transferFrom |
| SimpleToken.sol | Test token that mints supply to deployer |
| LPToken.sol | LP token with pool-only mint/burn |
| LiquidityPool.sol | AMM: addLiquidity, removeLiquidity, swap |
| Factory.sol | Creates pools, prevents duplicates |

## Testing Approaches

This project demonstrates **Solidity-based testing** (Hardhat v3 native):

### Solidity Tests (test/solidity/*.t.sol)
```bash
npx hardhat test
```
- Uses Hardhat v3's native Solidity test runner
- `setUp()` runs before each test
- `test_*()` functions are test cases
- Uses `require()` for assertions
- 26 tests covering all functionality

See [docs/05-testing-approaches.md](docs/05-testing-approaches.md) for details.

## Teaching Guidelines
Since this is a learning project:
1. **Explain concepts** - Add detailed comments in code
2. **Go slow** - One step at a time, verify understanding
3. **Use simple examples** - Avoid over-engineering
4. **Show the "why"** - Explain purpose, not just syntax

## Project Status: ✅ COMPLETE

All phases completed:
- ✅ Phase 0: Environment setup (Hardhat v3 + TypeScript)
- ✅ Phase 1: ERC-20 tokens (ERC20Base, SimpleToken)
- ✅ Phase 2: LP tokens (LPToken with pool-only control)
- ✅ Phase 3: Liquidity Pool (addLiquidity, removeLiquidity)
- ✅ Phase 4: Swap mechanism (x*y=k, 0.3% fee, slippage protection)
- ✅ Phase 5: Factory pattern (createPool, getPool)
- ✅ Solidity tests (26 tests)
- ✅ Documentation (5 concept guides)

## Key Concepts Covered
- ERC-20 token standard
- approve/transferFrom pattern (critical for DeFi)
- AMM formula: x * y = k (constant product)
- Liquidity pools and LP tokens
- Price impact and slippage protection
- Factory pattern (contract creating contracts)
- Solidity inheritance (abstract contracts)
- Solidity testing with Hardhat v3
