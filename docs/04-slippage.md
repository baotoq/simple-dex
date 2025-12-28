# Slippage Protection

## What is Slippage?

The difference between expected price and actual execution price.

```
You expect:  100 ETH → 200 USDC (rate 1:2)
You receive: 100 ETH → 190 USDC (rate 1:1.9)
Slippage:    5%
```

## Why Does Slippage Happen?

### 1. Price Impact (AMM Math)

Large trades move the price more due to the x*y=k formula:

```
Pool: 1000 ETH : 2000 USDC

Small trade (1 ETH):
  Output = 2000 * 1 / (1000 + 1) = 1.998 USDC
  Rate = 1:1.998 (almost 1:2)

Large trade (100 ETH):
  Output = 2000 * 100 / (1000 + 100) = 181.8 USDC
  Rate = 1:1.818 (9% worse than small trade)
```

### 2. Front-running

Someone sees your transaction and trades before you:

```
1. You submit: Buy 100 ETH at $2000 max
2. Bot sees your pending tx in mempool
3. Bot buys ETH first → price goes up
4. Your tx executes at higher price
5. Bot sells ETH → profits from the price increase
```

### 3. Block Delay

Price changes between when you submit and when tx confirms.

## How to Protect Against Slippage

### Set minAmountOut

```solidity
// In your swap call:
function swap(
    address tokenIn,
    uint256 amountIn,
    uint256 minAmountOut  // ← Minimum you'll accept
) external returns (uint256 amountOut) {
    // ... calculate amountOut ...

    require(amountOut >= minAmountOut, "Slippage too high");

    // ... execute swap ...
}
```

### Calculate minAmountOut

```typescript
// Frontend code:
const expectedOutput = await pool.read.getAmountOut([token, amount]);

// Allow 1% slippage
const slippageTolerance = 0.01; // 1%
const minOutput = expectedOutput * BigInt(Math.floor((1 - slippageTolerance) * 1000)) / 1000n;

await pool.write.swap([token, amount, minOutput]);
```

## Slippage Settings in Real DEXs

| DEX | Default Slippage | Notes |
|-----|------------------|-------|
| Uniswap | 0.5% | Auto-adjusts for stablecoins |
| PancakeSwap | 0.5% | Often needs higher for tax tokens |
| 1inch | 1% | Aggregates multiple DEXs |

## When to Use Higher Slippage

| Situation | Suggested Slippage |
|-----------|-------------------|
| Stablecoin pairs | 0.1% - 0.5% |
| Major tokens (ETH, BTC) | 0.5% - 1% |
| Low liquidity tokens | 1% - 5% |
| Very volatile markets | 3% - 10% |
| Tokens with tax/fee | 10% - 15% |

## Visual Example

```
Your swap: 100 ETH for USDC
Expected: 180,000 USDC

Slippage 1%:
┌────────────────────────────────────────┐
│  minAmountOut = 180,000 × 0.99         │
│               = 178,200 USDC           │
│                                        │
│  If you get 178,200+ → Success ✓       │
│  If you get < 178,200 → Revert ✗       │
└────────────────────────────────────────┘
```

## Key Takeaways

1. **Slippage** = difference between expected and actual price
2. **Causes**: AMM math, front-running, price movement
3. **Protection**: Set `minAmountOut` parameter
4. **Too low slippage** = transactions may fail
5. **Too high slippage** = you may get bad prices
6. **Best practice**: Use 0.5-1% for major tokens
