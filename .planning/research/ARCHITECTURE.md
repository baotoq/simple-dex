# Architecture Research

**Domain:** AMM DEX (Automated Market Maker Decentralized Exchange)
**Researched:** 2026-02-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Wallet  │  │   Swap   │  │ Liquidity│  │   Pool   │    │
│  │ Connect  │  │   Card   │  │  Manager │  │   Info   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │              │              │          │
├───────┴─────────────┴──────────────┴──────────────┴──────────┤
│                  Web3 Integration Layer                      │
│              (wagmi hooks + viem client)                     │
├─────────────────────────────────────────────────────────────┤
│                     Blockchain (EVM)                         │
├─────────────────────────────────────────────────────────────┤
│                   Smart Contract Layer                       │
│  ┌──────────────────────────────────────────────────┐       │
│  │                  Router Contract                  │       │
│  │         (Entry point for user interactions)       │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                        │
│  ┌──────────────────┴───────────────────────────────┐       │
│  │               Factory Contract                    │       │
│  │        (Pool deployment and registry)             │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                        │
│       ┌─────────────┼─────────────┐                         │
│       │             │             │                         │
│  ┌────▼────┐   ┌────▼────┐   ┌────▼────┐                   │
│  │  Pool   │   │  Pool   │   │  Pool   │                   │
│  │ (A/B)   │   │ (B/C)   │   │ (C/D)   │                   │
│  └─────────┘   └─────────┘   └─────────┘                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  ERC20   │  │  ERC20   │  │  ERC20   │                  │
│  │ Token A  │  │ Token B  │  │ Token C  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Factory Contract | Creates and tracks pool contracts; maintains registry of all deployed pools | Singleton contract using CREATE2 for deterministic addresses |
| Pool Contract (Pair) | Manages liquidity for a token pair; executes swaps using x*y=k formula; mints/burns LP tokens | One contract instance per token pair; implements ERC20 for LP tokens |
| Router Contract | User-facing interface; handles complex operations like multi-hop swaps; enforces slippage protection | Stateless periphery contract that interacts with pools |
| ERC20 Token | Standard fungible token implementation | OpenZeppelin ERC20 or custom implementation |
| LP Token | Represents liquidity provider share; issued by pool contract | ERC20-compliant, minted by pool on deposit |
| Wallet Connector | Connects user wallet to dApp; handles signing and transactions | Web3Modal, RainbowKit, or wagmi connectors |
| Frontend Components | User interface for swap, liquidity management, and pool information | React components using Next.js |
| Web3 Hooks | State management for blockchain data; handles contract interactions | wagmi hooks (useReadContract, useWriteContract, useWatchContractEvent) |

## Recommended Project Structure

### Smart Contracts (Foundry/Hardhat)

```
contracts/
├── core/
│   ├── Factory.sol              # Deploys and tracks pool contracts
│   ├── LiquidityPool.sol        # Core AMM logic (x*y=k), swap, add/remove liquidity
│   └── Router.sol               # Optional: User-facing interface with safety checks
├── tokens/
│   ├── ERC20Base.sol            # Base ERC20 implementation
│   ├── LPToken.sol              # LP token issued by pools
│   └── MockToken.sol            # Test tokens for development
├── interfaces/
│   ├── IFactory.sol             # Factory interface
│   ├── ILiquidityPool.sol       # Pool interface
│   └── IERC20.sol               # ERC20 interface
└── libraries/
    ├── Math.sol                 # Safe math operations, sqrt calculation
    └── SafeTransfer.sol         # Safe ERC20 transfer helpers

test/
├── Factory.test.ts
├── LiquidityPool.test.ts
├── Router.test.ts
└── integration/
    └── SwapFlow.test.ts         # End-to-end swap scenarios

scripts/
├── deploy.ts                    # Deployment script
└── setup-pool.ts                # Initial liquidity setup
```

### Frontend (Next.js)

