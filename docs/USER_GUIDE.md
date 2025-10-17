# MintCraft User Guide

## What is MintCraft?

MintCraft is a professional token creation platform for Solana's Token-2022 standard. It enables anyone to create advanced tokens with built-in features like transfer fees, max wallet caps, and automated treasury management - all without writing code.

## Features

### 🎯 Core Features
- **Token-2022 Standard**: Next-generation Solana tokens with advanced capabilities
- **IPFS Metadata**: Decentralized storage for token images and information
- **One-Click Creation**: Create tokens in seconds with a user-friendly interface
- **Explorer Integration**: Tokens appear immediately on Solana Explorer and Solscan

### 💰 Advanced Extensions

#### Transfer Fees (Tax System)
- Set a percentage fee on all token transfers (e.g., 2.5%)
- Automatic collection to your treasury wallet
- Optional maximum fee cap per transaction
- Support for split distributions (multiple treasury wallets)

#### Max Wallet Cap
- Limit how many tokens any wallet can hold
- Prevents whale accumulation
- Set as percentage of total supply (e.g., max 5%)
- Authority wallet is exempt from limits

#### Automated Fee Collection
- Set up hourly automatic fee sweeps
- No manual intervention required
- Split fees across multiple recipients
- Detailed collection logs

### 🔐 Security Features
- **Client-Side Signing**: Your private keys never leave your browser
- **Open Source**: All code is publicly auditable
- **On-Chain Program**: Verified Anchor program on Solana
- **Transparent Transactions**: All operations visible on blockchain

## Getting Started

### Prerequisites
- A Solana wallet (Phantom, Solflare, or any Solana Wallet Adapter compatible wallet)
- Some SOL for transaction fees (~0.05 SOL recommended)
- Token image (optional, but recommended)

### Step-by-Step Token Creation

#### 1. Connect Your Wallet
- Visit the MintCraft application
- Click "Connect Wallet" in the top right
- Select your wallet provider
- Approve the connection

#### 2. Choose Network
- **Devnet**: For testing (free SOL from faucets)
- **Mainnet**: For production tokens (real SOL required)

**Important**: Always test on Devnet first!

#### 3. Fill Out Token Details

**Basic Information:**
- **Token Name**: Full name (e.g., "Bitty Token")
- **Symbol**: Ticker symbol (e.g., "BITTY")
- **Description**: What your token represents
- **Image**: Logo/icon for your token

**Supply & Decimals:**
- **Decimals**: Number of decimal places (9 is standard for Solana)
- **Initial Supply**: Total tokens to create (e.g., 1,000,000,000)

**Example:**
```
Name: Bitty Token
Symbol: BITTY
Decimals: 9
Supply: 1,000,000,000
Description: A community-driven token for the Bitty ecosystem
```

#### 4. Configure Extensions (Optional)

**Transfer Fee:**
- Toggle "Enable Transfer Fee"
- Set percentage (e.g., 2.5% = 2.5)
- Set max fee per transaction (optional)
- Enter treasury wallet address
- Optionally configure split recipients

**Max Wallet Cap:**
- Toggle "Enable Max Wallet Cap"
- Set maximum percentage any wallet can hold (e.g., 5%)
- Your wallet is automatically exempt

#### 5. Review & Create
- Review all settings
- Click "Create Token"
- Approve the transaction in your wallet
- Wait for confirmation (usually 10-30 seconds)

#### 6. Success!
- Copy your token mint address
- View on Explorer
- Share with your community

## Understanding Your Token Transaction

When you create a token, MintCraft executes these steps in a single atomic transaction:

### Transaction Breakdown

| Step | Instruction | What It Does |
|------|-------------|--------------|
| 1 | Create Mint Account | Creates the token mint on-chain |
| 2 | Initialize Transfer Fee | Sets up the transfer tax system (if enabled) |
| 3 | Initialize Transfer Hook | Enables custom transfer validation (if max wallet enabled) |
| 4 | Initialize Mint | Finalizes the mint configuration with decimals and authorities |
| 5 | Create Token Account | Creates your associated token account |
| 6 | Mint Initial Supply | Mints all tokens to your wallet |
| 7 | Create Metadata | Adds name, symbol, and image URI on-chain |
| 8 | Initialize Max Wallet Config | Sets up the wallet cap enforcement (if enabled) |

