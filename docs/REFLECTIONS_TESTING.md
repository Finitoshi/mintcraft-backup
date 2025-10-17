# Testing Guide: MintCraft Reflections System

This guide walks you through testing the complete reflection system on Solana Devnet to ensure everything works as intended before deploying to mainnet.

## Prerequisites

### 1. Environment Setup

```bash
# Install Node.js dependencies
npm install

# Install Solana CLI (if not already installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor CLI (if not already installed)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 2. Create Test Wallets

You'll need 3 test wallets for comprehensive testing:

```bash
# Treasury wallet (holds collected fees, runs distributions)
solana-keygen new -o ~/.config/solana/treasury-test.json

# Test holder 1
solana-keygen new -o ~/.config/solana/holder1-test.json

# Test holder 2
solana-keygen new -o ~/.config/solana/holder2-test.json

# Set devnet as default
solana config set --url https://api.devnet.solana.com
```

### 3. Fund Wallets with Devnet SOL

```bash
# Fund treasury (needs more for distributions)
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/treasury-test.json)

# Fund holder 1
solana airdrop 1 $(solana-keygen pubkey ~/.config/solana/holder1-test.json)

# Fund holder 2
solana airdrop 1 $(solana-keygen pubkey ~/.config/solana/holder2-test.json)
```

## Phase 1: Deploy Anchor Program

### Step 1: Build the Program

```bash
cd programs/mintcraft
anchor build
```

**Expected Output:**
```
✔ Built programs/mintcraft
```

### Step 2: Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

**Expected Output:**
```
Program Id: <YOUR_PROGRAM_ID>
Deploy success
```

### Step 3: Update Program ID

Copy the program ID and update it in:
- `Anchor.toml` → `[programs.devnet]`
- `src/lib/solana/transaction-builder.ts` → `MINTCRAFT_PROGRAM_ID` constant (line 227)

### Step 4: Verify Deployment

```bash
solana program show <YOUR_PROGRAM_ID> --url devnet
```

**Expected Output:**
```
Program Id: <YOUR_PROGRAM_ID>
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: <DATA_ADDRESS>
Authority: <YOUR_WALLET>
Last Deployed In Slot: <SLOT_NUMBER>
Data Length: <SIZE> bytes
```

## Phase 2: Create Test Token with Reflections

### Step 1: Start the Frontend

```bash
# Terminal 1: Start API server (for IPFS uploads)
cd api
npm install
npm start
```

```bash
# Terminal 2: Start frontend
npm run dev
```

### Step 2: Create Token via UI

1. Open browser to `http://localhost:5173`
2. Click "Connect Wallet" → Select Phantom/Solflare
3. Switch to **Treasury wallet** in your wallet extension
4. Ensure network toggle shows **Devnet**

5. Fill in token details:
   - **Name**: "Test Reflection Token"
   - **Symbol**: "TRT"
   - **Description**: "Testing reflections on devnet"
   - **Supply**: 1000000
   - **Decimals**: 9

6. Enable **Transfer Fee** extension:
   - **Fee Percentage**: 5% (higher for testing visibility)
   - **Treasury Address**: `<YOUR_TREASURY_WALLET_ADDRESS>`

7. Enable **Hourly Reflections** extension:
   - **Minimum Holding**: 100 (holders need 100+ tokens)
   - **Gas Rebate %**: 2
   - **Excluded Wallets**: (leave empty for testing)

8. Click **"Forge Token"**

9. Approve transaction in wallet

**Expected Result:**
- Success toast: "Token Created Successfully!"
- Mint address shown in success message
- Explorer link clickable

**Save this mint address** - you'll need it throughout testing.

### Step 3: Verify Token Creation

```bash
# Replace <MINT_ADDRESS> with your token's address
solana account <MINT_ADDRESS> --url devnet
```

Visit Solana Explorer:
```
https://explorer.solana.com/address/<MINT_ADDRESS>?cluster=devnet
```

**Check for:**
- ✅ Token-2022 program ID
- ✅ Transfer Fee extension visible
- ✅ Correct supply (1000000 × 10^9 = 1000000000000000)
- ✅ Treasury as fee authority

## Phase 3: Distribute Test Tokens

### Step 1: Transfer to Test Holders

Use the built-in Transfer tab or Phantom wallet:

