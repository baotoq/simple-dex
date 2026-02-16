# Phase 2: Core AMM Implementation - Research

**Researched:** 2026-02-16
**Domain:** Automated Market Maker (AMM) smart contracts using constant product formula
**Confidence:** HIGH

## Summary

Phase 2 implements Pool and Factory contracts following Uniswap V2's battle-tested constant product AMM architecture. The Pool contract inherits from OpenZeppelin v5.5.0 ERC20 to serve as both the liquidity pool and LP token, implementing x*y=k swaps with 0.3% fees, proportional liquidity management, and critical security patterns (CEI, reentrancy protection, minimum liquidity burn). The Factory uses CREATE2 for deterministic pool deployment with canonical token ordering to prevent duplicates.

**Primary recommendation:** Follow Uniswap V2 Pair/Factory architecture closely for core mechanics (swap formula, LP math, CREATE2), leverage OpenZeppelin v5.5.0 ReentrancyGuard and ERC20 base contracts, implement comprehensive CEI pattern enforcement, and focus on well-commented educational code that explains WHY each security pattern exists.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**LP Token Design:**
- Pool contract inherits ERC20 — the Pool IS the LP token (Uniswap V2 pattern)
- LP token name/symbol auto-generated from pair: "SimpleDEX WETH-USDC LP" / "SLP-WETH-USDC"
- Pool only handles ERC20 tokens — no raw ETH, users must wrap to WETH first

**Fee Mechanics:**
- 0.3% fee taken from input before swap calculation: amountInWithFee = amountIn * 997 / 1000
- Fees stay in pool reserves — LP holders claim by withdrawing liquidity (proportional share grows)
- No protocol fee — all fees go to liquidity providers
- Fee rate hardcoded at 0.3% — not configurable

**First Deposit & Liquidity Math:**
- Initial LP tokens = sqrt(amount0 * amount1) — geometric mean (Uniswap V2 formula)
- MINIMUM_LIQUIDITY = 1000 wei permanently burned to address(0) on first deposit
- Proportional deposits only — users must deposit at current pool ratio, reverts otherwise
- Withdrawal by LP token amount — user specifies exact LP tokens to burn, receives proportional reserves

**Factory & Pool Creation:**
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenZeppelin Contracts | v5.5.0 | ERC20 base, ReentrancyGuard | Battle-tested security, industry standard for token contracts, already installed |
| Foundry/Forge | Latest | Testing framework | Solidity-native tests, faster than Hardhat, already chosen in Phase 1 |
| Solidity | 0.8.28 | Smart contract language | Built-in overflow protection, current stable version in foundry.toml |

### OpenZeppelin v5.5.0 Key Components

| Contract | Import Path | Use Case |
|---------|-------------|----------|
| ERC20 | `@openzeppelin/contracts/token/ERC20/ERC20.sol` | LP token base implementation with _mint/_burn |
| ReentrancyGuard | `@openzeppelin/contracts/utils/ReentrancyGuard.sol` | nonReentrant modifier for swap/mint/burn functions |
| Ownable (optional) | `@openzeppelin/contracts/access/Ownable.sol` | Factory owner-only pool creation control |

### Installation

Already installed from Phase 1:
```bash
# OpenZeppelin v5.5.0 installed via Foundry
forge install openzeppelin/openzeppelin-contracts@v5.5.0

# foundry.toml already configured with:
# remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]
```

**No additional dependencies needed** — leverage existing Phase 1 setup.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── tokens/           # Phase 1 - WETH.sol, MockUSDC.sol (existing)
├── core/             # Phase 2 - NEW
│   ├── Pool.sol      # Pair contract implementing AMM + LP token
│   └── Factory.sol   # Pool creator using CREATE2
└── interfaces/       # Phase 2 - NEW (optional but recommended)
    ├── IPool.sol     # Pool interface for external integrations
    └── IFactory.sol  # Factory interface

test/
├── tokens/           # Phase 1 tests (existing)
└── core/             # Phase 2 - NEW
    ├── Pool.t.sol        # Unit tests: swap, mint, burn, edge cases
    ├── Factory.t.sol     # Unit tests: createPool, duplicate prevention
    └── PoolFactory.t.sol # Integration: create pool + execute swaps