**All steps complete atomically** - either everything succeeds or the entire transaction fails (no partial state).

### Why Some Instructions Show "Unknown"

On Solana Explorer, you may see some instructions labeled as "Unknown". This is normal and doesn't indicate any problem:

- **Why it happens**: Solana Explorer hasn't indexed all Token-2022 extension types yet
- **What it means**: The instruction executed successfully, just not labeled
- **Your token is safe**: All operations are transparent on the blockchain

**Better explorers for Token-2022:**
- Solscan: `https://solscan.io/token/YOUR_MINT_ADDRESS?cluster=devnet`
- XRAY: `https://xray.helius.xyz`

## Managing Your Token

### Transfer Fee Collection

If you enabled transfer fees, you need to periodically collect accumulated fees.

#### Manual Collection
```bash
# Configure your collection settings
cp scripts/collect-fees.env.example scripts/collect-fees.env
nano scripts/collect-fees.env

# Run collection manually
npm run collect:fees
```

#### Automated Collection (Recommended)
```bash
# Install hourly cron job
scripts/install-fee-cron.sh
```

The cron job will:
- Run every hour automatically
- Find all accounts with withheld fees
- Create treasury token accounts if needed
- Withdraw fees to your treasury
- Split fees across recipients (if configured)
- Log all operations

### Updating Max Wallet Cap

You can update the max wallet percentage after creation:

```typescript
// Using the provided SDK utilities
import { createUpdateMaxWalletConfigInstruction } from '@/lib/solana/max-wallet';

const updateInstruction = createUpdateMaxWalletConfigInstruction({
  authority: yourWallet,
  mint: tokenMintAddress,
  maxWalletBps: 300, // 3% (in basis points)
});
```

## Token Economics Examples

### Example 1: Reflection Token
```
Name: Reflect Token
Symbol: RFLCT
Supply: 1,000,000,000
Decimals: 9

Transfer Fee: 3%
Max Fee Per Transfer: 100,000 RFLCT
Treasury: [Your Wallet]

Max Wallet: 2% of supply
```

**Outcome:**
- Each transfer collects 3% fee
- Holders can't accumulate more than 20M tokens (2%)
- Hourly collection redistributes fees to treasury

### Example 2: Community Token with Split Treasury
```
Name: Community Coin
Symbol: COMM
Supply: 500,000,000
Decimals: 9

Transfer Fee: 5%
Split Recipients:
  - Development Team: 40%
  - Marketing Fund: 30%
  - Burn Address: 30%

Max Wallet: 1% of supply
```

**Outcome:**
- 5% tax on all transfers
- Automatically split to 3 wallets
- Max holding is 5M tokens per wallet

### Example 3: Simple Meme Coin
```
Name: Doge Coin 2.0
Symbol: DOGE2
Supply: 100,000,000,000
Decimals: 9

Transfer Fee: Disabled
Max Wallet: Disabled
```

**Outcome:**
- Pure meme coin with no restrictions
- Fast transfers, no fees
- Full decentralization

## Best Practices

### Before Launch

1. **Test on Devnet**
   - Create a test token with identical settings
   - Test transfers between wallets
   - Verify fee collection works
   - Check explorer links

2. **Verify Settings**
   - Double-check treasury wallet address
   - Confirm fee percentages are correct
   - Test max wallet calculations
   - Review token metadata

3. **Prepare Documentation**
   - Explain your tokenomics
   - Share transaction breakdown
   - Provide explorer links
   - Document fee distribution

### After Launch

1. **Monitor Fee Collection**
   - Check cron logs regularly
   - Verify fees are being collected
   - Monitor treasury balances

2. **Communicate with Holders**
   - Share token mint address
   - Explain fee structure
   - Provide Solscan links (better than default Explorer)
   - Be transparent about treasury usage

3. **Track Metrics**
   - Monitor holder count
   - Track transaction volume
   - Review fee collection amounts
   - Analyze token distribution

## Common Questions

