# Project Research Summary

**Project:** SimpleDEX - Learning-focused AMM DEX
**Domain:** Automated Market Maker (Constant Product x*y=k)
**Researched:** February 16, 2026
**Confidence:** HIGH

## Executive Summary

SimpleDEX is a learning-focused implementation of a constant product Automated Market Maker (AMM) following the x*y=k formula pioneered by Uniswap v2. Experts build production AMM DEXs using a core/periphery architecture: minimal, immutable pool contracts that hold funds and execute swaps, paired with user-facing router contracts that provide safety features like slippage protection and deadlines. The technology landscape in 2026 strongly favors Foundry over Hardhat for smart contract development (5x faster compilation, native Solidity testing), and wagmi v3 + Viem v2 for frontend Web3 integration (TypeScript-first, 35KB vs 130KB for ethers.js).

The recommended approach prioritizes understanding AMM mechanics over production features. This means: (1) building pool contracts directly without initial router complexity, (2) using Foundry's Solidity-based testing to minimize context-switching, (3) implementing core security patterns (CEI, ReentrancyGuard, minimum liquidity burn) from day one, and (4) deferring advanced features like concentrated liquidity, multi-hop routing, and yield farming that would obscure the fundamental constant product mechanics. The existing codebase already implements most table-stakes features correctly.

Key risks center on smart contract security vulnerabilities that are catastrophic and unrecoverable: reentrancy attacks via token callbacks (prevented by CEI pattern + ReentrancyGuard), first deposit inflation attacks (prevented by minimum liquidity burn), and precision loss in constant product calculations (prevented by multiply-before-divide ordering). Secondary risks include poor UX around slippage, impermanent loss education, and unlimited ERC20 approvals - these are frontend concerns that don't compromise contract security but significantly impact user safety. The codebase review and testing phase will be critical to validate security assumptions before any mainnet consideration.

## Key Findings

### Recommended Stack

The 2026 Web3 development landscape has converged on clear winners for AMM development. Smart contract tooling favors **Foundry** (latest nightly, includes forge/cast/anvil) for 5x faster compilation than Hardhat, native Solidity testing that eliminates JavaScript context-switching, and built-in fuzzing with gas snapshots. **Solidity ^0.8.28** provides production stability with transient storage support while avoiding experimental EOF features in 0.8.29+. Frontend development centers on **Next.js 15.1+** with **React 19** for production-ready features and excellent DX.

**Core technologies:**
- **Foundry**: Smart contract development and testing - eliminates context-switching, 5x faster than Hardhat, industry standard for new projects
- **Viem v2.x + wagmi v3.x**: Web3 integration - 35KB bundle vs 130KB for ethers.js, TypeScript-first with automatic type inference, de facto standard for React DApps
- **RainbowKit v2.2+**: Wallet connection UI - polished UX with ENS resolution, better wagmi integration than Reown AppKit for EVM-only projects
- **OpenZeppelin Contracts v5.x**: Security primitives - battle-tested ERC20, ReentrancyGuard, access control patterns (requires Solidity ^0.8.20+)
- **Anvil**: Local development node - instant mining, 10 pre-funded accounts with 10,000 ETH each, forking capabilities for fast iteration

**Security tooling:**
- **Slither**: Static analysis with 92+ detectors, 30-second scans, essential pre-audit
- **Solhint**: Solidity linter funded by Ethereum Foundation through 2026
- **forge-std**: Testing utilities with console logging, VM cheatcodes, assertions

### Expected Features

Research reveals a clear hierarchy of features for AMM DEXs: table stakes users assume exist, differentiators that set products apart, and anti-features that seem good but create problems.

**Must have (table stakes):**
- Token swapping with x*y=k formula, 0.3% fee, atomic reserve updates
- Slippage protection (minimum received amount) to protect against price movement
- Price impact display showing how trade size affects pool price
- Wallet connection (MetaMask, WalletConnect) via wagmi multi-wallet support
- Token approval (ERC20) with two-step flow: approve then swap
- Add/remove liquidity with proportional amounts and LP token tracking
- Pool reserve display for transparency
- Transaction status feedback (pending/confirmed/failed)
- Real-time pool data (exchange rate, fees, pool depth)