```
frontend/src/
├── app/
│   ├── page.tsx                 # Swap interface (main page)
│   ├── liquidity/
│   │   └── page.tsx             # Add/remove liquidity page
│   └── pools/
│       └── page.tsx             # Pool explorer page
├── components/
│   ├── Header.tsx               # Wallet connection, network info
│   ├── SwapCard.tsx             # Token swap interface
│   ├── AddLiquidity.tsx         # Add liquidity form
│   ├── RemoveLiquidity.tsx      # Remove liquidity form
│   └── PoolInfo.tsx             # Display pool reserves and stats
├── hooks/
│   ├── useSwap.ts               # Swap logic and state
│   ├── useLiquidity.ts          # Add/remove liquidity logic
│   ├── usePoolReserves.ts       # Read pool state
│   └── useTokenBalance.ts       # Read user token balances
├── abis/
│   ├── Factory.ts               # Factory ABI
│   ├── LiquidityPool.ts         # Pool ABI
│   ├── Router.ts                # Router ABI (if used)
│   └── ERC20.ts                 # ERC20 ABI
├── config/
│   ├── wagmi.ts                 # wagmi configuration
│   └── contracts.ts             # Contract addresses by network
├── providers/
│   └── Web3Provider.tsx         # WagmiProvider wrapper
└── utils/
    ├── format.ts                # Number formatting utilities
    └── calculations.ts          # AMM math (price impact, etc.)
```

### Structure Rationale

- **contracts/core/:** Core protocol logic separated from periphery. Following Uniswap's core/periphery pattern - minimal, immutable core contracts with upgradeable periphery contracts for user interaction.
- **contracts/interfaces/:** Enables clean separation of concerns and easier testing/mocking.
- **contracts/libraries/:** Reusable logic (math, safe transfers) extracted to reduce code duplication and gas costs.
- **hooks/:** Custom hooks encapsulate Web3 logic, making components cleaner and logic reusable. wagmi's React Hooks architecture promotes this pattern.
- **abis/:** Centralized ABI management. Export as TypeScript constants for type safety.
- **config/:** Environment-specific configuration (contract addresses, network settings) separated from application code.

## Architectural Patterns

### Pattern 1: Core/Periphery Separation

**What:** Separate minimal, immutable core contracts from user-facing periphery contracts.

**When to use:** For production DEX systems where security and upgradeability matter. Core contracts hold funds and implement critical logic; periphery contracts provide user-friendly interfaces.

**Trade-offs:**
- **Pros:** Core contracts can remain immutable and minimal (reducing attack surface); periphery contracts can be upgraded to fix bugs or add features; simpler core contracts are easier to audit.
- **Cons:** More complex architecture; additional gas costs for cross-contract calls; users must trust periphery contracts.

**Example:**
```solidity
// Core: Minimal, immutable pool contract
contract LiquidityPool {
    function swap(uint amountIn, address tokenIn) external returns (uint amountOut) {
        // Core AMM logic only - no slippage checks, no deadlines
        // Direct token transfers
    }
}

// Periphery: User-facing router
contract Router {
    function swapWithSlippageProtection(
        uint amountIn,
        uint minAmountOut,
        address tokenIn,
        address pool,
        uint deadline
    ) external {
        require(block.timestamp <= deadline, "Expired");
        uint amountOut = ILiquidityPool(pool).swap(amountIn, tokenIn);
        require(amountOut >= minAmountOut, "Slippage exceeded");
    }
}
```

**SimpleDEX Decision:** For a learning project, Router is optional. Direct pool interaction is simpler and sufficient for understanding AMM mechanics.

### Pattern 2: Factory Pattern for Pool Deployment

**What:** Use a Factory contract to deploy pool contracts dynamically and maintain a registry.

**When to use:** When you need multiple instances of the same contract with different parameters (token pairs). Standard pattern for AMM DEXs.

**Trade-offs:**
- **Pros:** Centralized registry of all pools; deterministic addresses using CREATE2; prevents duplicate pools; simplifies pool discovery.
- **Cons:** Additional deployment cost; single point of failure if factory is compromised.

**Example:**
```solidity
contract Factory {
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;

    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "Identical tokens");
        require(getPool[tokenA][tokenB] == address(0), "Pool exists");

        // Deploy new pool contract
        bytes32 salt = keccak256(abi.encodePacked(tokenA, tokenB));
        pool = address(new LiquidityPool{salt: salt}(tokenA, tokenB));

        // Register pool
        getPool[tokenA][tokenB] = pool;
        getPool[tokenB][tokenA] = pool;
        allPools.push(pool);

        emit PoolCreated(tokenA, tokenB, pool);
    }
}
```

### Pattern 3: Checks-Effects-Interactions (CEI)

