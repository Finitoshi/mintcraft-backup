# 🎉 MintCraft Reflections - Ready to Test!

## ✅ Status: READY FOR TESTING

**Date:** 2025-10-16
**Build Status:** ✅ Successfully compiled
**Network:** Solana Devnet

---

## 📦 What's Complete

### ✅ On-Chain (Anchor Program)
- Compiled successfully with reflection instructions
- `initialize_reflection_config` - Set up reflection parameters
- `update_reflection_config` - Modify settings
- `claim_reflection` - Users claim early with gas rebate

### ✅ Off-Chain Scripts
- `scripts/distribute-reflections.mjs` - Automated distribution
- `scripts/collect-fees.env.example` - Fee collection config
- `scripts/reflections.env.example` - Reflection config
- `scripts/install-reflection-cron.sh` - Cron installer

### ✅ Frontend
- Token creation with reflections toggle
- Configuration inputs (min holding, gas rebate, excluded wallets)
- Reflection dashboard at `/reflections`
- Stats display and claim button UI

### ✅ Documentation
- `docs/REFLECTIONS.md` - Complete user guide
- `docs/REFLECTIONS_TESTING.md` - Comprehensive testing guide
- `TESTING_QUICKSTART.md` - 30-minute quick test
- `TEST_SESSION.md` - Current test session tracker

---

## 🔑 Test Wallets Created

### Treasury Wallet
```
Address:  CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF
Keypair:  ~/.config/solana/test-wallets/treasury-test.json
Balance:  1 SOL ✅
Purpose:  Creates token, receives fees, runs distributions
```

### Holder 1
```
Address:  CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1
Keypair:  ~/.config/solana/test-wallets/holder1-test.json
Balance:  0 SOL (needs funding)
Purpose:  Test holder receiving reflections
```

### Holder 2
```
Address:  6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz
Keypair:  ~/.config/solana/test-wallets/holder2-test.json
Balance:  0 SOL (needs funding)
Purpose:  Test holder receiving reflections
```

---

## 🚀 Next Steps (In Order)

### Step 1: Fund Remaining Wallets

**Option A: Web Faucet (Recommended)**
```
Visit: https://faucet.solana.com/

Request 1 SOL for:
- CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1
- 6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz
```

**Option B: Transfer from Treasury**
```bash
solana transfer CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1 0.1 \
  --from ~/.config/solana/test-wallets/treasury-test.json \
  --url devnet

solana transfer 6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz 0.1 \
  --from ~/.config/solana/test-wallets/treasury-test.json \
  --url devnet
```

### Step 2: Deploy Anchor Program

```bash
cd /home/fini/mintcraft-backup
anchor deploy --provider.cluster devnet
```

**CRITICAL:** Save the Program ID that is output!

### Step 3: Update Program ID in Code

Edit `src/lib/solana/transaction-builder.ts` line 227:

```typescript
// Change this line:
const MINTCRAFT_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// To your actual program ID:
const MINTCRAFT_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE');
```

### Step 4: Start Development Servers

**Terminal 1: API Server** (for IPFS uploads)
```bash
cd /home/fini/mintcraft-backup/api
npm start
```

**Terminal 2: Frontend**
```bash
cd /home/fini/mintcraft-backup
npm run dev
```

### Step 5: Create Test Token

1. Open browser: `http://localhost:5173`
2. Connect wallet (import treasury keypair into Phantom/Solflare)
   - Import private key from `~/.config/solana/test-wallets/treasury-test.json`
3. Ensure network is set to **Devnet**
4. Fill token form:
   - **Name:** Test Reflection Token
   - **Symbol:** TRT
   - **Supply:** 1000000
   - **Decimals:** 9

5. Enable **Transfer Fee** extension:
   - **Fee Percentage:** 5% (high for testing visibility)
   - **Treasury Address:** `CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF`

6. Enable **Hourly Reflections** extension:
   - **Minimum Holding:** 100
   - **Gas Rebate %:** 2
   - **Excluded Wallets:** (leave empty)

7. Click **"⚒️ FORGE TOKEN ⚒️"**

8. **SAVE THE MINT ADDRESS** from the success message!

### Step 6: Distribute Test Tokens

```bash
# Set your mint address
export MINT=<YOUR_MINT_ADDRESS_HERE>

# Transfer 10,000 tokens to Holder 1
spl-token transfer $MINT 10000 \
  CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1 \
  --from ~/.config/solana/test-wallets/treasury-test.json \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Transfer 5,000 tokens to Holder 2
spl-token transfer $MINT 5000 \
  6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz \
  --from ~/.config/solana/test-wallets/treasury-test.json \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

**Expected Results:**
- 5% fee deducted from each transfer
- Holder 1 receives: ~9,500 tokens
- Holder 2 receives: ~4,750 tokens
- Fees withheld in token accounts

### Step 7: Collect Transfer Fees

```bash
# Copy config template
cp scripts/collect-fees.env.example scripts/collect-fees.env

# Edit configuration
nano scripts/collect-fees.env
```

**Set these values:**
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/fini/.config/solana/test-wallets/treasury-test.json
TREASURY_ADDRESS=CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF
RPC_URL=https://api.devnet.solana.com
```

**Run collection:**
```bash
npm run collect:fees
```

**Expected Output:**
```
✅ Collected ~750 total tokens to treasury
```

### Step 8: Configure and Run Reflection Distribution

```bash
# Copy config template
cp scripts/reflections.env.example scripts/reflections.env

# Edit configuration
nano scripts/reflections.env
```