```

### Pattern 1: Pool IS LP Token (Inheritance)

**What:** Pool contract inherits from OpenZeppelin ERC20, becoming the LP token itself.

**When to use:** Locked decision from CONTEXT.md — this is Uniswap V2's elegant pattern.

**Example:**
```solidity
// Source: Uniswap V2 Pair + OpenZeppelin v5.5.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Pool is ERC20, ReentrancyGuard {
    address public immutable token0;
    address public immutable token1;

    uint112 private reserve0;
    uint112 private reserve1;

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    constructor(address _token0, address _token1)
        ERC20(
            string(abi.encodePacked("SimpleDEX ",
                IERC20Metadata(_token0).symbol(), "-",
                IERC20Metadata(_token1).symbol(), " LP")),
            string(abi.encodePacked("SLP-",
                IERC20Metadata(_token0).symbol(), "-",
                IERC20Metadata(_token1).symbol()))
        )
    {
        require(_token0 < _token1, "Pool: INVALID_TOKEN_ORDER");
        token0 = _token0;
        token1 = _token1;
    }

    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        // Implementation follows Pattern 3
    }
}
```

**Why this works:**
- LP token name/symbol auto-generated from pair tokens (locked requirement)
- Single contract reduces deployment costs and complexity
- Direct access to totalSupply() for LP math
- Standard ERC20 interface for LP token transfers/approvals

### Pattern 2: Constant Product Swap with 0.3% Fee

**What:** x*y=k formula enforced with fee deducted from input amount before calculation.

**When to use:** Core AMM mechanic — every swap must maintain invariant.

**Example:**
```solidity
// Source: Uniswap V2 Pair.sol swap() function
function swap(
    uint256 amount0Out,
    uint256 amount1Out,
    address to
) external nonReentrant {
    require(amount0Out > 0 || amount1Out > 0, "Pool: INSUFFICIENT_OUTPUT");

    (uint112 _reserve0, uint112 _reserve1) = (reserve0, reserve1);
    require(amount0Out < _reserve0 && amount1Out < _reserve1, "Pool: INSUFFICIENT_LIQUIDITY");

    // Effects: Transfer tokens AFTER reserves checked
    if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
    if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);

    // Interactions: Get balances after transfer
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));

    // Calculate input amounts (what user deposited)
    uint256 amount0In = balance0 > _reserve0 - amount0Out
        ? balance0 - (_reserve0 - amount0Out) : 0;
    uint256 amount1In = balance1 > _reserve1 - amount1Out
        ? balance1 - (_reserve1 - amount1Out) : 0;

    require(amount0In > 0 || amount1In > 0, "Pool: INSUFFICIENT_INPUT");

    // Apply 0.3% fee: multiply by 997/1000
    // Formula: (x + 0.997*dx) * (y - dy) >= x * y
    uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
    uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;

    require(
        balance0Adjusted * balance1Adjusted >= uint256(_reserve0) * uint256(_reserve1) * (1000**2),
        "Pool: K"
    );

    _update(balance0, balance1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
}
```

**Fee explanation:**
- User swaps 1000 tokenA → fee is 3 tokenA (0.3%)
- Only 997 tokenA participates in x*y=k calculation
- 3 tokenA stays in pool, increasing reserves for all LPs
- Fees compound over time, LP share value grows

### Pattern 3: Initial Liquidity with MINIMUM_LIQUIDITY Burn

**What:** First deposit mints sqrt(amount0 * amount1) LP tokens, burns 1000 wei to address(0).

**When to use:** Required security pattern to prevent inflation attacks.

**Example:**
```solidity
// Source: Uniswap V2 Pair.sol mint() function
function mint(address to) external nonReentrant returns (uint256 liquidity) {
    (uint112 _reserve0, uint112 _reserve1) = (reserve0, reserve1);

    // Get current balances (user must transfer tokens before calling mint)
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));

    // Calculate deposited amounts
    uint256 amount0 = balance0 - _reserve0;
    uint256 amount1 = balance1 - _reserve1;

    uint256 _totalSupply = totalSupply();

    if (_totalSupply == 0) {
        // First deposit: geometric mean minus minimum liquidity
        liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
        _mint(address(0), MINIMUM_LIQUIDITY); // Permanently lock
    } else {
        // Subsequent deposits: proportional to existing reserves
        liquidity = Math.min(
            (amount0 * _totalSupply) / _reserve0,
            (amount1 * _totalSupply) / _reserve1
        );
    }

    require(liquidity > 0, "Pool: INSUFFICIENT_LIQUIDITY_MINTED");
    _mint(to, liquidity);

    _update(balance0, balance1);
    emit Mint(msg.sender, amount0, amount1);
}
```

**Why MINIMUM_LIQUIDITY matters:**
- Prevents "inflation attack" where attacker deposits 1 wei, then donates large amount
- Without burn: attacker could manipulate LP token value to steal from subsequent depositors
- 1000 wei burn creates minimum pool value, making attack economically infeasible
- Reference: [Inflation attack vulnerability](https://github.com/code-423n4/2024-05-canto-findings/issues/13)

### Pattern 4: Proportional Withdrawal

**What:** Users burn LP tokens to receive proportional share of both reserves.

**Example:**
```solidity
// Source: Uniswap V2 Pair.sol burn() function
function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));
    uint256 liquidity = balanceOf(address(this)); // LP tokens sent to pool

    uint256 _totalSupply = totalSupply();

    // Pro-rata distribution
    amount0 = (liquidity * balance0) / _totalSupply;
    amount1 = (liquidity * balance1) / _totalSupply;

    require(amount0 > 0 && amount1 > 0, "Pool: INSUFFICIENT_LIQUIDITY_BURNED");

    _burn(address(this), liquidity);

    _safeTransfer(token0, to, amount0);
    _safeTransfer(token1, to, amount1);

    balance0 = IERC20(token0).balanceOf(address(this));
    balance1 = IERC20(token1).balanceOf(address(this));

    _update(balance0, balance1);
    emit Burn(msg.sender, amount0, amount1, to);
}
```

### Pattern 5: CREATE2 Deterministic Deployment

**What:** Factory uses CREATE2 to deploy pools at predictable addresses derived from token pair.

**When to use:** Locked decision — enables off-chain address computation and prevents duplicates.

**Example:**
```solidity
// Source: Uniswap V2 Factory.sol
contract Factory {
    mapping(address => mapping(address => address)) public getPair;

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256
    );

    function createPool(address tokenA, address tokenB)
        external
        returns (address pool)
    {
        require(tokenA != tokenB, "Factory: IDENTICAL_ADDRESSES");

        // Canonical ordering: smaller address is token0
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);

        require(token0 != address(0), "Factory: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "Factory: PAIR_EXISTS");

        // CREATE2 deployment with salt = hash(token0, token1)
        bytes memory bytecode = type(Pool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));

        assembly {
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        // Initialize pool (pass token addresses to constructor)
        // Note: In Solidity 0.8+, constructor params must be in creation code
        // Alternative: Use creationCode with constructor args encoded

        // Register in both directions for O(1) lookup
        getPair[token0][token1] = pool;
        getPair[token1][token0] = pool;

        emit PairCreated(token0, token1, pool, /* pool count */);
    }
}
```

**CREATE2 address computation:**
```solidity
// Off-chain or on-chain address prediction
address predictedAddress = address(uint160(uint256(keccak256(abi.encodePacked(
    bytes1(0xff),
    factoryAddress,
    keccak256(abi.encodePacked(token0, token1)), // salt
    keccak256(type(Pool).creationCode)           // init code hash
)))));
```

**Reference:** [Foundry CREATE2 guide](https://www.getfoundry.sh/guides/deterministic-deployments-using-create2)

### Pattern 6: Checks-Effects-Interactions (CEI)

**What:** Security pattern enforcing order: validate inputs → update state → external calls.

**When to use:** ALL functions that make external calls (swap, mint, burn).

**Example:**
```solidity
function swap(uint256 amount0Out, uint256 amount1Out, address to) external nonReentrant {
    // CHECKS: Validate all inputs and preconditions
    require(amount0Out > 0 || amount1Out > 0, "Pool: INSUFFICIENT_OUTPUT");
    (uint112 _reserve0, uint112 _reserve1) = (reserve0, reserve1);
    require(amount0Out < _reserve0 && amount1Out < _reserve1, "Pool: INSUFFICIENT_LIQUIDITY");
    require(to != token0 && to != token1, "Pool: INVALID_TO");

    // EFFECTS: Update all state variables
    // (In this case, transfers happen before state update, but verification after)

    // INTERACTIONS: External calls last
    if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
    if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);

    // Final state update after external calls complete
    _update(balance0, balance1);
}
```

**Why CEI matters:**
- Prevents reentrancy attacks where external contract calls back during execution
- Even with ReentrancyGuard, CEI prevents "read-only reentrancy" exploits
- Reference: [Solidity security best practices](https://docs.soliditylang.org/en/latest/security-considerations.html)

### Pattern 7: Safe Token Transfers

**What:** Use low-level calls with return value validation for ERC20 transfers.

**Why:** Some tokens don't return bool, some return false instead of reverting.

**Example:**
```solidity
// Internal helper for safe transfers
function _safeTransfer(address token, address to, uint256 value) private {
    (bool success, bytes memory data) = token.call(
        abi.encodeWithSelector(IERC20.transfer.selector, to, value)
    );
    require(
        success && (data.length == 0 || abi.decode(data, (bool))),
        "Pool: TRANSFER_FAILED"
    );
}
```

**Alternative:** Use OpenZeppelin SafeERC20 library:
```solidity
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

