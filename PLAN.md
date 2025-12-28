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

---

## Project Structure

```
simple-dex/
├── contracts/
│   ├── tokens/
│   │   ├── SimpleToken.sol      # ERC-20 for testing
│   │   └── LPToken.sol          # Liquidity provider tokens
│   ├── core/
│   │   └── LiquidityPool.sol    # AMM logic (x * y = k)
│   └── Factory.sol              # Creates trading pairs
├── test/
│   ├── SimpleToken.test.ts
│   ├── LiquidityPool.test.ts
│   └── Factory.test.ts
├── scripts/
│   └── deploy.ts
├── hardhat.config.ts
└── package.json
```

---

## Implementation Phases

### Phase 0: Environment Setup ✅
- [x] Initialize Hardhat project
- [x] Configure hardhat.config.ts
- [x] Install dependencies
- [x] Verify setup by compiling sample contract

### Phase 1: ERC-20 Token (Learn Token Basics)
**File**: `contracts/tokens/SimpleToken.sol`

- [ ] Create SimpleToken with name, symbol, decimals, totalSupply
- [ ] Implement `balanceOf` mapping
- [ ] Implement `transfer()` function
- [ ] Implement `approve()` and `allowance` mapping
- [ ] Implement `transferFrom()` (critical for DeFi!)
- [ ] Add Transfer and Approval events
- [ ] Write tests in `test/SimpleToken.test.ts`

**Key Learning**: The approve/transferFrom pattern is how DEXs move your tokens

### Phase 2: Liquidity Pool Core
**File**: `contracts/core/LiquidityPool.sol`

- [ ] Create pool with token0, token1 addresses
- [ ] Add reserve0, reserve1 state variables
- [ ] Create LPToken contract (`contracts/tokens/LPToken.sol`)
- [ ] Implement `addLiquidity()` - deposit tokens, receive LP tokens
- [ ] Implement `removeLiquidity()` - burn LP tokens, receive tokens back
- [ ] Write tests for liquidity operations

**Key Learning**: How liquidity pools hold assets and track ownership via LP tokens

### Phase 3: Swap Mechanism (The Core Feature)
**File**: `contracts/core/LiquidityPool.sol`

- [ ] Implement `getAmountOut()` using constant product formula:
  ```
  amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
  ```
  (997/1000 = 0.3% fee)
- [ ] Implement `swap()` function
- [ ] Add slippage protection (minAmountOut parameter)
- [ ] Add Swap event
- [ ] Write comprehensive swap tests

**Key Learning**: AMM math (x * y = k), fees, slippage protection

### Phase 4: Factory Pattern
**File**: `contracts/Factory.sol`

- [ ] Implement `createPool(tokenA, tokenB)` - deploys new LiquidityPool
- [ ] Add `getPool` mapping for lookups
- [ ] Track all pools in `allPools` array
- [ ] Add PoolCreated event
- [ ] Write factory tests

**Key Learning**: Contract creating contracts, registry patterns

### Phase 5: Integration & Testing
- [ ] Full integration tests (create pool → add liquidity → swap → remove liquidity)
- [ ] Edge case tests (empty pools, large swaps, insufficient balance)
- [ ] Deploy to local Hardhat network
- [ ] (Optional) Deploy to Sepolia testnet

---

## Key Concepts You'll Learn

| Phase | Concepts |
|-------|----------|
| 0 | Project structure, compilation, Hardhat basics |
| 1 | ERC-20 standard, mappings, events, approve pattern |
| 2 | LP tokens, minting/burning, proportional shares |
| 3 | AMM formula (x*y=k), fees, slippage, reentrancy |
| 4 | Factory pattern, contract deployment from contracts |
| 5 | Integration testing, gas awareness |

---

## Smart Contract Summaries

### SimpleToken.sol
Basic ERC-20 token for testing swaps. Teaches token fundamentals.

### LPToken.sol
Represents ownership of liquidity pool. Only the pool can mint/burn.

### LiquidityPool.sol (Main Contract)
- Holds two tokens (token0, token1)
- Tracks reserves
- `addLiquidity()`: Deposit tokens → get LP tokens
- `removeLiquidity()`: Burn LP tokens → get tokens back
- `swap()`: Trade token0 ↔ token1 using x*y=k formula
- `getAmountOut()`: Calculate swap output (view function)

### Factory.sol
Creates new LiquidityPool contracts and tracks all deployed pools.

---

## Getting Started Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local blockchain (Terminal 1)
npx hardhat node

# Deploy to local blockchain (Terminal 2)
npx hardhat run scripts/deploy.ts --network localhost
```

---

## Resources

- [Solidity Docs](https://docs.soliditylang.org)
- [Hardhat Docs](https://hardhat.org/docs)
- [CryptoZombies](https://cryptozombies.io) - Interactive Solidity tutorial
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf) - AMM reference
