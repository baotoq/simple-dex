# Technology Stack

**Project:** SimpleDEX - AMM DEX
**Researched:** February 16, 2026
**Confidence:** HIGH

## Recommended Stack

### Smart Contract Development

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Foundry | Latest (nightly) | Smart contract development, testing, deployment | 5x faster compilation than Hardhat, native Solidity testing, built-in fuzzing, gas snapshots. Industry standard for new projects in 2026. |
| Solidity | ^0.8.28 | Smart contract language | Latest stable with transient storage support. 0.8.29+ adds EOF (experimental). Use 0.8.28 for production stability. |
| forge-std | ^1.14.0 | Testing utilities and cheatcodes | Official Foundry standard library. Provides console logging, assertions, VM cheatcodes for test manipulation. |
| Anvil | (bundled with Foundry) | Local Ethereum node | Fast in-memory EVM node with instant mining, forking capabilities, 10 pre-funded accounts with 10,000 ETH each. |

### Frontend Development

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | ^15.1 | React framework | Production-ready with React 19 support, excellent DX, built-in optimization. v15+ required for React 19 compatibility. |
| React | ^19 | UI library | Latest stable release (Dec 2024), improved concurrent features, better TypeScript support. |
| TypeScript | ^5.x | Type safety | Essential for Web3 development. Viem and Wagmi provide excellent type inference. |
| Tailwind CSS | ^4.x | Styling | 5x faster builds, 100x faster incremental builds, CSS-first configuration. 35KB bundle size makes it ideal for DApps. |

### Web3 Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Viem | ^2.x | Ethereum client | Modern ethers.js replacement. 35KB vs 130KB, TypeScript-first, modular architecture, better type safety at compile-time. |
| Wagmi | ^3.x | React hooks for Web3 | De facto standard for React Web3 apps. Built on Viem and TanStack Query. First-class TypeScript support with automatic type inference. |
| @tanstack/react-query | ^5.x | Async state management | Required peer dependency for Wagmi. Handles request caching, refetching, state management. |
| RainbowKit | ^2.2.x | Wallet connection UI | Polished wallet modal with ENS resolution, balance display, network switching. Built on Wagmi/Viem. Alternative: Reown AppKit. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| OpenZeppelin Contracts | ^5.x | Secure contract utilities | Use for ERC20 base implementations, reentrancy guards, access control patterns. Requires Solidity ^0.8.20+. |
| @openzeppelin/contracts-upgradeable | ^5.x | Upgradeable contract patterns | Only if implementing proxy patterns. Not recommended for learning-focused AMM. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Solhint | Solidity linter | Funded by Ethereum Foundation through 2026. 92+ vulnerability detectors. Run in CI/CD. |
| Slither | Static security analysis | Python-based, 92 detectors, 30-second scans. Essential for security checks before audits. |
| Foundry Gas Snapshots | Gas optimization tracking | Built into forge test --gas-snapshot. Track gas changes over time. |
| forge fmt | Code formatting | Solidity formatter included with Foundry. Consistent style across team. |

## Installation

### Smart Contracts

```bash
# Install Foundry (includes forge, cast, anvil, chisel)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Initialize project (already done for SimpleDEX)
forge init

# Install OpenZeppelin (if needed)
forge install OpenZeppelin/openzeppelin-contracts

# Install Solhint
npm install -g solhint

# Install Slither
pip3 install slither-analyzer
```

### Frontend

```bash
# Core dependencies
npm install next@latest react@latest react-dom@latest

# Web3 integration
npm install wagmi viem@2.x @tanstack/react-query

# Wallet UI
npm install @rainbow-me/rainbowkit

# Styling
npm install -D tailwindcss@latest postcss autoprefixer

# TypeScript
npm install -D typescript @types/react @types/node
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Smart Contract Framework | Foundry | Hardhat | Hardhat is slower (14.56s vs 8.53s for 26 contracts), requires JavaScript for tests. Use Hardhat only if you need extensive plugin ecosystem or complex deployment scripts. |
| Ethereum Client | Viem | ethers.js | ethers.js is 130KB vs 35KB, lacks compile-time type safety, verbose async/await. Use ethers.js only for legacy codebases or if team strongly prefers its API. |
| Wallet Connection | RainbowKit | Reown AppKit (Web3Modal) | Both are excellent. RainbowKit has better Wagmi integration and UX. AppKit better for multi-chain (Solana, Bitcoin). For EVM-only AMM, RainbowKit wins. |
| Styling | Tailwind CSS v4 | Tailwind v3 | v4 is 5x faster with CSS-first config. No reason to use v3 for new projects in 2026. |
| Testing Framework | Foundry (Solidity tests) | Hardhat (JavaScript) | Writing tests in Solidity eliminates context-switching, runs faster, enables property-based testing with same language as contracts. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Truffle | Deprecated, slow, outdated | Foundry or Hardhat |
| Remix IDE for production | Browser-based, not suitable for complex projects | Foundry + VSCode |
| web3.js | Outdated API design, poor TypeScript support | Viem |
| Solidity <0.8.0 | Lacks built-in overflow protection | Solidity ^0.8.28 |
| Custom ERC20 from scratch | Reinventing the wheel, security risks | OpenZeppelin ERC20 |
| Mythril for CI/CD | 5 minutes per scan, too slow for CI | Slither (30 seconds) + Mythril for deep audits |
| Next.js <15 with React 19 | Incompatible | Next.js 15.1+ |

## Stack Patterns by Use Case

### Learning-Focused AMM (SimpleDEX)

**Recommended:**
- Foundry for contracts (learn Solidity testing in Solidity)
- Anvil for local development (instant feedback loop)
- Next.js + Wagmi + RainbowKit for frontend (modern standard stack)
- NO upgradeability patterns (adds complexity without learning value)
- OpenZeppelin for ERC20 base only (understand the implementation)

**Rationale:** Minimize JavaScript context-switching, maximize time understanding AMM mechanics.

### Production AMM DEX

**Additional considerations:**
- Concentrated liquidity (Uniswap v3 style) is baseline expectation in 2026
- Multi-chain deployment via Layer 2s (Arbitrum, Optimism, Base)
- Slither + Mythril + professional audit before mainnet
- Upgradeable contracts if iterating on protocol
- Gas optimization as primary concern

### Cross-Chain AMM

**Different stack:**
- Consider LayerZero or Hyperlane for cross-chain messaging
- Reown AppKit instead of RainbowKit (better multi-chain support)
- Solana/Cosmos SDKs if expanding beyond EVM

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Wagmi v3.x | Viem v2.x + TanStack Query v5.x | Wagmi v2+ completely redesigned around Viem. Not backward compatible with v1. |
| RainbowKit v2.2+ | Wagmi v2+ | RainbowKit v1 used Wagmi v1. Ensure versions align. |
| Next.js 15+ | React 18 or 19 | React 19 recommended but React 18 still supported for Pages Router. |
| Solidity 0.8.28 | forge-std 1.14.0 | forge-std requires ^0.8.13. OpenZeppelin v5 requires ^0.8.20. |
| Foundry (any) | Solidity 0.8.0-0.8.34+ | Foundry supports all modern Solidity versions via solc switching. |

## Security Tools Integration

### Pre-Commit Hooks

```bash
# .husky/pre-commit
forge fmt --check
solhint 'contracts/**/*.sol'
forge test
```

### CI/CD Pipeline

```bash
# .github/workflows/security.yml
- name: Run Slither
  run: slither . --exclude-dependencies

