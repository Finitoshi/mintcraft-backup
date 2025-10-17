# Frequently Asked Questions (FAQ)

## General Questions

### What is MintCraft?
MintCraft is a user-friendly platform for creating Solana Token-2022 tokens with advanced features like transfer fees, max wallet caps, and automated treasury management. It's completely open source and free to use.

### Do I need coding experience?
No! MintCraft provides a simple web interface. Just connect your wallet, fill out a form, and click create. The platform handles all the technical complexity.

### Is MintCraft free?
Yes! MintCraft charges zero platform fees. You only pay Solana network transaction fees (typically ~0.000005 SOL per transaction) and rent for account creation (~0.004 SOL, one-time).

### Is this open source?
Yes, completely. All code is available on GitHub and can be audited by anyone. The on-chain program is a verified Anchor program.

---

## Token Creation

### How long does it take to create a token?
The entire process takes 2-5 minutes:
- Form filling: 1-2 minutes
- Image upload to IPFS: 30 seconds
- Transaction confirmation: 10-30 seconds

### What information do I need to provide?
**Required:**
- Token name
- Token symbol
- Decimals (9 is standard)
- Initial supply

**Optional:**
- Token image
- Description
- Transfer fee settings
- Max wallet cap
- Split recipient addresses

### Can I create tokens on mainnet?
Yes! You can create tokens on both devnet (for testing) and mainnet (for production). Always test on devnet first.

### How much SOL do I need?
**Devnet:** Free (use a faucet)
**Mainnet:** ~0.01 SOL total
- Transaction fee: ~0.000005 SOL
- Rent for mint: ~0.0015 SOL
- Rent for metadata: ~0.0014 SOL
- Rent for config: ~0.001 SOL
- Buffer: +0.005 SOL

### What are decimals?
Decimals determine the divisibility of your token:
- **9 decimals** (standard): 1 token = 1,000,000,000 base units
- **6 decimals** (like USDC): 1 token = 1,000,000 base units
- **0 decimals** (NFT-like): Whole units only

Example: With 9 decimals, you can have 0.000000001 tokens.

### Can I create tokens without an image?
Yes, but it's not recommended. Tokens without images look unprofessional on explorers and wallets. You can upload an image later via the metadata program.

---

## Transfer Fees

### What is a transfer fee?
A transfer fee (also called tax) is a percentage taken from each token transfer and sent to a designated treasury wallet.

Example: 2.5% transfer fee
- Alice sends 1,000 tokens to Bob
- Bob receives 975 tokens
- 25 tokens go to treasury

### How do I set transfer fees?
1. Enable "Transfer Fee" extension
2. Set percentage (e.g., 2.5 = 2.5%)
3. Optionally set max fee per transaction
4. Enter treasury wallet address
5. Optionally configure split recipients

### What's a good transfer fee percentage?
**Common ranges:**
- **Low (0.5-1%)**: Minimal impact, good for utility tokens
- **Medium (2-5%)**: Standard for reflection/governance tokens
- **High (5-10%)**: Aggressive for burn/redistribution models

**Warning:** Fees >10% significantly hurt adoption.

### What is max fee per transaction?
A cap on the maximum tokens collected per transfer, regardless of transfer size.

Example:
- Fee: 2.5%
- Max fee: 1,000 tokens
- Transfer of 100,000 tokens: Fee = 1,000 (hits cap)
- Transfer of 10,000 tokens: Fee = 250 (under cap)

Use case: Prevents huge fees on large transfers (LP adds, CEX deposits)

### Can I change transfer fees later?
Yes, if you're the transfer fee config authority. You can update:
- Fee percentage
- Max fee amount
- Fee config authority
- Withdraw authority

### How do I collect transfer fees?
**Manual:**
```bash
npm run collect:fees
```

**Automated (recommended):**
```bash
scripts/install-fee-cron.sh
```
Sets up hourly automatic collection.

### What are split recipients?
Split recipients allow you to distribute collected fees to multiple wallets automatically.