**Should have (competitive differentiators for learning project):**
- Educational mode showing math behind calculations (x*y=k formula breakdown)
- Interactive formula visualization (bonding curve chart)
- Impermanent loss calculator helping LPs understand risk
- Transparent fee breakdown showing where 0.3% goes
- LP performance analytics tracking returns and fees earned
- Transaction deadline for time-limited validity
- Gas estimation in ETH and USD

**Defer (v2+ or anti-features):**
- Multi-hop routing (HIGH complexity, requires graph-based pathfinding) - defer to v2
- Concentrated liquidity (Uniswap v3 style) - massive complexity, obscures base mechanics, separate advanced project
- Yield farming/governance tokens - not core to AMM understanding, adds token economics complexity
- Limit orders - contradicts AMM model (passive liquidity), requires order book infrastructure
- Flash loans - complex security implications, defer to advanced topics
- Mainnet deployment - for learning project, adds cost/risk/audit requirements without learning value

**Feature priorities:**
The existing codebase implements all P1 (must-have) features: swap, add/remove liquidity, slippage protection, LP tokens, factory pattern. P2 features (educational mode, IL calculator, analytics) should be next iteration after core validation. P3 features (multi-hop routing, concentrated liquidity) are explicitly out of scope for learning-focused implementation.

### Architecture Approach

AMM DEXs follow a well-established **core/periphery separation pattern**: minimal, immutable core contracts (Factory + Pool) hold funds and implement critical logic, while optional periphery contracts (Router) provide user-friendly interfaces with safety checks. For SimpleDEX's learning focus, direct pool interaction is recommended over router complexity.

**Major components:**
1. **Factory Contract** — Creates and tracks pool contracts using CREATE2 for deterministic addresses; maintains registry preventing duplicate pools; singleton pattern
2. **Pool Contract (Pair)** — Manages liquidity for a token pair; executes swaps using x*y=k formula; mints/burns LP tokens (implements ERC20); stores reserves; one instance per token pair
3. **ERC20 Tokens** — Standard fungible tokens; SimpleDEX tokens for testing, OpenZeppelin base for production
4. **Frontend (Next.js)** — Swap interface, liquidity management, pool explorer using wagmi hooks for Web3 interactions
5. **Router Contract (Optional)** — User-facing interface enforcing slippage protection and deadlines; stateless periphery; recommended for production but not essential for learning

**Critical architectural patterns:**
- **Checks-Effects-Interactions (CEI)**: Update state before external calls to prevent reentrancy - this is the primary defense and must be in initial design
- **Factory Pattern**: Centralized pool deployment and registry - standard for AMM DEXs, provides deterministic addresses and prevents duplicates
- **LP Token as ERC20**: Pool contract implements ERC20 for liquidity shares - enables composability, simple accounting
- **Approve-TransferFrom Pattern**: Users approve contract spend, contract uses transferFrom to pull tokens - standard DeFi pattern, requires two transactions
- **Event-Driven State Sync**: Contracts emit events, frontend listens via useWatchContractEvent for real-time updates without polling
- **wagmi Hook Composition**: Type-safe Web3 interactions through composed React hooks - automatic caching, request deduplication via TanStack Query

**Build order dependencies:**
Phase 1: Core contracts (ERC20 tokens → Pool → Factory)
Phase 2: Testing (unit tests → integration tests with edge cases)
Phase 3: Frontend foundation (wagmi config → wallet connection → contract ABIs)
Phase 4: Read functionality (usePoolReserves → useTokenBalance → PoolInfo display)
Phase 5: Write functionality (token approval → useSwap → useLiquidity)
Phase 6: Polish and UX (error handling, loading states, price impact warnings)

### Critical Pitfalls

Research identified 8 critical pitfalls with real exploit case studies. The top 5 that must be addressed in Phase 1:

1. **Reentrancy attacks from token callbacks** — Malicious tokens (ERC777) with transfer hooks can re-enter swap functions before state updates complete, draining pools. Prevented by: CEI pattern (state updates before external calls) + ReentrancyGuard on all swap/liquidity functions. The Uniswap V1 imBTC exploit ($300k stolen) demonstrates this must be in initial design, not retrofitted.

2. **First deposit inflation attack** — Attacker deposits 1 wei as first LP, donates large amount to pool, causing subsequent depositors to receive 0 shares due to rounding, then extracts value from "free" deposits. Prevented by: minimum liquidity burn (mint 1000 wei to address(0) on first deposit, like Uniswap V2). Recovery cost is HIGH (requires pool redeployment).

3. **Integer overflow in arithmetic operations** — Even in Solidity 0.8+, overflow occurs in downcasting (uint256 → uint128), shift operations, and unchecked blocks. The Cetus AMM hack ($200M, May 2025) resulted from flawed overflow check. Prevented by: explicit boundary validation for downcasts, avoid unchecked blocks for user values, SafeCast library, test with type(uint256).max.

4. **K invariant violation with special tokens** — Fee-on-transfer, rebasing, and deflationary tokens break x*y=k because actual received amounts differ from transfer amounts. Prevented by: measure balance changes instead of trusting transfer amounts (balanceAfter - balanceBefore pattern), document supported token types, implement sync() for rebasing tokens.

5. **Precision loss in division** — Integer division truncates, causing cumulative precision loss in constant product calculations, especially with small amounts or imbalanced pools. Prevented by: always multiply before dividing ((a * b) / c not (a / c) * b), scale by 1e18 for intermediate calculations, round in protocol's favor, minimum trade size for dust prevention, test with 1 wei swaps and extreme ratios.

**Additional critical pitfalls for Phase 1 (smart contracts) and Phase 4 (frontend):**

6. **Insufficient slippage protection and deadline enforcement** — Transactions sit in mempool during volatility, execute at worse-than-expected prices, or get sandwiched by MEV bots. Prevented by: require minOutput parameter on swaps (revert if output < minOutput), require deadline parameter (revert if block.timestamp > deadline), UI calculates slippage based on pool depth, default 0.5% for stablecoins / 1-3% for volatile pairs.

7. **Price oracle manipulation via flash loans** — Using pool reserves directly as price oracle allows attackers to manipulate prices within single transaction using flash loans, enabling attacks on lending protocols. Prevented by: NEVER use spot price as oracle for external protocols, implement TWAP for oracle needs, use Chainlink/Pyth/API3 for external integrations, document that reserves should not be used as price feeds.

8. **Unlimited ERC20 approvals** — Users approve infinite allowance for convenience; if contract is compromised, attacker drains all approved tokens. Real exploits: Li.Fi Protocol ($9.7M), SocketDotTech ($3.3M), bZx ($14M). Prevented by: UI defaults to exact amount approval with clear warning, educate users to revoke old approvals, consider ERC20Permit (EIP-2612) for gasless approvals, never auto-select infinite approval.

**Recovery costs:**
- Reentrancy/overflow/K invariant violations: HIGH (deploy new contracts, coordinate migration, cannot recover if exploited)
- First deposit attack: MEDIUM (single pool compromised, deploy new pool with protection)
- Oracle manipulation: MEDIUM (migrate to TWAP or external oracle)
- Unlimited approval exploit: HIGH for users (funds drained), LOW for protocol (deploy new router)
- Slippage/precision issues: LOW-MEDIUM (add parameters, educate users)

## Implications for Roadmap

Based on research, the existing SimpleDEX codebase implements core functionality correctly but needs validation and enhancement phases. Suggested structure:

### Phase 1: Security Audit & Core Hardening
**Rationale:** Critical pitfalls from PITFALLS.md must be verified in existing contracts before proceeding. Reentrancy, first deposit inflation, and precision loss are catastrophic if missed. The Cetus AMM hack ($200M) and Li.Fi exploit ($9.7M) demonstrate that security cannot be retrofitted - it must be validated immediately.

