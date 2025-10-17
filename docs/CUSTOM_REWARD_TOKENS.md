# Custom Reward Token Distribution

This document explains how to configure and use custom reward tokens for reflections distribution in MintCraft.

## Overview

The reflection system now supports distributing rewards in a **different token** than the one that collects transfer fees. This allows you to:

1. Collect fees in your project token (Token A)
2. Automatically swap those fees to a reward token (Token B) using Jupiter
3. Distribute Token B to your holders proportionally

This is useful for:
- Distributing stablecoins (USDC) as rewards while collecting fees in your token
- Rewarding holders with established tokens (SOL, BONK, etc.)
- Creating hybrid tokenomics models

## How It Works

### Normal Flow (Same Token)
```
1. Collect transfer fees (Your Token)
2. Distribute fees to holders (Your Token)
```

### Custom Reward Flow (Different Token)
```
1. Collect transfer fees (Your Token)
2. Swap to reward token via Jupiter (Your Token → Reward Token)
3. Distribute reward token to holders (Reward Token)
```

### Fallback Mechanism
If the swap fails (e.g., no liquidity), the script will check if the treasury already has the reward token on hand:
- ✅ If yes: Use existing balance for distribution
- ❌ If no: Skip distribution and log error

## Configuration

### 1. Update your `.env` file

Copy the example configuration:
```bash
cp scripts/reflections.env.example scripts/reflections.env
```

Edit `scripts/reflections.env` and add:

```bash
# Your token mint that collects fees
MINT_ADDRESS=YourProjectTokenMintAddress

# The token you want to distribute as rewards
# Leave empty to distribute the same token as fees
REWARD_TOKEN_MINT=RewardTokenMintAddress

# Swap slippage tolerance (100 = 1%, 200 = 2%, etc.)
SWAP_SLIPPAGE_BPS=100
```

### 2. Example Configurations

**Distribute USDC as rewards:**
```bash
MINT_ADDRESS=2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN
REWARD_TOKEN_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC
SWAP_SLIPPAGE_BPS=100
```

**Distribute same token (no swap):**
```bash
MINT_ADDRESS=2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN
REWARD_TOKEN_MINT=  # Empty = use same token
```

**Distribute BONK as rewards:**
```bash
MINT_ADDRESS=YourTokenMintAddress
REWARD_TOKEN_MINT=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263  # BONK
SWAP_SLIPPAGE_BPS=200  # Higher slippage for memecoins
```

## On-Chain Configuration

The reflection config on-chain needs to be initialized with the reward token mint. When creating reflections for your token, use the `initialize_reflection_config` instruction:

```typescript
import * as anchor from '@coral-xyz/anchor';

// Initialize with custom reward token
await program.methods
  .initializeReflectionConfig(
    rewardTokenMint,  // PublicKey of the reward token
    minHolding,       // u64
    gasRebateBps      // u16
  )
  .accounts({
    payer: payer.publicKey,
    authority: authority.publicKey,
    mint: yourTokenMint,
    config: reflectionConfigPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Running the Distribution

### Manual Run
```bash
npm run distribute:reflections
```

### Automated Hourly (Cron)
```bash
# Install the cron job
bash scripts/install-reflection-cron.sh
```

## How the Swap Works

The script uses **Jupiter Aggregator** to find the best swap route:

1. **Quote**: Fetches the best price across all Solana DEXes
2. **Slippage**: Applies your configured slippage tolerance
3. **Execute**: Signs and sends the swap transaction
4. **Confirm**: Waits for confirmation before distributing

### Slippage Settings

- **100 BPS (1%)**: Good for liquid pairs (e.g., Your Token → USDC)
- **200 BPS (2%)**: Recommended for medium liquidity
- **500+ BPS (5%+)**: High slippage for low liquidity or memecoins

## Eligibility

Holders are eligible for reflections based on their holdings of the **fee collection token** (MINT_ADDRESS), not the reward token. This means:

- Hold 1000+ of Your Token → Receive proportional USDC rewards
- Don't need to hold any of the reward token to receive it
- Minimum holding threshold applies to the fee token

## Token Program Compatibility

The script automatically detects which token program each mint uses:
- ✅ **Token-2022** (recommended)
- ✅ **SPL Token** (legacy)
- ✅ **Mixed** (fee token on Token-2022, reward on SPL Token)

## Logging and Monitoring

The script logs all actions to:
```
~/.mintcraft/logs/reflections.log
```

Key log entries to monitor:
```
=== Starting Hourly Reflection Distribution ===
Fee Collection Mint: [your token]
Reward Token Mint: [reward token] (swap required)

=== Performing Token Swap ===
Initiating swap: [amount] of [fee token] -> [reward token]
Quote received: [output amount] output tokens expected
✅ Swap confirmed: [signature]

=== Distributing Reward Tokens ===
Distributing to [N] holders...
✅ Successful: [N] holders
💰 Total distributed: [amount] reward tokens
```

## Troubleshooting

### Swap Fails - No Liquidity
```
ERROR: Swap failed: No routes found
INFO: Checking if treasury already has reward tokens...
INFO: Using existing treasury reward balance: [amount]
```

**Solution**: Ensure your token has liquidity on a DEX, or pre-fund the treasury with reward tokens.

### Insufficient Fee Pool
```
WARN: Fee pool (1000) below minimum (10000). Skipping distribution.
```

**Solution**: Wait for more fees to accumulate, or lower `MIN_TOTAL_POOL` in your config.

### Wrong Token Program
```
ERROR: Invalid token account
```

**Solution**: The script auto-detects token programs. If this occurs, verify both mint addresses are valid.

## Gas Costs

With custom reward tokens, you pay for:
1. **Swap transaction**: Jupiter swap fees (minimal)
2. **Distribution transactions**: Same as normal reflections
3. **ATA creation**: Creating reward token accounts for recipients (one-time per holder)

Budget approximately **0.01-0.02 SOL per distribution run** depending on holder count.

## Security Considerations

- The treasury keypair signs both swap and distribution transactions
- Slippage protection prevents excessive loss during swaps
- Jupiter is a trusted, audited aggregator
- Always test on devnet first with small amounts

## Best Practices

1. **Start with conservative slippage** (100-200 BPS) and adjust if swaps fail
2. **Monitor the first few runs manually** before relying on cron automation
3. **Ensure your token has adequate liquidity** before enabling swaps
4. **Keep some SOL in the treasury** for transaction fees
5. **Use mainnet RPCs with high rate limits** (Helius, QuickNode, etc.)

## Example: USDC Rewards Setup

Complete setup for distributing USDC rewards:

```bash
# 1. Configure environment
cat > scripts/reflections.env << EOF
MINT_ADDRESS=YourTokenMintAddress
REWARD_TOKEN_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
SWAP_SLIPPAGE_BPS=100
MIN_HOLDING=1000000000
EXCLUDED_WALLETS=
MAX_DISTRIBUTIONS_PER_RUN=100
MIN_TOTAL_POOL=1000000000
TREASURY_KEYPAIR_PATH=~/.config/solana/treasury.json
RPC_URL=https://api.mainnet-beta.solana.com
EOF

# 2. Test manually first
npm run distribute:reflections

# 3. Verify in logs
tail -f ~/.mintcraft/logs/reflections.log

# 4. Install cron for hourly automation
bash scripts/install-reflection-cron.sh
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/mintcraft/issues
- Documentation: See CLAUDE.md for project overview
