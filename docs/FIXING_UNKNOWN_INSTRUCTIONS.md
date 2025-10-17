# Fixing "Unknown" Instructions in Solana Explorer

## The Problem

When viewing your token on Solana Explorer, some instructions appear as "Unknown" instead of showing descriptive names like "Initialize Max Wallet Config" or "Initialize Transfer Hook". This can confuse or worry investors.

Based on your token transaction at `2UA36agfD5PizwjWt4Qd41vDuvbNgj3sqaLd4PijJDbY`, the "Unknown" instructions are:

1. **Initialize Transfer Hook** (Token-2022 extension) - Shows as "Unknown"
2. **Initialize Max Wallet Config** (Your custom Anchor program) - Shows as "Unknown"

## Why This Happens

Solana Explorer needs the **IDL (Interface Definition Language)** file to decode instruction names. Without the IDL:
- Token-2022's newer extensions (like Transfer Hook) may not be indexed yet
- Custom Anchor programs are completely unrecognizable

## Solutions

### Solution 1: Upload Your IDL to Solana (Recommended)

This will make your custom "Initialize Max Wallet Config" instruction show properly on Explorer.

**Step 1: Verify your program is deployed**
```bash
solana program show Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 --url devnet
```

**Step 2: Initialize the IDL buffer (one-time setup)**
```bash
anchor idl init \
  --filepath target/idl/mintcraft.json \
  Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 \
  --provider.cluster devnet
```

**Step 3: Update the IDL whenever you make changes**
```bash
anchor idl upgrade \
  --filepath target/idl/mintcraft.json \
  Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 \
  --provider.cluster devnet
```

**Step 4: Verify it's uploaded**
```bash
anchor idl fetch Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 \
  --provider.cluster devnet \
  -o /tmp/fetched-idl.json

cat /tmp/fetched-idl.json
```

**What this fixes:**
- ✅ "Initialize Max Wallet Config" will show with proper name
- ✅ "Update Max Wallet Config" will show with proper name
- ✅ "Execute" (transfer hook) will show with proper name
- ❌ Token-2022's "Initialize Transfer Hook" may still show as Unknown (depends on Explorer indexing)

---

### Solution 2: Use a Different Explorer

Some explorers have better indexing for Token-2022 extensions:

**Solscan (Recommended for Token-2022)**
- URL: `https://solscan.io/token/2UA36agfD5PizwjWt4Qd41vDuvbNgj3sqaLd4PijJDbY?cluster=devnet`
- Better support for newer Token-2022 extensions
- Often shows instruction names that Solana Explorer doesn't

**SolanaFM**
- URL: `https://solana.fm/address/2UA36agfD5PizwjWt4Qd41vDuvbNgj3sqaLd4PijJDbY?cluster=devnet-solana`
- Good transaction decoding
- Detailed instruction breakdown

**XRAY by Helius**
- URL: `https://xray.helius.xyz/tx/2FAmfYZ8zDUF6tvehMhAZQe7Mm1LPHzYLA117H351QVmJJvN?network=devnet`
- Excellent instruction decoding
- Shows program logs and detailed execution flow

---

### Solution 3: Update the Metadata Instruction to Use Metaplex SDK

The Metaplex "CreateV1" instruction might show as "Unknown (Inner)" because we're manually serializing it. Using the official SDK method can help.

**Current implementation** (in `transaction-builder.ts`):
```typescript
const metadataData = MPLMetadata.getCreateV1InstructionDataSerializer().serialize({
  // ... metadata fields
});

const metadataInstruction = new TransactionInstruction({
  programId: TOKEN_METADATA_PROGRAM_ID,
  keys: [/* manual account list */],
  data: Buffer.from(metadataData),
});
```

