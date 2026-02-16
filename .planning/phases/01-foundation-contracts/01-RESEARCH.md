# Phase 1: Foundation Contracts - Research

**Researched:** 2026-02-16
**Domain:** ERC20 Test Tokens (WETH and USDC)
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational ERC20 test tokens needed for all subsequent DEX development. Two tokens are required: WETH (Wrapped Ether, 18 decimals) simulating Ethereum's canonical wrapped token with deposit/withdraw mechanisms, and USDC (6 decimals) representing realistic stablecoin behavior. These tokens serve as building blocks for pool creation, swap operations, and liquidity provision in later phases.

The implementation uses OpenZeppelin's battle-tested ERC20 base contracts (v5.x) with custom extensions for minting, faucet functionality, and WETH's ETH wrapping. Testing leverages Foundry's Solidity-native test framework (forge-std) with comprehensive coverage of transfers, approvals, minting, decimal handling, and edge cases.

**Primary recommendation:** Inherit from OpenZeppelin ERC20 for standard token behavior, add Ownable for mint access control, override decimals() for USDC's 6-decimal precision, and implement WETH's receive()/deposit()/withdraw() pattern following the canonical WETH9 architecture. Include unrestricted faucet functions for local development convenience.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token Identity:**
- Simulate real DeFi tokens: WETH and USDC
- WETH: 18 decimals (standard), named "Wrapped Ether" with symbol "WETH"
- USDC: 6 decimals (realistic, matching real USDC), named "USD Coin" with symbol "USDC"
- Light simulation: WETH includes real deposit/withdraw (wrapping ETH), USDC is standard ERC20 with 6 decimals

**Supply & Minting:**
- Owner-only mint function (deployer can mint new tokens, not open to everyone)
- Realistic initial supply at deployment: ~1,000 WETH + ~2,000,000 USDC
- All initial supply goes to deployer — they distribute as needed
- Faucet function included on both tokens — anyone can call, no cooldown (convenience for local testing)

**Token Pair Design:**
- WETH has real deposit/withdraw mechanism (send ETH → get WETH, burn WETH → get ETH back)
- Pool operates with WETH (ERC20) only — no auto-wrapping of raw ETH in the pool
- USDC is straightforward: standard ERC20 with 6 decimals, no blacklist/pause mechanisms
- Faucet has no cooldown or rate limiting — maximum convenience for local development

### Claude's Discretion

- Faucet drip amounts (how much per call)
- Exact contract structure and inheritance patterns
- Test helper utilities
- Event definitions beyond standard ERC20

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core Dependencies

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenZeppelin Contracts | ^5.x | Secure ERC20 base implementation, Ownable access control | Industry standard since 2016; audited by Trail of Bits, Consensys Diligence; 30,000+ GitHub stars; used by Uniswap, Aave, Compound |
| forge-std | ^1.14.0 | Foundry testing utilities (Test.sol, console.sol, assertions) | Official Foundry standard library; provides vm cheatcodes, event testing (expectEmit), and Solidity-native assertions |

### Supporting Tools

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Solhint | Latest | Solidity linter with security rules | Run on pre-commit; catches common mistakes (unused variables, uninitialized storage, reentrancy patterns) |
| forge fmt | (bundled) | Solidity code formatter | Consistent style; run before commits |
| forge coverage | (bundled) | Line and branch coverage reporting | Verify test completeness; aim for >95% on critical paths |

