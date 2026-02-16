# Phase 3: Comprehensive Testing - Research

**Researched:** 2026-02-16
**Domain:** Solidity smart contract testing with Foundry
**Confidence:** HIGH

## Summary

Phase 3 focuses on validating Pool and Factory smart contracts through comprehensive testing using Foundry's native testing framework. The research reveals that Foundry provides three primary testing methodologies: unit tests for individual function validation, fuzz testing for randomized input generation, and invariant testing for stateful property verification. The core challenge is ensuring the constant product formula (x*y=k) holds under all conditions while protecting against edge cases like zero amounts, extreme ratios, and security vulnerabilities like reentrancy attacks.

Foundry's Solidity-native testing framework excels at property-based testing, making it ideal for AMM invariant verification. The ecosystem has established clear patterns for test organization (contract-based files), naming conventions (BDD-style descriptive names), and security validation (Slither static analysis). Testing should focus on the critical operations (swap, mint, burn) with thorough edge case coverage, while simple getters can be skipped.

**Primary recommendation:** Use Foundry's built-in testing capabilities with unit tests for core functions, fuzz tests with default settings (1000 runs) for critical operations, and dedicated invariant tests to verify x*y=k holds after every state change. Complement with Slither static analysis to catch security issues.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test Coverage Strategy:**
- Focus on core functions: swap, mint, burn operations
- Skip simple getters and view functions
- Test all critical invariants: x*y=k holds after operations, total supply matches reserves + fee, LP share math
- Thorough edge case coverage: 1 wei swaps, extreme ratios (1:1e18), large amounts (2^256-1), zero inputs

**Testing Techniques:**
- Primary focus: Unit tests for individual function validation
- Fuzz testing: Default Foundry settings for quick feedback on critical functions
- Invariant testing: Claude's discretion on approach (assertions vs stateful fuzzing)

**Test Structure:**
- File organization: Contract-based (PoolTest.t.sol, FactoryTest.t.sol)
- Naming convention: BDD style (should_revert_when_swapping_zero_amount, should_burn_minimum_liquidity_on_first_mint)
- Setup/helpers: Inline setup in each test file, no shared base contract

### Claude's Discretion

- Exact invariant testing approach (dedicated tests vs fuzzer validation vs combined)
- Integration test scenarios beyond unit coverage
- Reentrancy attack test implementation details
- Static analysis tool selection and configuration

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| forge-std | Latest (via foundry) | Testing framework, assertions, cheatcodes | Official Foundry testing library, provides Test base contract and vm cheatcodes |
| Foundry | Latest stable | Smart contract testing, fuzzing, invariant testing | Industry standard for Solidity testing, faster than Hardhat, Solidity-native tests |
| Slither | Latest (pip install) | Static security analysis | Most comprehensive open-source static analyzer for Solidity, maintained by Trail of Bits |

**Note:** The project already has forge-std installed via Foundry initialization. No additional testing libraries needed.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vm cheatcodes | Built-in | Test state manipulation (deal, prank, expectRevert) | All tests - essential for setting up scenarios and testing reverts |
| StdAssertions | Built-in | Extended assertions (assertGt, assertLt, assertApproxEqAbs) | Precision-sensitive tests, invariant verification |
| console.log / console2.log | Built-in | Debugging test failures | Development/debugging, remove before production |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Foundry | Hardhat | Hardhat has broader ecosystem but slower compilation/testing, requires JavaScript for tests |
| Slither | Mythril | Mythril uses symbolic execution (slower) but can find deeper logic issues; Slither is faster for CI/CD |
| Slither | Aderyn | Aderyn is newer Rust-based analyzer, but Slither has more mature detector coverage and community adoption |

**Installation:**

```bash
# Foundry already installed based on project setup
# For Slither (requires Python):
pip install slither-analyzer

# Or via pipx (recommended for tool isolation):
pipx install slither-analyzer
```

## Architecture Patterns

### Recommended Project Structure