**What:** Structure smart contract functions in three phases: (1) Checks - validate inputs, (2) Effects - update state, (3) Interactions - external calls.

**When to use:** Always. This is the primary defense against reentrancy attacks.

**Trade-offs:**
- **Pros:** Prevents reentrancy vulnerabilities; makes code more predictable and easier to audit; follows Solidity security best practices.
- **Cons:** May require restructuring intuitive code flow; external calls must happen last.

**Example:**
```solidity
function removeLiquidity(uint liquidity) external returns (uint amount0, uint amount1) {
    // CHECKS
    require(liquidity > 0, "Invalid amount");
    require(balanceOf[msg.sender] >= liquidity, "Insufficient balance");

    // EFFECTS - update state BEFORE external calls
    uint totalSupply = totalSupply();
    amount0 = (liquidity * reserve0) / totalSupply;
    amount1 = (liquidity * reserve1) / totalSupply;

    _burn(msg.sender, liquidity);  // Update balances
    reserve0 -= amount0;
    reserve1 -= amount1;

    // INTERACTIONS - external calls LAST
    token0.transfer(msg.sender, amount0);
    token1.transfer(msg.sender, amount1);

    emit LiquidityRemoved(msg.sender, amount0, amount1, liquidity);
}
```

### Pattern 4: ERC20 Approve-TransferFrom Pattern

**What:** Users approve the contract to spend tokens, then contract uses transferFrom to pull tokens.

**When to use:** Required for DEX operations where users trade tokens. Standard DeFi pattern.

**Trade-offs:**
- **Pros:** User maintains custody until swap executes; standard pattern familiar to users; compatible with all ERC20 tokens.
- **Cons:** Requires two transactions (approve + swap); race condition vulnerability if not handled properly; unlimited approvals are security risk.

**Example:**
```solidity
// User flow:
// 1. User calls: tokenA.approve(pool, amountIn)
// 2. User calls: pool.swap(amountIn, tokenOut)

function swap(uint amountIn, address tokenOut) external returns (uint amountOut) {
    address tokenIn = tokenOut == token0 ? token1 : token0;

    // Calculate output using x*y=k
    amountOut = getAmountOut(amountIn, tokenIn);

    // Pull tokens from user (requires prior approval)
    IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

    // Send output tokens
    IERC20(tokenOut).transfer(msg.sender, amountOut);

    // Update reserves
    _updateReserves();
}
```

**Security Best Practice:** Frontend should request exact approvals (not unlimited) and guide users to revoke old approvals.

### Pattern 5: LP Token as ERC20

**What:** Pool contract itself implements ERC20 interface to represent liquidity provider shares.

**When to use:** Standard pattern for AMM pools. LP tokens represent proportional ownership of pool reserves.

**Trade-offs:**
- **Pros:** LP tokens are transferable and composable with other DeFi protocols; standard ERC20 interface; simple accounting (mint on deposit, burn on withdrawal).
- **Cons:** Additional gas cost for ERC20 logic; potential for LP tokens to be lost if sent to wrong address.

**Example:**
```solidity
contract LiquidityPool is ERC20 {
    function addLiquidity(uint amount0, uint amount1) external returns (uint liquidity) {
        // Transfer tokens to pool
        token0.transferFrom(msg.sender, address(this), amount0);
        token1.transferFrom(msg.sender, address(this), amount1);

        // Calculate liquidity to mint
        if (totalSupply() == 0) {
            liquidity = Math.sqrt(amount0 * amount1);
        } else {
            liquidity = Math.min(
                (amount0 * totalSupply()) / reserve0,
                (amount1 * totalSupply()) / reserve1
            );
        }

        // Mint LP tokens to user
        _mint(msg.sender, liquidity);

        emit LiquidityAdded(msg.sender, amount0, amount1, liquidity);
    }
}
```

### Pattern 6: Event-Driven State Synchronization

**What:** Smart contracts emit events on state changes; frontend listens to events to update UI.

**When to use:** Essential for responsive DeFi frontends. Alternative to polling (less efficient).

**Trade-offs:**
- **Pros:** Real-time updates; efficient (no unnecessary RPC calls); standard pattern across Web3; wagmi provides useWatchContractEvent hook.
- **Cons:** Requires WebSocket connection; events can be missed if connection drops; need to handle initial state separately.