**Delivers:**
- Security audit of existing Pool and Factory contracts
- Verification of CEI pattern, ReentrancyGuard implementation
- Confirmation of minimum liquidity burn (MINIMUM_LIQUIDITY minted to address(0))
- Validation of multiply-before-divide in x*y=k calculations
- Review of integer overflow protections

**Addresses:** Pitfalls #1 (reentrancy), #2 (first deposit), #3 (overflow), #4 (K invariant), #5 (precision loss)

**Avoids:** Deploying vulnerable contracts that require expensive migration

### Phase 2: Comprehensive Testing & Edge Cases
**Rationale:** PITFALLS.md emphasizes testing with special tokens (ERC777, fee-on-transfer, rebasing) and extreme values (1 wei, type(uint256).max). STACK.md shows Foundry's fuzzing capabilities are ideal for this. Testing validates security assumptions from Phase 1.

**Delivers:**
- Foundry test suite with 90%+ coverage
- Fuzz testing with 10,000+ runs per function
- Edge case tests: 1 wei swaps, extreme ratios (1000000:1), type(uint256).max
- Special token tests: ERC777 callbacks, fee-on-transfer, rebasing tokens
- Integration tests: end-to-end swap/liquidity scenarios
- Gas snapshots for optimization tracking

**Uses:** Foundry (forge test, forge coverage, forge snapshot), forge-std test utilities

**Addresses:** Validation of all Phase 1 security assumptions, documentation of supported token types

**Avoids:** Discovering critical vulnerabilities after user funds are at risk

### Phase 3: Frontend Enhancement - Safety & Education
**Rationale:** FEATURES.md identifies educational features as key differentiators for learning project. PITFALLS.md shows UX around slippage, approvals, and impermanent loss directly impacts user safety. Frontend is where SimpleDEX adds unique value over production DEXs.

**Delivers:**
- Educational mode showing x*y=k formula breakdown and step-by-step calculations
- Interactive bonding curve visualization (chart showing trades moving along curve)
- Impermanent loss calculator with price scenario analysis
- Transparent fee breakdown (where 0.3% goes, LP earnings over time)
- Price impact warnings (red display if >5%, require confirmation)
- Exact amount token approvals (never infinite by default)
- Clear error message mapping ("K" error → "Pool reserves depleted, try smaller amount")

**Uses:** Next.js 15.1+, React 19, wagmi v3.x, Tailwind CSS v4, Chart.js or Recharts for visualizations

**Implements:** Educational differentiators from FEATURES.md, UX pitfall prevention from PITFALLS.md #8

**Addresses:** Features marked P2 priority (educational mode, IL calculator, fee breakdown), unlimited approval pitfall

### Phase 4: Advanced Features & Production Readiness (Optional/Future)
**Rationale:** FEATURES.md explicitly defers multi-hop routing, concentrated liquidity, and yield farming as v2+ features that obscure core mechanics. ARCHITECTURE.md shows Router contract is optional for learning focus. This phase is only relevant if pivoting from learning to production.

**Delivers:**
- Router contract with slippage/deadline enforcement
- TWAP oracle implementation for external integrations
- Multi-hop routing with graph-based pathfinding
- LP performance analytics (APR tracking, historical returns)
- Gas optimization pass for mainnet deployment
- Multi-chain deployment scripts (Arbitrum, Optimism, Base)

**Uses:** OpenZeppelin AccessControl for Router, Slither + Mythril + professional audit before mainnet

**Addresses:** Features marked P3 priority (multi-hop routing), oracle manipulation pitfall, scaling considerations from ARCHITECTURE.md

**Note:** This phase may not align with learning goals and should be explicitly discussed before proceeding.

### Phase Ordering Rationale

**Why Phase 1 (Security Audit) comes first:**
- PITFALLS.md demonstrates vulnerabilities are catastrophic and unrecoverable (reentrancy, first deposit inflation)
- Recovery costs are HIGH (contract redeployment, user migration)
- The Cetus AMM hack ($200M, May 2025) proves security cannot be retrofitted
- Must validate security assumptions in existing codebase before building on it

