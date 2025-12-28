# Liquidity Providers (LPs)

## What is a Liquidity Provider?

A person who deposits tokens into a pool so others can trade. In return, they:
- Receive **LP tokens** (proof of ownership)
- Earn **fees** from every swap (0.3%)

## How It Works

### Adding Liquidity

```
┌─────────┐                         ┌──────────────┐
│   You   │   100 ETH + 200 USDC    │    Pool      │
│         │ ────────────────────►   │              │
│         │   ◄────────────────     │ 1000 ETH     │
│         │      50 LP tokens       │ 2000 USDC    │
└─────────┘                         └──────────────┘

Your LP tokens = (your deposit / total pool) × total LP supply
               = (100/1000) × 500
               = 50 LP tokens (10% ownership)
```

### Earning Fees

Every swap pays 0.3% fee:
```
Trader swaps 1000 ETH → USDC
Fee = 1000 × 0.3% = 3 ETH goes to pool

Your share = 10% of pool
Your earnings = 0.3 ETH (accumulated in pool)
```

### Removing Liquidity

```
┌─────────┐                         ┌──────────────┐
│   You   │      50 LP tokens       │    Pool      │
│         │ ────────────────────►   │              │
│         │   ◄────────────────     │              │
│         │   110 ETH + 180 USDC    │              │
└─────────┘   (+ fees earned!)      └──────────────┘
```

## LP Token Math

### First Depositor
```solidity
liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY

// Example: 1000 ETH × 1000 USDC
liquidity = sqrt(1000 × 1000) - 1000
         = 1000 - 1000 = ~0 (actually ~999999...)
```

### Subsequent Depositors
```solidity
liquidity = min(
    (amount0 * totalSupply) / reserve0,
    (amount1 * totalSupply) / reserve1
)

// Must deposit in the same ratio as the pool
```

## Impermanent Loss

If token prices change, LPs can lose value compared to just holding.

```
Initial: 1 ETH = 100 USDC
You deposit: 10 ETH + 1000 USDC ($2000 total)

Later: 1 ETH = 400 USDC (ETH 4x'd!)
Pool rebalances: ~5 ETH + 2000 USDC (still $4000 total)

If you held: 10 ETH + 1000 USDC = $5000
As LP: 5 ETH + 2000 USDC = $4000

Impermanent Loss = $1000 (20%)
```

**Why "impermanent"?** If prices return to original, the loss disappears.

## When to be an LP

| Good time | Bad time |
|-----------|----------|
| Stable pairs (USDC/USDT) | Volatile pairs |
| High trading volume | Low volume |
| Fees > impermanent loss | Major price moves expected |

## Key Takeaways

1. **LPs provide liquidity** for traders
2. **LP tokens** represent your share of the pool
3. **0.3% fee** on every swap goes to LPs
4. **Impermanent loss** is the risk of being an LP
5. **Profitable if** trading fees > impermanent loss