**Example:**
```typescript
// Smart contract emits events
event Swap(address indexed user, address tokenIn, address tokenOut, uint amountIn, uint amountOut);
event LiquidityAdded(address indexed provider, uint amount0, uint amount1, uint liquidity);

// Frontend listens to events
import { useWatchContractEvent } from 'wagmi';

function PoolInfo({ poolAddress }) {
  const [reserves, setReserves] = useState({ reserve0: 0n, reserve1: 0n });

  // Watch for swap events
  useWatchContractEvent({
    address: poolAddress,
    abi: poolABI,
    eventName: 'Swap',
    onLogs(logs) {
      // Refresh reserves when swap occurs
      refreshReserves();
    },
  });

  // Read initial state
  const { data: reservesData } = useReadContract({
    address: poolAddress,
    abi: poolABI,
    functionName: 'getReserves',
  });

  return <div>Reserve0: {reserves.reserve0.toString()}</div>;
}
```

### Pattern 7: wagmi Hook Composition

**What:** Compose multiple wagmi hooks to build complex DeFi interactions.

**When to use:** For React-based DeFi frontends. wagmi is the standard Web3 React library (adopted by Uniswap, OpenSea, ENS).

**Trade-offs:**
- **Pros:** Type-safe with TypeScript; automatic caching and request deduplication; built on TanStack Query for robust state management; multi-chain support; active development and community.
- **Cons:** React-specific (not usable with Vue, Svelte); learning curve for developers new to React Hooks; beta versions can have breaking changes.

**Example:**
```typescript
function useSwap(poolAddress: Address) {
  // Read contract state
  const { data: reserves } = useReadContract({
    address: poolAddress,
    abi: poolABI,
    functionName: 'getReserves',
  });

  // Prepare swap transaction
  const { config } = usePrepareContractWrite({
    address: poolAddress,
    abi: poolABI,
    functionName: 'swap',
    args: [amountIn, tokenOut],
  });

  // Execute swap
  const { write: executeSwap, isLoading } = useContractWrite(config);

  // Wait for transaction
  const { isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  return { executeSwap, isLoading, isSuccess, reserves };
}
```

## Data Flow

### Swap Flow

```
User selects tokens and amount
    ↓
Frontend calculates expected output (using x*y=k)
    ↓
User approves token spending (ERC20.approve)
    ↓
wagmi: useWriteContract → pool.swap(amountIn, tokenOut)
    ↓
Smart Contract: Checks balance, calculates output, transfers tokens
    ↓
Contract emits Swap event
    ↓
Frontend: useWatchContractEvent detects event
    ↓
UI updates with new reserves and balances
```

### Add Liquidity Flow

```
User enters amounts for both tokens
    ↓
Frontend validates ratio matches pool reserves
    ↓
User approves both tokens (2 transactions)
    ↓
wagmi: useWriteContract → pool.addLiquidity(amount0, amount1)
    ↓
Contract: Transfers tokens, mints LP tokens
    ↓
Contract emits LiquidityAdded event
    ↓
Frontend updates UI with new LP balance
```

### Remove Liquidity Flow

```
User specifies LP tokens to burn
    ↓
Frontend calculates expected token amounts
    ↓
wagmi: useWriteContract → pool.removeLiquidity(liquidity)
    ↓
Contract: Burns LP tokens, transfers underlying tokens
    ↓
Contract emits LiquidityRemoved event
    ↓
Frontend updates balances
```

### State Management Flow

```
┌─────────────────────────────────────────────────┐
│              Blockchain State                    │
│  (Pool reserves, user balances, approvals)       │
└─────────────────┬───────────────────────────────┘
                  │ (RPC calls)
                  ↓
┌─────────────────────────────────────────────────┐
│              wagmi + TanStack Query              │
│     (Caching, deduplication, auto-refresh)       │
└─────────────────┬───────────────────────────────┘
                  │ (React hooks)
                  ↓
┌─────────────────────────────────────────────────┐
│            Custom Hooks Layer                    │
│   (useSwap, useLiquidity, usePoolReserves)       │
└─────────────────┬───────────────────────────────┘
                  │ (Props and state)
                  ↓
┌─────────────────────────────────────────────────┐
│              React Components                    │
│    (SwapCard, AddLiquidity, PoolInfo)            │
└─────────────────────────────────────────────────┘
```

### Key Data Flows