### Q: Can I change my token after creation?
**A:** Some settings can be updated:
- ✅ Max wallet percentage (if you're the authority)
- ✅ Transfer fee config (if you're the authority)
- ❌ Token name, symbol, supply (immutable)
- ❌ Decimals (immutable)

### Q: What happens if a transfer would exceed max wallet?
**A:** The transfer is rejected with error "Transfer exceeds the maximum allowed wallet allocation". The sender keeps their tokens and can try a smaller amount.

### Q: How much SOL do I need?
**A:**
- Devnet: Free (use faucet)
- Mainnet: ~0.05 SOL for creation + rent (~0.01 SOL ongoing)

### Q: Can I revoke mint authority?
**A:** Yes! After creation, you can revoke mint authority using standard Token-2022 instructions to make supply permanently fixed.

### Q: Where are my tokens stored?
**A:** All tokens are minted to your associated token account. You have full custody - MintCraft never controls your tokens.

### Q: Is this audited?
**A:** The code is open source and uses standard Solana/Anchor patterns. For production mainnet tokens with significant value, we recommend a professional audit.

### Q: What are the fees?
**A:**
- Platform fee: $0 (completely free)
- Network fees: Just Solana transaction costs (~0.000005 SOL)
- No hidden charges

## Troubleshooting

### Wallet Won't Connect
- Refresh the page
- Try a different wallet
- Check if wallet is unlocked
- Verify correct network (devnet/mainnet)

### Transaction Failed
- **Insufficient SOL**: Add more SOL to your wallet
- **Blockhash Expired**: Try again (rare, auto-retries)
- **Invalid Settings**: Check all inputs are valid

### Token Not Showing in Wallet
- Wait 30 seconds for indexing
- Manually add token by mint address
- Check you're on correct network
- Verify transaction succeeded on Explorer

### Fees Not Collecting
- Verify cron job is running: `crontab -l`
- Check logs: `~/.mintcraft/logs/`
- Ensure withdraw authority keypair is accessible
- Verify treasury wallet addresses are correct

## Developer Resources

### SDK Integration

Use MintCraft tokens in your dApp:

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import * as Token2022Program from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com');
const mintAddress = new PublicKey('YOUR_MINT_ADDRESS');

// Get token info
const mintInfo = await Token2022Program.getMint(
  connection,
  mintAddress,
  'confirmed',
  Token2022Program.TOKEN_2022_PROGRAM_ID
);

console.log('Decimals:', mintInfo.decimals);
console.log('Supply:', mintInfo.supply);
```

### Reading Transfer Fee Config

```typescript
import { getTransferFeeConfig } from '@solana/spl-token';

const transferFeeConfig = await getTransferFeeConfig(mintInfo);
if (transferFeeConfig) {
  console.log('Fee BPS:', transferFeeConfig.newerTransferFee.transferFeeBasisPoints);
  console.log('Max Fee:', transferFeeConfig.newerTransferFee.maximumFee);
}
```

### API Endpoints

MintCraft API server:

**POST /api/upload-to-ipfs**
```bash
curl -X POST http://localhost:3001/api/upload-to-ipfs \
  -F "image=@token-logo.png" \
  -F "name=My Token" \
  -F "symbol=MTK" \
  -F "description=Token description"
```

Response:
```json
{
  "success": true,
  "metadataUri": "https://ipfs.bitty.money/ipfs/Qm...",
  "imageUri": "https://ipfs.bitty.money/ipfs/Qm..."
}
```

## Support & Community

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check `/docs` folder for technical details
- **Code**: Fully open source at the repository

## Security Notice

⚠️ **Important Security Practices:**

1. **Never share your private key** - MintCraft never asks for it
2. **Verify transaction details** in your wallet before signing
3. **Test on devnet** before mainnet launches
4. **Backup your keypairs** used for authorities
5. **Use hardware wallets** for high-value operations

## License & Disclaimer

This software is provided as-is. Users are responsible for:
- Testing their tokens thoroughly
- Understanding Solana mechanics
- Complying with local regulations
- Managing their token economies

MintCraft is a tool - token success depends on your project's fundamentals.

---

**Ready to create your token?** Connect your wallet and get started in under 5 minutes!
