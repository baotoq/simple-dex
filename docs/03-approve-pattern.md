# The Approve/TransferFrom Pattern

## Why Is This Needed?

In traditional finance, you authorize payments directly. In blockchain, contracts need **explicit permission** to move your tokens.

## The Problem

```
// This WON'T work:
contract DEX {
    function swap(address token, uint amount) {
        // DEX tries to take your tokens
        token.transfer(DEX, amount);  // FAILS! DEX is msg.sender, not you
    }
}
```

The token's `transfer` uses `msg.sender` (the DEX), not your address.

## The Solution: Approve + TransferFrom

### Step 1: You Approve
```solidity
// You call this on the token contract
token.approve(DEX_ADDRESS, 100);

// This sets:
allowance[YourAddress][DEX_ADDRESS] = 100;
// "DEX can spend up to 100 of my tokens"
```

### Step 2: DEX Uses TransferFrom
```solidity
contract DEX {
    function swap(address token, uint amount) {
        // DEX calls transferFrom (uses your approval)
        token.transferFrom(msg.sender, address(this), amount);
        // This checks: allowance[msg.sender][DEX] >= amount
    }
}
```

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: You approve the DEX                                 │
│                                                             │
│   You ──────────────────────────────────────► Token         │
│        "approve(DEX, 100)"                    Contract      │
│                                                             │
│   Result: allowance[You][DEX] = 100                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: You call swap on DEX                                │
│                                                             │
│   You ──────────────────────────────────────► DEX           │
│        "swap(tokenA, 50)"                     Contract      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: DEX pulls your tokens                               │
│                                                             │
│   DEX ──────────────────────────────────────► Token         │
│        "transferFrom(You, DEX, 50)"           Contract      │
│                                                             │
│   Token checks:                                             │
│   - allowance[You][DEX] >= 50? ✓                            │
│   - balanceOf[You] >= 50? ✓                                 │
│                                                             │
│   Result:                                                   │
│   - balanceOf[You] -= 50                                    │
│   - balanceOf[DEX] += 50                                    │
│   - allowance[You][DEX] = 50 (100 - 50)                     │
└─────────────────────────────────────────────────────────────┘
```

## Code Example

```typescript
// In your frontend/script:

// 1. Approve DEX to spend 100 tokens
await token.write.approve([dexAddress, parseUnits("100", 18)]);

// 2. Now you can swap
await dex.write.swap([tokenAddress, parseUnits("50", 18), minOutput]);
```

## Common Patterns

### Exact Approval
```solidity
// Approve exactly what you need
token.approve(DEX, 100);
// Safe, but requires approval before each swap
```

### Unlimited Approval
```solidity
// Approve maximum amount (once)
token.approve(DEX, type(uint256).max);
// Convenient, but risky if DEX is hacked
```

### Check Before Approve
```typescript
// Only approve if needed
const currentAllowance = await token.read.allowance([user, dex]);
if (currentAllowance < amount) {
    await token.write.approve([dex, amount]);
}
```

## Security Considerations

1. **Only approve trusted contracts** - A malicious contract can drain your tokens
2. **Revoke unused approvals** - Set allowance to 0 when done
3. **Use Permit (ERC-2612)** - Newer standard that combines approve + action in one transaction

## Key Takeaways

1. **Contracts can't just take your tokens** - They need permission
2. **approve()** sets the allowance
3. **transferFrom()** uses the allowance
4. **Allowance decreases** as it's used
5. **Always verify** what you're approving
