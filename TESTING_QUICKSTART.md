# Quick Start: Testing MintCraft Reflections

This is a condensed guide to get you testing the reflection system in under 30 minutes.

## Prerequisites (5 minutes)

```bash
# 1. Install dependencies
npm install
cd api && npm install && cd ..

# 2. Create test treasury wallet
solana-keygen new -o ~/.config/solana/treasury-test.json

# 3. Fund with devnet SOL
solana config set --url https://api.devnet.solana.com
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/treasury-test.json)

# 4. Create 2 test holder wallets
solana-keygen new -o ~/.config/solana/holder1.json
solana-keygen new -o ~/.config/solana/holder2.json
solana airdrop 1 $(solana-keygen pubkey ~/.config/solana/holder1.json)
solana airdrop 1 $(solana-keygen pubkey ~/.config/solana/holder2.json)
```

## Step 1: Start Servers (2 minutes)

```bash
# Terminal 1: API server (for IPFS)
cd api
npm start

# Terminal 2: Frontend
npm run dev
```

## Step 2: Create Test Token (5 minutes)

1. Open `http://localhost:5173`
2. Connect wallet (use treasury-test wallet)
3. Switch to **Devnet** in network toggle
4. Fill token form:
   - Name: "Test Token"
   - Symbol: "TEST"
   - Supply: 1000000
   - Decimals: 9
5. Enable **Transfer Fee**:
   - Percentage: 5%
   - Treasury: `<YOUR_TREASURY_ADDRESS>`
6. Enable **Hourly Reflections**:
   - Min Holding: 100
   - Gas Rebate: 2%
   - Excluded: (leave empty)
7. Click **"Forge Token"**
8. **SAVE THE MINT ADDRESS** from success message

## Step 3: Distribute Tokens (5 minutes)

```bash
# Set your mint address
MINT=<YOUR_MINT_ADDRESS>

# Transfer to holder 1 (10k tokens)
spl-token transfer $MINT 10000 \
  $(solana-keygen pubkey ~/.config/solana/holder1.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Transfer to holder 2 (5k tokens)
spl-token transfer $MINT 5000 \
  $(solana-keygen pubkey ~/.config/solana/holder2.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Verify balances
spl-token balance $MINT \
  --owner $(solana-keygen pubkey ~/.config/solana/holder1.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

**Expected:** Holder 1 has ~9500, Holder 2 has ~4750 (after 5% fee)

## Step 4: Collect Fees (3 minutes)

```bash
# Create fee collection config
cp scripts/collect-fees.env.example scripts/collect-fees.env

# Edit config
nano scripts/collect-fees.env
```

Set:
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/user/.config/solana/treasury-test.json
TREASURY_ADDRESS=<YOUR_TREASURY_ADDRESS>
RPC_URL=https://api.devnet.solana.com
```

```bash
# Run collection
npm run collect:fees
```

**Expected Output:**
```
✅ Collected ~750 total tokens to treasury
```

## Step 5: Test Reflection Distribution (5 minutes)

```bash
# Create reflection config
cp scripts/reflections.env.example scripts/reflections.env

# Edit config
nano scripts/reflections.env
```

Set:
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/user/.config/solana/treasury-test.json
RPC_URL=https://api.devnet.solana.com
MIN_HOLDING=100000000000  # 100 tokens
EXCLUDED_WALLETS=
MAX_DISTRIBUTIONS_PER_RUN=100
MIN_TOTAL_POOL=100000000000
```

```bash
# Run distribution
npm run distribute:reflections
```

**Expected Output:**
```
=== Distribution Summary ===
✅ Successful: 2 holders
💰 Total distributed: 750000000000 (750 tokens)
```

## Step 6: Verify Results (3 minutes)

```bash
# Check holder 1 (should be ~10000)
spl-token balance $MINT \
  --owner $(solana-keygen pubkey ~/.config/solana/holder1.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Check holder 2 (should be ~5000)
spl-token balance $MINT \
  --owner $(solana-keygen pubkey ~/.config/solana/holder2.json) \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Check state file
cat ~/.mintcraft/reflections/state-$MINT.json
```

## Step 7: Test Dashboard (5 minutes)

1. Navigate to `http://localhost:5173/reflections`
2. Connect wallet (switch to holder1)
3. Enter mint address: `<YOUR_MINT_ADDRESS>`
4. Click **"Load Stats"**

**Expected Display:**
- Your Balance: ~10000 TEST
- Fee Pool: 0 (all distributed)
- Your Share: ~66.67%
- Eligibility: ✅ Eligible

## Step 8: Test Cron (Optional, 5 minutes)

```bash
# Install cron job
chmod +x scripts/install-reflection-cron.sh
./scripts/install-reflection-cron.sh

# Verify installation
crontab -l | grep "MintCraft reflections"

# Watch logs (will run at top of next hour)
tail -f ~/.mintcraft/logs/reflections.log
```

## ✅ Success Criteria

If all of the following pass, your system is working:

- ✅ Token created with reflections enabled
- ✅ Transfers deduct 5% fee
- ✅ Fee collection script retrieves withheld tokens
- ✅ Distribution script runs without errors
- ✅ Holder 1 receives ~500 tokens (66.7% of 750)
- ✅ Holder 2 receives ~250 tokens (33.3% of 750)
- ✅ Final balances: Holder 1 ≈ 10000, Holder 2 ≈ 5000
- ✅ Treasury balance: 0 (all distributed)
- ✅ Dashboard loads stats correctly
- ✅ Cron job installs successfully

## 🐛 Common Issues

### "Account not found"
**Fix:** Token account doesn't exist yet. Script creates ATAs automatically.

### "Simulation failed"
**Fix:** Check treasury has SOL (~0.01) and correct mint address.

### "Fee pool below minimum"
**Fix:** Lower `MIN_TOTAL_POOL` in reflections.env to 10000000 (0.01 tokens).

### Distribution skipped
**Fix:** Ensure holders meet minimum requirement (100 tokens).

### Wrong amounts
**Fix:** Verify excluded wallets list and eligible supply.

## 📊 Test Calculations

**Distribution Math:**
- Holder 1: 9500 tokens
- Holder 2: 4750 tokens
- Total eligible: 14250 tokens
- Fee pool: 750 tokens

**Holder 1 share:** (9500 / 14250) × 750 = **500 tokens**
**Holder 2 share:** (4750 / 14250) × 750 = **250 tokens**

**Final balances:**
- Holder 1: 9500 + 500 = **10000 tokens** ✅
- Holder 2: 4750 + 250 = **5000 tokens** ✅

## 🚀 Next Steps

Once basic testing passes:

1. **Edge Cases** - Test minimum threshold, excluded wallets
2. **Automation** - Let cron run for 24 hours
3. **Performance** - Test with 10+ holders
4. **Dashboard** - Test all features thoroughly
5. **Documentation** - Read full guides:
   - `docs/REFLECTIONS.md` - Complete user guide
   - `docs/REFLECTIONS_TESTING.md` - Comprehensive testing

## 📚 Full Documentation

- **This Guide**: Quick 30-minute test
- **REFLECTIONS.md**: Complete system documentation
- **REFLECTIONS_TESTING.md**: 10-phase comprehensive testing
- **REFLECTIONS_SUMMARY.md**: Implementation overview

## 🎯 Ready for Production?

Before mainnet:
- ✅ Complete all tests in REFLECTIONS_TESTING.md
- ✅ Run cron for 24 hours without errors
- ✅ Verify gas costs are acceptable
- ✅ Test with realistic token supply/holders
- ✅ Consider professional audit of Anchor program

Happy testing! 🧪