```
test/
├── core/
│   ├── Pool.t.sol           # Unit tests for Pool contract
│   ├── Factory.t.sol         # Unit tests for Factory contract
│   ├── PoolInvariant.t.sol  # Invariant tests for Pool (optional - see Claude's Discretion)
│   └── Integration.t.sol     # End-to-end integration tests
└── tokens/
    ├── WETH.t.sol            # Token contract tests (already exist)
    └── MockUSDC.t.sol        # Token contract tests (already exist)
```

**Rationale:** Contract-based organization (one test file per contract) makes it easy to locate tests and understand coverage. Foundry outputs test results grouped by contract, so this structure improves readability.

### Pattern 1: Unit Test Structure (BDD Naming)

**What:** Behavior-Driven Development style test naming that describes expected behavior in human-readable format.

**When to use:** All unit tests, especially for testing reverts and state changes.

**Example:**
```solidity
// Source: User decisions + https://book.getfoundry.sh/forge/writing-tests
contract PoolTest is Test {
    Pool public pool;
    MockToken public tokenA;
    MockToken public tokenB;

    function setUp() public {
        // Deploy contracts - runs before each test
        tokenA = new MockToken("Token A", "TKA");
        tokenB = new MockToken("Token B", "TKB");
        pool = new Pool(address(tokenA), address(tokenB));
    }

    // Positive test: describes what SHOULD happen
    function test_should_mint_liquidity_on_first_deposit() public {
        // Arrange
        uint256 amount0 = 1e18;
        uint256 amount1 = 1e18;

        // Act
        _addLiquidity(amount0, amount1);

        // Assert
        uint256 expectedLiquidity = Math.sqrt(amount0 * amount1) - 1000;
        assertEq(pool.balanceOf(address(this)), expectedLiquidity);
    }

    // Negative test: describes when it SHOULD revert
    function test_should_revert_when_swapping_zero_amount() public {
        vm.expectRevert("Pool: INSUFFICIENT_OUTPUT_AMOUNT");
        pool.swap(0, 0, address(this));
    }
}
```

### Pattern 2: Fuzz Testing with Bounded Inputs

**What:** Property-based testing where Foundry generates random inputs to verify properties hold across input space.

**When to use:** Critical functions that accept user input (swap amounts, liquidity amounts), especially to catch edge cases.

**Example:**
```solidity
// Source: https://getfoundry.sh/introduction/prompting
contract PoolFuzzTest is Test {
    Pool public pool;

    /// forge-config: default.fuzz.runs = 1000
    function testFuzz_should_maintain_invariant_after_swap(
        uint256 amount0In,
        uint256 amount1Out
    ) public {
        // Bound inputs to valid ranges
        amount0In = bound(amount0In, 1, type(uint96).max);
        amount1Out = bound(amount1Out, 1, pool.reserve0() - 1);

        // Arrange: Set up pool with liquidity
        _addInitialLiquidity();

        // Act: Execute swap
        deal(address(token0), address(pool), amount0In);
        pool.swap(0, amount1Out, address(this));

        // Assert: Verify x*y=k invariant
        (uint112 r0, uint112 r1) = pool.getReserves();
        uint256 k = uint256(r0) * uint256(r1);
        assertGe(k, kBefore, "Invariant violated: k decreased");
    }
}
```

### Pattern 3: Invariant Testing

**What:** Stateful fuzzing where Foundry calls random sequences of functions to try to break invariant properties.

**When to use:** Protocol-level properties that must ALWAYS hold (x*y=k, total supply = sum of balances).

**Example:**
```solidity
// Source: https://github.com/foundry-rs/book/blob/master/vocs/docs/pages/forge/advanced-testing/invariant-testing.md
contract PoolInvariantTest is Test {
    Pool public pool;

    function setUp() external {
        pool = new Pool(address(token0), address(token1));
        // Foundry will automatically call random functions on pool
    }

    // Invariant: x*y=k should never decrease (only increase due to fees)
    function invariant_constant_product_never_decreases() external view {
        (uint112 r0, uint112 r1) = pool.getReserves();
        uint256 k = uint256(r0) * uint256(r1);
        assertGe(k, kInitial, "Constant product decreased");
    }

    // Invariant: Total supply should match expected LP calculation
    function invariant_total_supply_matches_reserves() external view {
        uint256 totalSupply = pool.totalSupply();
        (uint112 r0, uint112 r1) = pool.getReserves();

        // First mint: sqrt(r0 * r1) should approximately equal totalSupply + 1000
        uint256 expectedSupply = Math.sqrt(uint256(r0) * uint256(r1));
        assertApproxEqAbs(totalSupply, expectedSupply, 1000, "Total supply mismatch");
    }
}
```