Example:
```
Total fees collected: 1,000 tokens
Split configuration:
├─ Development: 40% → 400 tokens
├─ Marketing: 30% → 300 tokens
└─ Burn: 30% → 300 tokens
```

---

## Max Wallet Cap

### What is max wallet cap?
A limit on how many tokens any single wallet can hold, expressed as a percentage of total supply.

Example:
- Total supply: 1,000,000,000
- Max wallet: 2%
- Maximum per wallet: 20,000,000 tokens

### Why use max wallet cap?
**Benefits:**
- Prevents whale accumulation
- Encourages distribution
- Reduces manipulation risk
- Promotes decentralization

**Use cases:**
- Governance tokens (prevent voting control)
- Fair launch tokens
- Community tokens

### What happens if someone tries to exceed the cap?
The transfer is rejected with error: "Transfer exceeds the maximum allowed wallet allocation"

The sender keeps their tokens and can try a smaller amount.

### Are there any exemptions?
Yes, the authority wallet (the wallet that initialized the config) is exempt from the cap. This allows you to hold the initial supply before distribution.

### Can I update the max wallet percentage?
Yes, if you're the authority. Use the `update_max_wallet_config` instruction.

### Does max wallet affect DEX liquidity pools?
Yes! Be careful:
- If max wallet is 1% and you need to add 5% to LP, it will fail
- Solution: Set max wallet ≥ LP allocation
- Or use a separate LP wallet exempted from the cap

---

## Technical Questions

### What blockchain does this use?
Solana blockchain using the Token-2022 program (next-gen token standard).

### What's the difference between Token and Token-2022?
**Token (SPL Token):** Original Solana token standard
**Token-2022:** New standard with extensions:
- Transfer fees
- Transfer hooks
- Interest bearing
- Non-transferable
- And many more

MintCraft uses Token-2022 for advanced features.

### Where is my token data stored?
**On-chain (Solana blockchain):**
- Token mint account
- Supply, decimals, authorities
- Extension configurations
- Transfer hook config

**IPFS (decentralized storage):**
- Token image
- Metadata JSON (name, description, etc.)

**Not stored anywhere:**
- Your private keys (remain in your wallet)

### What is IPFS?
InterPlanetary File System - decentralized storage. Your token metadata and image are pinned to IPFS, ensuring they're permanently accessible without relying on a central server.

### Can Solana go down and affect my token?
Solana has experienced outages in the past. During an outage:
- ❌ Transfers won't process
- ✅ Your tokens remain safe
- ✅ Balances are unchanged
- ✅ Everything resumes when network recovers

### What if MintCraft website goes down?
Your tokens are unaffected! The token exists on Solana blockchain, not on MintCraft's website. You can:
- Transfer tokens using any Solana wallet
- View on any explorer (Solscan, etc.)
- Interact via command line tools
- The code is open source - anyone can host it

---

## Security Questions

### Is MintCraft safe?
**Security measures:**
- ✅ Open source (auditable)
- ✅ Client-side signing (keys never transmitted)
- ✅ Standard Solana programs
- ✅ No backend custody
- ✅ Anchor framework (security-first)

**Risks:**
- ⚠️ Smart contract risk (as with all blockchain)
- ⚠️ User error (wrong addresses, etc.)
- ⚠️ Market risk (token value)

### Can MintCraft steal my tokens?
No. MintCraft never has access to:
- Your private keys
- Your tokens
- Control over your mint

Everything is signed in your wallet locally.

### Can someone hack my token?
**What's protected:**
- Token supply (immutable if mint authority renounced)
- Token name/symbol (immutable)
- Holder balances (cryptographically secured)

**What could be changed (if authorities retained):**
- Transfer fee percentage (by fee config authority)
- Max wallet percentage (by max wallet authority)
- Freeze status (by freeze authority)

**Best practice:** Renounce authorities you don't need.

### What is authority renunciation?
Removing your ability to control certain aspects of the token, making them immutable.

