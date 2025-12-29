# Simple DEX Learning Project Plan

## Overview
Build a simple AMM-style DEX (like Uniswap V1) to learn blockchain and smart contract development from scratch.

**Your level**: Complete beginner
**Smart contract language**: Solidity (you'll write `.sol` files)
**Development framework**: Hardhat (compiles, tests, and deploys your Solidity code)
**Goal**: Basic token-to-token swaps

---

## Solidity vs Hardhat - Understanding the Tools

| | **Solidity** | **Hardhat** |
|---|--------------|-------------|
| **What** | Programming language | Development framework |
| **Purpose** | Write smart contracts | Compile, test, deploy contracts |
| **Files** | `.sol` files | Config + TS test files |
| **Analogy** | Like Java | Like Maven/Gradle |

**How they work together:**
```
You write SOLIDITY code (.sol) → HARDHAT compiles it → HARDHAT deploys to blockchain
```

### Solidity Basics You'll Learn

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;          // Version declaration

contract MyContract {              // Like a class
    uint256 public myNumber;       // State variable (stored on blockchain)
    mapping(address => uint256) public balances;  // Like a hash map

    event Transfer(address from, address to, uint256 amount);  // Logs

    function deposit() external payable {   // Function
        balances[msg.sender] += msg.value;  // msg.sender = caller's address
    }
}
```

**Key Solidity concepts:**
- `contract` = like a class, deployed to blockchain
- `mapping` = key-value storage (like HashMap)
- `msg.sender` = address of who called the function
- `public/external/internal/private` = visibility modifiers
- `view/pure` = read-only functions (no gas cost when called externally)
- `payable` = function can receive ETH
- `abstract` = contract that can't be deployed directly (must be inherited)

---

## Project Structure

```
simple-dex/
├── contracts/
│   ├── tokens/
│   │   ├── ERC20Base.sol       # Abstract base ERC-20 (shared logic)
│   │   ├── ERC20Base.t.sol     # Solidity tests
│   │   ├── SimpleToken.sol     # Test token (mints on deploy)
│   │   ├── LPToken.sol         # LP token (pool-only mint/burn)
│   │   └── LPToken.t.sol       # Solidity tests
│   ├── core/
│   │   ├── LiquidityPool.sol   # AMM logic (x * y = k)
│   │   └── LiquidityPool.t.sol # Solidity tests
│   ├── Factory.sol             # Creates trading pairs
│   └── Factory.t.sol           # Solidity tests
├── test/
│   ├── ERC20Base.test.ts       # TypeScript tests
│   ├── SimpleToken.test.ts     # TypeScript tests
│   ├── LPToken.test.ts         # TypeScript tests
│   ├── LiquidityPool.test.ts   # TypeScript tests
│   └── Factory.test.ts         # TypeScript tests
├── scripts/
│   ├── deploy.ts               # Traditional deployment
│   ├── demo.ts                 # Interactive demo
│   └── setup-pool.ts           # Post-Ignition setup
├── ignition/modules/
│   └── SimpleDex.ts            # Hardhat Ignition module
├── frontend/                   # Next.js + wagmi + RainbowKit
│   ├── src/
│   │   ├── app/                # Pages (swap, liquidity)
│   │   ├── components/         # SwapCard, AddLiquidity, etc.
│   │   ├── hooks/              # useSwap, useLiquidity, etc.
│   │   └── config/             # Wagmi config, contract addresses
│   └── package.json
├── docs/
│   ├── 01-amm-formula.md       # x * y = k explained
│   ├── 02-liquidity-provider.md # LP tokens & impermanent loss
│   ├── 03-approve-pattern.md   # DeFi token spending
│   ├── 04-slippage.md          # Protection mechanisms
│   └── 05-testing-approaches.md # Testing comparison
├── hardhat.config.ts
└── package.json
```

---

## Implementation Phases - ALL COMPLETE ✅

### Phase 0: Environment Setup ✅
- [x] Initialize Hardhat project with TypeScript
- [x] Configure hardhat.config.ts
- [x] Install dependencies (hardhat-toolbox, viem)
- [x] Verify setup by compiling sample contract

### Phase 1: ERC-20 Token (Learn Token Basics) ✅
**Files**: `contracts/tokens/ERC20Base.sol`, `contracts/tokens/SimpleToken.sol`

- [x] Create ERC20Base abstract contract with shared logic
- [x] Implement `balanceOf` mapping
- [x] Implement `transfer()` function
- [x] Implement `approve()` and `allowance` mapping
- [x] Implement `transferFrom()` (critical for DeFi!)
- [x] Add Transfer and Approval events
- [x] Create SimpleToken inheriting from ERC20Base
- [x] Write tests

**Key Learning**: The approve/transferFrom pattern is how DEXs move your tokens

### Phase 2: Liquidity Pool Core ✅
**Files**: `contracts/tokens/LPToken.sol`, `contracts/core/LiquidityPool.sol`

- [x] Create LPToken with pool-only mint/burn
- [x] Create pool with token0, token1 addresses
- [x] Add reserve0, reserve1 state variables
- [x] Implement `addLiquidity()` - deposit tokens, receive LP tokens
- [x] Implement `removeLiquidity()` - burn LP tokens, receive tokens back
- [x] Write tests for liquidity operations

**Key Learning**: How liquidity pools hold assets and track ownership via LP tokens

### Phase 3: Swap Mechanism (The Core Feature) ✅
**File**: `contracts/core/LiquidityPool.sol`

- [x] Implement `getAmountOut()` using constant product formula:
  ```
  amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
  ```
  (997/1000 = 0.3% fee)
- [x] Implement `swap()` function
- [x] Add slippage protection (minAmountOut parameter)
- [x] Add Swap event
- [x] Write comprehensive swap tests

**Key Learning**: AMM math (x * y = k), fees, slippage protection

### Phase 4: Factory Pattern ✅
**File**: `contracts/Factory.sol`

- [x] Implement `createPool(tokenA, tokenB)` - deploys new LiquidityPool
- [x] Add `getPool` mapping for lookups (both directions)
- [x] Track all pools in `allPools` array
- [x] Add PoolCreated event
- [x] Prevent duplicate pools
- [x] Write factory tests

**Key Learning**: Contract creating contracts, registry patterns

### Phase 5: Integration & Testing ✅
- [x] Full integration tests (create pool → add liquidity → swap → remove liquidity)
- [x] Edge case tests (slippage, insufficient balance)
- [x] Fuzz testing with random inputs
- [x] 113 tests passing (51 Solidity + 62 TypeScript)
- [x] Documentation in docs/ folder

---

## Key Concepts You Learned

| Phase | Concepts |
|-------|----------|
| 0 | Project structure, compilation, Hardhat basics |
| 1 | ERC-20 standard, mappings, events, approve pattern, inheritance |
| 2 | LP tokens, minting/burning, proportional shares |
| 3 | AMM formula (x*y=k), fees, slippage protection |
| 4 | Factory pattern, contract deployment from contracts |
| 5 | Integration testing, test organization |

---

## Smart Contract Summaries

### ERC20Base.sol (Abstract)
Base contract with all ERC-20 functionality. Cannot be deployed directly.
- `transfer()`, `approve()`, `transferFrom()`
- Internal `_mint()` and `_burn()` for child contracts

### SimpleToken.sol
Inherits ERC20Base. Mints initial supply to deployer in constructor.

### LPToken.sol
Inherits ERC20Base. Only the pool address can mint/burn tokens.

### LiquidityPool.sol (Main Contract)
- Holds two tokens (token0, token1)
- Tracks reserves (reserve0, reserve1)
- Creates its own LPToken on deployment
- `addLiquidity()`: Deposit tokens → get LP tokens
- `removeLiquidity()`: Burn LP tokens → get tokens back
- `swap()`: Trade token0 ↔ token1 using x*y=k formula
- `getAmountOut()`: Calculate swap output (view function)
- 0.3% fee on all swaps

### Factory.sol
- `createPool()`: Deploys new LiquidityPool, prevents duplicates
- `getPool[tokenA][tokenB]`: Lookup pool address
- `allPools[]`: Array of all created pools

---

## Commands

```bash
# Smart Contracts
npx hardhat compile              # Compile contracts
npx hardhat test                 # Run all tests (113 tests)
npx hardhat test solidity        # Run Solidity tests only (51 tests)
npx hardhat test nodejs          # Run TypeScript tests only (62 tests)
npx hardhat node                 # Start local blockchain

# Deployment
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/demo.ts --network localhost

# Frontend
cd frontend && npm install       # Install frontend dependencies
cd frontend && npm run dev       # Start dev server (http://localhost:3000)
cd frontend && npm run build     # Build for production
```

---

## Resources

- [Solidity Docs](https://docs.soliditylang.org)
- [Hardhat Docs](https://hardhat.org/docs)
- [CryptoZombies](https://cryptozombies.io) - Interactive Solidity tutorial
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf) - AMM reference

---

## What's Next?

Possible extensions to continue learning:
1. **Router contract** - Single entry point for multi-hop swaps
2. **Flash loans** - Borrow without collateral (repay in same tx)
3. **Oracles** - Price feeds for external data
4. **Governance** - DAO voting for protocol changes
5. ~~**Frontend** - React/Next.js UI for the DEX~~ ✅ DONE
6. **Testnet deployment** - Deploy to Sepolia/Goerli

### Phase 6: Frontend ✅ COMPLETE

**Tech Stack**: Next.js 14 + Tailwind CSS + wagmi v3 + RainbowKit

**Features implemented**:
- Wallet connection with RainbowKit
- Token swap interface with slippage protection
- Add/remove liquidity forms
- Pool info display (reserves, price, share)
- Real-time balance updates

**Frontend Structure**:
```
frontend/src/
├── app/
│   ├── page.tsx              # Swap page
│   └── liquidity/page.tsx    # Liquidity management
├── components/
│   ├── Header.tsx            # Navbar with wallet connect
│   ├── SwapCard.tsx          # Token swap UI
│   ├── AddLiquidity.tsx      # Add liquidity form
│   ├── RemoveLiquidity.tsx   # Remove liquidity form
│   └── PoolInfo.tsx          # Pool statistics
├── hooks/
│   ├── useSwap.ts            # Swap logic
│   ├── useLiquidity.ts       # Liquidity logic
│   ├── useTokenBalance.ts    # Balance fetching
│   └── usePoolReserves.ts    # Pool reserves
└── config/
    ├── wagmi.ts              # Wagmi + RainbowKit config
    └── contracts.ts          # Contract addresses
```