1. **Read Flow (Blockchain → UI):** wagmi hooks automatically fetch and cache contract state; TanStack Query handles caching and request deduplication; components re-render when data changes.

2. **Write Flow (UI → Blockchain):** User action triggers wagmi useWriteContract; wallet prompts user to sign transaction; transaction submitted to blockchain; useWaitForTransaction monitors transaction status; event listener or polling detects state change; UI updates with new state.

3. **Event Subscription Flow:** useWatchContractEvent establishes WebSocket connection; contract emits event on state change; frontend receives event in real-time; UI updates or refetches relevant data.

## Build Order and Dependencies

### Phase 1: Core Smart Contracts
**Build order:**
1. ERC20 token contracts (needed for testing)
2. LiquidityPool contract (core AMM logic)
3. Factory contract (pool deployment)

**Rationale:** Pool contract has no dependencies except ERC20 interface. Factory depends on Pool. This is the minimal viable DEX.

### Phase 2: Testing Infrastructure
**Build order:**
1. Unit tests for Pool (swap, add/remove liquidity)
2. Unit tests for Factory (pool creation)
3. Integration tests (end-to-end swap scenarios)

**Rationale:** Test each component in isolation before integration testing.

### Phase 3: Frontend Foundation
**Build order:**
1. wagmi configuration and wallet connection
2. Contract ABIs and address configuration
3. Basic UI layout (Header with wallet connect)

**Rationale:** Wallet connection is prerequisite for all Web3 interactions.

### Phase 4: Read Functionality
**Build order:**
1. usePoolReserves hook (read pool state)
2. useTokenBalance hook (read user balances)
3. PoolInfo component (display pool data)

**Rationale:** Reading data before writing ensures UI can display current state.

### Phase 5: Write Functionality
**Build order:**
1. Token approval flow (required for subsequent operations)
2. useSwap hook and SwapCard component
3. useLiquidity hooks and Add/Remove components

**Rationale:** Swap is simpler than liquidity operations. Build simplest write operation first.

### Phase 6: Polish and UX
**Build order:**
1. Error handling and user feedback
2. Loading states and transaction monitoring
3. Price impact calculations and warnings

**Rationale:** Core functionality must work before adding UX improvements.

## Scaling Considerations

| Concern | Learning Project | Production DEX | High-Volume DEX |
|---------|------------------|----------------|-----------------|
| **Gas Optimization** | Basic optimization sufficient | Optimize critical paths (swap, add/remove liquidity) | Extensive optimization, consider L2 deployment |
| **Multi-Hop Routing** | Not needed | Implement router for multi-hop swaps | Advanced routing with DEX aggregation |
| **Oracle Integration** | Not needed | Consider TWAP oracle for price feeds | Required for accurate pricing and MEV protection |
| **Access Control** | Simple ownership | Multi-sig or governance for critical functions | DAO governance with timelock |
| **Frontend Performance** | Direct RPC calls acceptable | CDN deployment, optimize bundle size | Edge caching, server-side rendering, dedicated RPC nodes |
| **Pool Variety** | Single pool type (constant product) | Multiple pool types (stable swaps, concentrated liquidity) | Algorithmic pool selection, dynamic fee tiers |

### Scaling Priorities for SimpleDEX

1. **Not needed for learning:** Multi-chain support, governance, advanced routing, oracles, MEV protection.
2. **Nice to have:** Router contract with slippage protection, better error messages, transaction history.
3. **Essential:** Correct implementation of x*y=k formula, proper event emission, CEI pattern for reentrancy protection.

## Anti-Patterns

### Anti-Pattern 1: Mutating State After External Calls

**What people do:** Update contract state (reserves, balances) after calling external contracts (token transfers).

**Why it's wrong:** Opens reentrancy vulnerability. If external contract is malicious, it can call back into your contract before state is updated, exploiting inconsistent state.

**Do this instead:** Follow CEI pattern - update all state before making external calls. Use ReentrancyGuard as additional protection.

```solidity
// WRONG - state update after external call
function swap(uint amountIn, address tokenOut) external {
    tokenIn.transferFrom(msg.sender, address(this), amountIn);  // External call
    reserve0 += amountIn;  // State update - TOO LATE!
}

// CORRECT - state update before external calls
function swap(uint amountIn, address tokenOut) external {
    uint amountOut = calculateAmountOut(amountIn);
    reserve0 += amountIn;   // State update FIRST
    reserve1 -= amountOut;

    tokenIn.transferFrom(msg.sender, address(this), amountIn);  // Then external calls
    tokenOut.transfer(msg.sender, amountOut);
}
```

