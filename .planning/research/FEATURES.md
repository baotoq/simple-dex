# Feature Research

**Domain:** AMM DEX (Constant Product x*y=k)
**Researched:** 2026-02-16
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Token Swapping** | Core DEX functionality - users must be able to exchange one token for another | MEDIUM | Requires accurate x*y=k math, handling fees (0.3%), updating reserves atomically |
| **Slippage Protection** | Users expect minimum received amount to protect against price movement during transaction | MEDIUM | Calculate minimum output based on user tolerance (0.1%-1%+), revert if not met |
| **Price Impact Display** | Users need to see how their trade size affects the pool price before executing | LOW | Calculate: `1 - (reserveOut / (reserveOut + amountOut))`, display as percentage |
| **Wallet Connection** | Users expect to connect MetaMask, WalletConnect, or similar without friction | LOW | Use wagmi/viem for multi-wallet support, standard pattern in 2026 |
| **Token Approval (ERC20)** | Before swapping, users must approve DEX contract to spend their tokens | MEDIUM | Two-step flow: approve transaction first, then swap. Consider Permit2 for better UX |
| **Add Liquidity** | Users must be able to deposit equal-value token pairs to become LPs | MEDIUM | Calculate proportional amounts, mint LP tokens, handle first liquidity provision edge case |
| **Remove Liquidity** | LPs must be able to withdraw their tokens by burning LP tokens | MEDIUM | Calculate proportional withdrawal based on LP token share, burn LP tokens |
| **LP Token Tracking** | Show users their LP token balance representing their pool share | LOW | ERC20 LP tokens track ownership, display as percentage of pool |
| **Pool Reserve Display** | Show current token reserves in each pool for transparency | LOW | Read contract state, display both token amounts clearly |
| **Transaction Status** | Users need clear feedback on pending/confirmed/failed transactions | LOW | Listen to transaction events, show appropriate loading/success/error states |
| **Token Balance Display** | Show user's wallet balances for relevant tokens before swap | LOW | Query ERC20 balances, update after transactions |
| **Real-time Pool Data** | Display current exchange rate, fees, and pool depth | LOW | Calculate from reserves: price = reserveB/reserveA, update on each block |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Educational Mode** | For learning-focused project, show the math behind each calculation | MEDIUM | Display x*y=k formula, show before/after reserves, explain price impact calculation step-by-step |
| **Interactive Formula Visualization** | Visual representation of the bonding curve and how trades move along it | MEDIUM | Chart showing x*y=k curve with current position and post-trade position |
| **Impermanent Loss Calculator** | Help LPs understand risk by showing IL based on price movements | MEDIUM | Calculate IL for different price scenarios: `IL = 2*sqrt(priceRatio) / (1+priceRatio) - 1` |
| **Transparent Fee Breakdown** | Show exactly where fees go (to LPs) and how they affect reserves | LOW | Display 0.3% fee separately, show LP earnings over time |
| **Multi-Hop Routing** | Allow trading Token A → Token B → Token C when no direct pool exists | HIGH | Graph-based path finding, execute multiple swaps in single transaction, significantly better pricing |
| **Price History Tracking** | Show how pool price has changed over time for user reference | MEDIUM | Store historical prices on-chain or off-chain, chart price movements |
| **Gas Estimation** | Show estimated gas costs before confirming transactions | LOW | Use eth_estimateGas, display in ETH and USD equivalent |
| **Swap Comparison** | Compare different routing paths to show optimal route selected | MEDIUM | Requires multi-hop routing first, display alternative paths with different outcomes |
| **LP Performance Analytics** | Track LP returns, fees earned, current IL status | MEDIUM | Calculate fees accumulated, compare current value to initial deposit, show APR |
| **Transaction Deadline** | Allow users to set time limit for transaction validity | LOW | Pass deadline parameter to contract, revert if block.timestamp > deadline |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems or don't align with learning goals.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Concentrated Liquidity** | More capital efficient (Uniswap v3 style) | Adds massive complexity, obscures understanding of base AMM mechanics | Learn x*y=k thoroughly first, v3 as separate advanced project |
| **Yield Farming / Staking Rewards** | "All DEXs have farming" | Not core to AMM understanding, adds token economics complexity, governance overhead | Focus on swap fees as LP incentive, demonstrate organic yield model |
| **Governance Token** | Common DEX pattern | Distracts from AMM mechanics, adds security concerns, requires DAO infrastructure | Learning project doesn't need governance, protocol parameters can be fixed |
| **Flash Loans** | Advanced DeFi primitive | Complex security implications, not core to AMM function, can be used to attack pools | Defer to advanced topics, focus on core swap mechanics |
| **Limit Orders** | "Like a CEX" | Contradicts AMM model (AMMs are passive liquidity), requires order book infrastructure | Embrace AMM model: instant execution at market price, explain why it's different |
| **Mainnet Deployment** | "Make it real" | For learning project, adds cost, security risk, audit requirements, legal considerations | Local Anvil deployment provides full learning value without risk/cost |
| **Unlimited Token Approvals** | "Better UX" | Security risk (malicious contracts can drain approved tokens), bad practice to teach | Request exact approval amounts or use Permit2 for time-bound approvals |
| **Auto-Compounding LP Rewards** | Maximize yields | Adds significant smart contract complexity, gas costs for rebalancing, obscures base mechanics | Show fees accumulating transparently, let users manually claim |
| **Cross-Chain Bridging** | Access more liquidity | Requires bridge infrastructure, security complexities, outside AMM scope | Single-chain focus sufficient for learning, bridges are separate topic |
| **Impermanent Loss Protection** | "Make LPs safe" | Requires external funding source or token inflation, complex mechanism, not economically sustainable | Educate about IL, show calculator, LPs accept risk for fees |