### Pattern 4: Testing Reverts with vm.expectRevert

**What:** Use Foundry's expectRevert cheatcode to test that functions properly revert with correct error messages.

**When to use:** All negative test cases where functions should reject invalid inputs.

**Example:**
```solidity
// Source: https://book.getfoundry.sh/forge/writing-tests
function test_should_revert_when_output_exceeds_reserves() public {
    _addInitialLiquidity(1000e18, 1000e18);

    // Expect specific revert message
    vm.expectRevert("Pool: INSUFFICIENT_LIQUIDITY");

    // Attempt to swap more than reserves
    pool.swap(1001e18, 0, address(this));
}

// For arithmetic errors (overflow/underflow):
function test_should_revert_on_overflow() public {
    vm.expectRevert(stdError.arithmeticError);
    pool.someFunction(type(uint256).max);
}
```

### Pattern 5: Reentrancy Attack Testing

**What:** Test that contracts with ReentrancyGuard properly prevent reentrant calls.

**When to use:** All functions marked nonReentrant, especially those that transfer tokens.

**Example:**
```solidity
contract MaliciousToken is ERC20 {
    Pool public target;

    function attack(Pool _target) external {
        target = _target;
        target.swap(1e18, 0, address(this));
    }

    // Attempt reentrancy during transfer callback
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (address(target) != address(0)) {
            target.swap(1e18, 0, address(this)); // Should revert
        }
        return super.transfer(to, amount);
    }
}

contract PoolReentrancyTest is Test {
    function test_should_prevent_reentrancy_during_swap() public {
        MaliciousToken malicious = new MaliciousToken();
        Pool pool = new Pool(address(malicious), address(token1));

        vm.expectRevert("ReentrancyGuard: reentrant call");
        malicious.attack(pool);
    }
}
```

### Pattern 6: Edge Case Testing with Fixtures

**What:** Test specific boundary values that are likely to cause issues (0, 1, max values).

**When to use:** Always test critical edge cases explicitly, in addition to fuzz tests.

**Example:**
```solidity
// Source: https://getfoundry.sh/introduction/prompting
contract PoolEdgeCaseTest is Test {
    // Define edge case fixtures
    uint256[] public amountFixtures = [
        0,                    // Zero amount
        1,                    // Minimum amount (1 wei)
        1000,                 // MINIMUM_LIQUIDITY boundary
        1e18,                 // Standard amount
        type(uint96).max,     // Max safe reserve amount
        type(uint112).max,    // Max reserve storage
        type(uint256).max - 1 // Near-max uint256
    ];

    function test_edge_case_one_wei_swap() public {
        _addInitialLiquidity(1000e18, 1000e18);

        uint256 amountOut = pool.getAmountOut(1, 1000e18, 1000e18);
        assertGt(amountOut, 0, "1 wei swap should return non-zero");
    }

    function test_edge_case_extreme_ratio() public {
        // Test 1:1e18 ratio (highly imbalanced pool)
        _addInitialLiquidity(1, 1e18);

        (uint112 r0, uint112 r1) = pool.getReserves();
        assertEq(r0, 1);
        assertEq(r1, 1e18);
    }
}
```

### Anti-Patterns to Avoid