function _safeTransfer(address token, address to, uint256 value) private {
    IERC20(token).safeTransfer(to, value);
}
```

**Reference:** [SafeERC20 usage guide](https://soliditydeveloper.com/safe-erc20)

### Pattern 8: Square Root for Geometric Mean

**What:** Babylonian method (Newton-Raphson) for computing sqrt(x*y) in LP token minting.

**Implementation:**
```solidity
// Source: Uniswap V2 Math.sol
library Math {
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
        // else z = 0 (default)
    }
}
```

**Why geometric mean:**
- Initial LP tokens = sqrt(amount0 * amount1) balances both token values
- Prevents manipulation from depositing 1 wei of one token + huge amount of other
- Fair valuation regardless of token prices

**Alternative:** OpenZeppelin v5 includes Math.sqrt():
```solidity
import "@openzeppelin/contracts/utils/math/Math.sol";

uint256 liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
```

### Anti-Patterns to Avoid

**1. Violating CEI Pattern**
```solidity
// BAD: State update after external call
function withdraw() external {
    uint256 amount = balances[msg.sender];
    payable(msg.sender).transfer(amount);  // External call first
    balances[msg.sender] = 0;              // State update second - VULNERABLE!
}

// GOOD: State update before external call
function withdraw() external {
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0;              // State update first
    payable(msg.sender).transfer(amount);  // External call second - SAFE
}
```

**2. Skipping MINIMUM_LIQUIDITY Burn**
```solidity
// BAD: First deposit without minimum burn
if (totalSupply == 0) {
    liquidity = Math.sqrt(amount0 * amount1); // VULNERABLE to inflation attack
}

// GOOD: Always burn minimum liquidity
if (totalSupply == 0) {
    liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
    _mint(address(0), MINIMUM_LIQUIDITY);
}
```

**3. Non-Proportional Deposits (After First)**
```solidity
// BAD: Allowing arbitrary deposit ratios
liquidity = Math.sqrt(amount0 * amount1); // Always geometric mean

// GOOD: Enforce proportional deposits (take minimum)
liquidity = Math.min(
    (amount0 * totalSupply) / reserve0,
    (amount1 * totalSupply) / reserve1
);
```

**4. Missing slippage Protection**
```solidity
// BAD: No minimum output check
function swap(uint256 amountIn, address tokenIn) external {
    // ... calculate amountOut ...
    // User gets whatever the pool gives, could be front-run
}