**Better approach** (use the SDK's instruction builder):
```typescript
import { createV1 } from '@metaplex-foundation/mpl-token-metadata';

// Use the SDK's createV1 helper which properly formats the instruction
const metadataInstruction = createV1(umi, {
  mint: mintKeypair.publicKey,
  authority: payerWallet,
  name: sanitizedName,
  symbol: sanitizedSymbol,
  uri: sanitizedUri,
  sellerFeeBasisPoints: { basisPoints: 0, decimals: 2 },
  tokenStandard: TokenStandard.Fungible,
  // ... other fields
}).getInstructions()[0];
```

**Note:** This requires integrating Metaplex's Umi framework, which is a larger refactor.

---

### Solution 4: Wait for Explorer Indexing

Token-2022 extensions are relatively new. Solana Explorer is constantly being updated to support new instruction types.

**What you can do:**
1. Report the missing instruction types to Solana Explorer team
2. Check back periodically - they may have added support
3. In the meantime, use Solution 1 (upload IDL) for your custom instructions

---

## Recommended Immediate Actions

**For your investors' peace of mind:**

1. **Upload your IDL now** (Solution 1) - This is quick and will fix the custom program instructions
2. **Use Solscan links** instead of Solana Explorer in your marketing/docs
3. **Add a note to your documentation** explaining what each transaction does:

Example documentation:
```markdown
## Token Creation Transaction Breakdown

When you mint BITTY tokens, the following operations occur:

1. **Create Mint Account** - Creates the Token-2022 mint
2. **Initialize Transfer Fee** - Configures the 2.5% transfer tax
3. **Initialize Transfer Hook** - Enables custom transfer validation
4. **Initialize Mint** - Finalizes the mint configuration
5. **Create Token Account** - Creates your token wallet
6. **Mint Initial Supply** - Mints 1B tokens to your wallet
7. **Create Metadata** - Adds name, symbol, and logo on-chain
8. **Initialize Max Wallet Config** - Sets the max wallet cap to 5%

All operations complete in a single atomic transaction for security.
```

---

## Commands Reference

### Upload IDL (First Time)
```bash
anchor idl init \
  --filepath target/idl/mintcraft.json \
  Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 \
  --provider.cluster devnet
```

### Update IDL (After Changes)
```bash
# Rebuild to regenerate IDL
anchor build

# Upload the updated IDL
anchor idl upgrade \
  --filepath target/idl/mintcraft.json \
  Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 \
  --provider.cluster devnet
```

### Verify IDL is Live
```bash
anchor idl fetch Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 \
  --provider.cluster devnet
```

### Close IDL Account (if you need to reset)
```bash
anchor idl close \
  Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 \
  --provider.cluster devnet
```

---

## Expected Results

**After uploading IDL:**

| Instruction | Before | After |
|-------------|--------|-------|
| Initialize Transfer Fee | ✅ Shows correctly | ✅ Shows correctly |
| Initialize Transfer Hook | ❌ Unknown | ⚠️ Still Unknown (Token-2022 issue) |
| Initialize Mint | ✅ Shows correctly | ✅ Shows correctly |
| Create Token Account | ✅ Shows correctly | ✅ Shows correctly |
| Mint To (Checked) | ✅ Shows correctly | ✅ Shows correctly |
| Create Metadata | ❌ Unknown (Inner) | ⚠️ Might still show as Unknown |
| Initialize Max Wallet Config | ❌ Unknown | ✅ **Shows correctly!** |

**Why some still show as Unknown:**
- Token-2022's Transfer Hook initialization uses a discriminator that Explorer hasn't indexed yet
- Metaplex metadata "Inner" instructions are often not decoded properly
- These are Explorer limitations, not issues with your token

---

## For Mainnet Deployment

When you deploy to mainnet:

1. Deploy your program: `anchor deploy --provider.cluster mainnet`
2. Upload the IDL immediately: `anchor idl init --provider.cluster mainnet`
3. Update your `src/lib/solana/max-wallet.ts` with the new mainnet program ID
4. Test with a small token first
5. Verify all instructions decode properly on multiple explorers

---

## Additional Resources

- [Anchor IDL Documentation](https://www.anchor-lang.com/docs/the-accounts-struct#idl)
- [Solscan Devnet](https://solscan.io/?cluster=devnet)
- [Solana Program Registry](https://github.com/solana-labs/solana-program-library)
- [Token-2022 Extension Guide](https://spl.solana.com/token-2022/extensions)