**Installation:**
```bash
# OpenZeppelin Contracts (Foundry)
forge install OpenZeppelin/openzeppelin-contracts

# Update foundry.toml with remappings
echo '@openzeppelin/=lib/openzeppelin-contracts/' >> remappings.txt

# Solhint (optional, for linting)
npm install -g solhint
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenZeppelin ERC20 | Hand-rolled ERC20 | OpenZeppelin provides battle-tested implementation with 8+ years of audits. Custom implementation increases audit surface and risks subtle bugs (precision loss, transfer hooks, approval race conditions). Only justified if adding novel functionality. |
| Ownable | AccessControl (role-based) | Ownable is simpler for single-owner scenarios. AccessControl adds complexity (MINTER_ROLE, DEFAULT_ADMIN_ROLE) unnecessary for test tokens. Use AccessControl only if multiple admins or delegated minting is required. |
| forge-std testing | JavaScript tests (Hardhat) | Solidity tests eliminate context-switching, run faster (no ABI encoding overhead), and enable property-based fuzzing in the same language. JavaScript tests better for complex deployment scripts or frontend integration tests. |

## Architecture Patterns

### Recommended Project Structure

```
contracts/
├── tokens/
│   ├── WETH.sol              # Wrapped Ether with deposit/withdraw
│   ├── MockUSDC.sol          # USD Coin with 6 decimals
│   └── interfaces/
│       └── IWETH.sol         # WETH interface for external integrations
test/
├── tokens/
│   ├── WETH.t.sol            # WETH deposit/withdraw/transfer tests
│   ├── MockUSDC.t.sol        # USDC transfer/approve/decimals tests
│   └── helpers/
│       └── TokenTestBase.sol # Shared test utilities (addresses, assertions)
```

**Structure rationale:**
- `contracts/tokens/` — Separates tokens from future pool/factory contracts; clear domain boundary
- `test/tokens/` — Mirrors contract structure; easy to locate tests for each contract
- `helpers/` — Shared test setup (user addresses, common assertions) reduces duplication
- `interfaces/` — IWETH interface enables future pool contracts to interact with WETH without importing full implementation

### Pattern 1: OpenZeppelin ERC20 Inheritance

**What:** Inherit from OpenZeppelin's ERC20 base contract and extend with custom functionality (mint, faucet, decimals override).

**When to use:** For all production-grade ERC20 tokens. OpenZeppelin handles transfer logic, balance tracking, approval mechanics, and edge cases (zero-address checks, overflow protection).

**Example:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("USD Coin", "USDC") Ownable(msg.sender) {
        // Mint 2,000,000 USDC to deployer (6 decimals)
        _mint(msg.sender, 2_000_000 * 10**6);
    }

    // Override decimals for 6-decimal precision (default is 18)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Owner-only mint for test setup
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Unrestricted faucet for local development
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

**Key points:**
- `Ownable(msg.sender)` — OpenZeppelin v5.x requires explicit initial owner in constructor
- `decimals() public pure override` — Override to return 6 instead of default 18
- `onlyOwner` modifier — Inherited from Ownable; restricts mint to deployer
- `faucet()` has no access control — anyone can call for testing convenience

### Pattern 2: WETH Deposit/Withdraw with receive()

**What:** Implement WETH following the canonical WETH9 pattern: `receive()` triggers deposit, explicit `withdraw()` burns WETH and returns ETH.

**When to use:** When creating WETH or wrapped native token. This is the standard pattern recognized by all DeFi protocols (Uniswap, SushiSwap, Aave).

**Example:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WETH is ERC20, Ownable {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20("Wrapped Ether", "WETH") Ownable(msg.sender) {
        // Mint 1,000 WETH to deployer (18 decimals, default)
        _mint(msg.sender, 1000 * 10**18);
    }

    // Receive ETH and mint equivalent WETH
    receive() external payable {
        deposit();
    }

    // Explicit deposit function (can also be called directly)
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    // Burn WETH and return ETH
    function withdraw(uint256 wad) external {
        require(balanceOf(msg.sender) >= wad, "Insufficient balance");
        _burn(msg.sender, wad);
        (bool success, ) = msg.sender.call{value: wad}("");
        require(success, "ETH transfer failed");
        emit Withdrawal(msg.sender, wad);
    }

    // Owner-only mint for test setup
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Unrestricted faucet for local development
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

**Key points:**
- `receive() external payable` — Modern Solidity (0.8+) uses `receive()` instead of unnamed fallback for plain ETH transfers
- `msg.sender.call{value: wad}("")` — Preferred over `.transfer()` (2300 gas limit) or `.send()` (ignores failure); see Pitfall 7 in project PITFALLS.md
- `Deposit` and `Withdrawal` events — Match canonical WETH9; indexers and frontends expect these
- Checks-Effects-Interactions — Balance checked, state updated (_burn), then external call (ETH transfer)

**Source:** [Canonical WETH9 Implementation](https://github.com/gnosis/canonical-weth/blob/master/contracts/WETH9.sol)

### Pattern 3: Faucet Function for Test Tokens

**What:** Public function allowing anyone to mint tokens for testing without restrictions.

**When to use:** Local development and testing only. NEVER deploy faucet functions to testnet/mainnet without rate limiting or authentication.

**Example:**
```solidity
// Unrestricted faucet (local development only)
function faucet(address to, uint256 amount) external {
    _mint(to, amount);
}

