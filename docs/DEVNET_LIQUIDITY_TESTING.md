# Creating Devnet Liquidity Pool for Swap Testing

## Goal
Create a liquidity pool on devnet with two test tokens so we can actually test Jupiter swaps end-to-end.

## Strategy: Use Orca Whirlpools on Devnet

Orca Whirlpools has **full devnet support** and is Jupiter-compatible!

---

## Method 1: Orca Whirlpools (Recommended)

### Step 1: Prepare Two Test Tokens

**Option A: Use Your Existing Token + Create New One**
```bash
# You already have: 2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN

# Create a second test token (use MintCraft UI or CLI)
spl-token create-token --decimals 9
# Save the mint address: TOKEN_B
```

**Option B: Use Existing Devnet Tokens**
```bash
# Your token: 2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN
# USDC devnet: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

### Step 2: Get Devnet SOL

```bash
# Get SOL for pool creation fees
solana airdrop 5 --url devnet

# Check balance
solana balance --url devnet
```

### Step 3: Mint Test Tokens to Your Wallet

```bash
# Mint 1,000,000 of each token
spl-token mint <TOKEN_A> 1000000 --url devnet
spl-token mint <TOKEN_B> 1000000 --url devnet

# Verify balances
spl-token accounts --url devnet
```

### Step 4: Create Orca Whirlpool (Using SDK)

Install Orca SDK:
```bash
npm install @orca-so/whirlpools-sdk
```

Create pool script: `scripts/create-orca-pool.mjs`
```javascript
import { WhirlpoolContext, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const RPC = "https://api.devnet.solana.com";
const connection = new Connection(RPC);
const wallet = // Load your keypair

const provider = new AnchorProvider(connection, wallet, {});
const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
const client = buildWhirlpoolClient(ctx);

// Create pool
const tokenA = new PublicKey("YOUR_TOKEN_A");
const tokenB = new PublicKey("YOUR_TOKEN_B");

// Pool creation with initial price
const { poolKey } = await client.createPool(
  tokenA,
  tokenB,
  64, // Tick spacing (64 = 0.01% fee tier)
  initialPrice, // Initial price ratio
);

console.log("Pool created:", poolKey.toBase58());
```

### Step 5: Add Liquidity

```javascript
// Add liquidity to the pool
const position = await client.openPosition(
  poolKey,
  tickLowerIndex,
  tickUpperIndex,
  {
    tokenA: 100000, // Amount of token A
    tokenB: 100000, // Amount of token B
  }
);

console.log("Liquidity added!");
```

---

## Method 2: Quick & Dirty - Use Existing Devnet Pools

Some devnet pools may already exist. Check Orca's devnet deployment:

```bash
# Orca devnet program
PROGRAM_ID: whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc

# Check if pools exist for common pairs
```

---

## Method 3: Simplest - Create Minimal AMM Pool Programmatically

Create a basic constant product AMM just for testing:

### Install Dependencies
```bash
npm install @project-serum/anchor
```

### Create Simple Swap Pool Script

```javascript
// scripts/create-simple-pool.mjs
import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountIdempotent,
  mintTo,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token';

// Simple constant product pool: x * y = k
// This creates a minimal swap pool just for testing

const connection = new Connection('https://api.devnet.solana.com');
const payer = // Your keypair

// 1. Create pool account (stores reserves)
// 2. Transfer tokens to pool
// 3. Pool can now execute swaps using x*y=k formula

// This is enough for Jupiter to detect and route through!
```

---

## Method 4: Use Raydium on Devnet

Raydium may have devnet support:

```bash
# Raydium devnet program
# Check: https://docs.raydium.io/

# Create pool through Raydium SDK
npm install @raydium-io/raydium-sdk
```

---

## Testing the Pool with Jupiter

Once pool is created:

### Test 1: Verify Pool Exists
```javascript
import { createJupiterApiClient } from '@jup-ag/api';

const jupiter = createJupiterApiClient();

const quote = await jupiter.quoteGet({
  inputMint: 'YOUR_TOKEN_A',
  outputMint: 'YOUR_TOKEN_B',
  amount: '1000000',
  slippageBps: 500,
});

if (quote) {
  console.log('✅ Jupiter can route through your pool!');
  console.log('Route:', quote.routePlan);
} else {
  console.log('❌ Jupiter cannot find route');
}
```

### Test 2: Execute Swap
```javascript
const swapResponse = await jupiter.swapPost({
  swapRequest: {
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toBase58(),
  },
});

// Sign and send transaction
const tx = VersionedTransaction.deserialize(
  Buffer.from(swapResponse.swapTransaction, 'base64')
);
tx.sign([wallet]);
const sig = await connection.sendRawTransaction(tx.serialize());

console.log('✅ Swap executed:', sig);
```

### Test 3: Run Full Reflection Distribution
```bash
# Update reflections.env
MINT_ADDRESS=YOUR_TOKEN_A
REWARD_TOKEN_MINT=YOUR_TOKEN_B
SWAP_SLIPPAGE_BPS=500  # Higher for test pool

# Run distribution
npm run distribute:reflections
```

---

## Recommended Approach

**Easiest Path:**

1. **Use Orca Whirlpools on Devnet**
   - Full SDK support
   - Jupiter integrates automatically
   - Well-documented

2. **Start Small**
   - Create pool with 10,000 of each token
   - Test single swap first
   - Then test full reflection distribution

3. **Monitor Results**
   - Check Jupiter routing
   - Verify slippage
   - Confirm distribution

---

## Quick Start Script

Want me to create a complete script that:
1. Creates two test tokens
2. Creates Orca Whirlpool
3. Adds liquidity
4. Tests Jupiter swap
5. Runs reflection distribution

Just say "yes" and I'll build it!

---

## Alternative: Manual Pool Creation via Orca UI

1. Go to: **https://www.orca.so/** (switch to devnet in wallet)
2. Click "Pools" → "Create Pool"
3. Select your two tokens
4. Set initial price ratio
5. Add liquidity (e.g., 10,000 of each)
6. Done! Jupiter will automatically detect it

---

## Expected Results

After pool creation:
- ✅ Jupiter can quote swaps between your tokens
- ✅ Swaps execute successfully
- ✅ Reflection distribution with swaps works end-to-end
- ✅ Full production flow validated on devnet!

---

Let me know which method you want to try and I'll create the complete implementation!
