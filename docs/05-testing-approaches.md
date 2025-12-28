# Testing Smart Contracts: Two Approaches

This project demonstrates both Solidity and TypeScript testing with Hardhat v3.

## Overview

| Aspect | Solidity Tests | TypeScript Tests |
|--------|---------------|------------------|
| **Location** | `contracts/*.t.sol` | `test/*.test.ts` |
| **Framework** | Hardhat v3 native | Node.js test runner |
| **Language** | Solidity | TypeScript |
| **Run with** | `npx hardhat test solidity` | `npx hardhat test nodejs` |
| **Best for** | Unit tests, fuzzing | Integration, debugging |
| **Count** | 51 tests | 62 tests |

---

## Solidity Tests (Hardhat v3 Native)

### Structure
```solidity
// contracts/tokens/SimpleToken.t.sol
import "./SimpleToken.sol";

contract SimpleTokenTest {
    SimpleToken token;
    address user1;

    function setUp() public {
        user1 = address(0x1);
        token = new SimpleToken("Test", "TST", 1000 ether);
    }

    function test_HasCorrectName() public view {
        require(
            keccak256(bytes(token.name())) == keccak256(bytes("Test")),
            "Name should be 'Test'"
        );
    }

    function test_TransferFailsWithInsufficientBalance() public {
        // Try-catch for expected reverts
        try token.transfer(user1, token.balanceOf(address(this)) + 1) {
            revert("Should have failed");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("ERC20: insufficient balance")),
                "Wrong error"
            );
        }
    }
}
```

### Key Features
- `setUp()` - Runs before each test
- `test_*()` - Test function naming convention
- `require()` - Assertions
- `try/catch` - Testing reverts
- Fuzz testing with function parameters

### Fuzz Testing
```solidity
// Hardhat v3 runs this with 256 random inputs!
function test_TransferAnyAmount(uint256 amount) public {
    // Bound amount to valid range
    if (amount > token.balanceOf(address(this))) {
        amount = token.balanceOf(address(this));
    }
    if (amount == 0) amount = 1;

    uint256 balanceBefore = token.balanceOf(address(this));
    token.transfer(user1, amount);

    require(
        token.balanceOf(address(this)) == balanceBefore - amount,
        "Balance should decrease"
    );
}
```

### Running
```bash
npx hardhat test solidity              # Run all Solidity tests
npx hardhat test solidity --grep swap  # Filter by name
```

---

## TypeScript Tests (Node.js Native)

### Structure
```typescript
// test/SimpleToken.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("SimpleToken", async function () {
  const { viem } = await network.connect();
  const [owner, user1] = await viem.getWalletClients();

  it("Should have correct name", async function () {
    const token = await viem.deployContract("SimpleToken", [
      "Test", "TST", parseEther("1000")
    ]);

    assert.equal(await token.read.name(), "Test");
  });

  it("Should fail with insufficient balance", async function () {
    const token = await viem.deployContract("SimpleToken", [
      "Test", "TST", parseEther("1000")
    ]);

    // Get contract instance for user1 (who has no tokens)
    const tokenAsUser1 = await viem.getContractAt("SimpleToken", token.address, {
      client: { wallet: user1 },
    });

    try {
      await tokenAsUser1.write.transfer([owner.account.address, parseEther("100")]);
      assert.fail("Should have thrown");
    } catch (error: unknown) {
      assert.ok(
        (error as Error).message.includes("ERC20: insufficient balance"),
        "Should fail with insufficient balance"
      );
    }
  });
});
```

### Key Features
- `describe()` / `it()` - Test organization
- `assert` from `node:assert/strict` - Assertions
- `viem` library - Contract interactions
- `network.connect()` - Network access
- `.read.*` / `.write.*` - Contract calls

### Running
```bash
npx hardhat test nodejs              # Run all TypeScript tests
npx hardhat test nodejs --grep swap  # Filter by name
```

---

## Comparison: Same Test in Both Styles

### Checking Insufficient Balance

**Solidity:**
```solidity
function test_TransferFailsWithInsufficientBalance() public {
    token.transfer(user1, 1000 ether); // Give all to user1

    try token.transfer(user2, 1 ether) {
        revert("Should have failed");
    } catch Error(string memory reason) {
        require(
            keccak256(bytes(reason)) == keccak256(bytes("ERC20: insufficient balance")),
            "Wrong error"
        );
    }
}
```

**TypeScript:**
```typescript
it("Should fail with insufficient balance", async function () {
  const tokenAsUser1 = await viem.getContractAt("SimpleToken", token.address, {
    client: { wallet: user1 },
  });

  try {
    await tokenAsUser1.write.transfer([user2.account.address, parseEther("100")]);
    assert.fail("Should have thrown");
  } catch (error: unknown) {
    assert.ok(
      (error as Error).message.includes("ERC20: insufficient balance")
    );
  }
});
```

---

## When to Use Each

| Scenario | Recommended |
|----------|-------------|
| Quick unit tests | Solidity |
| Fuzz testing | Solidity |
| Testing reverts | Either (both work) |
| Complex async flows | TypeScript |
| Frontend integration prep | TypeScript |
| Learning/debugging | TypeScript (better errors) |
| Gas optimization | Solidity |

---

## Project Test Files

### Solidity Tests (51 tests)
```
contracts/
├── tokens/
│   ├── ERC20Base.t.sol     # 13 tests (including fuzz)
│   └── LPToken.t.sol       # 8 tests (including fuzz)
├── core/
│   └── LiquidityPool.t.sol # 15 tests (including fuzz)
├── Factory.t.sol           # 12 tests
└── Counter.t.sol           # 3 tests (example)
```

### TypeScript Tests (62 tests)
```
test/
├── ERC20Base.test.ts       # 15 tests
├── SimpleToken.test.ts     # 3 tests
├── LPToken.test.ts         # 12 tests
├── LiquidityPool.test.ts   # 18 tests
├── Factory.test.ts         # 12 tests
└── Counter.ts              # 2 tests (example)
```

---

## Running All Tests

```bash
# Run everything (113 tests)
npx hardhat test

# Output:
# 51 passing (solidity)
# 62 passing (nodejs)
```