```bash
# Using CLI (alternative to UI):
# Install SPL Token CLI
cargo install spl-token-cli

# Transfer to holder 1
spl-token transfer <MINT_ADDRESS> 10000 \
  $(solana-keygen pubkey ~/.config/solana/holder1-test.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Transfer to holder 2
spl-token transfer <MINT_ADDRESS> 5000 \
  $(solana-keygen pubkey ~/.config/solana/holder2-test.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

**Expected Result:**
- Transfer fee deducted (5% = 500 tokens from 10000 transfer)
- Holder 1 receives: 9500 tokens
- Holder 2 receives: 4750 tokens
- Fees withheld in token accounts

### Step 2: Verify Balances

```bash
# Check holder 1 balance
spl-token balance <MINT_ADDRESS> \
  --owner $(solana-keygen pubkey ~/.config/solana/holder1-test.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Check holder 2 balance
spl-token balance <MINT_ADDRESS> \
  --owner $(solana-keygen pubkey ~/.config/solana/holder2-test.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

## Phase 4: Collect Transfer Fees

### Step 1: Configure Fee Collection

```bash
cp scripts/collect-fees.env.example scripts/collect-fees.env
```

Edit `scripts/collect-fees.env`:
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/user/.config/solana/treasury-test.json
TREASURY_ADDRESS=<YOUR_TREASURY_WALLET_ADDRESS>
RPC_URL=https://api.devnet.solana.com
```

### Step 2: Collect Fees Manually

```bash
npm run collect:fees
```

**Expected Output:**
```
🏦 MintCraft Fee Collector
==========================
Mint: <MINT_ADDRESS>
Treasury: <TREASURY_ADDRESS>
RPC: https://api.devnet.solana.com

📊 Scanning for accounts with withheld fees...
Found 2 accounts with withheld fees

💰 Collecting fees...
  Account 1: 500 tokens
  Account 2: 250 tokens
✅ Collected 750 total tokens to treasury

Summary:
✅ Success: 2 accounts
❌ Failed: 0 accounts
💰 Total collected: 750 tokens
```

### Step 3: Verify Treasury Balance

```bash
spl-token balance <MINT_ADDRESS> \
  --owner <TREASURY_ADDRESS> \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

**Expected:** 750 tokens (from 5% fees on transfers)

## Phase 5: Test Reflection Distribution

### Step 1: Configure Reflections

```bash
cp scripts/reflections.env.example scripts/reflections.env
```

Edit `scripts/reflections.env`:
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/user/.config/solana/treasury-test.json
RPC_URL=https://api.devnet.solana.com
MIN_HOLDING=100000000000  # 100 tokens with 9 decimals
EXCLUDED_WALLETS=
MAX_DISTRIBUTIONS_PER_RUN=100
MIN_TOTAL_POOL=100000000000  # 100 tokens minimum to distribute
```

### Step 2: Test Manual Distribution

```bash
npm run distribute:reflections
```

**Expected Output:**
```
=== Starting Hourly Reflection Distribution ===
Treasury: <TREASURY_ADDRESS>
Mint: <MINT_ADDRESS>
Total supply: 1000000000000000
Decimals: 9
Treasury balance (fee pool): 750000000000

Fetching all token accounts for mint...
Found 3 token accounts
Eligible holders: 2 / 3

Total eligible supply: 14250000000000
Fee pool to distribute: 750000000000

Distributing to 2 holders (batch 1)...
✅ Batch confirmed: <SIGNATURE>

=== Distribution Summary ===
✅ Successful: 2 holders
❌ Failed: 0 holders
💰 Total distributed: 750000000000 (750 tokens)
📊 Remaining pool: 0
📈 Lifetime distributed: 750000000000
```

### Step 3: Verify Distribution Math

**Holder 1 calculation:**
- Balance: 9500 tokens
- Eligible supply: 14250 tokens (9500 + 4750)
- Share: (9500 / 14250) × 750 = **500 tokens**

**Holder 2 calculation:**
- Balance: 4750 tokens
- Eligible supply: 14250 tokens
- Share: (4750 / 14250) × 750 = **250 tokens**

**Verify new balances:**
```bash
# Holder 1 should now have: 9500 + 500 = 10000
spl-token balance <MINT_ADDRESS> \
  --owner $(solana-keygen pubkey ~/.config/solana/holder1-test.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Holder 2 should now have: 4750 + 250 = 5000
spl-token balance <MINT_ADDRESS> \
  --owner $(solana-keygen pubkey ~/.config/solana/holder2-test.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

**✅ Pass Criteria:**
- Holder 1: **10000 tokens** (±1 for rounding)
- Holder 2: **5000 tokens** (±1 for rounding)
- Treasury: **0 tokens** (all distributed)

### Step 4: Check State File

```bash
cat ~/.mintcraft/reflections/state-<MINT_ADDRESS>.json
```

**Expected Content:**
```json
{
  "lastDistribution": "2025-10-16T...",
  "totalDistributed": "750000000000",
  "distributions": [
    {
      "timestamp": "2025-10-16T...",
      "successCount": 2,
      "failCount": 0,
      "totalDistributed": "750000000000",
      "records": [
        {
          "owner": "<HOLDER_1_ADDRESS>",
          "amount": "500000000000",
          "signature": "<TX_SIGNATURE>"
        },
        {
          "owner": "<HOLDER_2_ADDRESS>",
          "amount": "250000000000",
          "signature": "<TX_SIGNATURE>"
        }
      ]
    }
  ]
}
```

## Phase 6: Test Cron Automation

### Step 1: Install Cron Job

```bash
chmod +x scripts/install-reflection-cron.sh
./scripts/install-reflection-cron.sh
```

**Expected Output:**
```
🔧 MintCraft Reflection Cron Installer
======================================
📋 Configuration:
  Mint: <MINT_ADDRESS>
  Schedule: 0 * * * *
  Min Holding: 100000000000

✅ Created wrapper script: scripts/distribute-reflections.cron.sh
✅ Cron job installed/updated

📊 Current crontab:
0 * * * * /path/to/scripts/distribute-reflections.cron.sh # MintCraft reflections: <MINT_ADDRESS>

✅ Setup complete!
```

### Step 2: Verify Cron Job

```bash
crontab -l | grep "MintCraft reflections"
```

**Expected:** Line showing hourly schedule

### Step 3: Test Cron Execution

For testing, temporarily change the schedule to run every minute:

```bash
# Edit reflections.env
CRON_SCHEDULE=* * * * *

# Reinstall cron
./scripts/install-reflection-cron.sh
```

Generate new fees to distribute:
```bash
# Transfer tokens to create fees
spl-token transfer <MINT_ADDRESS> 1000 \
  $(solana-keygen pubkey ~/.config/solana/holder2-test.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Collect fees
npm run collect:fees

# Wait 1 minute, then check logs
tail -f ~/.mintcraft/logs/reflections.log
```

**Expected:** New distribution entry within 1 minute

**Don't forget to restore hourly schedule:**
```bash
# Edit reflections.env
CRON_SCHEDULE=0 * * * *

# Reinstall
./scripts/install-reflection-cron.sh
```

## Phase 7: Test Reflection Dashboard

### Step 1: Access Dashboard

Open browser to: `http://localhost:5173/reflections`

### Step 2: Load Token Stats

1. Connect wallet (use Holder 1)
2. Enter mint address: `<YOUR_MINT_ADDRESS>`
3. Click "Load Stats"

**Expected Display:**
- ✅ Your Balance: ~10000 TRT
- ✅ Fee Pool: Current treasury balance
- ✅ Your Share: ~66.67% (if holder 1)
- ✅ Estimated Reflection: Calculated share
- ✅ Eligibility Badge: "Eligible" (balance > 100)

### Step 3: Test Claim Button (UI Only)

1. Click "💎 Claim Now"
2. Check toast notification

**Expected:**
- Toast shows: "Claim Not Yet Implemented"
- Displays net amount after gas rebate
- Example: "You would receive 980 tokens (20 gas rebate deducted)"

**Note:** Actual claim functionality requires deployed Anchor program with `claim_reflection` instruction.

### Step 4: Test with Ineligible Wallet

1. Switch wallet to one with <100 tokens
2. Load stats again

**Expected:**
- Badge shows: "Not Eligible"
- Claim button disabled
- Message: "You need at least 100 tokens to receive reflections"

## Phase 8: Edge Case Testing

### Test 1: Minimum Holding Threshold

```bash
# Create wallet with exactly minimum (100 tokens)
solana-keygen new -o ~/.config/solana/min-holder.json
solana airdrop 1 $(solana-keygen pubkey ~/.config/solana/min-holder.json)

# Transfer exactly 100 tokens (minus fee)
spl-token transfer <MINT_ADDRESS> 105.26 \
  $(solana-keygen pubkey ~/.config/solana/min-holder.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# They should receive: 105.26 × 0.95 = ~100 tokens
```

Run distribution - **verify this wallet is included**.

### Test 2: Below Minimum Threshold

```bash
# Create wallet with 99 tokens
solana-keygen new -o ~/.config/solana/below-min.json
solana airdrop 1 $(solana-keygen pubkey ~/.config/solana/below-min.json)

# Transfer 104 tokens (99 after fee)
spl-token transfer <MINT_ADDRESS> 104.21 \
  $(solana-keygen pubkey ~/.config/solana/below-min.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

Run distribution - **verify this wallet is excluded**.

### Test 3: Excluded Wallets

Edit `scripts/reflections.env`:
```bash
EXCLUDED_WALLETS=<HOLDER_2_ADDRESS>
```

Run distribution - **verify holder 2 receives nothing**.

### Test 4: Empty Fee Pool

```bash
# Ensure treasury has 0 tokens
# Run distribution
npm run distribute:reflections
```

**Expected Output:**
```
Fee pool (0) below minimum (100000000000). Skipping distribution.
```

### Test 5: Large Holder Count

Create 10 test wallets with varying balances and run distribution.

**Expected:**
- All distributions succeed
- Batching occurs (5 per transaction)
- No timeouts or failures

## Phase 9: Performance Testing

### Test 1: Gas Costs

Monitor SOL costs during distribution:

```bash
# Check treasury SOL before
solana balance <TREASURY_ADDRESS> --url devnet

# Run distribution
npm run distribute:reflections

# Check treasury SOL after
solana balance <TREASURY_ADDRESS> --url devnet
```

**Expected:** ~0.0001 SOL per distribution (for 2 holders)

### Test 2: Distribution Speed

Time the distribution:

```bash
time npm run distribute:reflections
```

**Expected:** <30 seconds for 100 holders

### Test 3: RPC Rate Limits

Run distributions rapidly:

```bash
for i in {1..5}; do
  npm run distribute:reflections
  sleep 5
done
```

**Expected:** All succeed or graceful rate limit errors logged

## Phase 10: Cleanup & Reset

### Remove Test Cron Job

```bash
crontab -e
# Delete the line with "MintCraft reflections"
```

### Delete State Files

```bash
rm -rf ~/.mintcraft/reflections/
rm -rf ~/.mintcraft/logs/
```

### Close Test Token Accounts (Reclaim SOL)

```bash
spl-token close <MINT_ADDRESS> \
  --owner ~/.config/solana/holder1-test.json \
  --url devnet
```

## Verification Checklist

Before deploying to mainnet, ensure:

- [ ] Token creation with reflections succeeds
- [ ] Transfer fees are collected correctly
- [ ] Fee collection script works
- [ ] Manual reflection distribution succeeds
- [ ] Distribution math is accurate (±1 token rounding)
- [ ] Cron job installs and executes
- [ ] State file tracks distributions correctly
- [ ] Dashboard displays accurate stats
- [ ] Minimum holding threshold enforced
- [ ] Excluded wallets are skipped
- [ ] Empty fee pool handled gracefully
- [ ] Gas costs are acceptable
- [ ] No errors in logs after 24h cron run

## Common Issues & Solutions

### Issue: "Account not found"

**Cause:** Token account doesn't exist yet

**Solution:** Distribution script creates ATAs automatically. Ensure treasury has enough SOL (~0.002 per new account).

### Issue: "Simulation failed"

**Cause:** Insufficient balance or wrong program ID

**Solution:**
1. Check treasury balance: `spl-token balance <MINT>`
2. Verify program ID in transaction-builder.ts

### Issue: "Too many requests"

**Cause:** RPC rate limiting

**Solution:** Use premium RPC (QuickNode, Helius) or add delays between batches

### Issue: Distribution skipped (fee pool below minimum)

**Cause:** `MIN_TOTAL_POOL` set too high

**Solution:** Lower `MIN_TOTAL_POOL` in reflections.env for testing

### Issue: Wrong reflection amounts

**Cause:** Math precision or excluded wallets

**Solution:**
1. Check excluded wallets list
2. Verify eligible supply calculation
3. Review distribution logs for individual amounts

## Next Steps

Once testing passes:

1. **Document your findings** - Note any issues or adjustments made
2. **Deploy to mainnet** - Use mainnet RPC URLs and real wallets
3. **Monitor closely** - Watch first 24 hours of distributions
4. **Set alerts** - Monitor logs and state files
5. **Backup everything** - Save keypairs and state files securely

## Support

If you encounter issues during testing:

1. Check logs: `tail -100 ~/.mintcraft/logs/reflections.log`
2. Check state: `cat ~/.mintcraft/reflections/state-<MINT>.json`
3. Verify balances on Solana Explorer
4. Open GitHub issue with logs (redact sensitive addresses)