// Alternative: Fixed drip amount
function faucet() external {
    _mint(msg.sender, 100 * 10**decimals());
}

// For testnet: Rate-limited faucet (OUT OF SCOPE for Phase 1)
mapping(address => uint256) public lastFaucetTime;
function faucet() external {
    require(block.timestamp >= lastFaucetTime[msg.sender] + 1 days, "Cooldown active");
    lastFaucetTime[msg.sender] = block.timestamp;
    _mint(msg.sender, 100 * 10**decimals());
}
```

**Recommendation for Phase 1:**
- Use unrestricted faucet (no cooldown, no limits)
- Accept `address to` and `uint256 amount` parameters for flexibility
- Document clearly: "LOCAL DEVELOPMENT ONLY — DO NOT DEPLOY TO PUBLIC NETWORKS"

### Pattern 4: Foundry Test Structure (Test.sol + setUp)

**What:** Inherit from `forge-std/Test.sol`, use `setUp()` for initialization, organize tests by function.

**When to use:** All Foundry tests. This pattern provides vm cheatcodes, console logging, and assertion helpers.

**Example:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/tokens/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC public usdc;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this); // Test contract is owner
        user1 = address(0x1);
        user2 = address(0x2);

        usdc = new MockUSDC(); // Deploys with owner = address(this)

        // Label addresses for better trace output
        vm.label(owner, "Owner");
        vm.label(user1, "User1");
        vm.label(user2, "User2");
    }

    function testInitialSupply() public {
        // Owner receives 2,000,000 USDC (6 decimals)
        assertEq(usdc.balanceOf(owner), 2_000_000 * 10**6);
    }

    function testDecimals() public {
        assertEq(usdc.decimals(), 6);
    }

    function testTransfer() public {
        uint256 amount = 100 * 10**6; // 100 USDC

        // Owner transfers to user1
        usdc.transfer(user1, amount);

        assertEq(usdc.balanceOf(user1), amount);
        assertEq(usdc.balanceOf(owner), 2_000_000 * 10**6 - amount);
    }

    function testMintOnlyOwner() public {
        // Non-owner cannot mint
        vm.prank(user1);
        vm.expectRevert(); // Reverts with OwnableUnauthorizedAccount
        usdc.mint(user1, 1000 * 10**6);

        // Owner can mint
        usdc.mint(user2, 1000 * 10**6);
        assertEq(usdc.balanceOf(user2), 1000 * 10**6);
    }

    function testFaucetUnrestricted() public {
        // Anyone can call faucet
        vm.prank(user1);
        usdc.faucet(user1, 500 * 10**6);

        assertEq(usdc.balanceOf(user1), 500 * 10**6);
    }

    function testTransferEvent() public {
        uint256 amount = 100 * 10**6;

        // Expect Transfer event
        vm.expectEmit(true, true, false, true);
        emit IERC20.Transfer(owner, user1, amount);

        usdc.transfer(user1, amount);
    }
}
```

**Key testing utilities:**
- `vm.prank(address)` — Next call executed as if from specified address
- `vm.expectRevert()` — Expect next call to revert (optionally specify revert message)
- `vm.expectEmit(bool, bool, bool, bool)` — Expect event emission with indexed parameter matching
- `vm.label(address, string)` — Label addresses in stack traces for debugging
- `assertEq(a, b)` — Assert equality with gas-efficient comparison

