# 🚀 MintCraft Reflections - Test In Progress

**Status:** SERVERS RUNNING - Ready for UI Testing
**Date:** 2025-10-16
**Time:** Test session started

---

## ✅ Completed Steps

### 1. ✅ Anchor Program Deployed
- **Program ID:** `Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4`
- **Network:** Solana Devnet
- **Deployment Signature:** `5RNBJdFwd21bVnMpYtH7TRAV39K8kSp4D1Ty3TZDXcXrtdhkRN5HhDTtXvjTiM1o8mCt8p3GpmUgZckUreidPDdd`
- **IDL Account:** `Bu4cta2QH3MKFmpPLpx7wq3LCEqM3C3oDZAv9YCgGSTN`
- **Status:** Successfully deployed and confirmed

### 2. ✅ Program ID Updated in Code
- **File:** `src/lib/solana/transaction-builder.ts` line 226
- **Value:** `Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4`

### 3. ✅ Test Wallets Funded

| Wallet | Address | Balance | Purpose |
|--------|---------|---------|---------|
| **Treasury** | `CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF` | 0.6 SOL | Create token, collect fees, run distributions |
| **Holder 1** | `CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1` | 0.2 SOL | Test holder receiving reflections |
| **Holder 2** | `6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz` | 0.2 SOL | Test holder receiving reflections |

**Keypair Locations:**
- Treasury: `~/.config/solana/test-wallets/treasury-test.json`
- Holder 1: `~/.config/solana/test-wallets/holder1-test.json`
- Holder 2: `~/.config/solana/test-wallets/holder2-test.json`

### 4. ✅ Servers Running

**API Server:**
- URL: `http://127.0.0.1:3001`
- Status: ✅ Running
- Log: `/tmp/api-server.log`

**Frontend:**
- URL: `http://localhost:5173`
- Status: ✅ Running
- Log: `/tmp/frontend-dev.log`

---

## 🎯 Next Steps: Create Token via UI

### Step 1: Import Treasury Wallet into Browser Wallet

**For Phantom:**
1. Click Phantom extension
2. Click settings gear → "Add / Connect Wallet"
3. "Import Private Key"
4. Get private key: `cat ~/.config/solana/test-wallets/treasury-test.json`
5. Copy the array of numbers
6. Paste and import

**For Solflare:**
1. Click Solflare extension
2. "Import Wallet" → "Private Key"
3. Get private key from file above
4. Import

### Step 2: Create Test Token

1. **Open browser:** `http://localhost:5173`

2. **Connect Wallet:**
   - Click "Connect Wallet" button
   - Select your wallet (Phantom/Solflare)
   - Ensure you're using the Treasury wallet
   - Approve connection

3. **Switch to Devnet:**
   - Check network toggle shows "DEVNET"
   - If not, toggle to Devnet

4. **Fill Token Details:**
   ```
   Name: Test Reflection Token
   Symbol: TRT
   Description: Testing MintCraft reflections on devnet
   Supply: 1000000
   Decimals: 9
   ```

5. **Enable Transfer Fee:**
   - Toggle ON "Transfer Fee" extension
   - Fee Percentage: 5
   - Treasury Address: CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF

6. **Enable Hourly Reflections:**
   - Toggle ON "Hourly Reflections" extension
   - Minimum Holding: 100
   - Gas Rebate %: 2
   - Excluded Wallets: (leave empty)

7. **Forge Token:**
   - Click "⚒️ FORGE TOKEN ⚒️"
   - Approve transaction in wallet
   - Wait for confirmation

8. **SAVE THE MINT ADDRESS!**
   - Copy from success message
   - Write it down here: ____________________________________

---

## 📊 After Token Creation

### Step 3: Distribute Tokens to Test Holders

```bash
# Set your mint address (from step 2.8 above)
export MINT=<YOUR_MINT_ADDRESS_HERE>

# Transfer 10,000 tokens to Holder 1
spl-token transfer $MINT 10000 \
  CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1 \
  --from ~/.config/solana/test-wallets/treasury-test.json \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet \
  --fee-payer ~/.config/solana/test-wallets/treasury-test.json

# Transfer 5,000 tokens to Holder 2
spl-token transfer $MINT 5000 \
  6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz \
  --from ~/.config/solana/test-wallets/treasury-test.json \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet \
  --fee-payer ~/.config/solana/test-wallets/treasury-test.json
```

**Expected:**
- Holder 1 receives: ~9,500 tokens (10,000 - 5% fee)
- Holder 2 receives: ~4,750 tokens (5,000 - 5% fee)
- Total fees withheld: ~750 tokens

### Step 4: Collect Transfer Fees

```bash
# Configure fee collection
cp scripts/collect-fees.env.example scripts/collect-fees.env

# Edit with your mint address
nano scripts/collect-fees.env
```

