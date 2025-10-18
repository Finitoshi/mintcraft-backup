# Meteora Token Requirements

## Critical Discovery: Freeze Authority Restriction

Through testing, we discovered that **Meteora DLMM pools require tokens to NOT have freeze authority**.

## Test Results

### ❌ Failed: Token with Freeze Authority
```
Token: B9NVdv1pTQbtpp6aTg96AjwLq2u5HCzHL9xr9LxycbZc
Freeze Authority: ovXjqNBujbbpeXZ6r1G4bJyMGxbDAoSfa98MSdLFc3K
Error: UnsupportedTokenMint (Error Code: 0x17b9)
```

### ✅ Success: Token without Freeze Authority
```
Token: CZQzHq9dcffWRj8inK2GL2qazaV5ieCY98BYq9Y2hxhc
Freeze Authority: (not set)
Pool: GDtsBcbB69bKinxnjYDMqxkho5WbJgDTTQ42RHmizVgr
Transaction: 2deWoGMjqVXf7Rk83fTJcLaSXaMSegNdF7DhW2zDWk5J6WpZdbxbNgNaUUzsYRAEnoHne5uBfYfkyZ1koWWnJT7j
Status: ✅ Created successfully via API
```

## Why This Restriction Exists

Meteora protects liquidity providers by **preventing tokens with freeze authority** from being used in pools.

If a token could be frozen:
- Liquidity providers could lose access to their tokens
- Trading could be halted arbitrarily
- Pool manipulation would be possible

By requiring no freeze authority, Meteora ensures:
- ✅ Tokens in pools cannot be frozen
- ✅ Liquidity remains accessible
- ✅ Fair trading environment

## How to Create Meteora-Compatible Tokens

### Using @solana/spl-token

```javascript
import { createMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Create Token-2022 WITHOUT freeze authority
const mint = await createMint(
  connection,
  payer,
  mintAuthority,
  null,  // ← IMPORTANT: No freeze authority!
  9,     // decimals
  undefined,
  undefined,
  TOKEN_2022_PROGRAM_ID
);
```

### Using spl-token CLI

```bash
# Create token without freeze authority (omit --freeze-authority flag)
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --decimals 9

# ❌ DO NOT use --freeze-authority flag if you want Meteora pools
```

## MintCraft Integration

When creating tokens in MintCraft for Meteora pools:

1. **Remove freeze authority option** from token creation form
2. **Or** add checkbox: "Make Meteora-compatible (no freeze authority)"
3. **Document** this requirement in the UI

### Suggested UI Flow

```typescript
// Token creation form
<Checkbox 
  label="Create Meteora Pool after minting"
  description="Requires token to be created without freeze authority"
  onChange={(checked) => {
    if (checked) {
      // Automatically disable freeze authority
      setFreezeAuthority(null);
      setFreezeAuthorityDisabled(true);
    }
  }}
/>
```

## Verification

You can verify a token's freeze authority status:

```bash
# Check if token has freeze authority
spl-token display YOUR_TOKEN_MINT --url devnet

# Look for this line:
# Freeze authority: (not set)  ✅ Meteora compatible
# Freeze authority: 7x8k...     ❌ Cannot create Meteora pool
```

## Summary

| Token Attribute | Meteora Requirement | Why |
|----------------|---------------------|-----|
| Token Program | Token-2022 or SPL Token | Both supported ✅ |
| Freeze Authority | MUST be null | Protects liquidity providers |
| Mint Authority | Can be present | Allowed |
| Transfer Fees | Supported | Works with extensions ✅ |
| Transfer Hooks | Supported | Works with extensions ✅ |

---

**Key Takeaway**: The API wrapper works perfectly for Token-2022. The "UnsupportedTokenMint" error was specifically due to freeze authority, not Token-2022 compatibility.

**Tested**: 2025-10-17
**Status**: Verified on devnet
**Working Pools**: 2 Token-2022 pools created successfully