## Feature Dependencies

```
Token Swapping
    ├──requires──> Wallet Connection
    ├──requires──> Token Approval (ERC20)
    ├──requires──> Slippage Protection
    └──requires──> Pool Reserve Display

Add Liquidity
    ├──requires──> Wallet Connection
    ├──requires──> Token Approval (ERC20)
    └──requires──> LP Token Tracking

Remove Liquidity
    ├──requires──> Add Liquidity (must have LP tokens)
    └──requires──> LP Token Tracking

Multi-Hop Routing ──enhances──> Token Swapping
    └──requires──> Multiple pools

Educational Mode ──enhances──> All swap/liquidity features

Price Impact Display ──enhances──> Token Swapping
    └──requires──> Pool Reserve Display

LP Performance Analytics
    ├──requires──> LP Token Tracking
    └──requires──> Price History Tracking

Transaction Deadline ──enhances──> Token Swapping
Transaction Deadline ──enhances──> Add Liquidity
Transaction Deadline ──enhances──> Remove Liquidity
```

### Dependency Notes

- **Token Swapping requires Token Approval**: ERC20 tokens must be approved before the DEX contract can transfer them. This is a two-transaction flow that's standard across all DEXs.
- **Multi-Hop Routing enhances Token Swapping**: Not required for basic functionality, but dramatically improves swap options when direct pools don't exist (e.g., USDC → WETH → DAI instead of direct USDC → DAI).
- **Educational Mode enhances all features**: For a learning-focused project, showing the underlying math adds unique value without changing core functionality.
- **LP Performance Analytics requires Price History**: Can't calculate returns or IL without knowing historical prices and initial deposit values.
- **Transaction Deadline is independent enhancement**: Can be added to any state-changing function without dependencies, protects against stale transactions.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the constant product AMM concept.

- [x] **Token Swapping** — Core AMM functionality with x*y=k formula
- [x] **Slippage Protection** — Minimum received amount to protect users
- [x] **Price Impact Display** — Show how trade affects pool price
- [x] **Wallet Connection** — MetaMask/WalletConnect via wagmi
- [x] **Token Approval** — Standard ERC20 approve flow
- [x] **Add Liquidity** — Deposit token pairs, receive LP tokens
- [x] **Remove Liquidity** — Burn LP tokens, withdraw proportional amounts
- [x] **LP Token Tracking** — Show user's pool share
- [x] **Pool Reserve Display** — Current reserves for transparency
- [x] **Transaction Status** — Clear pending/success/fail feedback
- [x] **Token Balance Display** — Show wallet balances
- [x] **Factory Contract** — Create new pools for token pairs

### Add After Validation (v1.x)

Features to add once core AMM mechanics are working and understood.

- [ ] **Educational Mode** — Show math behind calculations, explain x*y=k
- [ ] **Interactive Formula Visualization** — Chart the bonding curve
- [ ] **Impermanent Loss Calculator** — Help LPs understand risk
- [ ] **Transparent Fee Breakdown** — Show exactly where fees go
- [ ] **Price History Tracking** — Historical pool price data
- [ ] **Gas Estimation** — Show estimated costs before confirming
- [ ] **LP Performance Analytics** — Track returns, fees earned, IL
- [ ] **Transaction Deadline** — Time limits on transaction validity

### Future Consideration (v2+)

Features to defer until core product is fully understood and validated.