### Anti-Pattern 2: Unlimited Token Approvals

**What people do:** Frontend requests users to approve uint256.max for convenience (one-time approval).

**Why it's wrong:** Gives contract unlimited access to user funds forever. If contract is compromised or has bug, attacker can drain all approved tokens.

**Do this instead:** Request exact approval for each transaction. Guide users to revoke old approvals periodically. Consider EIP-2612 (permit) for gasless approvals.

```typescript
// WRONG - unlimited approval
await tokenContract.write.approve([poolAddress, BigInt(2**256 - 1)]);

// CORRECT - exact approval
await tokenContract.write.approve([poolAddress, amountIn]);
```

### Anti-Pattern 3: Ignoring Price Impact

**What people do:** Allow swaps without calculating or displaying price impact.

**Why it's wrong:** Large swaps can cause significant slippage. Users get much worse prices than expected, leading to bad UX and potential for front-running.

**Do this instead:** Calculate price impact before swap. Display warning for high-impact trades. Implement minimum output amount (slippage protection).

```typescript
// Calculate price impact
function calculatePriceImpact(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): number {
  const spotPrice = Number(reserveOut) / Number(reserveIn);
  const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
  const executionPrice = Number(amountOut) / Number(amountIn);
  const priceImpact = ((spotPrice - executionPrice) / spotPrice) * 100;
  return priceImpact;
}

// Warn user if impact > 5%
if (priceImpact > 5) {
  showWarning("High price impact! Your trade will significantly affect pool price.");
}
```

### Anti-Pattern 4: Not Handling Failed Transactions

**What people do:** Assume all transactions succeed. Don't provide feedback on failures.

**Why it's wrong:** Transactions fail often (insufficient gas, slippage exceeded, user rejection). Silent failures confuse users.

**Do this instead:** Use wagmi's transaction status hooks. Provide clear error messages. Allow users to retry with adjusted parameters.

```typescript
const { write: swap, data, error } = useWriteContract();
const { isLoading, isSuccess, isError } = useWaitForTransaction({ hash: data?.hash });

if (isError) {
  return <ErrorMessage>Transaction failed: {error?.message}</ErrorMessage>;
}
if (isLoading) {
  return <LoadingSpinner>Confirming transaction...</LoadingSpinner>;
}
if (isSuccess) {
  return <SuccessMessage>Swap completed!</SuccessMessage>;
}
```

### Anti-Pattern 5: Hardcoding Contract Addresses

**What people do:** Put contract addresses directly in component code.

**Why it's wrong:** Hard to manage multiple environments (local, testnet, mainnet). Redeploying contracts requires changing code in many places.

**Do this instead:** Centralize contract addresses in config file. Use environment variables for network-specific addresses.

```typescript
// WRONG - hardcoded
const poolAddress = "0x1234...";

// CORRECT - centralized config
// config/contracts.ts
export const contracts = {
  [chains.localhost.id]: {
    factory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    tokenA: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  },
  [chains.sepolia.id]: {
    factory: "0xabcd...",
    tokenA: "0xefgh...",
  },
};

// Components use config
const factoryAddress = contracts[chainId]?.factory;
```

### Anti-Pattern 6: Calculating Output On-Chain in View Function, Then Using Stale Data

**What people do:** Frontend calls pool.getAmountOut() to preview swap, then user submits transaction. Between these calls, someone else trades, changing reserves.

**Why it's wrong:** User gets different output than expected. Transaction may fail or execute at worse price.

**Do this instead:** Use minAmountOut parameter (slippage tolerance) in swap function. Calculate expected output minus slippage buffer. Revert if actual output is less.

```solidity
function swap(uint amountIn, address tokenOut, uint minAmountOut) external {
    uint amountOut = calculateAmountOut(amountIn);
    require(amountOut >= minAmountOut, "Slippage exceeded");
    // ... execute swap
}
```

### Anti-Pattern 7: Using transfer() Instead of call() for ETH

**What people do:** Use address.transfer() or address.send() for ETH transfers.

**Why it's wrong:** These methods forward only 2300 gas, which is insufficient if recipient is a contract with fallback logic. Post-Istanbul hard fork, gas costs changed making this even more problematic.