- name: Gas Snapshot
  run: forge snapshot --check

- name: Coverage
  run: forge coverage --report lcov
```

### Pre-Audit Checklist

1. Slither analysis (30 seconds, 92 detectors)
2. Mythril symbolic execution (5 minutes, deep analysis)
3. Manual review with Solhint rules
4. Foundry fuzzing with 10,000+ runs
5. Gas optimization review with forge snapshot
6. Professional audit (for mainnet deployment)

## Development Workflow

### Smart Contracts

```bash
# 1. Write contract
vim contracts/LiquidityPool.sol

# 2. Write test (same language!)
vim contracts/LiquidityPool.t.sol

# 3. Run tests with gas report
forge test --gas-report

# 4. Fuzz test automatically
forge test --fuzz-runs 10000

# 5. Check coverage
forge coverage

# 6. Deploy to local Anvil
anvil  # Terminal 1
forge script scripts/deploy.ts --broadcast --rpc-url http://localhost:8545  # Terminal 2
```

### Frontend

```bash
# 1. Start Anvil
anvil

# 2. Deploy contracts
forge script scripts/deploy.ts --broadcast --rpc-url http://localhost:8545

# 3. Generate TypeScript ABIs
forge build && node scripts/generate-abis.ts

# 4. Start frontend
cd frontend && npm run dev

# 5. Connect wallet to localhost:8545
```

## Sources

### HIGH Confidence Sources

- [Foundry Official Documentation](https://getfoundry.sh/) - Installation, Anvil overview, forge-std
- [Wagmi Installation Guide](https://wagmi.sh/react/installation) - Wagmi v3.x + Viem v2.x + TanStack Query requirements
- [RainbowKit Documentation](https://rainbowkit.com/docs/introduction) - v2.2.10 features and requirements
- [Solidity Releases](https://www.soliditylang.org/blog/category/releases/) - v0.8.28, v0.8.29 announcements
- [Next.js Version 15 Guide](https://nextjs.org/blog/next-15) - React 19 support
- [Tailwind CSS v4 Release](https://tailwindcss.com/blog/tailwindcss-v4) - Performance improvements
- [OpenZeppelin Contracts Changelog](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/CHANGELOG.md) - v5.x Solidity requirements

### MEDIUM Confidence Sources

- [Foundry vs Hardhat Comparison (Chainstack)](https://chainstack.com/foundry-hardhat-differences-performance/) - Performance benchmarks (8.53s vs 14.56s)
- [Viem vs ethers.js (MetaMask)](https://metamask.io/news/viem-vs-ethers-js-a-detailed-comparison-for-web3-developers) - Bundle size comparison (35KB vs 130KB)
- [Solhint ESP Grant Announcement](https://medium.com/@Protofire_io/protofire-received-ethereum-foundation-esp-grant-to-maintain-and-evolve-solhint-q2-2025-q1-2026-9eb32fd4ef17) - 2025-2026 development roadmap
- [Top Smart Contract Security Tools 2025](https://www.quillaudits.com/blog/smart-contract/smart-contract-security-tools-guide) - Slither 92+ detectors
- [TanStack Query NPM](https://www.npmjs.com/package/@tanstack/react-query) - v5.90.21 latest version

### Additional Context

- [AMM DEX Development Fundamentals](https://rocknblock.io/blog/amm-dex-development-fundamentals) - Constant product formula, liquidity pools
- [Reown AppKit Overview](https://reown.com/blog/walletconnect-modal-vs-web3modal-differences-for-d) - AppKit vs RainbowKit comparison
- [Slither GitHub](https://github.com/crytic/slither) - Static analyzer for Solidity
- [forge-std Releases](https://github.com/foundry-rs/forge-std/releases) - v1.14.0 (January 5, 2026)

---
*Stack research for: AMM DEX Development*
*Researched: February 16, 2026*
*Focus: Learning-first approach with production-ready tools*