- [ ] **Multi-Hop Routing** — Complex routing algorithm, significant implementation effort
- [ ] **Swap Comparison** — Requires multi-hop routing first
- [ ] **Multiple Pool Types** — After mastering constant product, explore constant sum, stable swaps
- [ ] **Advanced LP Strategies** — Range orders, concentrated liquidity (separate learning project)
- [ ] **MEV Protection** — Private mempools, Flashbots integration (advanced topic)
- [ ] **Price Oracles** — TWAP implementation for external price feeds

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Token Swapping | HIGH | MEDIUM | P1 |
| Slippage Protection | HIGH | MEDIUM | P1 |
| Wallet Connection | HIGH | LOW | P1 |
| Token Approval | HIGH | MEDIUM | P1 |
| Add/Remove Liquidity | HIGH | MEDIUM | P1 |
| LP Token Tracking | HIGH | LOW | P1 |
| Price Impact Display | HIGH | LOW | P1 |
| Pool Reserve Display | HIGH | LOW | P1 |
| Transaction Status | HIGH | LOW | P1 |
| Token Balance Display | MEDIUM | LOW | P1 |
| Educational Mode | HIGH (for learning project) | MEDIUM | P2 |
| Impermanent Loss Calculator | HIGH (for learning) | MEDIUM | P2 |
| Interactive Visualization | MEDIUM | MEDIUM | P2 |
| Fee Breakdown | MEDIUM | LOW | P2 |
| Gas Estimation | MEDIUM | LOW | P2 |
| Transaction Deadline | MEDIUM | LOW | P2 |
| LP Performance Analytics | MEDIUM | MEDIUM | P2 |
| Price History Tracking | MEDIUM | MEDIUM | P2 |
| Multi-Hop Routing | HIGH | HIGH | P3 |
| Swap Comparison | LOW | MEDIUM | P3 |
| Advanced LP Strategies | LOW (different scope) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — core AMM functionality
- P2: Should have — enhances learning/usability when core works
- P3: Nice to have — advanced features for future exploration

## Competitor Feature Analysis

| Feature | Uniswap v2 | PancakeSwap | SimpleDEX Approach |
|---------|------------|-------------|-------------------|
| **Swapping** | Constant product (x*y=k), 0.3% fee | Same as Uniswap v2, BSC-based | Same formula, learning-focused implementation |
| **Liquidity Provision** | Standard add/remove, fungible LP tokens | Same as Uniswap v2 | Same mechanics, emphasize understanding over production features |
| **Slippage Protection** | User-set tolerance (0.1%-50%) | User-set tolerance, default 0.5% | Standard implementation, explain why it's needed |
| **Price Impact** | Displayed prominently, warns at >5% | Similar display, mobile-optimized | Show calculation details for learning |
| **Multi-Hop Routing** | Up to 3 hops supported | Supported via router | Defer to v2+ (complex implementation) |
| **Token Approvals** | Standard ERC20 approve, unlimited common | Same pattern | Request exact amounts or Permit2 (teach best practices) |
| **Factory Pattern** | CREATE2 for deterministic addresses | Similar factory | Standard factory, focus on pool creation mechanics |
| **Educational Features** | None (production DEX) | None (production DEX) | Core differentiator: show the math, explain concepts |
| **Concentrated Liquidity** | No (v2), Yes (v3) | No (v2), Yes (v3) | Explicitly out of scope, x*y=k only |
| **Yield Farming** | No (pure DEX) | Yes (extensive) | Out of scope, focus on swap fees |
| **Governance** | UNI token | CAKE token | Not needed for learning project |
| **Cross-Chain** | Multiple deployments | Multiple chains | Single chain sufficient |

## Sources