**Source:** [Foundry Testing Documentation](https://getfoundry.sh/forge/reference/verify-bytecode)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ERC20 token standard | Custom token from scratch | OpenZeppelin ERC20 | 8+ years of audits; handles edge cases (zero-address transfers, approval race conditions, overflow checks); 30,000+ deployments without critical bugs |
| Owner access control | Custom `require(msg.sender == owner)` pattern | OpenZeppelin Ownable | Standardized ownership transfer, renouncement; emits events; prevents common mistakes (no owner initialization, no transfer function) |
| Safe ETH transfers | `address.transfer()` or `address.send()` | `call{value: amount}("")` with success check | `.transfer()` forwards only 2300 gas (breaks with smart contract wallets); `.send()` ignores failures; `call` is flexible and secure when checked |
| Decimal conversion utilities | Manual `10**decimals()` calculations everywhere | Helper functions or import from tested library | Reduces human error in production code; consolidates decimal logic for testing different precisions |

**Key insight:** Token standards (ERC20) and access patterns (Ownable) are well-established with thousands of production deployments. Custom implementations introduce unnecessary risk — security audits cost $50k-200k to catch what OpenZeppelin already solved in 2017.

## Common Pitfalls

### Pitfall 1: Forgetting to Override decimals() for Non-18 Tokens

**What goes wrong:**
USDC deployed with default 18 decimals instead of 6. Initial supply minted as `2_000_000 * 10**18` instead of `2_000_000 * 10**6`, creating 1 trillion trillion USDC instead of 2 million.

**Why it happens:**
OpenZeppelin ERC20 defaults `decimals()` to 18. Developers assume constructor parameter sets decimals, but decimals is a function, not storage.

**How to avoid:**
- Override `decimals()` function explicitly:
  ```solidity
  function decimals() public pure override returns (uint8) {
      return 6;
  }
  ```
- Use correct decimal multiplier in constructor:
  ```solidity
  _mint(msg.sender, 2_000_000 * 10**6); // NOT 10**18
  ```
- Add explicit test case:
  ```solidity
  function testDecimals() public {
      assertEq(usdc.decimals(), 6, "USDC must have 6 decimals");
  }
  ```

**Warning signs:**
- Initial supply calculation uses hardcoded `10**18` for all tokens
- No `decimals()` override in USDC contract
- Tests don't verify decimal count

**Phase to address:** Phase 1 (Foundation Contracts) — Must be correct from deployment.

**Source:** [Mastering Token Decimals in Solidity](https://bailsec.io/tpost/23ey4soeh1-handling-tokens-with-varying-decimal-in)

### Pitfall 2: Using transfer() Instead of call() for ETH in WETH

**What goes wrong:**
`withdraw()` function uses `msg.sender.transfer(wad)` which forwards only 2300 gas. Smart contract wallets with complex receive logic fail, preventing legitimate users from unwrapping WETH.

**Why it happens:**
`.transfer()` was considered "safe" in early Solidity because limited gas prevented reentrancy. Post-Istanbul hard fork (2019), gas costs changed, and multisig wallets became common.

**How to avoid:**
- Use `call{value: amount}("")` with explicit success check:
  ```solidity
  (bool success, ) = msg.sender.call{value: wad}("");
  require(success, "ETH transfer failed");
  ```
- Follow Checks-Effects-Interactions: burn WETH before sending ETH
- Test with contract recipients, not just EOAs

**Warning signs:**
- Code uses `address.transfer()` or `address.send()`
- No tests with smart contract recipients
- Following outdated (pre-2020) WETH examples

**Phase to address:** Phase 1 (Foundation Contracts) — WETH withdrawal is core functionality.

**Source:** See project PITFALLS.md (Anti-Pattern 7: Using transfer() Instead of call() for ETH)

### Pitfall 3: Ownable Constructor in OpenZeppelin v5.x

**What goes wrong:**
Contract deployed with Ownable but no initial owner set. All `onlyOwner` functions permanently inaccessible.

**Why it happens:**
OpenZeppelin v5.x changed Ownable constructor to require explicit `initialOwner` parameter. v4.x automatically set `msg.sender` as owner.

**How to avoid:**
- Pass initial owner to Ownable constructor:
  ```solidity
  contract WETH is ERC20, Ownable {
      constructor() ERC20("Wrapped Ether", "WETH") Ownable(msg.sender) {
          // msg.sender is now owner
      }
  }
  ```
- Verify owner set correctly in tests:
  ```solidity
  function testOwnerSet() public {
      assertEq(weth.owner(), address(this));
  }
  ```

**Warning signs:**
- Compilation error: "Constructor for Ownable not provided"
- Test failures on `onlyOwner` functions
- Using OpenZeppelin v5.x with v4.x patterns

**Phase to address:** Phase 1 (Foundation Contracts) — Detected at compile time if constructor incorrect.

**Source:** [OpenZeppelin Ownable Documentation](https://context7.com/openzeppelin/openzeppelin-contracts/llms.txt)

### Pitfall 4: Faucet Function in Production

**What goes wrong:**
Unrestricted faucet deployed to testnet/mainnet. Attacker mints unlimited tokens, dilutes supply, manipulates pools.

**Why it happens:**
Developer copies test token contracts to deployment scripts without removing faucet function.

**How to avoid:**
- Add compiler directive comments:
  ```solidity
  // WARNING: FAUCET FUNCTION — LOCAL DEVELOPMENT ONLY
  // Remove before deploying to testnet/mainnet
  function faucet(address to, uint256 amount) external {
      _mint(to, amount);
  }
  ```
- Separate contracts for local vs. testnet:
  - `MockUSDC.sol` (with faucet) for local
  - `TestnetUSDC.sol` (rate-limited faucet) for testnet
  - Production tokens have no faucet
- Use deployment guards:
  ```solidity
  constructor() {
      require(block.chainid == 31337, "Local only"); // Hardhat/Anvil
  }
  ```

**Warning signs:**
- Single contract file used for all environments
- No comments warning about faucet risk
- Deployment scripts don't check for faucet functions

**Phase to address:** Phase 1 (Foundation Contracts) — Document risk; proper guards added in deployment phase.

**Confidence:** MEDIUM — Best practices for testnet/mainnet deployment are out of scope for Phase 1, but documentation should warn developers.

### Pitfall 5: Missing receive() Function in WETH

**What goes wrong:**
Users send plain ETH to WETH contract expecting automatic wrapping. Transaction reverts because contract doesn't accept ETH.

**Why it happens:**
Developer implements `deposit()` function but forgets `receive()` to handle plain ETH transfers (e.g., from wallet "Send" button).

**How to avoid:**
- Always implement both `receive()` and explicit `deposit()`:
  ```solidity
  receive() external payable {
      deposit();
  }

  function deposit() public payable {
      _mint(msg.sender, msg.value);
      emit Deposit(msg.sender, msg.value);
  }
  ```
- Test plain ETH transfer:
  ```solidity
  function testReceiveETH() public {
      vm.deal(user1, 1 ether);
      vm.prank(user1);
      (bool success, ) = address(weth).call{value: 1 ether}("");
      assertTrue(success);
      assertEq(weth.balanceOf(user1), 1 ether);
  }
  ```

**Warning signs:**
- WETH has `deposit()` but no `receive()` function
- Tests only call `deposit()` directly, never send raw ETH
- Following old Solidity patterns (pre-0.6.0 fallback functions)

**Phase to address:** Phase 1 (Foundation Contracts) — WETH wrapping is core functionality.

**Source:** [Solidity receive and fallback functions](https://shishirsingh66g.medium.com/solidity-part-2-payable-fallback-and-receive-42c00cb75108)

### Pitfall 6: Precision Loss in Decimal Conversions (Future Risk)

**What goes wrong:**
Pool contracts (Phase 2+) calculate swap amounts assuming all tokens have 18 decimals. With 6-decimal USDC, precision loss causes rounding errors or transaction reverts.

**Why it happens:**
Developers hardcode `10**18` scaling factor, or don't normalize token amounts before arithmetic.

**How to avoid:**
- Always fetch decimals dynamically:
  ```solidity
  uint256 scaledAmount = amount * 10**token.decimals();
  ```
- Normalize to common precision in pool math:
  ```solidity
  // Scale both to 18 decimals for calculations
  uint256 amount0Scaled = amount0 * 10**(18 - token0.decimals());
  uint256 amount1Scaled = amount1 * 10**(18 - token1.decimals());
  ```
- Test with token pairs of different decimals

**Warning signs:**
- Pool math uses hardcoded `10**18` everywhere
- No tests with WETH/USDC pair (18/6 decimal mix)
- Converting between tokens without decimal normalization

**Phase to address:** Phase 2+ (Pool Contracts) — Token contracts in Phase 1 should correctly implement `decimals()`, but pool math handles precision.

**Confidence:** HIGH — This is a known issue documented in security audits and DeFi postmortems.

**Source:** [Pricing + Decimal Scaling](https://calnix.gitbook.io/eth-dev/yield-mentorship-2022/projects/5-collateralized-vault/pricing-+-decimal-scaling), [Audit Anomalies Archive](https://zuhaibmd.medium.com/audit-anomalies-archive-issue-1-7caf714fec8b)

## Code Examples

Verified patterns from official sources:

### Basic ERC20 with 6 Decimals (MockUSDC)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("USD Coin", "USDC") Ownable(msg.sender) {
        // Mint 2,000,000 USDC to deployer (6 decimals)
        _mint(msg.sender, 2_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

**Source:** [OpenZeppelin ERC20 Documentation](https://context7.com/openzeppelin/openzeppelin-contracts/llms.txt)

### WETH with Deposit/Withdraw

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WETH is ERC20, Ownable {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20("Wrapped Ether", "WETH") Ownable(msg.sender) {
        _mint(msg.sender, 1000 * 10**18);
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) external {
        require(balanceOf(msg.sender) >= wad, "Insufficient balance");
        _burn(msg.sender, wad);
        (bool success, ) = msg.sender.call{value: wad}("");
        require(success, "ETH transfer failed");
        emit Withdrawal(msg.sender, wad);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

**Source:** [Canonical WETH9 Implementation](https://github.com/gnosis/canonical-weth/blob/master/contracts/WETH9.sol)

### Foundry Test Example (WETH Deposit/Withdraw)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/tokens/WETH.sol";

contract WETHTest is Test {
    WETH public weth;
    address public user;

    function setUp() public {
        weth = new WETH();
        user = address(0x1);
        vm.label(user, "User");
        vm.deal(user, 10 ether); // Give user 10 ETH
    }

    function testDeposit() public {
        vm.prank(user);
        weth.deposit{value: 1 ether}();

        assertEq(weth.balanceOf(user), 1 ether);
        assertEq(address(user).balance, 9 ether);
    }

    function testReceiveETH() public {
        vm.prank(user);
        (bool success, ) = address(weth).call{value: 1 ether}("");

        assertTrue(success);
        assertEq(weth.balanceOf(user), 1 ether);
    }

    function testWithdraw() public {
        // Deposit first
        vm.prank(user);
        weth.deposit{value: 5 ether}();

        // Withdraw
        vm.prank(user);
        weth.withdraw(3 ether);

        assertEq(weth.balanceOf(user), 2 ether);
        assertEq(address(user).balance, 8 ether);
    }

    function testWithdrawInsufficientBalance() public {
        vm.prank(user);
        vm.expectRevert("Insufficient balance");
        weth.withdraw(1 ether);
    }

    function testDepositEvent() public {
        vm.expectEmit(true, false, false, true);
        emit WETH.Deposit(user, 1 ether);

        vm.prank(user);
        weth.deposit{value: 1 ether}();
    }
}
```

**Source:** [Foundry Testing Patterns](https://getfoundry.sh/forge/reference/verify-bytecode)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fallback() payable` for WETH | `receive() external payable` | Solidity 0.6.0 (2020) | `receive()` is more explicit and gas-efficient; separates plain ETH transfers from function calls with data |
| `address.transfer()` for ETH | `call{value: amount}("")` with success check | Post-Istanbul hard fork (2019) | `.transfer()` 2300 gas limit breaks smart contract wallets; `call` is flexible and forward-compatible |
| OpenZeppelin Ownable auto-owner | Ownable(initialOwner) constructor | OpenZeppelin v5.0 (2023) | Explicit owner prevents deployment mistakes; clearer security model |
| Manual `require(msg.sender == owner)` | OpenZeppelin Ownable + `onlyOwner` modifier | OpenZeppelin v2.0 (2018) | Standardized pattern; automatic ownership transfer and events; audited |
| ERC20 decimals as storage variable | `decimals()` as virtual function | ERC20 standard (2015) | Function allows compile-time override without storage cost; more flexible |

**Deprecated/outdated:**
- **Unnamed fallback function:** Solidity 0.6+ requires explicit `receive()` for plain ETH, `fallback()` for calls with data
- **OpenZeppelin Contracts v4.x Ownable:** v5.x requires `initialOwner` parameter; v4.x auto-set `msg.sender`
- **SafeMath library (OpenZeppelin v2-3):** Solidity 0.8+ has built-in overflow checks; SafeMath adds gas overhead

## Open Questions

### Question 1: Faucet Drip Amounts

**What we know:**
- WETH has 18 decimals (1 WETH = 1 ether = 10^18 wei)
- USDC has 6 decimals (1 USDC = 10^6 units)
- Faucet should be convenient for local testing

**What's unclear:**
- Ideal drip amount per faucet call (user-specified vs. fixed)
- Should faucet have a maximum cap per call to prevent accidental overflow?

**Recommendation:**
- Accept `amount` parameter for maximum flexibility:
  ```solidity
  function faucet(address to, uint256 amount) external {
      _mint(to, amount);
  }
  ```
- Document suggested amounts in tests/comments:
  - WETH: 10 ether (10 * 10^18) — Enough for multiple swaps
  - USDC: 10,000 USDC (10_000 * 10^6) — Realistic trading balance
- No maximum cap for local development (simplicity over safety)

**Confidence:** HIGH — Faucet flexibility is more valuable than enforcing limits in local environment.

### Question 2: Should WETH faucet() mint directly or wrap ETH?

**What we know:**
- WETH has `deposit()` to wrap real ETH
- WETH has owner-only `mint()` for test setup
- Faucet is for convenience during testing

**What's unclear:**
- Should `faucet()` call `_mint()` directly (simpler, no ETH required)?
- Or should `faucet()` require ETH and call `deposit()` (more realistic)?

**Recommendation:**
- Faucet should `_mint()` directly without requiring ETH:
  ```solidity
  function faucet(address to, uint256 amount) external {
      _mint(to, amount); // NOT deposit() — no ETH needed
  }
  ```
- Rationale: Faucet is for convenience. Requiring ETH defeats the purpose (users need to fund test accounts first).
- Real wrapping behavior tested via `deposit()` and `withdraw()` tests

**Confidence:** MEDIUM — Both approaches work; direct mint is more convenient, but some might prefer realism.

### Question 3: Event Definitions Beyond Standard ERC20

**What we know:**
- ERC20 emits `Transfer` and `Approval` events (standard)
- WETH should emit `Deposit` and `Withdrawal` (matches canonical WETH9)
- Faucet function could emit custom event for tracking

**What's unclear:**
- Should faucet emit custom `Faucet(address indexed to, uint256 amount)` event?
- Should mint emit separate event beyond standard `Transfer(address(0), to, amount)`?

**Recommendation:**
- WETH: Emit `Deposit` and `Withdrawal` events (matches WETH9 standard)
  ```solidity
  event Deposit(address indexed dst, uint256 wad);
  event Withdrawal(address indexed src, uint256 wad);
  ```
- Faucet: No custom event needed; `Transfer` event sufficient
- Rationale: Additional events add complexity without clear benefit in local testing

**Confidence:** HIGH — WETH events match canonical implementation; faucet events are optional nice-to-have.

## Sources

### Primary (HIGH confidence)

- [OpenZeppelin Contracts Documentation](https://context7.com/openzeppelin/openzeppelin-contracts/llms.txt) - ERC20 implementation, Ownable pattern, decimals override
- [OpenZeppelin ERC20 Guide](https://docs.openzeppelin.com/contracts/3.x/erc20) - Standard token patterns
- [Canonical WETH9 Implementation](https://github.com/gnosis/canonical-weth/blob/master/contracts/WETH9.sol) - Official WETH deposit/withdraw pattern
- [Foundry Documentation](https://getfoundry.sh/) - forge-std testing patterns, vm cheatcodes
- [Solidity Documentation - Contracts](https://docs.soliditylang.org/en/latest/contracts.html) - receive and fallback functions

### Secondary (MEDIUM confidence)

- [Writing ERC-20 Tests in Solidity with Foundry](https://soliditydeveloper.com/foundry) - Test structure patterns
- [TESTING ERC-20 TOKENS — Foundry](https://medium.com/@lbsmhmdakr17/testing-erc-20-tokens-foundry-ddc1b3ea6727) - setUp and assertion patterns
- [Mastering Token Decimals in Solidity](https://bailsec.io/tpost/23ey4soeh1-handling-tokens-with-varying-decimal-in) - 6 vs 18 decimals handling
- [Solidity — Part 2- Payable, Fallback, and Receive](https://shishirsingh66g.medium.com/solidity-part-2-payable-fallback-and-receive-42c00cb75108) - Modern payable patterns
- [Introduction to Building on DeFi with Ethereum and USDC](https://www.coinbase.com/blog/introduction-to-building-on-defi-with-ethereum-and-usdc-part-1) - USDC integration patterns
- [Base USDC Contract Address Integration Guide](https://www.7blocklabs.com/blog/base-usdc-contract-address-0x833589-integration-guide-for-developers) - USDC decimal handling
- [ERC20 Token Faucet Patterns](https://medium.com/buildbear/erc20-token-faucet-for-any-testnet-pre-mapped-and-custom-token-address-6ee6f3eda6e3) - Faucet implementation approaches

### Supporting Context (Project-Specific)

- SimpleDEX `.planning/research/STACK.md` - Foundry and OpenZeppelin versions
- SimpleDEX `.planning/research/ARCHITECTURE.md` - Project structure and patterns
- SimpleDEX `.planning/research/PITFALLS.md` - DeFi security pitfalls (reentrancy, precision loss, oracle manipulation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - OpenZeppelin and Foundry are industry-standard with official documentation
- Architecture: HIGH - ERC20 patterns well-established since 2015; WETH9 canonical since 2017
- Pitfalls: HIGH - Based on OpenZeppelin v5 migration guide, Solidity 0.8+ best practices, and real DeFi exploits

**Research date:** 2026-02-16
**Valid until:** ~90 days (stable domain; OpenZeppelin and Foundry have stable APIs)

**Key assumptions:**
- Solidity ^0.8.28 (stable, production-ready)
- OpenZeppelin Contracts v5.x (latest major version)
- Foundry (latest via foundryup)
- Local development only (no testnet/mainnet deployment in Phase 1)

**What might I have missed:**
- Gas optimization techniques (out of scope for learning project)
- Upgradeable proxy patterns (explicitly excluded per project decisions)
- EIP-2612 Permit (gasless approvals) — nice-to-have but adds complexity
- ERC20 extensions (Burnable, Pausable, Snapshot) — not needed for test tokens
- Multi-chain deployment considerations (Phase 1 is local-only)
