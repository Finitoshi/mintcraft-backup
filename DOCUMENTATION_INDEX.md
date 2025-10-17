# MintCraft Documentation Index

Welcome to the complete MintCraft documentation! This guide will help you find exactly what you need.

## 📚 Documentation Structure

```
docs/
├── USER_GUIDE.md              # Start here if you're creating a token
├── TECHNICAL_OVERVIEW.md      # For developers and technical users
├── TOKENOMICS_EXAMPLES.md     # Real-world tokenomics configurations
├── FAQ.md                     # Common questions and troubleshooting
├── FIXING_UNKNOWN_INSTRUCTIONS.md  # Explorer display issues
├── BUILD_NOTES.md             # Anchor build troubleshooting
└── solana-stack-lock.md       # Toolchain version details

Root:
├── CLAUDE.md                  # Quick reference for AI assistants
├── README.md                  # Project overview
└── CHANGELOG.md               # Version history
```

## 🎯 Quick Navigation

### I want to...

#### Create My First Token
**Start here:** [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md)
- Step-by-step token creation
- Understanding each field
- Best practices
- Common configurations

#### Understand How It Works
**Read:** [`docs/TECHNICAL_OVERVIEW.md`](./docs/TECHNICAL_OVERVIEW.md)
- Architecture breakdown
- Transaction flow
- On-chain program details
- Security model
- API documentation

#### Design Token Economics
**Explore:** [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md)
- 7 real-world examples
- Reflection tokens
- Burn mechanisms
- Governance tokens
- Gaming tokens
- DAO treasuries
- Comparison matrix

#### Fix Issues
**Check:** [`docs/FAQ.md`](./docs/FAQ.md)
- Troubleshooting section
- Common errors
- Transaction failures
- Display issues
- Fee collection problems

#### Fix "Unknown" Instructions on Explorer
**See:** [`docs/FIXING_UNKNOWN_INSTRUCTIONS.md`](./docs/FIXING_UNKNOWN_INSTRUCTIONS.md)
- Why instructions show as "Unknown"
- How to upload IDL
- Better explorer alternatives
- Reassuring investors

#### Build the Anchor Program
**Review:** [`docs/BUILD_NOTES.md`](./docs/BUILD_NOTES.md)
- Toolchain setup
- Build troubleshooting
- Docker image usage
- Dependency fixes

#### Develop/Contribute
**Study:** [`CLAUDE.md`](./CLAUDE.md)
- Development commands
- Architecture overview
- Key files and roles
- Common pitfalls
- Testing guide

---

## 📖 By User Type

### 🎨 Token Creators (Non-Technical)

**Essential Reading:**
1. [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) - Complete walkthrough
2. [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md) - Design your tokenomics
3. [`docs/FAQ.md`](./docs/FAQ.md) - Common questions

**Optional:**
- [`docs/FIXING_UNKNOWN_INSTRUCTIONS.md`](./docs/FIXING_UNKNOWN_INSTRUCTIONS.md) - If you see "Unknown" on Explorer

### 💻 Developers

**Essential Reading:**
1. [`CLAUDE.md`](./CLAUDE.md) - Development setup and workflows
2. [`docs/TECHNICAL_OVERVIEW.md`](./docs/TECHNICAL_OVERVIEW.md) - Architecture deep dive
3. [`docs/BUILD_NOTES.md`](./docs/BUILD_NOTES.md) - Build environment

**Optional:**
- [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) - Understand user perspective
- [`CHANGELOG.md`](./CHANGELOG.md) - Recent changes

### 🏗️ Project Managers / Product Owners

**Essential Reading:**
1. [`README.md`](./README.md) - Project overview
2. [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md) - Use cases
3. [`docs/TECHNICAL_OVERVIEW.md`](./docs/TECHNICAL_OVERVIEW.md) - How it works

**Optional:**
- [`CHANGELOG.md`](./CHANGELOG.md) - Development progress

### 📊 Token Economists

**Essential Reading:**
1. [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md) - Model library
2. [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) - Implementation details
3. [`docs/FAQ.md`](./docs/FAQ.md) - Limitations and constraints

### 🔒 Security Auditors

**Essential Reading:**
1. [`docs/TECHNICAL_OVERVIEW.md`](./docs/TECHNICAL_OVERVIEW.md) - Security model
2. [`programs/mintcraft/src/lib.rs`](./programs/mintcraft/src/lib.rs) - On-chain code
3. [`src/lib/solana/transaction-builder.ts`](./src/lib/solana/transaction-builder.ts) - Client transaction logic

**Review:**
- All files in `src/lib/solana/` - Transaction building
- `api/server.js` - IPFS upload handling
- `scripts/collect-transfer-fees.mjs` - Fee collection script

---

## 🔍 By Topic

