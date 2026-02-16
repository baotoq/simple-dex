# Pitfalls Research

**Domain:** AMM DEX (Automated Market Maker Decentralized Exchange)
**Researched:** 2026-02-16
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Reentrancy Attacks from Token Callbacks

**What goes wrong:**
Malicious tokens (especially ERC777) with transfer hooks can re-enter swap/liquidity functions before state updates complete, allowing attackers to drain pools by manipulating balances mid-transaction.

**Why it happens:**
Developers follow the "transfer tokens, then update state" pattern without considering that token transfers can execute arbitrary code. ERC777 tokens have pre-transfer and post-transfer hooks that enable callbacks.

**How to avoid:**
- Use the Checks-Effects-Interactions pattern religiously (update state BEFORE external calls)
- Add reentrancy guards (OpenZeppelin's ReentrancyGuard) on all swap/liquidity functions
- Consider whitelisting only standard ERC20 tokens without callbacks
- For universal token support, design accounting logic to be robust against mid-transfer callback execution

**Warning signs:**
- State changes occur after token transfers
- No reentrancy guards on external-facing functions
- Testing only with standard ERC20 tokens, not ERC777 or fee-on-transfer variants

**Phase to address:**
Phase 1 (Core Contracts) — Must be in initial design. The Uniswap V1 imBTC exploit ($300k stolen) demonstrates this cannot be retrofitted safely.

---

### Pitfall 2: Integer Overflow in Arithmetic Operations

**What goes wrong:**
Even in Solidity 0.8+, overflow can occur in specific scenarios: type conversions (uint256 to uint128), shift operations, and unchecked blocks. The Cetus AMM hack ($200M, May 2025) resulted from a flawed overflow check during liquidity manipulation.

**Why it happens:**
Developers assume Solidity 0.8's automatic overflow protection is comprehensive, but it doesn't apply to:
- Downcasting (uint256 → smaller types)
- Shift operations (<< and >>)
- Code inside `unchecked {}` blocks (used for gas optimization)
- Truncation in division operations

**How to avoid:**
- Explicitly validate boundaries when downcasting types
- Avoid `unchecked {}` blocks for user-supplied values or financial calculations
- Test with extreme values (type(uint256).max, 0, 1 wei)
- Use SafeCast library for type conversions
- For constant product formula (x*y=k), ensure intermediate calculations don't overflow

**Warning signs:**
- Type conversions without boundary checks
- `unchecked {}` blocks around user input processing
- Lack of fuzzing tests with extreme values
- Complex arithmetic without overflow analysis

**Phase to address:**
Phase 1 (Core Contracts) — Mathematical operations are fundamental. Testing edge cases should be in Phase 2 (Testing).

---

### Pitfall 3: "K" Invariant Violation with Special Tokens

**What goes wrong:**
Fee-on-transfer tokens, rebasing tokens, and deflationary tokens break the constant product formula (x*y=k) because actual received amounts differ from transfer amounts, causing transactions to revert with "UniswapV2: K" errors or worse, allowing value extraction.

**Why it happens:**
Pool assumes `transfer(amount)` results in exactly `amount` being received, but:
- **Fee-on-transfer tokens**: Recipient gets less than sent (e.g., SAFEMOON deducts 10%)
- **Rebasing tokens**: Balances change without transfers (e.g., AMPL)
- **Deflationary tokens**: Burn percentage on each transfer

**How to avoid:**
- Measure balance changes instead of trusting transfer amounts:
  ```solidity
  uint256 balanceBefore = token.balanceOf(address(this));
  token.transferFrom(msg.sender, address(this), amount);
  uint256 balanceAfter = token.balanceOf(address(this));
  uint256 actualReceived = balanceAfter - balanceBefore;
  ```
- Document explicitly which token types are supported
- For rebasing tokens, require token contracts to call `sync()` after rebase events
- Consider implementing SupportingFeeOnTransfer variants (like Uniswap V2 Router)

**Warning signs:**
- Direct use of transfer amount in calculations without balance verification
- No documentation about supported token types
- Testing only with standard ERC20 (USDC, DAI)
- No `sync()` function for reserve updates

**Phase to address:**
Phase 1 (Core Contracts) — Token handling is core functionality. Add comprehensive token testing in Phase 2.

---

### Pitfall 4: First Deposit Inflation Attack

**What goes wrong:**
Attacker deposits 1 wei as first liquidity provider, donates large amount to pool, causing subsequent depositors to receive 0 shares due to rounding. Attacker can then extract value from "free" deposits.

**Why it happens:**
Share calculation: `shares = (deposit * totalSupply) / totalReserves`

With 1 wei total supply and artificially inflated reserves (via donation), legitimate deposits round down to 0 shares.

**How to avoid:**
- Implement minimum liquidity burn (Uniswap V2 approach):
  ```solidity
  if (totalSupply == 0) {
      liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
      _mint(address(0), MINIMUM_LIQUIDITY); // permanently locked
  }
  ```
- Set MINIMUM_LIQUIDITY to 1000 (or higher)
- Ensure first mint is economically significant to make attack expensive
- Use virtual reserves (OpenZeppelin ERC4626 approach with virtual shares/assets)

**Warning signs:**
- No minimum liquidity requirement
- First depositor receives 100% of their calculated shares
- No protection against donation attacks
- Lack of testing for "first deposit edge case"

**Phase to address:**
Phase 1 (Core Contracts) — Must be in initial pool design. Recovery from this vulnerability requires pool redeployment.

---

### Pitfall 5: Price Oracle Manipulation via Flash Loans

**What goes wrong:**
Using pool reserves directly as price oracle allows attackers to manipulate prices within a single transaction using flash loans, enabling attacks on lending protocols, liquidations, or arbitrage systems that trust the pool price.

**Why it happens:**
Spot price from reserves (reserve1/reserve0) reflects only the current state and can be manipulated by large single-transaction trades. Flash loans make this attack accessible without requiring capital.

**How to avoid:**
- NEVER use spot price as oracle for external protocols
- Implement Time-Weighted Average Price (TWAP):
  ```solidity
  // Uniswap V2 approach
  uint32 blockTimestamp = uint32(block.timestamp % 2**32);
  uint256 timeElapsed = blockTimestamp - blockTimestampLast;
  if (timeElapsed > 0 && reserve0 != 0 && reserve1 != 0) {
      price0CumulativeLast += uint256(UQ112x112.encode(reserve1).uqdiv(reserve0)) * timeElapsed;
      price1CumulativeLast += uint256(UQ112x112.encode(reserve0).uqdiv(reserve1)) * timeElapsed;
  }
  ```
- For external integrations, use Chainlink, Pyth, or API3 oracles
- Document explicitly that pool reserves should not be used as price feeds
- Consider circuit breakers for abnormal price movements

**Warning signs:**
- Direct use of `reserve1/reserve0` for pricing in other contracts
- No TWAP implementation
- Documentation suggesting pool can be used as oracle
- Lack of external oracle integration guidance

**Phase to address:**
Phase 1 (Core Contracts) if TWAP is needed. Phase 3 (Advanced Features) if adding oracle integrations. Document the risk in Phase 2.

---

### Pitfall 6: Insufficient Slippage Protection and Deadline Enforcement

**What goes wrong:**
Transactions sit in mempool during volatility, execute at worse-than-expected prices, or get sandwiched by MEV bots. Without deadline checks, transactions can execute minutes/hours after submission at stale prices.

**Why it happens:**
Users set insufficient gas → transaction pending → price moves → execution at bad price. MEV bots see pending transaction and sandwich it (front-run with buy, let user trade, back-run with sell).

**How to avoid:**
- Require `minOutput` parameter on all swaps:
  ```solidity
  require(outputAmount >= minOutput, "INSUFFICIENT_OUTPUT");
  ```
- Require `deadline` parameter:
  ```solidity
  require(block.timestamp <= deadline, "EXPIRED");
  ```
- Set reasonable default: 20 minutes (Uniswap uses this)
- In UI, calculate slippage based on pool depth and trade size
- Default to 0.5% for stablecoin pairs, 1-3% for volatile pairs
- Educate users: low slippage = more reverts, high slippage = more MEV risk

**Warning signs:**
- Swap functions without minOutput parameter
- No deadline enforcement
- UI that doesn't calculate or explain slippage
- Missing transaction preview showing price impact
- No warnings for high slippage settings

**Phase to address:**
Phase 1 (Core Contracts) for smart contract parameters. Phase 4 (Frontend) for UI implementation and user education.

---

### Pitfall 7: Precision Loss and Rounding Errors in Division

**What goes wrong:**
Integer division in Solidity truncates (rounds down), causing cumulative precision loss in constant product calculations, especially with small amounts or imbalanced pools. Can leak value over time or prevent small trades.

**Why it happens:**
- EVM doesn't support floating-point arithmetic
- Division rounds down: `5 / 2 = 2` (not 2.5)
- Order of operations matters: `a * b / c` ≠ `a / c * b`
- Repeated operations compound errors

**How to avoid:**
- Always multiply before dividing: `(a * b) / c` not `(a / c) * b`
- Use higher precision for intermediate calculations (scale by 1e18)
- For AMM protocol fees and rounding, favor the protocol (round down user outputs, round up user inputs)
- Add minimum trade size to prevent dust trades that don't yield meaningful output
- Test with:
  - Very small amounts (1 wei swaps)
  - Very imbalanced pools (1000000:1 ratio)
  - Sequential operations to catch compounding errors

**Warning signs:**
- Division before multiplication
- No scaling factor for precision
- Rounding that favors users over protocol
- No minimum trade amount
- Lack of edge case testing (1 wei, extreme ratios)

**Phase to address:**
Phase 1 (Core Contracts) — Mathematical foundation. Phase 2 (Testing) for comprehensive edge case validation.

---

### Pitfall 8: Unlimited ERC20 Approvals

**What goes wrong:**
Users approve infinite allowance (type(uint256).max) to DEX router. If router is compromised or has a vulnerability, attacker can drain all approved tokens from all users who ever interacted with the protocol.

**Why it happens:**
Infinite approvals reduce user friction (no need to re-approve), but create massive attack surface. Real exploits:
- Li.Fi Protocol (2024): $9.7M stolen from users with infinite approvals
- SocketDotTech (2024): $3.3M stolen via infinite approval exploitation
- bZx (2020): $14M lost partly due to excessive allowances

**How to avoid:**
- In UI, offer users choice:
  - Exact amount approval (default, more secure)
  - Higher amount for multiple transactions (explicit opt-in)
  - Never auto-select infinite approval
- Display clear warning for infinite approvals
- Educate users to revoke approvals on revoke.cash or similar
- Consider ERC20Permit (EIP-2612) for gasless signature-based approvals
- For router upgrades, deploy new router contract (don't reuse compromised approvals)

**Warning signs:**
- UI defaults to infinite approval without warning
- No explanation of approval risks
- No integration with approval management tools
- Router upgrade path reuses old approvals
- Documentation doesn't mention approval hygiene

**Phase to address:**
Phase 4 (Frontend) for UI implementation. Education and UX warnings are critical for user protection.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip TWAP implementation | Faster initial development | Cannot safely serve as price oracle; blocks DeFi integrations | Learning project only, not production |
| Use `unchecked {}` for gas optimization | ~30-40 gas per operation | Risk of overflow vulnerabilities if used carelessly | Only for loop counters with provable bounds, never for user inputs |
| No emergency pause mechanism | Simpler, more decentralized | Cannot respond to discovered vulnerabilities | Only if accepting that bugs are permanent (code is law) |
| Support all ERC20 tokens universally | Wider compatibility, no restrictions | Complex edge cases (fee-on-transfer, rebasing, ERC777 callbacks) | If implementing comprehensive balance checking and SupportingFeeOnTransfer variants |
| Single-signature admin keys | Simpler deployment and testing | Single point of failure, centralization risk | Local development only, never mainnet |
| Large `unchecked {}` blocks | Maximum gas savings | Difficult to audit overflow safety | Never acceptable - keep unchecked blocks minimal and well-documented |

## Integration Gotchas

Common mistakes when connecting to external services or frontend.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Wallet Connection** | Assuming MetaMask is available | Check for provider existence, support WalletConnect, handle mobile wallets |
| **Chain ID Verification** | Not checking user is on correct network | Verify `chainId` matches expected network before contract calls |
| **Gas Estimation** | Using ethers.js `estimateGas()` as-is | Wrap estimation in try/catch; if fails, transaction will revert (likely insufficient balance or approval) |
| **Transaction Confirmation** | Showing success immediately after sending | Wait for `tx.wait(confirmations)` — minimum 1 block, recommend 2-3 for safety |
| **Token Balance Display** | Fetching once on load | Implement polling or WebSocket to update after transactions |
| **Price Impact Calculation** | Calculating on outdated reserves | Fetch current reserves immediately before displaying quote |
| **Error Messages** | Showing raw Solidity revert messages | Map common errors to user-friendly messages ("INSUFFICIENT_OUTPUT" → "Price moved unfavorably, increase slippage tolerance") |
| **Transaction Deadlines** | Using fixed deadline (e.g., 20 min) | Calculate deadline as `block.timestamp + duration` client-side, send as parameter |
| **Multicall/Batch Operations** | No atomicity guarantees | Be aware multicalls can partially succeed; consider using try/catch or atomic batching patterns |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **No event indexing** | Slow historical data queries | Index key parameters in events: `event Swap(address indexed user, ...)` | >1000 swaps; subgraph queries timeout |
| **Linear search in arrays** | Functions exceed gas limit | Use mappings for O(1) lookup, events for historical data | >50-100 items in array |
| **Storing redundant data on-chain** | High deployment costs, expensive updates | Store only essential state; compute derivable values off-chain | Contracts >24kb (deployment fails) |
| **No pagination in UI queries** | App becomes unresponsive | Implement infinite scroll or pagination for transaction history | >500 transactions per user |
| **Fetching every pool for discovery** | RPC rate limiting, slow load times | Use subgraph/indexer (The Graph) for aggregation queries | >20 active pools |
| **Re-fetching static data** | Unnecessary RPC calls | Cache token metadata (decimals, symbol, name) and contract addresses | Not a breakage point, but wastes resources from day 1 |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| **Using spot price as oracle** | Flash loan manipulation enables liquidations, arbitrage attacks | Use TWAP or external oracles (Chainlink, Pyth, API3) |
| **No minimum liquidity burn** | First depositor inflation attack can steal from subsequent LPs | Burn minimum liquidity (1000 wei) on first mint |
| **Missing reentrancy guards** | Drain pool via callback reentrancy (ERC777, custom tokens) | Add ReentrancyGuard to all state-changing functions |
| **Insufficient access control** | Unauthorized pause, fee changes, or withdrawals | Use OpenZeppelin AccessControl or Ownable, consider Timelock |
| **No input validation** | Zero amounts, identical tokens, self-transfers cause undefined behavior | Require amount > 0, tokenA != tokenB, validate addresses |
| **Approving router with max uint** | Router exploit drains all user tokens across all approved users | UI should default to exact amount approval with clear warnings |
| **No deadline checks** | Stale transactions execute at unfavorable prices | Require `block.timestamp <= deadline` on all time-sensitive operations |
| **Hardcoded gas limits** | Transaction fails on congested network or with gas price changes | Use dynamic gas estimation with buffer (e.g., 120% of estimate) |
| **Using `tx.origin` for auth** | Phishing attacks via malicious contract intermediary | Always use `msg.sender` for authentication |
| **Unchecked external calls** | Silently failing transfers (non-standard ERC20) | Use SafeERC20 library or check return values |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **No price impact warning** | Users lose significant value to slippage without realizing | Show "Price Impact: 5.2%" in red if >1%, require confirmation if >5% |
| **No impermanent loss explanation** | LPs don't understand they can lose money even when pool grows | Link to calculator and explanation before first deposit; show estimated IL for current price divergence |
| **Confusing error messages** | User sees "K" error and gives up | Map technical errors to user-friendly messages with suggested fixes |
| **No transaction status visibility** | User doesn't know if transaction is pending, failed, or succeeded | Show toast notifications with Etherscan links, maintain transaction history |
| **Hidden fees** | User surprised by swap output after transaction | Display: "Price: X, Fee: 0.3%, Min received: Y" before confirming |
| **No gas price recommendations** | Transaction stuck for hours with insufficient gas | Show gas options (slow/standard/fast) with time estimates |
| **Can't cancel pending transaction** | Stuck transaction blocks wallet | Provide "Cancel" button that sends 0 ETH to self with higher gas (nonce replacement) |
| **No loading states** | User clicks multiple times, sends duplicate transactions | Disable buttons during pending transactions, show spinners |
| **Displaying raw wei amounts** | "Received 1500000000000000000 tokens" is meaningless | Format with proper decimals and symbol: "1.5 ETH" |
| **No wallet balance display** | User attempts swap with insufficient balance | Show balance for each token with "Max" button |
| **Auto-routing without explanation** | User doesn't understand why multi-hop route was chosen | Show route path: "ETH → USDC → DAI" with explanation "Better price via intermediate swap" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Swap function:** Often missing deadline parameter — verify `require(block.timestamp <= deadline)`
- [ ] **Liquidity addition:** Often missing slippage protection — verify `minAmount0` and `minAmount1` parameters enforced
- [ ] **First liquidity mint:** Often missing minimum liquidity burn — verify MINIMUM_LIQUIDITY is minted to address(0)
- [ ] **Token transfers:** Often missing balance verification — verify actual balance change measured, not trusting transfer amount
- [ ] **Price calculation:** Often using spot price — verify TWAP implementation or documentation warning against oracle use
- [ ] **Access control:** Often using single address owner — verify multisig/timelock for production, or clearly document centralization risk
- [ ] **Reentrancy protection:** Often missing from all paths — verify ReentrancyGuard on swap/addLiquidity/removeLiquidity
- [ ] **Emergency functions:** Often have no access control — verify onlyOwner or role-based access on pause/unpause
- [ ] **Frontend error handling:** Often shows raw revert strings — verify user-friendly error messages mapped from contract errors
- [ ] **Transaction confirmation:** Often assumes success after send — verify waiting for transaction receipt with confirmations
- [ ] **Input sanitization:** Often allows zero amounts — verify `require(amount > 0)` and `require(tokenA != tokenB)`
- [ ] **Type conversions:** Often unguarded downcasting — verify SafeCast used or explicit bounds checking on uint256 → uint128 conversions

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| **Reentrancy vulnerability discovered** | HIGH | Deploy new pool contracts, pause old pools if possible, coordinate migration with LPs. Cannot recover if already exploited. |
| **Overflow bug found** | HIGH | Deploy patched contracts immediately. If funds at risk, coordinate emergency withdrawal for users. Post-exploit recovery depends on ability to pause. |
| **First deposit attack executed** | MEDIUM | Pool is compromised but not protocol-wide. Deploy new pool with minimum liquidity protection. Attacker profit limited to single pool. |
| **Oracle manipulation (flash loan)** | MEDIUM | If protocol depends on pool as oracle, need to migrate to TWAP or external oracle. Coordinate with affected integrations. |
| **Unlimited approval exploited** | LOW (protocol) / HIGH (users) | Protocol deploys new router. Affected users must revoke old approvals. User funds may already be drained — no recovery. |
| **Slippage not enforced** | LOW | Users can protect themselves by setting proper slippage. Add UI warnings. Not a contract vulnerability. |
| **Precision loss discovered** | MEDIUM | If leaking value, need mathematical audit and potential redesign. May require pool migration if economically significant. |
| **Token incompatibility (fee-on-transfer)** | LOW | Document incompatibility or add SupportingFeeOnTransfer functions. Not exploitable, just non-functional. |
| **No deadline enforcement** | LOW | Add deadline parameter in router v2. v1 remains usable, just suboptimal. Users can still specify gas to avoid long pending. |
| **Centralized admin key compromised** | HIGH | If key can pause or drain, immediate emergency actions needed. May need DAO vote or multisig threshold to revoke. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Reentrancy attacks | Phase 1: Core Contracts | Audit shows ReentrancyGuard on all external functions; tests include ERC777 tokens |
| Integer overflow | Phase 1: Core Contracts | Tests with type(uint256).max, SafeCast used for conversions, fuzzing tests pass |
| K invariant violation | Phase 1: Core Contracts | Balance verification implemented; tests include fee-on-transfer, rebasing tokens |
| First deposit inflation | Phase 1: Core Contracts | MINIMUM_LIQUIDITY minted to address(0) on first deposit; edge case tests pass |
| Oracle manipulation | Phase 1 or 3: TWAP implementation | TWAP code reviewed; documentation explicitly warns against spot price as oracle |
| Slippage protection | Phase 1: Core + Phase 4: UI | Smart contracts enforce minOutput/deadline; UI calculates and displays slippage |
| Precision loss | Phase 1: Core Contracts | Math reviewed for multiply-before-divide; tests with 1 wei amounts and extreme ratios |
| Unlimited approvals | Phase 4: Frontend | UI defaults to exact amount; warning shown for high approvals; user education provided |
| Special token handling | Phase 2: Testing | Test suite includes ERC777, fee-on-transfer, rebasing; documentation lists supported types |
| Emergency pause risks | Phase 1 or 3: If implemented | Multisig/timelock controls pause; documentation explains centralization tradeoff |

## Sources

**Security Research & Exploits:**
- [OWASP Smart Contract Top 10](https://owasp.org/www-project-smart-contract-top-10/)
- [Cetus AMM $200M Hack: Overflow Check Failure](https://dedaub.com/blog/the-cetus-amm-200m-hack-how-a-flawed-overflow-check-led-to-catastrophic-loss/)
- [DEX Security Best Practices 2025](https://www.extractor.live/blog/dex-security-best-practices-how-to-secure-your-protocol)
- [DeFi Attack Vectors & Security 2025](https://www.quillaudits.com/blog/web3-security/defi-attack-vectors-security-risks)
- [ERC777 Reentrancy Vulnerability](https://medium.com/@Heuss/unprotected-swap-function-a-erc777-reentrancy-vulnerability-81aaeaa75a2a)
- [ERC777 Latent Bugs in Billion-Dollar Code](https://dedaub.com/blog/erc777-tokens-latent-bugs-in-billion-plus-dollar-code/)

**Uniswap Official Documentation:**
- [Uniswap V2 Common Errors](https://docs.uniswap.org/contracts/v2/reference/smart-contracts/common-errors)
- [How Uniswap Works](https://docs.uniswap.org/contracts/v2/concepts/protocol-overview/how-uniswap-works)
- [Constant Product Formula Price Impact](https://rareskills.io/post/uniswap-v2-price-impact)

**MEV & Front-Running:**
- [Front-Running & MEV Mitigation Guide](https://speedrunethereum.com/guides/front-running-mev-mitigation)
- [Implementing MEV Protection in 2025](https://medium.com/@ancilartech/implementing-effective-mev-protection-in-2025-c8a65570be3a)
- [MEV Protection: Sandwiching & Front-Running](https://www.blocknative.com/blog/mev-protection-sandwiching-frontrunning-bots)
- [BNB Chain MEV Protection Introduction](https://www.bnbchain.org/en/blog/protecting-users-from-sandwich-attacks-bnb-chain-introduces-mev-protection-with-several-wallets)

**Token Security & Approvals:**
- [ERC20 Approve Pattern Security Guide](https://speedrunethereum.com/guides/erc20-approve-pattern)
- [Unlimited ERC20 Allowances Considered Harmful](https://kalis.me/unlimited-erc20-allowances/)
- [Quantifying Risk of Unlimited Approvals](https://arxiv.org/pdf/2207.01790)
- [ERC-20 Allowance Risks Explained](https://cryptorank.io/news/feed/77213-erc-20-allowance-risks-explained)

**Oracle & Flash Loan Attacks:**
- [Price Oracle Manipulation & Protection](https://medium.com/@ancilartech/price-oracle-manipulation-protection-safeguarding-your-blockchain-applications-0d5ad1a94f64)
- [The Full Guide to Price Oracle Manipulation](https://www.cyfrin.io/blog/price-oracle-manipulation-attacks-with-examples)
- [Flash Loan Attacks: DeFi Security Risks](https://www.startupdefense.io/cyberattacks/flash-loan-attack)
- [Oracle Integration for AMM Pricing](https://www.chainscorelabs.com/en/guides/economic-impact-and-financial-systems/dex-and-amm-architecture/setting-up-a-decentralized-oracle-integration-for-amm-pricing)

**Inflation Attacks & First Deposit:**
- [ERC4626 Inflation Attacks Defense](https://blog.openzeppelin.com/a-novel-defense-against-erc4626-inflation-attacks)
- [Inflation Attacks in DeFi Protocols](https://r4bbit.vercel.app/blog/defi-inflation-attacks)
- [Demystifying ERC4626 Inflation Attack](https://medium.com/@shresthasubik/demystifying-the-inflation-attack-in-erc4626-c06301f7d4a4)

**Precision & Rounding:**
- [Precision Loss in Solidity Arithmetic](https://blog.solidityscan.com/precision-loss-in-arithmetic-operations-8729aea20be9)
- [Precision Loss Errors](https://dacian.me/precision-loss-errors)
- [Division Precision Loss](https://lab.guardianaudits.com/encyclopedia-of-common-solidity-bugs/division-precision-loss)
- [Rounding Errors for Auditors](https://33audits.hashnode.dev/rounding-errors-for-auditors)

**Solidity Arithmetic & Overflow:**
- [Unchecked Math in Solidity](https://www.vibraniumaudits.com/post/unchecked-math-operations-in-solidity)
- [Integer Overflow & Underflow](https://owasp.org/www-project-smart-contract-top-10/2023/en/src/SC02-integer-overflow-underflow.html)
- [Solidity Gas Optimization Guide](https://www.alchemy.com/overviews/solidity-gas-optimization)

**Slippage & User Protection:**
- [AMMs and Slippage: Comprehensive Explanation](https://www.swaap.finance/blog/amms-and-slippage-a-comprehensive-explanation)
- [Minimize Slippage on Swaps](https://blog.uniswap.org/minimize-slippage-on-swaps)
- [Slippage Fundamentals - KyberSwap](https://docs.kyberswap.com/getting-started/foundational-topics/decentralized-finance/slippage)

**Impermanent Loss:**
- [What is Impermanent Loss - Uniswap Labs](https://support.uniswap.org/hc/en-us/articles/20904453751693-What-is-Impermanent-Loss)
- [Impermanent Loss Math Explained](https://speedrunethereum.com/guides/impermanent-loss-math-explained)
- [Impermanent Loss Calculator Guide](https://goldrush.dev/guides/how-to-calculate-impermanent-loss-with-examples/)

**Emergency Functions & Centralization:**
- [Emergency Stop Pattern](https://fravoll.github.io/solidity-patterns/emergency_stop.html)
- [How to Pause a Smart Contract](https://www.halborn.com/blog/post/how-to-pause-a-smart-contract)
- [Risk Management in Smart Contracts](https://chain.link/article/risk-management-blockchain-smart-contracts)
- [Centralization Defects in Smart Contracts](https://arxiv.org/html/2411.10169v1)

**Testing & Edge Cases:**
- [Liquidity Pool Simulation Testing](https://github.com/tendermint/liquidity/issues/40)
- [DEX Liquidity Pool Management](https://ideasoft.io/blog/dex-liquidity-pools-management/)

---
*Pitfalls research for: SimpleDEX AMM Project*
*Researched: 2026-02-16*
*Confidence: HIGH — based on official Uniswap documentation, real exploit case studies (Cetus $200M, Li.Fi $9.7M, imBTC $300k), security research papers, and established best practices from OWASP Smart Contract Top 10*
