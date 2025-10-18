# MintCraft - Solana Token-2022 Creation Platform

Create professional Solana tokens with advanced features like transfer fees, max wallet caps, and automated treasury management - all without writing code.

## 🚀 Quick Links

- **[📖 Complete Documentation Index](./DOCUMENTATION_INDEX.md)** - Start here to find what you need
- **[👤 User Guide](./docs/USER_GUIDE.md)** - Step-by-step token creation guide
- **[💡 Tokenomics Examples](./docs/TOKENOMICS_EXAMPLES.md)** - Real-world configurations
- **[❓ FAQ](./docs/FAQ.md)** - Common questions & troubleshooting
- **[🔧 Technical Overview](./docs/TECHNICAL_OVERVIEW.md)** - Architecture & API docs

## Project info

**URL**: https://lovable.dev/projects/61ed21ce-8c51-4e7d-b71b-cc1b2cdf22c9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/61ed21ce-8c51-4e7d-b71b-cc1b2cdf22c9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/61ed21ce-8c51-4e7d-b71b-cc1b2cdf22c9) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## ✨ Features

### Token-2022 Extensions
- **Transfer Fees**: Automatic tax on transfers with configurable percentage
- **Max Wallet Cap**: Limit token holdings per wallet to prevent whales
- **Split Distributions**: Route fees to multiple wallets automatically
- **Transfer Hooks**: Custom on-chain validation during transfers
- **Metaplex Metadata**: On-chain name, symbol, and image

### 🌊 Meteora DLMM Integration (NEW!)
- **Automated Pool Creation**: Create liquidity pools instantly after token creation
- **Token-2022 Support**: Full support for tokens with extensions via CLI integration
- **Jupiter-Ready**: Pools are automatically discovered by Jupiter aggregator for swaps
- **API Endpoint**: Programmatic pool creation via REST API
- **Strategic Positioning**: First launchpad with automated Meteora DLMM integration

### 💰 Reflection System
- **Custom Reward Tokens**: Distribute collected fees in any token (USDC, BONK, etc.)
- **Jupiter DEX Integration**: Automatic swap from fee token to reward token
- **Automated Distributions**: Hourly cron job for proportional holder rewards
- **Configurable**: Minimum holdings, excluded wallets, gas rebates

### User Experience
- **One-Click Creation**: Create tokens in under 5 minutes
- **Client-Side Signing**: Your keys never leave your browser
- **IPFS Storage**: Decentralized metadata and image hosting
- **Automated Fee Collection**: Set up hourly cron jobs for fee sweeps
- **Multiple Explorers**: Works with Solana Explorer, Solscan, XRAY

### Developer Features
- **Open Source**: Fully auditable code
- **Extensible**: Add custom Token-2022 extensions
- **TypeScript SDK**: Use transaction builder in your dApp
- **Anchor Program**: Verified on-chain program
- **Comprehensive Docs**: 15,000+ words of documentation

## 📚 Documentation

### For Token Creators
- **[User Guide](./docs/USER_GUIDE.md)** - Complete walkthrough of token creation
- **[Tokenomics Examples](./docs/TOKENOMICS_EXAMPLES.md)** - 7 real-world token models
- **[FAQ](./docs/FAQ.md)** - 60+ questions answered
- **[Fixing Unknown Instructions](./docs/FIXING_UNKNOWN_INSTRUCTIONS.md)** - Explorer display issues

### Advanced Features
- **[Custom Reward Tokens](./docs/CUSTOM_REWARD_TOKENS.md)** - Jupiter swap integration guide
- **[Meteora Pool Creation](./docs/METEORA_INTEGRATION.md)** - Automated DLMM pool setup
- **[Jupiter Devnet Testing](./docs/JUPITER_DEVNET_TESTING.md)** - DEX testing strategies
- **[Devnet Liquidity Testing](./docs/DEVNET_LIQUIDITY_TESTING.md)** - Pool creation walkthrough

### For Developers
- **[Technical Overview](./docs/TECHNICAL_OVERVIEW.md)** - Architecture & API documentation
- **[CLAUDE.md](./CLAUDE.md)** - Development commands & workflows
- **[Build Notes](./docs/BUILD_NOTES.md)** - Anchor build troubleshooting
- **[Changelog](./CHANGELOG.md)** - Version history

### Navigation
- **[Documentation Index](./DOCUMENTATION_INDEX.md)** - Complete guide to all docs

## 🎯 Quick Start

### Create Your First Token

1. **Install dependencies**
```bash
npm install
```

2. **Start the development server**
```bash
npm run dev
```

3. **Open in browser**: http://localhost:5173

4. **Connect your wallet** and create a test token on devnet

**Full guide**: See [User Guide](./docs/USER_GUIDE.md) for detailed steps

### Deploy the Anchor Program

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Upload IDL so Explorer can decode instructions
bash scripts/upload-idl.sh devnet
```

**Build issues?** See [Build Notes](./docs/BUILD_NOTES.md)

## Auto-collect Token Transfer Fees

To sweep Token-2022 transfer taxes into your treasury every hour:

```sh
# 1. Configure your mint, withdraw authority, and treasury owner.
cp scripts/collect-fees.env.example scripts/collect-fees.env
${EDITOR:-nano} scripts/collect-fees.env

# 2. Install the cron job (adds/updates an hourly entry).
scripts/install-fee-cron.sh
```

- Edit `CRON_SCHEDULE` in `scripts/collect-fees.env` if you prefer a different cadence.
- Logs default to `~/.mintcraft/logs/collect-fees-<timestamp>.log`.
- The job runs `npm run collect:fees`, which auto-discovers taxed accounts, creates the treasury ATA if needed, and withdraws withheld fees to your treasury wallet.
- Want to route taxes to multiple wallets? Set `SPLIT_RECIPIENTS=WalletA:70,WalletB:30` in the env file (percentages are normalized), and optionally provide `TREASURY_AUTHORITY` if the treasury owner differs from the withdraw authority key.