**Why Phase 2 (Testing) before Phase 3 (Frontend):**
- ARCHITECTURE.md shows frontend depends on stable smart contract interfaces
- Testing validates Phase 1 security assumptions with edge cases
- PITFALLS.md shows testing with special tokens (ERC777, fee-on-transfer) uncovers subtle vulnerabilities
- Frontend changes are cheap; smart contract bugs require expensive migrations

**Why Phase 3 (Frontend) focuses on education:**
- FEATURES.md identifies educational features as core differentiator for learning project
- Production DEXs (Uniswap, PancakeSwap) don't show math - this is SimpleDEX's unique value
- PITFALLS.md #8 shows UX around approvals directly impacts user safety
- Impermanent loss education prevents user losses that don't compromise security but destroy trust

**Why Phase 4 (Advanced Features) is optional:**
- FEATURES.md explicitly defers concentrated liquidity, multi-hop routing, yield farming to v2+
- These features obscure understanding of base AMM mechanics (learning goal)
- ARCHITECTURE.md shows Router is optional for learning focus
- Production features add complexity without educational value

**Dependencies respect ARCHITECTURE.md build order:**
- Core contracts (Phase 1/2) have no frontend dependencies
- Frontend (Phase 3) depends on stable contract interfaces from Phase 1/2
- Advanced features (Phase 4) depend on core contracts + frontend foundation

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (if pursued):** Multi-hop routing algorithm requires graph theory research, DEX aggregator patterns (1inch, Paraswap) need investigation, complex implementation effort
- **Phase 4 (if pursued):** TWAP oracle implementation needs deep dive into Uniswap v2's cumulative price approach, UQ112x112 fixed-point arithmetic library

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Security audit uses standard checklist (CEI pattern, ReentrancyGuard, MINIMUM_LIQUIDITY burn) - well-documented in PITFALLS.md
- **Phase 2:** Foundry testing patterns are standard - forge-std provides cheatcodes, fuzzing is built-in, STACK.md covers tooling
- **Phase 3:** wagmi/React patterns are well-documented in official docs, RainbowKit has comprehensive guides, ARCHITECTURE.md provides examples

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Foundry, wagmi, Next.js docs; multiple benchmark studies (8.53s vs 14.56s Foundry vs Hardhat); 2026 community consensus clear |
| Features | HIGH | Uniswap v2 whitepaper (foundational), official Ethereum.org DEX design docs, competitor analysis (PancakeSwap, Uniswap), community best practices |
| Architecture | HIGH | Uniswap v2 whitepaper + RareSkills tutorial (detailed technical breakdown), academic survey (arXiv DEX with AMM protocols), official wagmi docs, multiple implementation guides |
| Pitfalls | HIGH | Real exploit case studies with dollar amounts (Cetus $200M, Li.Fi $9.7M, imBTC $300k), OWASP Smart Contract Top 10, official Uniswap v2 common errors doc, peer-reviewed security research |

**Overall confidence:** HIGH

Research is based on:
- **Official documentation:** Uniswap v2 whitepaper, Foundry docs, wagmi docs, Solidity releases, OpenZeppelin changelogs
- **Real exploits:** Cetus AMM ($200M, May 2025), Li.Fi Protocol ($9.7M, 2024), SocketDotTech ($3.3M, 2024), Uniswap V1 imBTC ($300k), bZx ($14M, 2020)
- **Academic sources:** arXiv DEX survey, OWASP Smart Contract Top 10, peer-reviewed security papers
- **Performance benchmarks:** Chainstack Foundry vs Hardhat (8.53s vs 14.56s compilation), MetaMask Viem vs ethers.js comparison (35KB vs 130KB)

### Gaps to Address

Despite high overall confidence, several areas need validation during implementation:

**1. Existing codebase security validation:**
- Gap: Research identifies critical patterns, but actual SimpleDEX implementation needs line-by-line audit
- Resolution: Phase 1 security audit must verify CEI pattern, ReentrancyGuard, MINIMUM_LIQUIDITY burn, multiply-before-divide ordering
- Risk: If existing code deviates from patterns, expensive contract redeployment required

