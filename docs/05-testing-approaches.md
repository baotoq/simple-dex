# Testing Smart Contracts: Two Approaches

This project includes both TypeScript and Solidity tests to help you learn different testing methodologies.

## Overview

| Aspect | TypeScript Tests | Solidity Tests (Foundry) |
|--------|-----------------|-------------------------|
| **Location** | `test/*.test.ts` | `test/solidity/*.t.sol` |
| **Framework** | Hardhat + Chai | Foundry (forge) |
| **Language** | TypeScript | Solidity |
| **Run with** | `npx hardhat test` | `forge test` |
| **Best for** | Integration, async ops | Unit tests, fuzzing |

---

## TypeScript Tests (Hardhat)

### Structure
```typescript
import { expect } from "chai";
import hre from "hardhat";

describe("SimpleToken", function () {
  async function deployFixture() {
    const token = await hre.viem.deployContract("SimpleToken", [...]);
    return { token };
  }

  it("Should have correct name", async function () {
    const { token } = await deployFixture();
    expect(await token.read.name()).to.equal("Test");
  });
});
```

### Key Features
- `describe()` / `it()` - Group and name tests
- `expect()` - Chai assertions
- `async/await` - Handle blockchain transactions
- `.read.` / `.write.` - viem syntax for contract calls

### Running
```bash
npx hardhat test                    # Run all tests
npx hardhat test test/Factory.test.ts  # Run specific file
npx hardhat test --grep "swap"      # Run tests matching pattern
```

---

## Solidity Tests (Foundry)

### Structure
```solidity
import "forge-std/Test.sol";

contract SimpleTokenTest is Test {
    SimpleToken token;

    function setUp() public {
        token = new SimpleToken("Test", "TST", 1000);
    }

    function test_HasCorrectName() public view {
        assertEq(token.name(), "Test");
    }
}
```

### Key Features

#### Basic Assertions
```solidity
assertEq(a, b);           // a == b
assertTrue(condition);     // condition is true
assertFalse(condition);    // condition is false
assertGt(a, b);           // a > b
assertLt(a, b);           // a < b
```

#### Cheatcodes (vm.*)
```solidity
// Impersonate an address
vm.prank(alice);
token.transfer(bob, 100);  // This call is from alice

// Expect a revert
vm.expectRevert("Insufficient balance");
token.transfer(bob, 1000000);

// Expect an event
vm.expectEmit(true, true, false, true);
emit Transfer(alice, bob, 100);
token.transfer(bob, 100);

// Create labeled address
address alice = makeAddr("alice");

// Set block timestamp
vm.warp(block.timestamp + 1 days);

// Set ETH balance
vm.deal(alice, 10 ether);
```

#### Fuzz Testing
```solidity
// Foundry runs this with many random inputs!
function testFuzz_Transfer(uint256 amount) public {
    // Bound to valid range
    amount = bound(amount, 0, token.balanceOf(owner));

    token.transfer(alice, amount);
    assertEq(token.balanceOf(alice), amount);
}
```

### Running (requires Foundry installation)
```bash
# Install Foundry first
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Run tests
forge test                    # Run all tests
forge test -vv                # Verbose output
forge test --match-test swap  # Run tests matching pattern
forge test --gas-report       # Show gas usage
```

---

## Comparison: Same Test in Both Styles

### TypeScript
```typescript
it("Should fail transfer with insufficient balance", async function () {
  const { token, alice, bob } = await deployFixture();

  const aliceToken = await hre.viem.getContractAt("SimpleToken", token.address, {
    client: { wallet: alice },
  });

  await expect(
    aliceToken.write.transfer([bob.account.address, parseUnits("100", 18)])
  ).to.be.rejectedWith("Insufficient balance");
});
```

### Solidity
```solidity
function test_TransferFailsWithInsufficientBalance() public {
    vm.prank(alice);  // Much simpler!
    vm.expectRevert("Insufficient balance");
    token.transfer(bob, 100 * 10 ** 18);
}
```

---

## Fuzz Testing Explained

Fuzz testing automatically generates random inputs to find edge cases.

### Example: Testing Swap Invariants
```solidity
function testFuzz_KNeverDecreases(uint256 swapAmount) public {
    // Setup: Add liquidity
    _addLiquidity(1000e18, 1000e18);

    // Bound: Keep swap in reasonable range
    swapAmount = bound(swapAmount, 1e18, 500e18);

    // Record K before
    (uint256 r0, uint256 r1) = pool.getReserves();
    uint256 kBefore = r0 * r1;

    // Action: Swap
    tokenA.approve(address(pool), swapAmount);
    pool.swap(address(tokenA), swapAmount, 0);

    // Assert: K should never decrease
    (r0, r1) = pool.getReserves();
    uint256 kAfter = r0 * r1;
    assertTrue(kAfter >= kBefore);
}
```

Foundry will run this with 256 random values for `swapAmount` by default!

---

## When to Use Each

| Scenario | Recommended |
|----------|-------------|
| Quick unit tests | Solidity |
| Testing reverts | Solidity (vm.expectRevert) |
| Testing events | Solidity (vm.expectEmit) |
| Fuzz testing | Solidity |
| Complex async flows | TypeScript |
| Frontend integration | TypeScript |
| Learning/debugging | TypeScript (better errors) |

---

## Project Test Files

### TypeScript Tests (56 tests)
```
test/
├── ERC20Base.test.ts       # Base ERC-20 functionality
├── SimpleToken.test.ts     # Constructor minting
├── LPToken.test.ts         # Pool-only mint/burn
├── LiquidityPool.test.ts   # AMM operations
└── Factory.test.ts         # Pool creation + integration
```

### Solidity Tests (with Foundry)
```
test/solidity/
├── SimpleToken.t.sol       # Includes fuzz tests!
├── LPToken.t.sol           # vm.prank for access control
├── LiquidityPool.t.sol     # AMM fuzz testing
└── Factory.t.sol           # Event testing
```

---

## Installing Foundry

To run the Solidity tests, install Foundry:

```bash
# macOS/Linux
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
forge --version
```

Then run:
```bash
forge test
```