// GOOD: Require minimum output
function swap(uint256 amountIn, address tokenIn, uint256 minAmountOut) external {
    // ... calculate amountOut ...
    require(amountOut >= minAmountOut, "Pool: SLIPPAGE_EXCEEDED");
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ERC20 LP Token | Custom token with balances mapping | OpenZeppelin ERC20 inheritance | Handles decimal metadata, transfer hooks, approval edge cases, ERC20Permit (optional), battle-tested |
| Reentrancy Protection | Custom mutex or state flags | OpenZeppelin ReentrancyGuard | Handles cross-function reentrancy, gas-optimized, stateless in v5.5.0 |
| Square Root | Custom iterative algorithm | OpenZeppelin Math.sqrt() or Uniswap Math.sqrt() | Babylonian method correctly implemented, gas-optimized, edge case handling |
| Safe Token Transfers | Direct IERC20.transfer() calls | OpenZeppelin SafeERC20 | Handles non-standard tokens (no return value, false instead of revert), low-level call safety |
| Access Control | require(msg.sender == owner) | OpenZeppelin Ownable/AccessControl | Two-step ownership transfer, role-based permissions, event emissions |

**Key insight:** DeFi contracts handle real money — subtle bugs in math, reentrancy, or token interactions lead to exploits. Use battle-tested libraries for ALL non-core logic. Only implement AMM-specific mechanics (swap formula, LP math) from scratch.

## Common Pitfalls

### Pitfall 1: Integer Overflow in Constant Product Check

**What goes wrong:** Multiplying large reserves can overflow uint256, causing invariant check to pass incorrectly.

**Why it happens:** Solidity 0.8+ has built-in overflow checks, but in complex formulas like `balance0Adjusted * balance1Adjusted >= reserve0 * reserve1 * 1000000`, intermediate multiplications can overflow.

**How to avoid:**
- Use Uniswap's pattern: store reserves as uint112, allowing safe multiplication to uint224
- Split calculations: `balance0Adjusted * balance1Adjusted >= uint256(reserve0) * uint256(reserve1) * (1000**2)`
- Cast to uint256 before multiplying to use full 256-bit range

**Warning signs:**
- Tests failing with "arithmetic overflow" on large reserves
- Swaps reverting unexpectedly when pools have high liquidity

**Example:**
```solidity
// Store reserves in smaller type
uint112 private reserve0;
uint112 private reserve1;

// Safe multiplication in invariant check
require(
    balance0Adjusted * balance1Adjusted >=
    uint256(reserve0) * uint256(reserve1) * (1000**2),
    "Pool: K"
);
```

### Pitfall 2: Rounding Errors in LP Token Calculation

**What goes wrong:** Integer division truncates, causing users to lose dust amounts or pool to mint more LP tokens than deserved.

**Why it happens:** Solidity has no decimals, `a / b` always rounds down. In `liquidity = (amount * totalSupply) / reserve`, small amounts round to zero.

**How to avoid:**
- Use Math.min() to take smaller of two calculations (protects pool)
- Require minimum deposit amounts to avoid dust
- For withdrawals, always favor the pool (round against user)

**Warning signs:**
- Users receiving 0 LP tokens for small deposits
- Pool reserve ratio drifting over time
- Arbitrageurs draining pool through micro-deposits

**Example:**
```solidity
// Proportional deposit: take minimum to prevent ratio manipulation
liquidity = Math.min(
    (amount0 * _totalSupply) / _reserve0,
    (amount1 * _totalSupply) / _reserve1
);

// Withdrawal: round in pool's favor
amount0 = (liquidity * balance0) / _totalSupply; // Rounds down, pool keeps dust
```

### Pitfall 3: Forgetting to Update Reserves After State Changes

**What goes wrong:** Reserves (reserve0, reserve1) become out of sync with actual token balances, breaking swap calculations and creating arbitrage opportunities.

**Why it happens:** Developers update balances but forget to call `_update()` to sync reserves, or call it at wrong time (before external transfers complete).

**How to avoid:**
- Always call `_update(balance0, balance1)` as LAST step in swap/mint/burn
- Use consistent pattern: execute logic → external calls → update reserves
- Emit Sync event in _update() to track reserve changes

**Warning signs:**
- Swaps calculating wrong amounts out
- Pool reserves not matching balanceOf() for token contracts
- Events showing mismatched reserve values

**Example:**
```solidity
function _update(uint256 balance0, uint256 balance1) private {
    require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "Pool: OVERFLOW");
    reserve0 = uint112(balance0);
    reserve1 = uint112(balance1);
    emit Sync(reserve0, reserve1);
}

function swap(...) external nonReentrant {
    // ... transfer tokens ...

    // Get balances AFTER transfers complete
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));

    // ... validate invariant ...

    _update(balance0, balance1); // Update reserves LAST
}
```

### Pitfall 4: CREATE2 Salt Collision from Unsorted Tokens

**What goes wrong:** Creating pools with (tokenA, tokenB) and (tokenB, tokenA) attempts to deploy to same address, causing second deployment to fail or overwrite first.

**Why it happens:** CREATE2 address depends on salt = keccak256(abi.encodePacked(token0, token1)). If tokens aren't sorted consistently, same pair generates different salts.

**How to avoid:**
- ALWAYS sort tokens before CREATE2: `(token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA)`
- Store sorted pair in getPair mapping in both directions
- Check getPair[token0][token1] != address(0) before deploying

**Warning signs:**
- Factory allowing duplicate pools for same pair
- CREATE2 reverting with "address already deployed"
- getPair(A,B) != getPair(B,A)

**Example:**
```solidity
function createPool(address tokenA, address tokenB) external returns (address pool) {
    require(tokenA != tokenB, "Factory: IDENTICAL_ADDRESSES");

    // Sort tokens to ensure consistent salt
    (address token0, address token1) = tokenA < tokenB
        ? (tokenA, tokenB)
        : (tokenB, tokenA);

    require(getPair[token0][token1] == address(0), "Factory: PAIR_EXISTS");

    bytes32 salt = keccak256(abi.encodePacked(token0, token1));
    // ... CREATE2 deployment ...

    // Store in both directions
    getPair[token0][token1] = pool;
    getPair[token1][token0] = pool;
}
```

### Pitfall 5: Reentrancy Through Token Callbacks

**What goes wrong:** ERC777 and other tokens with transfer hooks call recipient before transfer completes, allowing reentrancy even with ReentrancyGuard.

**Why it happens:** ReentrancyGuard only blocks re-entering the SAME function. If token.transfer() calls malicious recipient, recipient can call OTHER pool functions.

**How to avoid:**
- Use ReentrancyGuard on ALL state-changing functions (swap, mint, burn)
- Enforce CEI pattern: update state before transfers
- Document that pool only supports standard ERC20 (no hooks)
- Alternatively: Use checks-effects-interactions even within same transaction

**Warning signs:**
- Tests passing with normal ERC20 but failing with ERC777
- Unexpected state changes during swaps
- Flash loan attacks succeeding

**Example:**
```solidity
// Apply nonReentrant to ALL external state-changing functions
function swap(...) external nonReentrant { }
function mint(...) external nonReentrant { }
function burn(...) external nonReentrant { }

// Or use cross-function reentrancy protection
uint256 private _locked = 1;

modifier lock() {
    require(_locked == 1, "Pool: LOCKED");
    _locked = 2;
    _;
    _locked = 1;
}
```

### Pitfall 6: Fee Calculation Precision Loss

**What goes wrong:** Calculating 0.3% fee as `(amountIn * 3) / 1000` loses precision for small amounts, or using wrong order causes intermediate overflow.

**Why it happens:** Integer division rounds down, and order of operations matters in fixed-point math.

**How to avoid:**
- Use Uniswap's pattern: `amountInWithFee = amountIn * 997` (multiply first)
- Check invariant with adjusted balances: `balance * 1000 - amountIn * 3`
- Never divide before multiplying in fee calculations

**Warning signs:**
- Swaps taking slightly wrong fee amounts
- Pool not accumulating fees correctly over time
- Arbitrage bots extracting value

**Example:**
```solidity
// CORRECT: Multiply first, maintain precision
uint256 amountInWithFee = amountIn * 997; // 99.7% of input
uint256 numerator = amountInWithFee * reserveOut;
uint256 denominator = reserveIn * 1000 + amountInWithFee;
uint256 amountOut = numerator / denominator;

// Or in invariant check:
uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
require(
    balance0Adjusted * balance1Adjusted >= uint256(reserve0) * uint256(reserve1) * (1000**2),
    "Pool: K"
);
```

## Code Examples

Verified patterns from official sources:

### Constant Product Swap (Uniswap V2)

```solidity
// Source: https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol
function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data)
    external
    lock  // Uniswap uses custom lock modifier, we'll use nonReentrant
{
    require(amount0Out > 0 || amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
    (uint112 _reserve0, uint112 _reserve1,) = getReserves();
    require(amount0Out < _reserve0 && amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');

    uint256 balance0;
    uint256 balance1;
    {
        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, 'UniswapV2: INVALID_TO');

        if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
    }

    uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
    uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
    require(amount0In > 0 || amount1In > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');

    {
        uint256 balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
        uint256 balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
        require(
            balance0Adjusted.mul(balance1Adjusted) >= uint256(_reserve0).mul(_reserve1).mul(1000**2),
            'UniswapV2: K'
        );
    }

    _update(balance0, balance1, _reserve0, _reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
}
```

### LP Token Minting with Geometric Mean

```solidity
// Source: https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol
function mint(address to) external lock returns (uint liquidity) {
    (uint112 _reserve0, uint112 _reserve1,) = getReserves();
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));
    uint256 amount0 = balance0.sub(_reserve0);
    uint256 amount1 = balance1.sub(_reserve1);

    bool feeOn = _mintFee(_reserve0, _reserve1);
    uint256 _totalSupply = totalSupply; // gas savings
    if (_totalSupply == 0) {
        liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
        _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
    } else {
        liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
    }
    require(liquidity > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_MINTED');
    _mint(to, liquidity);

    _update(balance0, balance1, _reserve0, _reserve1);
    if (feeOn) kLast = uint256(reserve0).mul(reserve1);
    emit Mint(msg.sender, amount0, amount1);
}
```

### Babylonian Square Root

```solidity
// Source: https://github.com/Uniswap/v2-core/blob/master/contracts/libraries/Math.sol
library Math {
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
```

### CREATE2 Pool Deployment

```solidity
// Source: https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Factory.sol
function createPair(address tokenA, address tokenB) external returns (address pair) {
    require(tokenA != tokenB, 'UniswapV2: IDENTICAL_ADDRESSES');
    (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(token0 != address(0), 'UniswapV2: ZERO_ADDRESS');
    require(getPair[token0][token1] == address(0), 'UniswapV2: PAIR_EXISTS');

    bytes memory bytecode = type(UniswapV2Pair).creationCode;
    bytes32 salt = keccak256(abi.encodePacked(token0, token1));
    assembly {
        pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
    }

    IUniswapV2Pair(pair).initialize(token0, token1);
    getPair[token0][token1] = pair;
    getPair[token1][token0] = pair;
    allPairs.push(pair);

    emit PairCreated(token0, token1, pair, allPairs.length);
}
```

### OpenZeppelin v5 ERC20 + ReentrancyGuard

```solidity
// Source: OpenZeppelin v5.5.0 documentation
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Pool is ERC20, ReentrancyGuard {
    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
    {
        // ERC20 handles name, symbol, decimals (default 18)
    }

    function mint(address to, uint256 amount) internal {
        _mint(to, amount); // Internal function, updates totalSupply
    }

    function burn(address from, uint256 amount) internal {
        _burn(from, amount); // Internal function, decreases totalSupply
    }

    function protectedFunction() external nonReentrant {
        // ReentrancyGuard prevents reentrant calls
        // In v5.5.0, it's stateless and gas-optimized
    }
}
```

### Safe ERC20 Transfers

```solidity
// Source: OpenZeppelin SafeERC20 pattern
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Pool {
    using SafeERC20 for IERC20;

    function _safeTransfer(address token, address to, uint256 value) private {
        IERC20(token).safeTransfer(to, value);
        // Handles tokens that don't return bool
        // Handles tokens that return false instead of reverting
        // Reverts if transfer fails
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) private {
        IERC20(token).safeTransferFrom(from, to, value);
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SafeMath library for all arithmetic | Built-in overflow checks (Solidity 0.8+) | December 2020 | Cleaner code, reduced gas for checked math, use `unchecked {}` for gas optimization where safe |
| Custom reentrancy guards | OpenZeppelin ReentrancyGuard v5 (stateless) | v5.0 (2023) | No initialization needed, works in upgradeable contracts without storage slot conflicts |
| ERC20 _beforeTokenTransfer hook | _update hook in ERC20 | OpenZeppelin v5.0 | Simpler override pattern, single hook for all transfers |
| Ownable single-step transfer | Ownable2Step (two-step transfer) | OpenZeppelin v5.0 | Prevents accidental ownership loss from typo addresses |
| Manual token sorting in Factory | Canonical token0 < token1 pattern | Uniswap V2 (2020) | Industry standard, prevents duplicate pools, enables deterministic addressing |
| Custom LP token contract | Pool inherits ERC20 (Uniswap V2 pattern) | Uniswap V2 (2020) | Reduces complexity, deployment cost, and attack surface |

**Deprecated/outdated:**
- **SafeMath library**: Use built-in checked arithmetic in Solidity 0.8+, only use `unchecked {}` for proven-safe gas optimizations
- **UniswapV2Pair.initialize()**: With Solidity 0.8.28, pass constructor params in creationCode instead of separate initialize call (avoids front-running)
- **Price oracles via cumulative price**: Advanced feature not needed for core AMM learning (defer to later phase if needed)
- **Uniswap V2 sync()/skim()**: Edge case functions for fee-on-transfer tokens, defer unless user specifically needs them

## Compiler & Optimizer Settings

### Recommended Foundry Configuration

**For Phase 2 (Production-Like Settings):**
```toml
# foundry.toml
[profile.default]
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 1000000  # High runs = optimize for execution cost (AMMs are called frequently)
via_ir = false            # Use legacy pipeline for compatibility
evm_version = "cancun"    # Latest EVM features

remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]

