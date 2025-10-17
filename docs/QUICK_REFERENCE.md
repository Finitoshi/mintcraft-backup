# MintCraft Quick Reference Card

## 📋 Common Commands

### Frontend
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (localhost:5173)
npm run build           # Production build
npm test                # Run tests
npm lint                # Lint code
```

### Anchor Program
```bash
anchor build                              # Build program
anchor deploy --provider.cluster devnet   # Deploy to devnet
bash scripts/upload-idl.sh devnet        # Upload IDL
anchor test                               # Run tests
```

### Fee Collection
```bash
npm run collect:fees              # Manual collection
bash scripts/install-fee-cron.sh  # Install hourly cron
```

## 🔗 Quick Links

| What | Link |
|------|------|
| User Guide | [docs/USER_GUIDE.md](./USER_GUIDE.md) |
| Tokenomics Examples | [docs/TOKENOMICS_EXAMPLES.md](./TOKENOMICS_EXAMPLES.md) |
| FAQ | [docs/FAQ.md](./FAQ.md) |
| Technical Docs | [docs/TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md) |
| Fix "Unknown" | [docs/FIXING_UNKNOWN_INSTRUCTIONS.md](./FIXING_UNKNOWN_INSTRUCTIONS.md) |
| All Docs | [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) |

## 🌐 Program IDs

```
Devnet:  Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4
Mainnet: (not deployed)
```

## 📊 Token Configuration Cheatsheet

### Transfer Fee
```typescript
transferFee: {
  feeBasisPoints: 250,        // 2.5% (250/10000)
  maxFee: BigInt(100000000),  // 0.1 tokens (9 decimals)
  transferFeeConfigAuthority: yourWallet,
  withdrawWithheldAuthority: treasuryWallet,
}
```

### Max Wallet
```typescript
maxWalletPercentage: 2.5  // 2.5% of total supply
```

### Split Recipients
```bash
# In collect-fees.env
SPLIT_RECIPIENTS=Wallet1:40,Wallet2:30,Wallet3:30
```

## 🎯 Typical Token Creation Flow

1. Fill form with token details
2. Upload image (optional) → IPFS
3. Configure extensions (optional)
4. Click "Create Token"
5. Sign transaction in wallet
6. Wait 10-30 seconds
7. Copy mint address
8. View on Explorer/Solscan

## 💰 Cost Reference (Mainnet)

| Action | Cost |
|--------|------|
| Create Token | ~0.004 SOL |
| Transfer | ~0.000005 SOL |
| Fee Collection | ~0.000005 SOL |
| Upload IDL | ~0.002 SOL |

## 🔧 Key File Locations

```
Frontend:
├── src/hooks/useTokenMinting.ts      # Main minting hook
├── src/lib/solana/transaction-builder.ts  # TX builder
├── src/lib/solana/extensions.ts      # Extension handler
└── src/components/TokenForm.tsx      # UI form

Anchor Program:
└── programs/mintcraft/src/lib.rs     # On-chain code

Scripts:
├── scripts/collect-transfer-fees.mjs # Fee collection
├── scripts/upload-idl.sh            # IDL uploader
└── scripts/collect-fees.env         # Config

Documentation:
└── docs/                            # All guides
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Transaction failed | Check SOL balance, try again |
| "Unknown" instruction | Upload IDL or use Solscan |
| Image not showing | Wait 1-2 minutes, refresh wallet |
| Max wallet exceeded | Reduce transfer amount |
| Cron not running | Check `crontab -l` |
| Build fails | Run `bash scripts/fix_build.sh` |

## 📱 Best Explorer Links

```
Solana Explorer:
https://explorer.solana.com/address/MINT?cluster=devnet

Solscan (Better for Token-2022):
https://solscan.io/token/MINT?cluster=devnet

XRAY (Best for transactions):
https://xray.helius.xyz/tx/SIGNATURE?network=devnet
```

## 🔑 Important Basis Points

```
100 BPS  = 1%
250 BPS  = 2.5%
500 BPS  = 5%
1000 BPS = 10%
10000 BPS = 100%
```

## 🎨 Tokenomics Quick Picks

| Model | Fee | Max Wallet | Use Case |
|-------|-----|------------|----------|
| Meme Coin | 0% | None | Pure speculation |
| Reflection | 3-5% | 2% | Reward holders |
| Burn | 5-10% | 3% | Deflationary |
| Governance | 0% | 1% | DAO voting |
| Gaming | 1% | 0.5% | In-game currency |

## 🛡️ Security Checklist

Before mainnet:
- [ ] Test identical token on devnet
- [ ] Verify all features work
- [ ] Test fee collection
- [ ] Backup all keypairs
- [ ] Document tokenomics
- [ ] Prepare marketing materials
- [ ] Test with multiple wallets
- [ ] Verify explorer links

## 📞 Get Help

1. Check [FAQ](./FAQ.md)
2. Search [GitHub Issues](https://github.com/YOUR_REPO/issues)
3. Review [Documentation](../DOCUMENTATION_INDEX.md)
4. Open new issue with details

## 💡 Pro Tips

- Always test on devnet first
- Use Solscan for Token-2022 tokens
- Upload IDL immediately after deploy
- Keep authorities initially, renounce later
- Document everything for your community
- Start with low fees (1-2%)
- Max wallet should be ≥ LP allocation

---

**Need more detail?** See [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) for full documentation.