```bash
# Renounce mint authority (supply becomes fixed)
spl-token authorize <MINT> mint --disable

# Renounce freeze authority (can't freeze wallets)
spl-token authorize <MINT> freeze --disable
```

**Warning:** Irreversible! Test thoroughly before renouncing.

### Should I renounce all authorities?
**Pros of renouncing:**
- ✅ Increases trust
- ✅ Can't rug pull
- ✅ Immutable supply

**Cons of renouncing:**
- ❌ Can't fix bugs
- ❌ Can't update tokenomics
- ❌ Can't adjust to market

**Recommendation:** Keep authorities initially, renounce after stability proven.

---

## Explorer & Display

### Why does my token show "Unknown" instructions?
This is a Solana Explorer indexing issue, not a problem with your token. Some Token-2022 extensions aren't fully indexed yet.

**Solutions:**
1. Upload your IDL: `bash scripts/upload-idl.sh devnet`
2. Use Solscan instead: `https://solscan.io`
3. Use XRAY: `https://xray.helius.xyz`

See `docs/FIXING_UNKNOWN_INSTRUCTIONS.md` for detailed guide.

### How do I verify my token on explorers?
Verification is done by:
- **Solscan:** Submit verification form
- **Coingecko:** Apply for listing
- **Jupiter:** Community token list submission

Process varies by platform. Check each platform's documentation.

### Why doesn't my token show an image in my wallet?
**Possible reasons:**
1. Wallet hasn't indexed metadata yet (wait 1-2 minutes)
2. IPFS gateway is slow (try refreshing)
3. Wallet doesn't support Token-2022 metadata
4. Image URL is invalid

**Fix:** Wait a few minutes, then refresh wallet.

### How do I add my token to DEXs?
Most Solana DEXs (Jupiter, Raydium, Orca) automatically support all Token-2022 tokens. Just:
1. Create a liquidity pool
2. Add liquidity
3. Token becomes tradeable

Some DEXs have token lists for better UX - submit to those separately.

---

## Troubleshooting

### Transaction failed: "Insufficient funds"
You need more SOL in your wallet. Add at least 0.01 SOL and try again.

### Transaction failed: "Blockhash expired"
Network congestion caused delay. Simply try again - the transaction is automatically retried with a fresh blockhash.

### "Max wallet exceeded" error
Someone is trying to receive more tokens than the max wallet cap allows. They need to:
- Receive a smaller amount
- Split the transfer to multiple wallets
- Wait for the cap to be increased (if applicable)

### Token not showing in my wallet
1. Wait 30-60 seconds for indexing
2. Refresh your wallet
3. Manually add token by mint address
4. Verify you're on the correct network (devnet/mainnet)

### Cron job not collecting fees
**Check:**
```bash
# Verify cron is installed
crontab -l

# Check logs
tail -f ~/.mintcraft/logs/collect-fees-*.log

# Test manually
npm run collect:fees
```

**Common issues:**
- Keypair path wrong in env file
- No fees accumulated yet
- Insufficient SOL for transactions
- Wrong RPC URL

### Image won't upload
**IPFS upload issues:**
1. Check file size (<10MB recommended)
2. Check format (PNG, JPG, GIF supported)
3. Try a different image
4. Check API server is running
5. Check network connection

### Split recipients not working
**Verify:**
1. Recipient addresses are valid Solana addresses
2. Percentages add up correctly
3. `SPLIT_RECIPIENTS` format: `Address1:40,Address2:30,Address3:30`
4. No spaces in the configuration
5. Cron job is running

---

## Best Practices

### Before Mainnet Launch

**Checklist:**
- [ ] Test identical token on devnet
- [ ] Verify all features work (transfers, fees, max wallet)
- [ ] Test fee collection script
- [ ] Confirm split distributions
- [ ] Audit tokenomics calculations
- [ ] Prepare documentation for holders
- [ ] Secure all keypairs (backup!)
- [ ] Test wallet integrations
- [ ] Verify explorer links work
- [ ] Plan initial distribution