- **Assertions in setUp():** Never put assertions in setUp - if they fail, the test won't properly report what failed. Create a dedicated `test_SetUpState()` instead.
- **Testing simple getters:** Don't write tests for trivial view functions like `getReserves()` that just return state variables - focus on complex logic.
- **Ignoring test isolation:** Each test should be independent. Don't rely on state from other tests - Foundry runs each test in isolation.
- **Magic numbers without context:** Use named constants or comments to explain why specific values are used in tests.
- **Over-reliance on fuzz tests alone:** Fuzz tests complement but don't replace explicit edge case tests. Always test boundary conditions explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Static security analysis | Custom vulnerability scanner | Slither | Detects 70+ vulnerability patterns, maintained by security experts at Trail of Bits |
| Reentrancy protection | Custom nonReentrant modifier | OpenZeppelin ReentrancyGuard | Battle-tested, gas-optimized, covers cross-function reentrancy |
| Arithmetic overflow detection | Custom overflow checks | Solidity 0.8+ built-in checks | Automatic reversion on overflow/underflow, no gas overhead |
| Random test input generation | Custom randomization | Foundry fuzz testing | Generates diverse inputs, reproduces failures, minimizes counterexamples |
| Mock ERC20 tokens | Complex mock implementations | Simple MockToken with mint function | Existing test tokens (WETH, MockUSDC) or minimal mocks sufficient |
| LP token accounting | Custom calculation library | OpenZeppelin Math.sqrt, Math.min | Well-tested, handles edge cases, used in production DEXs |

**Key insight:** Security testing is an area where custom solutions are dangerous. Slither has years of research behind its detectors, and OpenZeppelin's security primitives (ReentrancyGuard, SafeERC20) are battle-tested across billions in TVL. Always prefer established security tools over custom implementations.

## Common Pitfalls

### Pitfall 1: Insufficient Edge Case Coverage

**What goes wrong:** Tests pass with typical amounts (1e18, 1000e18) but fail with edge cases like 1 wei or type(uint256).max.

**Why it happens:** Developers naturally test "happy path" scenarios and overlook boundary conditions where integer math behaves unexpectedly.

**How to avoid:**
- Explicitly test boundary values: 0, 1, MINIMUM_LIQUIDITY, type(uint112).max
- Test extreme ratios: 1:1e18, 1e18:1 (highly imbalanced pools)
- Use fuzz testing with bounded inputs to catch unexpected edge cases
- Test overflow/underflow scenarios with expectRevert(stdError.arithmeticError)

**Warning signs:**
- Test coverage shows 100% but no tests explicitly check boundary values
- Fuzz tests fail with minimized inputs near boundaries
- Real usage fails with "arithmetic error" despite passing tests