**2. Special token support boundaries:**
- Gap: Research shows fee-on-transfer, rebasing, ERC777 tokens require special handling, but implementation complexity vs. learning value tradeoff unclear
- Resolution: During Phase 2 testing, document which token types are explicitly supported vs. unsupported; test with both standard ERC20 and edge cases
- Risk: Users may attempt unsupported tokens leading to locked funds or failed transactions

**3. Router necessity for learning goals:**
- Gap: ARCHITECTURE.md shows Router is optional, but PITFALLS.md shows slippage/deadline enforcement prevents user losses
- Resolution: During Phase 1/2, evaluate whether direct pool interaction with UI-side slippage checks suffices, or if Router contract provides meaningful learning value
- Risk: Without Router, users must understand low-level pool interactions; with Router, adds complexity that may obscure core mechanics

**4. Educational feature depth vs. distraction:**
- Gap: FEATURES.md identifies educational mode as differentiator, but optimal level of mathematical detail unclear
- Resolution: During Phase 3, start with basic formula display and user feedback will indicate if deeper explanations (step-by-step reserve calculations, fee allocation breakdown) add value
- Risk: Too much detail overwhelms, too little detail misses learning opportunity

**5. Testing coverage sufficiency:**
- Gap: Research recommends 90%+ coverage, fuzzing with 10,000+ runs, edge cases (1 wei, type(uint256).max), but exact test scenarios for x*y=k validation need definition
- Resolution: Phase 2 should establish test matrix covering: arithmetic edge cases, token variants, attack vectors, integration flows
- Risk: Insufficient testing leaves vulnerabilities undiscovered until user interaction

**6. Mainnet deployment path (if pursued):**
- Gap: FEATURES.md recommends against mainnet for learning project, but if requirements change, audit and deployment process undefined
- Resolution: If Phase 4 pursued, research professional audit firms (Trail of Bits, OpenZeppelin, Consensys Diligence), deployment checklist, incident response plan
- Risk: Mainnet deployment without proper audit and security measures risks real user funds

## Sources

### Primary (HIGH confidence)