**Do this instead:** Use address.call{value: amount}(""). Check return value. Or use OpenZeppelin's Address.sendValue().

```solidity
// WRONG
payable(msg.sender).transfer(amount);

// CORRECT
(bool success, ) = payable(msg.sender).call{value: amount}("");
require(success, "ETH transfer failed");
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| RPC Provider | HTTP/WebSocket via wagmi | Use Alchemy, Infura, or QuickNode for reliability; localhost RPC (Anvil) for development |
| Wallet | Browser extension or WalletConnect | wagmi supports MetaMask, WalletConnect, Coinbase Wallet, etc.; RainbowKit for better UX |
| Block Explorer | Read-only API calls | Etherscan API for transaction verification and contract verification |
| IPFS | Optional for frontend hosting | Not needed for SimpleDEX; relevant for production decentralized hosting |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Smart Contracts | RPC calls via wagmi hooks | Read operations use useReadContract; write operations use useWriteContract; events use useWatchContractEvent |
| Router ↔ Pool | Direct contract calls | Router calls pool functions; no events needed since router is stateless |
| Pool ↔ ERC20 Tokens | transferFrom/transfer | Pool pulls tokens from users (transferFrom) and pushes tokens to users (transfer) |
| Factory ↔ Pool | Deployment and registry | Factory deploys pools using CREATE2; maintains mapping of token pairs to pool addresses |
| Custom Hooks ↔ Components | React props and state | Hooks encapsulate Web3 logic; components focus on UI |

## Sources

### High Confidence (Official Documentation & Academic Sources)

- [Uniswap V2 Whitepaper](https://app.uniswap.org/whitepaper.pdf) - Core architecture reference
- [Uniswap V2 Architecture Overview | Nansen](https://www.nansen.ai/post/what-is-uniswap-v2-architecture-pools-flash-swaps) - Component structure
- [RareSkills: Uniswap V2 Architecture Tutorial](https://rareskills.io/post/uniswap-v2-tutorial) - Detailed technical breakdown
- [SoK: Decentralized Exchanges (DEX) with AMM Protocols (arXiv)](https://arxiv.org/pdf/2103.12732) - Academic survey of AMM architectures
- [wagmi Documentation](https://wagmi.sh/) - Official wagmi docs

### Medium Confidence (Developer Guides & Community Resources)

- [Uniswap v2 explained | Zealynx](https://www.zealynx.io/blogs/uniswap-v2) - Architecture and security
- [Programming DeFi: Uniswap V2 | Jeiwan](https://jeiwan.net/posts/programming-defi-uniswapv2-1/) - Implementation walkthrough
- [Smart Contract 101: Constant Product AMM | Web3 Magazine](https://medium.com/web3-magazine/smart-contract-101-constant-product-amm-cf5327316c14) - Code breakdown
- [ERC20 Approve Pattern Guide | Speedrun Ethereum](https://speedrunethereum.com/guides/erc20-approve-pattern) - Security best practices
- [Checks-Effects-Interactions Pattern | Medium](https://medium.com/@dehvcurtis/robust-smart-contracts-checks-effects-interactions-pattern-for-secure-dapps-6498bb4af893) - CEI explanation
- [Reentrancy Attacks in Solidity | Cyfrin](https://www.cyfrin.io/blog/what-is-a-reentrancy-attack-solidity-smart-contracts) - Security considerations
- [Factory Pattern in Solidity | Medium](https://medium.com/@regis-graptin/factory-pattern-in-solidity-save-gas-and-optimize-smart-contract-deployment-fd2350f4564a) - Implementation guide
- [Wagmi: React Hooks for Ethereum | Medium](https://medium.com/@BizthonOfficial/wagmi-the-react-hooks-framework-powering-modern-ethereum-dapps-ac94db1ee343) - Frontend architecture
- [DeFi Frontend Architecture 2026 | iLink](https://ilink.dev/blog/defi-app-development-in-2025-key-features-tech-stack-and-cost-breakdown) - Modern patterns
- [How Wallets Can Scale in 2026 | The Block](https://www.theblock.co/post/388495/how-wallets-can-scale-in-2026-integrations-not-in-house-builds) - Integration trends

---
*Architecture research for: SimpleDEX AMM*
*Researched: 2026-02-16*