**Set these values:**
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/fini/.config/solana/test-wallets/treasury-test.json
RPC_URL=https://api.devnet.solana.com
MIN_HOLDING=100000000000  # 100 tokens with 9 decimals
EXCLUDED_WALLETS=
MAX_DISTRIBUTIONS_PER_RUN=100
MIN_TOTAL_POOL=100000000000  # 100 tokens minimum
```

**Run distribution:**
```bash
npm run distribute:reflections
```

**Expected Output:**
```
=== Distribution Summary ===
✅ Successful: 2 holders
💰 Total distributed: 750000000000 (750 tokens)
📊 Remaining pool: 0
```

### Step 9: Verify Results

```bash
export MINT=<YOUR_MINT_ADDRESS>

# Check Holder 1 balance (should be ~10,000)
spl-token balance $MINT \
  --owner CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1 \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Check Holder 2 balance (should be ~5,000)
spl-token balance $MINT \
  --owner 6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Check distribution state
cat ~/.mintcraft/reflections/state-$MINT.json | jq .
```

### Step 10: Test Reflection Dashboard

1. Navigate to `http://localhost:5173/reflections`
2. Connect wallet (switch to Holder 1 in your wallet extension)
3. Enter mint address
4. Click **"🔍 Load Stats"**

**Expected Display:**
- Your Balance: ~10,000 TRT
- Fee Pool: 0 (all distributed)
- Your Share: ~66.67%
- Eligibility Badge: ✅ Eligible

---

## 📊 Expected Test Results

### Distribution Math

**Setup:**
- Holder 1: 9,500 tokens (before reflection)
- Holder 2: 4,750 tokens (before reflection)
- Total eligible: 14,250 tokens
- Fee pool: 750 tokens

**Calculations:**
```
Holder 1 share: (9,500 / 14,250) × 750 = 500 tokens
Holder 2 share: (4,750 / 14,250) × 750 = 250 tokens
```

**Final Balances:**
- Holder 1: 9,500 + 500 = **10,000 tokens** ✅
- Holder 2: 4,750 + 250 = **5,000 tokens** ✅
- Treasury: 0 tokens (all distributed)

---

## ✅ Success Criteria

Your test is successful if ALL of these pass:

- [ ] Anchor program deploys without errors
- [ ] Token creates with reflections enabled
- [ ] Transfers deduct 5% fee correctly
- [ ] Fee collection retrieves ~750 tokens
- [ ] Distribution script runs without errors
- [ ] Holder 1 receives ~500 tokens (reflection)
- [ ] Holder 2 receives ~250 tokens (reflection)
- [ ] Final balances: H1 ≈ 10,000, H2 ≈ 5,000
- [ ] Treasury balance: 0
- [ ] Dashboard loads and displays stats correctly
- [ ] State file created at `~/.mintcraft/reflections/state-<MINT>.json`

---

## 🐛 Troubleshooting

### "Account not found"
**Cause:** Token account doesn't exist yet
**Fix:** Script creates ATAs automatically. Ensure treasury has SOL for rent.

### "Simulation failed"
**Cause:** Wrong program ID or insufficient balance
**Fix:**
1. Verify program ID updated in transaction-builder.ts
2. Check treasury has SOL

### "Fee pool below minimum"
**Cause:** `MIN_TOTAL_POOL` set too high
**Fix:** Lower to 10000000 (0.01 tokens) in reflections.env

### Distribution skipped
**Cause:** Holders don't meet minimum requirement
**Fix:** Verify holders have ≥100 tokens

### Wrong reflection amounts
**Cause:** Math error or excluded wallets
**Fix:** Check excluded wallets list and eligible supply calculation

---

## 📚 Documentation Quick Links

- **This Guide:** `READY_TO_TEST.md`
- **Quick Test:** `TESTING_QUICKSTART.md` (30 minutes)
- **Full Testing:** `docs/REFLECTIONS_TESTING.md` (2-3 hours)
- **User Guide:** `docs/REFLECTIONS.md`
- **Test Session:** `TEST_SESSION.md` (track your progress)

---

## 🎯 After Successful Test

Once all tests pass:

1. **Install Cron Job** for automated hourly distributions:
   ```bash
   chmod +x scripts/install-reflection-cron.sh
   ./scripts/install-reflection-cron.sh
   ```

2. **Monitor for 24 Hours**:
   ```bash
   tail -f ~/.mintcraft/logs/reflections.log
   ```

3. **Test Dashboard Features**:
   - Load different tokens
   - Switch between holder wallets
   - Verify eligibility checks
   - Test claim button (when implemented)

4. **Performance Testing**:
   - Create 10+ test holders
   - Run distribution with larger holder count
   - Measure gas costs
   - Verify batch processing

5. **Edge Cases**:
   - Test minimum holding threshold
   - Test excluded wallets
   - Test empty fee pool handling
   - Test with zero-balance holders

---

## 🏆 You're Ready!

Everything is built and ready for testing. Follow the steps above in order, and you'll have a fully functional reflection system running on devnet within 30-60 minutes.

**Good luck with testing! 🚀**

---

## 📝 Notes Section

*(Use this space to record your findings, mint address, and any issues encountered)*

**Mint Address:** ____________________________________

**Program ID:** ____________________________________

**Test Results:**
- Token Creation: ⬜ Pass / ⬜ Fail
- Fee Collection: ⬜ Pass / ⬜ Fail
- Distribution: ⬜ Pass / ⬜ Fail
- Math Verification: ⬜ Pass / ⬜ Fail
- Dashboard: ⬜ Pass / ⬜ Fail

**Issues Found:**