# Compiler metadata
bytecode_hash = "none"    # Makes bytecode deterministic for CREATE2
cbor_metadata = false     # Removes metadata hash from bytecode
```

**Why 1,000,000 runs:**
- AMM pools execute swaps constantly (high execution frequency)
- Higher runs optimize runtime gas at expense of deployment cost
- Uniswap V2 uses 999,999 runs for production
- Reference: [Foundry optimizer guide](https://www.getfoundry.sh/config/reference/solidity-compiler)

**Why bytecode_hash = "none":**
- CREATE2 address depends on init code hash
- Metadata in bytecode changes hash between compilations
- Deterministic bytecode enables reproducible addresses
- Reference: [Foundry CREATE2 tutorial](https://www.getfoundry.sh/guides/deterministic-deployments-using-create2)

**Optional: Testing Profile (Faster Compilation)**
```toml
[profile.test]
optimizer = false  # Faster compilation during development
```

### Gas Optimization Notes

- **Solidity 0.8+ built-in overflow checks** add ~24 gas per arithmetic operation
- Use `unchecked {}` only for proven-safe calculations (e.g., incrementing loop counters)
- **uint112 for reserves** enables safe multiplication to uint224 without overflow
- **Immutable variables** (token0, token1) save gas on every read vs storage
- **Storage packing**: Group uint112 reserve0, reserve1, uint32 timestamp in single slot (saves 2 SLOAD per swap)

**Example storage packing:**
```solidity
// Packed into single 256-bit slot
uint112 private reserve0;           // 112 bits
uint112 private reserve1;           // 112 bits
uint32 private blockTimestampLast;  // 32 bits
// Total: 256 bits = 1 storage slot
```

## Event Design

### Recommended Event Parameters

**Swap Event:**
```solidity
event Swap(
    address indexed sender,      // Who initiated swap (indexed for filtering by user)
    uint256 amount0In,           // Token0 input amount
    uint256 amount1In,           // Token1 input amount
    uint256 amount0Out,          // Token0 output amount
    uint256 amount1Out,          // Token1 output amount
    address indexed to           // Recipient of output tokens (indexed for filtering)
);
```

**Mint Event (Add Liquidity):**
```solidity
event Mint(
    address indexed sender,      // Who added liquidity
    uint256 amount0,             // Token0 deposited
    uint256 amount1              // Token1 deposited
);
```

**Burn Event (Remove Liquidity):**
```solidity
event Burn(
    address indexed sender,      // Who removed liquidity
    uint256 amount0,             // Token0 withdrawn
    uint256 amount1,             // Token1 withdrawn
    address indexed to           // Recipient of withdrawn tokens
);
```

**Sync Event (Reserve Update):**
```solidity
event Sync(
    uint112 reserve0,            // New reserve0 value
    uint112 reserve1             // New reserve1 value
);
```

**Factory PairCreated Event:**
```solidity
event PairCreated(
    address indexed token0,      // First token (sorted)
    address indexed token1,      // Second token (sorted)
    address pair,                // Pool address
    uint256                      // Total pairs created (counter)
);
```

### Indexed Parameter Best Practices

- **Maximum 3 indexed parameters** per event (first topic used for event signature)
- **Index addresses** (sender, to) for user-based filtering
- **Don't index large types** (bytes, string, uint256 arrays) — expensive and hashed
- **Balance gas cost vs queryability**: Each indexed param adds ~375 gas
- Reference: [Solidity events guide](https://rareskills.io/post/ethereum-events)

## Testing Strategy

### Phase 2 Testing Scope (Basic Sanity Tests)

**Goal:** Verify core mechanics work, defer comprehensive testing to Phase 3.

**Recommended structure:**
```
test/core/
├── Pool.t.sol           # Unit tests for Pool contract
├── Factory.t.sol        # Unit tests for Factory contract
└── Integration.t.sol    # Basic integration: create pool + swap
```

### Pool.t.sol Test Cases (Minimum Viable)

```solidity
// Foundry test structure
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/core/Pool.sol";