**Set:**
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/fini/.config/solana/test-wallets/treasury-test.json
TREASURY_ADDRESS=CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF
RPC_URL=https://api.devnet.solana.com
```

**Run:**
```bash
npm run collect:fees
```

**Expected:** "✅ Collected ~750 total tokens to treasury"

### Step 5: Configure Reflections

```bash
# Configure reflection distribution
cp scripts/reflections.env.example scripts/reflections.env

# Edit with your mint address
nano scripts/reflections.env
```

**Set:**
```bash
MINT_ADDRESS=<YOUR_MINT_ADDRESS>
TREASURY_KEYPAIR_PATH=/home/fini/.config/solana/test-wallets/treasury-test.json
RPC_URL=https://api.devnet.solana.com
MIN_HOLDING=100000000000
EXCLUDED_WALLETS=
MAX_DISTRIBUTIONS_PER_RUN=100
MIN_TOTAL_POOL=100000000000
```

### Step 6: Run Reflection Distribution

```bash
npm run distribute:reflections
```

**Expected Output:**
```
=== Distribution Summary ===
✅ Successful: 2 holders
💰 Total distributed: 750000000000 (750 tokens)
```

### Step 7: Verify Results

```bash
export MINT=<YOUR_MINT_ADDRESS>

# Check Holder 1 (should be ~10,000)
spl-token balance $MINT \
  --owner CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1 \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet

# Check Holder 2 (should be ~5,000)
spl-token balance $MINT \
  --owner 6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --url devnet
```

### Step 8: Test Reflection Dashboard

1. Open `http://localhost:5173/reflections`
2. Import Holder 1 wallet into browser wallet
3. Connect wallet
4. Enter mint address
5. Click "Load Stats"

**Expected:**
- Balance: ~10,000 TRT
- Share: ~66.67%
- Eligibility: ✅

---

## 📝 Test Results

### Token Creation
- [ ] Token created successfully
- [ ] Mint Address: _______________
- [ ] Transfer fee enabled (5%)
- [ ] Reflections enabled
- [ ] Visible on Solana Explorer

### Token Distribution
- [ ] Holder 1 received: _____ tokens
- [ ] Holder 2 received: _____ tokens
- [ ] Fees deducted correctly (~5%)

### Fee Collection
- [ ] Collection script ran successfully
- [ ] Treasury received: _____ tokens
- [ ] No errors in output

### Reflection Distribution
- [ ] Distribution script ran successfully
- [ ] Holder 1 reflection: _____ tokens
- [ ] Holder 2 reflection: _____ tokens
- [ ] Math verified (H1: ~500, H2: ~250)

### Final Balances
- [ ] Holder 1 final: _____ tokens (target: ~10,000)
- [ ] Holder 2 final: _____ tokens (target: ~5,000)
- [ ] Treasury final: _____ tokens (target: 0)
- [ ] Math matches expectations ✅ / ❌

### Dashboard Testing
- [ ] Dashboard loads successfully
- [ ] Stats display correctly
- [ ] Balance shows accurately
- [ ] Eligibility badge shows
- [ ] Claim button visible

### State Files
- [ ] State file created: `~/.mintcraft/reflections/state-<MINT>.json`
- [ ] Distribution records present
- [ ] Timestamps accurate

---

## 🐛 Issues Encountered

*(Record any problems here)*

---

## 📊 Quick Reference

### Check Logs
```bash
# API server
tail -f /tmp/api-server.log

# Frontend
tail -f /tmp/frontend-dev.log

# Reflections
tail -f ~/.mintcraft/logs/reflections.log
```

### Check Balances
```bash
# SOL balances
solana balance CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF --url devnet
solana balance CquKNyS1ac1LP6tmQjuanJwKaH4h3KaHFcskEijYBHL1 --url devnet
solana balance 6T6PCYLgFgebWygAeAwQ96ZtuyKykoEf1VmniSz1uzQz --url devnet

# Token balances
spl-token balance <MINT> --owner <ADDRESS> \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --url devnet
```

### View State
```bash
cat ~/.mintcraft/reflections/state-<MINT>.json | jq .
```

### Explorer Links
```
Token: https://explorer.solana.com/address/<MINT>?cluster=devnet
Treasury: https://explorer.solana.com/address/CKRK1GYRnToBZsnFm5KiNitjT8bhQTx23JqgBJkgsbgF?cluster=devnet
Program: https://explorer.solana.com/address/Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4?cluster=devnet
```

---

## ✅ Success Criteria

All of these must pass:

- [x] Program deployed to devnet
- [x] Servers running (API + Frontend)
- [x] Wallets funded with devnet SOL
- [ ] Token created with reflections
- [ ] Fees collected successfully
- [ ] Distribution runs without errors
- [ ] Math verification passes
- [ ] Dashboard displays correctly

**Test Status:** IN PROGRESS

**Next Action:** Create token via UI at http://localhost:5173