**Foundational Specifications:**
- [Uniswap v2 Whitepaper](https://uniswap.org/whitepaper.pdf) - Architecture, constant product formula, core/periphery pattern
- [Uniswap v3 Development Book](https://uniswapv3book.com/milestone_0/constant-function-market-maker.html) - CPMM fundamentals
- [Solidity Official Releases](https://www.soliditylang.org/blog/category/releases/) - v0.8.28 features, v0.8.29 EOF

**Official Documentation:**
- [Foundry Documentation](https://getfoundry.sh/) - forge/cast/anvil, testing, deployment
- [wagmi v3.x Installation](https://wagmi.sh/react/installation) - Viem v2.x requirements, TanStack Query integration
- [RainbowKit Documentation](https://rainbowkit.com/docs/introduction) - v2.2.10 wallet connection, features
- [Next.js Version 15 Guide](https://nextjs.org/blog/next-15) - React 19 support, performance improvements
- [OpenZeppelin Contracts Changelog](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/CHANGELOG.md) - v5.x requirements
- [Ethereum.org DEX Design Best Practices](https://ethereum.org/developers/docs/design-and-ux/dex-design-best-practice/) - UI/UX guidelines
- [Uniswap v2 Common Errors](https://docs.uniswap.org/contracts/v2/reference/smart-contracts/common-errors) - K invariant, slippage

**Security Research:**
- [OWASP Smart Contract Top 10](https://owasp.org/www-project-smart-contract-top-10/) - Vulnerability categories
- [Dedaub: Cetus AMM $200M Hack Analysis](https://dedaub.com/blog/the-cetus-amm-200m-hack-how-a-flawed-overflow-check-led-to-catastrophic-loss/) - Overflow case study
- [OpenZeppelin: ERC4626 Inflation Attack Defense](https://blog.openzeppelin.com/a-novel-defense-against-erc4626-inflation-attacks) - First deposit protection
- [Kalis: Unlimited ERC20 Allowances Considered Harmful](https://kalis.me/unlimited-erc20-allowances/) - Approval risks

**Academic Sources:**
- [arXiv: SoK - DEX with AMM Protocols](https://arxiv.org/pdf/2103.12732) - Comprehensive AMM survey
- [ACM: SoK - DEX with AMM Protocols](https://dl.acm.org/doi/10.1145/3570639) - Peer-reviewed research
- [arXiv: Quantifying Risk of Unlimited Approvals](https://arxiv.org/pdf/2207.01790) - Approval security analysis

### Secondary (MEDIUM confidence)

**Performance Benchmarks:**
- [Chainstack: Foundry vs Hardhat](https://chainstack.com/foundry-hardhat-differences-performance/) - 8.53s vs 14.56s compilation
- [MetaMask: Viem vs ethers.js](https://metamask.io/news/viem-vs-ethers-js-a-detailed-comparison-for-web3-developers) - 35KB vs 130KB bundle size
- [Tailwind CSS v4 Release](https://tailwindcss.com/blog/tailwindcss-v4) - 5x faster builds

**Implementation Guides:**
- [RareSkills: Uniswap V2 Architecture Tutorial](https://rareskills.io/post/uniswap-v2-tutorial) - Detailed technical breakdown
- [Speedrun Ethereum: ERC20 Approve Pattern](https://speedrunethereum.com/guides/erc20-approve-pattern) - Security best practices
- [Cyfrin: Reentrancy Attacks](https://www.cyfrin.io/blog/what-is-a-reentrancy-attack-solidity-smart-contracts) - Attack vectors
- [Jeiwan: Programming DeFi Uniswap V2](https://jeiwan.net/posts/programming-defi-uniswapv2-1/) - Implementation walkthrough

**Security Exploits:**
- [Medium: ERC777 Reentrancy Vulnerability](https://medium.com/@Heuss/unprotected-swap-function-a-erc777-reentrancy-vulnerability-81aaeaa75a2a) - Real exploit analysis
- [Dedaub: ERC777 Latent Bugs](https://dedaub.com/blog/erc777-tokens-latent-bugs-in-billion-plus-dollar-code/) - Billion-dollar code analysis

**Feature Research:**
- [Chainlink: What is an AMM?](https://chain.link/education-hub/what-is-an-automated-market-maker-amm) - AMM fundamentals
- [Gemini Cryptopedia: AMM](https://www.gemini.com/cryptopedia/amm-what-are-automated-market-makers) - Comprehensive overview
- [KyberSwap: Slippage Documentation](https://docs.kyberswap.com/getting-started/foundational-topics/decentralized-finance/slippage) - Slippage mechanics
- [Uniswap Blog: Minimize Slippage](https://blog.uniswap.org/minimize-slippage-on-swaps) - Best practices

**Tooling:**
- [Protofire: Solhint ESP Grant](https://medium.com/@Protofire_io/protofire-received-ethereum-foundation-esp-grant-to-maintain-and-evolve-solhint-q2-2025-q1-2026-9eb32fd4ef17) - 2025-2026 development
- [QuillAudits: Smart Contract Security Tools 2025](https://www.quillaudits.com/blog/smart-contract/smart-contract-security-tools-guide) - Slither 92+ detectors

### Tertiary (LOW confidence - needs validation)

**Trends & Opinion:**
- [Eco: Top DEXs in 2026](https://eco.com/support/en/articles/13313257-top-dexs-in-2026-complete-guide-to-the-best-decentralized-exchanges) - Current trends
- [Metana: PancakeSwap vs Uniswap 2025](https://metana.io/blog/pancakeswap-vs-uniswap-which-dex-reigns-supreme/) - Competitor comparison
- [iLink: DeFi Frontend 2026](https://ilink.dev/blog/defi-app-development-in-2025-key-features-tech-stack-and-cost-breakdown) - Modern patterns

---
**Research completed:** February 16, 2026
**Ready for roadmap:** Yes
**Next step:** Roadmapper agent uses this summary to create phase-based roadmap in ROADMAP.md