contract PoolTest is Test {
    Pool pool;
    MockERC20 token0;
    MockERC20 token1;

    function setUp() public {
        token0 = new MockERC20("Token0", "TK0");
        token1 = new MockERC20("Token1", "TK1");
        pool = new Pool(address(token0), address(token1));
    }

    // BASIC TESTS (Phase 2)
    function test_InitialState() public {
        assertEq(pool.token0(), address(token0));
        assertEq(pool.token1(), address(token1));
        assertEq(pool.totalSupply(), 0);
    }

    function test_MintFirstLiquidity() public {
        // First deposit: should mint sqrt(x*y) - MINIMUM_LIQUIDITY
        uint256 amount0 = 1000e18;
        uint256 amount1 = 4000e18;

        token0.transfer(address(pool), amount0);
        token1.transfer(address(pool), amount1);

        uint256 expectedLiquidity = Math.sqrt(amount0 * amount1) - 1000;
        uint256 liquidity = pool.mint(address(this));

        assertEq(liquidity, expectedLiquidity);
        assertEq(pool.balanceOf(address(0)), 1000); // MINIMUM_LIQUIDITY burned
    }

    function test_Swap() public {
        // Add liquidity first
        _addLiquidity(1000e18, 1000e18);

        // Swap: give 100 token0, expect ~90.7 token1 (with 0.3% fee)
        uint256 amountIn = 100e18;
        token0.transfer(address(pool), amountIn);

        uint256 amountOut = pool.swap(0, /* calculated amountOut */, address(this));

        // Verify constant product (with fee adjustment)
        // Detailed assertions in Phase 3
    }

    // DEFER TO PHASE 3: Edge cases, fuzz tests, invariant tests
}
```

### Factory.t.sol Test Cases (Minimum Viable)

```solidity
contract FactoryTest is Test {
    Factory factory;

    function test_CreatePool() public {
        address pool = factory.createPool(token0, token1);

        assertEq(factory.getPair(token0, token1), pool);
        assertEq(factory.getPair(token1, token0), pool); // Bidirectional lookup
    }

    function test_PreventDuplicatePools() public {
        factory.createPool(token0, token1);

        vm.expectRevert("Factory: PAIR_EXISTS");
        factory.createPool(token0, token1);
    }

    function test_TokenOrdering() public {
        address pool = factory.createPool(token1, token0); // Reversed order

        // Should create same pool as (token0, token1)
        assertEq(factory.getPair(token0, token1), pool);
    }
}
```

### Integration.t.sol (Minimum Viable)

```solidity
contract IntegrationTest is Test {
    function test_FullFlowCreateAndSwap() public {
        // 1. Create pool via factory
        address pool = factory.createPool(weth, usdc);

        // 2. Add initial liquidity
        // ... transfer tokens, call mint ...

        // 3. Execute swap
        // ... transfer tokens, call swap ...

        // 4. Verify balances changed correctly
    }
}
```

### Testing Tools (Foundry Features)

| Feature | Use Case | Example |
|---------|----------|---------|
| `forge test` | Run all tests | `forge test -vvv` (verbose output) |
| `forge test --match-test` | Run specific test | `forge test --match-test test_Swap` |
| `forge test --gas-report` | Gas usage analysis | Optimize expensive operations |
| `vm.expectRevert()` | Test error cases | Verify require() statements |
| `vm.prank(user)` | Simulate calls from address | Test access control |
| Fuzz testing | Random inputs | `function test_Swap(uint256 amountIn) public` |

**Phase 2 focus:** Basic happy path tests only. Defer comprehensive testing to Phase 3.

Reference: [Foundry testing guide](https://getfoundry.sh/forge/tests/writing-tests/)

## Open Questions

### 1. Should Pool constructor take token addresses or use initialize()?

**What we know:**
- Uniswap V2 uses separate initialize() to work around CREATE2 + constructor params complexity
- Solidity 0.8+ supports constructor params in creationCode via abi.encodePacked

**What's unclear:**
- Does Foundry/Solc 0.8.28 handle constructor params in CREATE2 cleanly?
- Trade-off: simpler code (constructor) vs tested pattern (initialize)

**Recommendation:**
- **Try constructor first** (cleaner pattern for Solidity 0.8.28)
- If CREATE2 deployment fails, fall back to initialize() pattern
- Test both approaches in Factory.t.sol

**Code sketch:**
```solidity
// Option 1: Constructor (cleaner)
contract Pool is ERC20, ReentrancyGuard {
    constructor(address _token0, address _token1)
        ERC20(...)
    {
        token0 = _token0;
        token1 = _token1;
    }
}