### After Launch

**Immediate (first 24 hours):**
- [ ] Monitor first transfers
- [ ] Verify fee collection
- [ ] Check explorer display
- [ ] Test DEX integration
- [ ] Respond to community questions

**Ongoing:**
- [ ] Monitor cron logs
- [ ] Track holder distribution
- [ ] Review treasury balances
- [ ] Adjust fees if needed (before renouncing)
- [ ] Engage with community

### Marketing Tips

**Do:**
- ✅ Share Solscan links (better than default Explorer)
- ✅ Explain tokenomics clearly
- ✅ Show transaction breakdown
- ✅ Be transparent about fees
- ✅ Document everything
- ✅ Build in public

**Don't:**
- ❌ Promise guaranteed returns
- ❌ Hide fee structures
- ❌ Make price predictions
- ❌ Rush mainnet launch
- ❌ Over-complicate tokenomics

---

## Support

### Where can I get help?
1. **Documentation:** Check `/docs` folder
2. **GitHub Issues:** Report bugs or ask questions
3. **Community:** Join our community channels
4. **Code:** Review open source code

### How do I report a bug?
1. Go to GitHub repository
2. Open a new issue
3. Provide:
   - Description of bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/transaction signatures
   - Network (devnet/mainnet)

### Can I contribute to MintCraft?
Yes! MintCraft is open source. Contributions welcome:
- Code improvements
- Documentation
- Bug reports
- Feature requests
- Testing

See `CONTRIBUTING.md` for guidelines (if it exists).

### Is there a Discord/Telegram?
Check the GitHub repository README for current community links.

---

## Advanced Topics

### Can I use MintCraft programmatically?
Yes! You can use the transaction builder directly:

```typescript
import { TransactionBuilder } from '@/lib/solana/transaction-builder';
import { TokenConfig } from '@/lib/solana/types';

const builder = new TransactionBuilder();
const { transaction } = await builder.buildTokenCreationTransaction(
  connection,
  tokenConfig,
  payerWallet,
  mintKeypair
);
```

See `docs/TECHNICAL_OVERVIEW.md` for API details.

### Can I customize the transfer hook?
Yes, but it requires deploying your own Anchor program:

1. Fork the repository
2. Modify `programs/mintcraft/src/lib.rs`
3. Implement your custom logic in `execute()`
4. Deploy to your own program ID
5. Update frontend to use your program ID

### Can I add custom extensions?
The codebase is extensible. To add new Token-2022 extensions:

1. Update `TokenConfig` types
2. Add space calculation
3. Add instruction creation
4. Update UI
5. Test thoroughly

See `CLAUDE.md` for detailed workflow.

### Can I integrate MintCraft into my dApp?
Absolutely! Two approaches:

**Approach 1: Embed UI**
```html
<iframe src="https://mintcraft.app" />
```

**Approach 2: Use SDK**
Import transaction builder and use it directly in your dApp.

### How do I handle errors programmatically?
```typescript
try {
  await mintToken(formData, extensions);
} catch (error) {
  if (error.message.includes('MaxWalletExceeded')) {
    // Handle max wallet error
  } else if (error.message.includes('Insufficient funds')) {
    // Handle balance error
  }
  // ... other error handling
}
```

See program error codes in IDL.

---

## Glossary

**ATA**: Associated Token Account - deterministic token account address
**Basis Points**: 1/100th of a percent (100 BPS = 1%)
**Devnet**: Solana test network with free SOL
**IDL**: Interface Definition Language - describes program structure
**IPFS**: InterPlanetary File System - decentralized storage
**Mainnet**: Solana production network with real SOL
**PDA**: Program Derived Address - deterministic account controlled by program
**RPC**: Remote Procedure Call - API for blockchain interaction
**SPL**: Solana Program Library
**Token-2022**: Next-gen Solana token standard with extensions
**Transfer Hook**: Custom program executed during token transfers

---

**Still have questions?** Check the other documentation files or open a GitHub issue!