### Official Documentation
- [Uniswap v2 Whitepaper](https://uniswap.org/whitepaper.pdf) - HIGH confidence (foundational constant product AMM)
- [Uniswap v3 Concentrated Liquidity](https://docs.uniswap.org/concepts/protocol/concentrated-liquidity) - HIGH confidence (official docs)
- [Uniswap V3 Development Book - Constant Function Market Maker](https://uniswapv3book.com/milestone_0/constant-function-market-maker.html) - HIGH confidence

### AMM Fundamentals
- [Chainlink: What is an Automated Market Maker (AMM)?](https://chain.link/education-hub/what-is-an-automated-market-maker-amm) - HIGH confidence
- [Gemini Cryptopedia: AMM](https://www.gemini.com/cryptopedia/amm-what-are-automated-market-makers) - HIGH confidence
- [Cube Exchange: Constant Product Market Maker (CPMM)](https://www.cube.exchange/what-is/constant-product-market-maker-cpmm) - MEDIUM confidence

### Features & Best Practices (2026)
- [Top DEXs in 2026: Complete Guide](https://eco.com/support/en/articles/13313257-top-dexs-in-2026-complete-guide-to-the-best-decentralized-exchanges) - MEDIUM confidence (current trends)
- [PancakeSwap vs Uniswap 2025 Comparison](https://metana.io/blog/pancakeswap-vs-uniswap-which-dex-reigns-supreme/) - MEDIUM confidence
- [DEX Design Best Practices - Ethereum.org](https://ethereum.org/developers/docs/design-and-ux/dex-design-best-practice/) - HIGH confidence (official Ethereum docs)
- [Understanding DEX Interfaces - Medium](https://goofwriter.medium.com/understanding-dex-interfaces-0fe8386eb29c) - MEDIUM confidence

### Slippage & Price Impact
- [KyberSwap: Slippage Documentation](https://docs.kyberswap.com/getting-started/foundational-topics/decentralized-finance/slippage) - HIGH confidence
- [Cube Exchange: What is Slippage?](https://www.cube.exchange/what-is/slippage) - MEDIUM confidence
- [Uniswap: How to Minimize Slippage](https://blog.uniswap.org/minimize-slippage-on-swaps) - HIGH confidence (official blog)
- [0x: Price Impact Protection](https://webflow.internal.0x.org/post/0x-swap-api-price-impact-protection) - MEDIUM confidence

### Liquidity Pool Management
- [IdeaSoft: DEX Liquidity Pools Management](https://ideasoft.io/blog/dex-liquidity-pools-management/) - MEDIUM confidence
- [Gemini: What is a Liquidity Pool?](https://www.gemini.com/cryptopedia/what-is-a-liquidity-pool-crypto-market-liquidity) - HIGH confidence
- [Gemini: How LP Tokens Work](https://www.gemini.com/cryptopedia/liquidity-provider-amm-tokens) - HIGH confidence

### Impermanent Loss
- [Nadcab: Impermanent Loss Protection in DEXs](https://www.nadcab.com/blog/impermanent-loss-protection-in-dex) - MEDIUM confidence
- [Camelot DEX: Understanding Impermanent Loss](https://docs.camelot.exchange/get-started/faqs/understanding-impermanent-loss) - MEDIUM confidence
- [tastycrypto: Impermanent Loss Explained](https://www.tastycrypto.com/defi/impermanent-loss-explained/) - MEDIUM confidence

### Wallet Integration
- [WalletConnect Official Site](https://walletconnect.com/) - HIGH confidence
- [Medium: Complete Guide to Integrating WalletConnect and MetaMask](https://medium.com/@ancilartech/complete-guide-to-integrating-walletconnect-and-metamask-in-react-dapps-833a8a1d2d31) - MEDIUM confidence
- [MetaMask vs WalletConnect Comparison](https://bingx.com/en/learn/article/metamask-vs-walletconnect-wct-which-wallet-to-choose) - MEDIUM confidence

### Token Approvals & UX
- [Speedrun Ethereum: ERC20 Approve Pattern](https://speedrunethereum.com/guides/erc20-approve-pattern) - HIGH confidence
- [Jacek's Blog: Token Approvals - From ERC20 to Permit2](https://blog.varkiwi.com/2025/04/23/ERC20-Approve-And-Permit(2).html) - MEDIUM confidence
- [Ethereum.org: ERC-20 Transfers and Approval](https://ethereum.org/developers/tutorials/transfers-and-approval-of-erc-20-tokens-from-a-solidity-smart-contract/) - HIGH confidence

### Multi-Hop Routing
- [Eco: What is a DEX Aggregator?](https://eco.com/support/en/articles/13314092-what-is-a-dex-aggregator-a-complete-guide-to-defi-s-smart-trading-layer) - MEDIUM confidence
- [Liquid Labs: Multi-hop Routing Deep Dive](https://docs.liqd.ag/for-liquidswap-traders/multi-hop-routing) - MEDIUM confidence
- [Nadcab: Smart Order Routing](https://www.nadcab.com/blog/smart-order-routing-in-dex) - MEDIUM confidence

### Security & Anti-Patterns
- [Medium: The Dark Side of Liquidity - AMM DEX Risks](https://medium.com/thecapital/the-dark-side-of-liquidity-a-deep-dive-into-amm-based-dex-risks-and-security-based-on-the-sok-a35a550f1bb6) - MEDIUM confidence
- [ACM: SoK - DEX with AMM Protocols](https://dl.acm.org/doi/10.1145/3570639) - HIGH confidence (academic research)
- [arXiv: SoK - DEX with AMM Protocols (PDF)](https://arxiv.org/pdf/2103.12732) - HIGH confidence (peer-reviewed)

---
*Feature research for: SimpleDEX (Learning-focused AMM DEX)*
*Researched: 2026-02-16*
*Context: This research informs roadmap creation for a constant product (x*y=k) AMM implementation focused on deep understanding of DeFi mechanics rather than production deployment.*