// Factory creates with:
bytes memory bytecode = abi.encodePacked(
    type(Pool).creationCode,
    abi.encode(token0, token1)
);

// Option 2: Initialize (Uniswap V2 pattern)
contract Pool {
    function initialize(address _token0, address _token1) external {
        require(token0 == address(0)); // Only initialize once
        token0 = _token0;
        token1 = _token1;
    }
}
```

### 2. Should we implement price oracles (cumulative price tracking)?

**What we know:**
- Uniswap V2 includes price0CumulativeLast/price1CumulativeLast for TWAP oracles
- User decision is "Claude's discretion" on advanced features vs simplicity

**What's unclear:**
- Does implementing oracles provide significant learning value for core AMM understanding?
- Are oracles used in later phases (frontend, deployment)?

**Recommendation:**
- **Defer to Phase 3 or later** — not needed for core AMM mechanics
- Price oracles add complexity (UQ112x112 fixed-point math, timestamp tracking)
- Focus Phase 2 on swap/liquidity core, add oracles if user requests or Phase 3+ needs them

### 3. Should sync() and skim() functions be included?

**What we know:**
- Uniswap V2 includes sync() to force reserves to match balances
- skim() recovers excess tokens (e.g., from fee-on-transfer tokens)
- Both are edge case handlers, not core AMM functionality

**What's unclear:**
- Do we support fee-on-transfer tokens in this project?
- Is there learning value in these recovery mechanisms?

**Recommendation:**
- **Skip sync/skim in Phase 2** — defer to Phase 3+ if needed
- Document in comments: "This implementation doesn't support fee-on-transfer tokens"
- If user specifically requests them later, add as enhancement

### 4. How should we handle LP token decimals?

**What we know:**
- OpenZeppelin ERC20 defaults to 18 decimals
- Uniswap V2 LP tokens use 18 decimals
- Underlying tokens (WETH, USDC) have different decimals (18, 6)

**What's unclear:**
- Should LP token decimals match token0/token1, or always be 18?

**Recommendation:**
- **Use 18 decimals for LP tokens** (OpenZeppelin default)
- LP tokens represent pool shares, not actual token amounts
- Simplifies sqrt() math (no decimal conversion needed)
- Matches Uniswap V2 standard

## Sources

### Primary (HIGH confidence)

**Context7 Documentation:**
- [/uniswap/v2-core](https://github.com/uniswap/v2-core) - Uniswap V2 core contracts reference
- [/uniswap/docs](https://github.com/uniswap/docs) - Official Uniswap V2 documentation on liquidity, swaps, CREATE2
- [/openzeppelin/openzeppelin-contracts](https://github.com/openzeppelin/openzeppelin-contracts) - OpenZeppelin v5 ERC20, ReentrancyGuard, SafeERC20 patterns
- [/ethereum/solidity](https://github.com/ethereum/solidity) - Solidity 0.8.x CEI pattern, security considerations

**Official Documentation:**
- [Solidity Security Considerations](https://docs.soliditylang.org/en/latest/security-considerations.html) - CEI pattern, reentrancy prevention
- [Uniswap V2 Core Contracts](https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol) - Actual implementation code
- [Uniswap V2 Factory](https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Factory.sol) - CREATE2 deployment pattern
- [Uniswap V2 Math Library](https://github.com/Uniswap/v2-core/blob/master/contracts/libraries/Math.sol) - Babylonian sqrt implementation
- [OpenZeppelin Contracts v5.5.0 Release](https://github.com/OpenZeppelin/openzeppelin-contracts/releases/tag/v5.5.0) - ReentrancyGuard changes, ERC20 updates
- [Foundry Deterministic Deployments Guide](https://www.getfoundry.sh/guides/deterministic-deployments-using-create2) - CREATE2 usage

### Secondary (MEDIUM confidence)

**Technical Analysis & Tutorials:**
- [Uniswap V2 Price Impact Calculation - RareSkills](https://rareskills.io/post/uniswap-v2-price-impact) - Detailed swap formula explanation
- [How Uniswap Works - Official Docs](https://docs.uniswap.org/contracts/v2/concepts/protocol-overview/how-uniswap-works) - Constant product mechanics
- [Understanding Constant Product Formula - Bitget](https://www.bitget.com/wiki/what-is-the-constant-product-formula-of-uniswap-v1--v2) - x*y=k detailed explanation
- [AMM Vulnerabilities - Arristor](https://arristor.com/amm-vulnerabilities-and-exploits-how-defi-liquidity-pools-get-ripped-off) - Security analysis
- [Inflation Attack Prevention - GitHub Issue](https://github.com/code-423n4/2024-05-canto-findings/issues/13) - MINIMUM_LIQUIDITY rationale
- [Safe ERC20 Interactions - Solidity Developer](https://soliditydeveloper.com/safe-erc20) - SafeERC20 usage patterns
- [Solidity Events Guide - RareSkills](https://rareskills.io/post/ethereum-events) - Event design best practices
- [Foundry Testing Best Practices](https://getfoundry.sh/guides/best-practices/writing-tests/) - Test structure guide
- [Creating Invariant Tests for AMMs](https://allthingsfuzzy.substack.com/p/creating-invariant-tests-for-an-amm) - Advanced testing patterns
- [Solidity 0.8 Safe Math - Solidity Developer](https://soliditydeveloper.com/solidity-0.8) - Built-in overflow protection
- [OpenZeppelin Math.sqrt Documentation](https://docs.openzeppelin.com/contracts/3.x/api/math) - Alternative sqrt implementation

### Tertiary (LOW confidence - marked for validation)

**Community Resources:**
- [DeFi Patterns: ERC20 Transfers - Mixbytes](https://mixbytes.io/blog/defi-patterns-erc20-token-transfers-howto) - Token interaction patterns
- [Foundry Unit Tests - RareSkills](https://rareskills.io/post/foundry-testing-solidity) - Testing methodology
- [Gas Optimization Guide - Alchemy](https://www.alchemy.com/overviews/solidity-gas-optimization) - Gas saving techniques

## Metadata

**Confidence breakdown:**
- **Standard stack: HIGH** - OpenZeppelin v5.5.0 verified installed, Foundry confirmed from Phase 1, Solidity 0.8.28 in foundry.toml
- **Architecture patterns: HIGH** - Uniswap V2 source code directly reviewed, official documentation cross-referenced, OpenZeppelin v5 examples verified
- **Security pitfalls: HIGH** - Official Solidity docs on CEI/reentrancy, multiple verified exploit examples, OpenZeppelin security patterns
- **Compiler settings: MEDIUM-HIGH** - Foundry documentation verified, Uniswap V2 optimizer runs confirmed, CREATE2 bytecode requirements documented
- **Testing strategy: MEDIUM** - Foundry testing docs verified, AMM-specific testing patterns from community sources (needs Phase 3 validation)

**Research date:** 2026-02-16

**Valid until:** March 2026 (30 days) — Core AMM patterns are stable, but monitor for:
- OpenZeppelin security advisories
- Foundry updates affecting CREATE2 or compiler integration
- Solidity 0.8.x releases with breaking changes