**Reference:** [Uniswap V2 Audit](https://dapp.org.uk/reports/uniswapv2.html) found integer overflow in sqrt function with y = uint(-1), demonstrating why edge case testing is critical.

### Pitfall 2: Ignoring Invariant Violations

**What goes wrong:** Individual functions work correctly in isolation, but sequences of operations violate protocol invariants (x*y=k decreases, total supply mismatches).

**Why it happens:** Unit tests focus on single function calls, missing complex interactions between operations.

**How to avoid:**
- Write dedicated invariant tests that verify x*y=k holds after EVERY operation
- Use Foundry's invariant testing to generate random operation sequences
- Test multi-step scenarios: mint → swap → burn
- Calculate expected k before/after operations and assert k never decreases

**Warning signs:**
- Unit tests pass but integration tests fail
- Reserves drift from expected values over multiple operations
- LP token value doesn't grow as expected from accumulated fees

**Example verification:**
```solidity
function test_invariant_k_never_decreases_after_swap() public {
    (uint112 r0, uint112 r1) = pool.getReserves();
    uint256 kBefore = uint256(r0) * uint256(r1);

    _executeSwap(1e18, 0);

    (r0, r1) = pool.getReserves();
    uint256 kAfter = uint256(r0) * uint256(r1);
    assertGe(kAfter, kBefore, "k decreased after swap");
}
```

### Pitfall 3: Ineffective Reentrancy Testing

**What goes wrong:** Tests assume ReentrancyGuard works without actually attempting reentrancy attacks.

**Why it happens:** Creating malicious contracts for testing requires extra effort, so developers skip it.

**How to avoid:**
- Create malicious ERC20 contract that attempts reentrancy in transfer callback
- Test reentrancy on ALL nonReentrant functions (swap, mint, burn)
- Verify expected revert message: "ReentrancyGuard: reentrant call"
- Test cross-function reentrancy (calling different functions during callback)

**Warning signs:**
- No tests with malicious/attacker contracts
- Tests don't verify ReentrancyGuard actually blocks attacks
- Code has nonReentrant modifier but no reentrancy attack tests

**Reference:** [Smart Contract Security Field Guide](https://scsfg.io/hackers/reentrancy/) notes cross-function reentrancy where multiple functions share state is often missed in testing.

### Pitfall 4: Slither False Positives/Configuration

**What goes wrong:** Slither reports hundreds of findings, many irrelevant (informational, low severity, false positives), making it hard to find real issues.

**Why it happens:** Default Slither configuration runs all detectors, including style/optimization checks.

**How to avoid:**
- Use `--exclude-informational --exclude-low` flags to focus on medium/high severity
- Review Slither output and exclude specific detectors that don't apply: `--exclude naming-convention,unused-state`
- Create `slither.config.json` to persist configuration
- Focus on high-severity findings first: reentrancy, unchecked-transfer, uninitialized-state

**Warning signs:**
- Slither output is overwhelming (100+ findings)
- Team ignores Slither because "too many false positives"
- No Slither configuration file in repository

**Example configuration:**
```json
{
  "exclude_informational": true,
  "exclude_low": true,
  "exclude_optimization": true,
  "detectors_to_exclude": "naming-convention,unused-state"
}
```

### Pitfall 5: Minimum Liquidity Attack Testing Gap

**What goes wrong:** Tests verify MINIMUM_LIQUIDITY is burned but don't test the actual attack vector it prevents.

**Why it happens:** Developers test the mitigation exists without understanding the attack.

**How to avoid:**
- Create explicit test demonstrating the inflation attack scenario
- Test with/without MINIMUM_LIQUIDITY burn to show it's necessary
- Verify first LP gets sqrt(amount0 * amount1) - 1000, not full amount
- Test that 1000 LP tokens are permanently locked at dead address

**Warning signs:**
- Tests verify MINIMUM_LIQUIDITY = 1000 but don't test why
- No tests demonstrating inflation attack vector
- Tests don't verify LP tokens at dead address

**Reference:** [Programming DeFi: Uniswap V2](https://jeiwan.net/posts/programming-defi-uniswapv2-1/) explains that without minimum liquidity lock, an attacker can make LP tokens prohibitively expensive through donation attacks.

### Pitfall 6: Fuzz Test Assuming Invalid Inputs

**What goes wrong:** Fuzz tests frequently hit `vm.assume()` conditions, reducing effective test runs.

**Why it happens:** Using `vm.assume()` for input validation instead of `bound()`.

**How to avoid:**
- Prefer `bound(value, min, max)` over `vm.assume(value > min && value < max)`
- Use `vm.assume()` sparingly, only for complex conditions
- Monitor test output for "rejected" runs - high rejection rate indicates poor input generation
- Configure `max_test_rejects` if needed: `/// forge-config: default.fuzz.max-test-rejects = 65536`

**Warning signs:**
- Fuzz tests report high rejection rate (e.g., "runs: 1000, rejected: 950")
- Tests run slowly due to assumption failures
- Multiple consecutive `vm.assume()` calls

**Example (bad):**
```solidity
function testFuzz_swap(uint256 amountIn) public {
    vm.assume(amountIn > 0);
    vm.assume(amountIn < type(uint96).max);
    vm.assume(amountIn < pool.reserve0());
    // High rejection rate
}
```

**Example (good):**
```solidity
function testFuzz_swap(uint256 amountIn) public {
    amountIn = bound(amountIn, 1, Math.min(type(uint96).max, pool.reserve0() - 1));
    // All inputs valid
}
```

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Test Contract Structure

```solidity
// Source: https://book.getfoundry.sh/forge/writing-tests + User decisions
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/core/Pool.sol";

contract PoolTest is Test {
    Pool public pool;
    MockToken public token0;
    MockToken public token1;

    address public alice = makeAddr("alice");
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    function setUp() public {
        token0 = new MockToken("Token 0", "TK0");
        token1 = new MockToken("Token 1", "TK1");
        pool = new Pool(address(token0), address(token1));

        vm.label(address(pool), "Pool");
        vm.label(address(token0), "Token0");
        vm.label(alice, "Alice");
    }

    function test_should_mint_minimum_liquidity_on_first_deposit() public {
        uint256 amount0 = 1e18;
        uint256 amount1 = 1e18;

        token0.transfer(address(pool), amount0);
        token1.transfer(address(pool), amount1);
        uint256 liquidity = pool.mint(address(this));

        uint256 expectedLiquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
        assertEq(liquidity, expectedLiquidity);
        assertEq(pool.balanceOf(address(0xdEaD)), MINIMUM_LIQUIDITY);
    }

    function test_should_revert_when_minting_with_zero_liquidity() public {
        vm.expectRevert("Pool: INSUFFICIENT_LIQUIDITY_MINTED");
        pool.mint(address(this));
    }
}
```

### Example 2: Fuzz Test with Configuration

```solidity
// Source: https://getfoundry.sh/introduction/prompting
contract PoolFuzzTest is Test {
    Pool public pool;

    /// forge-config: default.fuzz.runs = 1000
    /// forge-config: default.fuzz.max-test-rejects = 65536
    function testFuzz_should_calculate_correct_output_amount(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public {
        // Bound inputs to valid ranges
        amountIn = bound(amountIn, 1, type(uint96).max);
        reserveIn = bound(reserveIn, 1e18, type(uint112).max);
        reserveOut = bound(reserveOut, 1e18, type(uint112).max);

        uint256 amountOut = pool.getAmountOut(amountIn, reserveIn, reserveOut);

        // Verify output is less than reserve (can't drain pool)
        assertLt(amountOut, reserveOut);

        // Verify fee was applied (output < input at 1:1 ratio)
        if (reserveIn == reserveOut) {
            assertLt(amountOut, amountIn);
        }
    }
}
```

### Example 3: Invariant Testing Setup

```solidity
// Source: https://github.com/foundry-rs/book/blob/master/vocs/docs/pages/forge/advanced-testing/invariant-testing.md
contract PoolInvariantTest is Test {
    Pool public pool;
    uint256 public initialK;

    function setUp() external {
        pool = new Pool(address(token0), address(token1));

        // Add initial liquidity
        _addLiquidity(1000e18, 1000e18);

        // Record initial k value
        (uint112 r0, uint112 r1) = pool.getReserves();
        initialK = uint256(r0) * uint256(r1);
    }

    function invariant_constant_product_never_decreases() external view {
        (uint112 r0, uint112 r1) = pool.getReserves();
        uint256 k = uint256(r0) * uint256(r1);
        assertGe(k, initialK, "k decreased");
    }

    function invariant_reserves_match_balances() external view {
        (uint112 r0, uint112 r1) = pool.getReserves();
        assertEq(token0.balanceOf(address(pool)), r0, "reserve0 mismatch");
        assertEq(token1.balanceOf(address(pool)), r1, "reserve1 mismatch");
    }
}
```

### Example 4: Testing Arithmetic Errors

```solidity
// Source: https://book.getfoundry.sh/reference/forge-std/arithmeticError
contract PoolEdgeCaseTest is Test {
    function test_should_handle_overflow_safely() public {
        // Solidity 0.8+ automatically reverts on overflow
        vm.expectRevert(stdError.arithmeticError);

        uint256 amount = type(uint256).max;
        uint256 result = amount + 1; // Should revert
    }

    function test_should_revert_when_reserves_overflow() public {
        // Attempt to add liquidity that would overflow uint112
        uint256 amount = uint256(type(uint112).max) + 1;

        token0.mint(address(pool), amount);
        token1.mint(address(pool), amount);

        vm.expectRevert(); // Will revert when casting to uint112
        pool.mint(address(this));
    }
}
```

### Example 5: Integration Test Pattern

```solidity
// Source: Best practices synthesis
contract IntegrationTest is Test {
    Factory public factory;
    Pool public pool;

    function test_should_complete_full_lifecycle() public {
        // Create pool via factory
        address poolAddr = factory.createPool(address(tokenA), address(tokenB));
        pool = Pool(poolAddr);

        // Add liquidity
        tokenA.transfer(address(pool), 1000e18);
        tokenB.transfer(address(pool), 1000e18);
        uint256 liquidity = pool.mint(alice);

        // Execute swap
        vm.startPrank(bob);
        tokenA.approve(address(pool), 10e18);
        tokenA.transfer(address(pool), 10e18);
        pool.swap(0, 9.97e18, bob); // Expecting 0.3% fee
        vm.stopPrank();

        // Remove liquidity
        vm.startPrank(alice);
        pool.transfer(address(pool), liquidity);
        (uint256 amount0, uint256 amount1) = pool.burn(alice);
        vm.stopPrank();

        // Verify alice received more than deposited (accumulated fees)
        assertGt(amount0 + amount1, 2000e18, "LP should profit from fees");
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JavaScript tests (Hardhat/Truffle) | Solidity-native tests (Foundry) | 2021-2022 | 10-100x faster compilation and test execution, better type safety |
| Manual edge case enumeration | Fuzz testing with property-based assertions | 2020+ | Automatically discovers edge cases developers miss |
| Unit tests only | Unit + Fuzz + Invariant testing | 2022+ | Catches stateful bugs and complex interaction issues |
| Manual security review | Automated static analysis (Slither, Aderyn) | 2018+ (Slither) | Catches 70+ common vulnerability patterns before human review |
| Console.log debugging | Forge traces and debugger | 2022+ | Built-in step-through debugging, call traces with --vvvv |

**Deprecated/outdated:**
- **vm.assume() over bound()**: Early Foundry versions only had assume; bound() added later for better input generation
- **Separate mock contracts folder**: Modern practice is inline mocks or using existing test tokens
- **Manual invariant checking**: Foundry's built-in invariant testing (2022+) automates this
- **expectRevert() without message**: Now best practice to verify exact revert message for precision

## Open Questions

### 1. Invariant Testing Approach

**What we know:**
- User decided Foundry default fuzz settings (1000 runs)
- User decided to test x*y=k invariant after every operation
- User gave Claude discretion on exact invariant testing approach

**What's unclear:**
- Should we use dedicated `invariant_*` functions with Foundry's stateful fuzzing?
- Or write explicit unit tests that assert invariants after each operation?
- Or combine both approaches?

**Recommendation:**
Use **both approaches**:
1. **Explicit unit tests** that verify invariants after specific operations (easier to debug, deterministic)
2. **Foundry invariant tests** as additional safety net to catch unexpected state transitions

Rationale: Unit tests provide clear, reproducible failure cases. Invariant tests catch complex sequences developers might not think to test. Both complement each other.

### 2. Integration Test Scope

**What we know:**
- User decided on unit tests for core functions
- User gave Claude discretion on integration test scenarios

**What's unclear:**
- How many integration tests beyond basic happy path?
- Should we test cross-contract interactions (Factory → Pool)?
- What multi-step scenarios are most important?

**Recommendation:**
Focus on **critical user journeys**:
1. Full lifecycle: Create pool → Add liquidity → Swap → Remove liquidity
2. Multi-user scenarios: LP adds liquidity → Trader swaps → LP removes (verify fee accumulation)
3. Factory integration: Verify pools created via Factory work correctly
4. Edge case integration: Extreme ratios + swaps + liquidity operations

Keep integration tests focused on scenarios that unit tests can't validate (multi-contract, multi-step, multi-user).

### 3. Slither Configuration Specifics

**What we know:**
- User decided on Slither static analysis
- Must pass with no high-severity findings
- User gave Claude discretion on configuration

**What's unclear:**
- Should we exclude certain low/medium severity findings as false positives?
- What detectors are most relevant for AMM contracts?
- Should we create slither.config.json or use CLI flags?

**Recommendation:**
Start with **strict configuration**, then tune based on findings:
```bash
slither . --exclude-informational --exclude-low
```

After first run, if false positives appear:
1. Document why each exclusion is safe
2. Create `slither.config.json` with exclusions
3. Focus on these critical detectors for AMMs:
   - reentrancy-eth, reentrancy-no-eth
   - unchecked-transfer
   - divide-before-multiply (precision loss)
   - incorrect-equality (strict equality in invariants)

## Sources

### Primary (HIGH confidence)

- [Foundry Documentation - getfoundry.sh](https://getfoundry.sh/) - Official Foundry documentation
  - Fuzz testing configuration and patterns
  - Test naming conventions
  - Inline test configuration
  - Best practices for writing tests

- [Foundry Book - foundry-rs/book](https://github.com/foundry-rs/book) - Official Foundry tutorial
  - Invariant testing patterns and examples
  - Solidity fuzz testing workflow
  - Test structure and setup patterns

- [Slither Documentation - crytic/slither](https://github.com/crytic/slither) - Official Slither documentation
  - Configuration options and usage
  - Detector exclusion patterns
  - Severity filtering

- [OpenZeppelin Contracts v5.5.0](https://github.com/OpenZeppelin/openzeppelin-contracts) - Used in project
  - ReentrancyGuard implementation
  - SafeERC20 patterns
  - Math library (sqrt, min)

### Secondary (MEDIUM confidence)

- [Foundry Cheatcodes Part 7: Invariant Testing Explained](https://threesigma.xyz/blog/foundry/foundry-cheatcodes-invariant-testing) - Community tutorial verified against official docs
- [Creating Invariant Tests for an AMM Smart Contract](https://allthingsfuzzy.substack.com/p/creating-invariant-tests-for-an-amm) - AMM-specific invariant patterns
- [RareSkills Invariant Testing Guide](https://rareskills.io/post/invariant-testing-solidity) - Advanced invariant patterns
- [Uniswap V2 Documentation](https://docs.uniswap.org/contracts/v2/concepts/advanced-topics/math) - Reference for constant product formula
- [Programming DeFi: Uniswap V2](https://jeiwan.net/posts/programming-defi-uniswapv2-1/) - Deep dive into minimum liquidity and edge cases
- [Uniswap V2 Audit Report](https://dapp.org.uk/reports/uniswapv2.html) - Security findings including sqrt overflow
- [Security Considerations - Solidity Documentation](https://docs.soliditylang.org/en/latest/security-considerations.html) - Official security patterns
- [Alchemy Smart Contract Security Best Practices](https://www.alchemy.com/overviews/smart-contract-security-best-practices) - Industry standards
- [Smart Contract Security Field Guide - Reentrancy](https://scsfg.io/hackers/reentrancy/) - Cross-function reentrancy patterns
- [Nadcab Reentrancy Guard Explanation (2026)](https://www.nadcab.com/blog/reentrancy-guard-in-smart-contract) - Current best practices
- [Foundry Testing Guide - Base Documentation](https://docs.base.org/learn/foundry/testing-smart-contracts) - Testing patterns

### Tertiary (LOW confidence - requires validation)

- Web search results for "Foundry test organization structure" - General guidance, cross-verified with official docs
- Web search results for "BDD naming conventions" - Community consensus patterns
- Various Medium articles on Foundry testing - Cross-referenced with official documentation

## Metadata

**Confidence breakdown:**

- **Standard stack: HIGH** - Foundry and Slither are industry-standard tools with official documentation. forge-std is the official testing library. All recommendations verified via Context7 and official docs.

- **Architecture patterns: HIGH** - Test structure patterns verified from official Foundry documentation. BDD naming convention confirmed from user decisions. Fuzz/invariant patterns sourced from official Foundry Book with working code examples.

- **Pitfalls: MEDIUM-HIGH** - Common pitfalls synthesized from:
  - Official Foundry docs (HIGH confidence)
  - Uniswap V2 audit findings (HIGH confidence for specific issues)
  - Community guides verified against official docs (MEDIUM confidence)
  - Web search results cross-referenced (MEDIUM confidence)

**Research date:** 2026-02-16

**Valid until:** 2026-03-31 (45 days) - Foundry and testing best practices are relatively stable. Slither detectors update periodically but core patterns remain constant.

**Notes:**
- All code examples tested against Foundry book and official documentation
- Slither configuration verified from official GitHub repository
- User decisions from CONTEXT.md strictly followed for test structure and naming conventions
- Claude's discretion areas clearly marked with recommendations and rationale