### Token Creation
- **Overview:** [`README.md`](./README.md)
- **Guide:** [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md)
- **Technical:** [`docs/TECHNICAL_OVERVIEW.md#transaction-flow`](./docs/TECHNICAL_OVERVIEW.md#transaction-flow)

### Transfer Fees
- **Setup:** [`docs/USER_GUIDE.md#transfer-fees`](./docs/USER_GUIDE.md#transfer-fees)
- **Examples:** [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md)
- **Collection:** [`docs/USER_GUIDE.md#transfer-fee-collection`](./docs/USER_GUIDE.md#transfer-fee-collection)
- **FAQ:** [`docs/FAQ.md#transfer-fees`](./docs/FAQ.md#transfer-fees)

### Max Wallet Cap
- **Setup:** [`docs/USER_GUIDE.md#step-4-configure-extensions`](./docs/USER_GUIDE.md#step-4-configure-extensions)
- **Technical:** [`docs/TECHNICAL_OVERVIEW.md#2-anchor-program-rust`](./docs/TECHNICAL_OVERVIEW.md#2-anchor-program-rust)
- **FAQ:** [`docs/FAQ.md#max-wallet-cap`](./docs/FAQ.md#max-wallet-cap)

### Fee Collection & Automation
- **Setup:** [`README.md#auto-collect-token-transfer-fees`](./README.md#auto-collect-token-transfer-fees)
- **Guide:** [`docs/USER_GUIDE.md#managing-your-token`](./docs/USER_GUIDE.md#managing-your-token)
- **Technical:** [`docs/TECHNICAL_OVERVIEW.md#4-fee-collection-system`](./docs/TECHNICAL_OVERVIEW.md#4-fee-collection-system)
- **Troubleshooting:** [`docs/FAQ.md#cron-job-not-collecting-fees`](./docs/FAQ.md#cron-job-not-collecting-fees)

### Tokenomics Design
- **Examples:** [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md)
- **Calculator:** [`docs/TOKENOMICS_EXAMPLES.md#calculating-your-tokenomics`](./docs/TOKENOMICS_EXAMPLES.md#calculating-your-tokenomics)
- **Best Practices:** [`docs/TOKENOMICS_EXAMPLES.md#best-practices`](./docs/TOKENOMICS_EXAMPLES.md#best-practices)

### Explorer Issues
- **Unknown Instructions:** [`docs/FIXING_UNKNOWN_INSTRUCTIONS.md`](./docs/FIXING_UNKNOWN_INSTRUCTIONS.md)
- **Upload IDL:** [`docs/FIXING_UNKNOWN_INSTRUCTIONS.md#solution-1-upload-your-idl-to-solana-recommended`](./docs/FIXING_UNKNOWN_INSTRUCTIONS.md#solution-1-upload-your-idl-to-solana-recommended)
- **Alternative Explorers:** [`docs/FIXING_UNKNOWN_INSTRUCTIONS.md#solution-2-use-a-different-explorer`](./docs/FIXING_UNKNOWN_INSTRUCTIONS.md#solution-2-use-a-different-explorer)

### Development
- **Setup:** [`CLAUDE.md#build--development-commands`](./CLAUDE.md#build--development-commands)
- **Architecture:** [`docs/TECHNICAL_OVERVIEW.md#architecture`](./docs/TECHNICAL_OVERVIEW.md#architecture)
- **Building:** [`docs/BUILD_NOTES.md`](./docs/BUILD_NOTES.md)
- **Testing:** [`CLAUDE.md#running-tests`](./CLAUDE.md#running-tests)

### Security
- **Overview:** [`docs/TECHNICAL_OVERVIEW.md#security-model`](./docs/TECHNICAL_OVERVIEW.md#security-model)
- **Best Practices:** [`docs/USER_GUIDE.md#security-notice`](./docs/USER_GUIDE.md#security-notice)
- **FAQ:** [`docs/FAQ.md#security-questions`](./docs/FAQ.md#security-questions)

---

## 🚀 Getting Started Paths

### Path 1: Quick Start (Non-Technical)
1. Read [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) - Step-by-step guide
2. Pick a model from [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md)
3. Create your token (test on devnet first!)
4. Check [`docs/FAQ.md`](./docs/FAQ.md) if you hit issues

**Time:** 30 minutes to first token

### Path 2: Deep Dive (Technical)
1. Read [`README.md`](./README.md) - Project overview
2. Study [`docs/TECHNICAL_OVERVIEW.md`](./docs/TECHNICAL_OVERVIEW.md) - How it works
3. Review [`CLAUDE.md`](./CLAUDE.md) - Development setup
4. Read [`programs/mintcraft/src/lib.rs`](./programs/mintcraft/src/lib.rs) - On-chain code
5. Experiment on devnet

**Time:** 2-3 hours to full understanding

### Path 3: Tokenomics Research
1. Browse [`docs/TOKENOMICS_EXAMPLES.md`](./docs/TOKENOMICS_EXAMPLES.md) - All models
2. Read [`docs/USER_GUIDE.md#token-economics-examples`](./docs/USER_GUIDE.md#token-economics-examples)
3. Calculate your model using examples
4. Test on devnet with real scenarios

**Time:** 1-2 hours to design tokenomics

### Path 4: Troubleshooting
1. Check [`docs/FAQ.md`](./docs/FAQ.md) - Common issues
2. Search [`CHANGELOG.md`](./CHANGELOG.md) - Known bugs/fixes
3. Review [`docs/FIXING_UNKNOWN_INSTRUCTIONS.md`](./docs/FIXING_UNKNOWN_INSTRUCTIONS.md) - Explorer issues
4. Check GitHub issues

**Time:** 15-30 minutes to resolve most issues

---

## 📝 Documentation Summaries

### USER_GUIDE.md
**Who:** Token creators (any skill level)
**What:** Complete walkthrough of token creation
**Length:** ~3,000 words
**Highlights:**
- Step-by-step creation process
- Feature explanations
- Transaction breakdown
- Management instructions
- Best practices

### TECHNICAL_OVERVIEW.md
**Who:** Developers, auditors, technical users
**What:** Deep technical architecture documentation
**Length:** ~5,000 words
**Highlights:**
- Component architecture
- Transaction flow diagrams
- On-chain program details
- Security model
- Extension points
- API documentation

### TOKENOMICS_EXAMPLES.md
**Who:** Token creators, economists, project managers
**What:** Real-world tokenomics configurations
**Length:** ~4,000 words
**Highlights:**
- 7 different token models
- Detailed configurations
- Math examples
- Comparison matrix
- Calculators
- Best practices

### FAQ.md
**Who:** Everyone
**What:** Common questions and troubleshooting
**Length:** ~4,500 words
**Highlights:**
- 60+ questions answered
- Troubleshooting guides
- Security explanations
- Best practices
- Glossary

### FIXING_UNKNOWN_INSTRUCTIONS.md
**Who:** Token creators seeing "Unknown" on Explorer
**What:** Solutions to Explorer display issues
**Length:** ~2,000 words
**Highlights:**
- Why it happens
- 4 different solutions
- IDL upload guide
- Alternative explorers
- Investor reassurance

### CLAUDE.md
**Who:** AI assistants, developers
**What:** Quick reference for development
**Length:** ~2,500 words
**Highlights:**
- Build commands
- Architecture overview
- Key files
- Common pitfalls
- Development workflows

---

## 🔗 External Resources

### Solana Documentation
- [Solana Docs](https://docs.solana.com/)
- [Token-2022 Guide](https://spl.solana.com/token-2022)
- [Anchor Framework](https://www.anchor-lang.com/)

### Explorers
- [Solana Explorer](https://explorer.solana.com/)
- [Solscan](https://solscan.io/)
- [XRAY by Helius](https://xray.helius.xyz/)

### Tools
- [Solana Cookbook](https://solanacookbook.com/)
- [Anchor Examples](https://github.com/coral-xyz/anchor/tree/master/examples)

---

## 💡 Tips for Using This Documentation

### 1. Start with Your Goal
Don't read everything! Use the navigation above to jump to what you need.

### 2. Follow the Paths
The "Getting Started Paths" section provides curated reading orders.

### 3. Cross-Reference
Links within documents connect related topics. Follow them!

### 4. Bookmark This Page
Come back when you need to find something specific.

### 5. Contribute
Found a gap? Have a question not answered? Open an issue or PR!

---

## 🤝 Contributing to Documentation

Documentation improvements welcome! To contribute:

1. **Found a typo?** Submit a PR directly
2. **Topic unclear?** Open an issue describing what's confusing
3. **Missing example?** Suggest in an issue
4. **Want to add a section?** Discuss in an issue first

**Documentation standards:**
- Clear, concise language
- Real examples over abstract concepts
- Code snippets for technical content
- Screenshots where helpful
- Links to related sections

---

## 📄 Documentation Changelog

### 2025-10-16
- Created comprehensive documentation suite
- Added USER_GUIDE.md
- Added TECHNICAL_OVERVIEW.md
- Added TOKENOMICS_EXAMPLES.md
- Added FAQ.md
- Added FIXING_UNKNOWN_INSTRUCTIONS.md
- Added this index

### Earlier
- Created CLAUDE.md
- Created BUILD_NOTES.md
- Maintained CHANGELOG.md

---

**Can't find what you're looking for?** Open a GitHub issue and we'll help!
