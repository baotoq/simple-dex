# AMM Formula: Constant Product (x * y = k)

## The Core Concept

An Automated Market Maker (AMM) uses a mathematical formula to determine prices instead of an order book.

The **Constant Product Formula**:
```
x * y = k

Where:
- x = reserve of token0
- y = reserve of token1
- k = constant (product of reserves)
```

## Visual Explanation

```
BEFORE SWAP:
┌─────────────────────────────────────────┐
│  Pool: 1000 ETH × 2000 USDC = 2,000,000 │
│        (x)         (y)          (k)     │
└─────────────────────────────────────────┘

SWAP 100 ETH for USDC:
┌─────────────────────────────────────────┐
│  New x = 1000 + 100 = 1100 ETH          │
│                                         │
│  New y = k / x = 2,000,000 / 1100       │
│        = 1818.18 USDC                   │
│                                         │
│  USDC out = 2000 - 1818.18 = 181.82     │
└─────────────────────────────────────────┘

AFTER SWAP:
┌─────────────────────────────────────────┐
│  Pool: 1100 ETH × 1818.18 USDC = 2M     │
│        (k stays constant!)              │
└─────────────────────────────────────────┘
```

## The Formula for Output Amount

```
amountOut = (reserveOut * amountIn) / (reserveIn + amountIn)
```

With 0.3% fee:
```
amountInWithFee = amountIn * 997 / 1000

amountOut = (reserveOut * amountInWithFee) / (reserveIn * 1000 + amountInWithFee)
```

## Price Impact

Larger trades get worse rates because they move the price more:

| Trade Size | Input | Output | Rate |
|------------|-------|--------|------|
| Small | 10 ETH | 19.7 USDC | 1:1.97 |
| Medium | 100 ETH | 181.8 USDC | 1:1.82 |
| Large | 500 ETH | 666.7 USDC | 1:1.33 |

This is called **slippage** or **price impact**.

## Why This Works

1. **No counterparty needed** - Price is determined by math
2. **Always liquid** - You can always trade (at some price)
3. **Self-balancing** - Arbitrageurs keep prices aligned with market

## Limitations

1. **Capital inefficient** - Liquidity spread across all prices
2. **Impermanent loss** - LPs can lose vs. just holding
3. **Price manipulation** - Large trades can move price significantly
