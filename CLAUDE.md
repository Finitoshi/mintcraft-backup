# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MintCraft is a Solana Token-2022 minting platform with a hybrid architecture:
- **Frontend**: React + TypeScript + Vite web application for creating SPL Token-2022 tokens with advanced extensions
- **Anchor Program**: On-chain Solana program (`mintcraft`) that implements transfer hooks for max-wallet caps
- **API Server**: Express.js backend for IPFS uploads and metadata management
- **Fee Collection**: Automated scripts for collecting and distributing transfer fees

The project enables users to create Token-2022 mints with extensions like transfer fees, max wallet caps, transfer hooks, and Metaplex metadata, all through a user-friendly UI.

## Build & Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (Vite dev server on localhost:5173)
npm run dev

# Build for production
npm run build

# Build for development (includes source maps)
npm run build:dev

# Run frontend tests (Vitest)
npm test

# Lint the codebase
npm lint

# Preview production build
npm preview
```

### Anchor Program (Solana)
```bash
# Build the Anchor program (requires Anchor 0.32.1, Solana 2.3.0)
anchor build

# Run the helper script to fix build issues and compile
bash scripts/fix_build.sh

# Test the Anchor program
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Upload IDL so Explorer can decode your instructions
bash scripts/upload-idl.sh devnet
```

**Important Build Notes:**
- The project uses Docker image `backpackapp/build:v0.32.1` configured in `Anchor.toml` to avoid Rust/Cargo toolchain issues
- If you encounter `edition2024` errors from `base64ct`, run: `cargo update -p base64ct --precise 1.7.0`
- Always run `anchor clean` before building if you encounter persistent issues
- See `docs/BUILD_NOTES.md` for detailed troubleshooting

### API Server
```bash
cd api
npm install
npm run dev  # Starts Express server on localhost:3001
```

### Fee Collection
```bash
# Manually collect transfer fees
npm run collect:fees

# Install automated hourly cron job
scripts/install-fee-cron.sh

# Configure fee collection (copy and edit)
cp scripts/collect-fees.env.example scripts/collect-fees.env
```

## Architecture & Key Concepts

### Transaction Flow
1. **Client-Side Token Creation**: All token minting happens client-side using `@solana/web3.js` and `@solana/spl-token`
2. **Transaction Building**: `TransactionBuilder` class (`src/lib/solana/transaction-builder.ts`) orchestrates the creation of Token-2022 mints with extensions
3. **Extension Ordering**: Token-2022 extensions MUST be initialized BEFORE the mint itself. The builder handles this automatically.
4. **Metadata Creation**: Uses Metaplex Token Metadata program to create on-chain metadata so explorers can display token info

### Token-2022 Extensions System

The codebase implements several Token-2022 extensions:

- **Transfer Fee**: Collects a percentage fee on each transfer, routed to a treasury wallet. Supports split distributions to multiple recipients.
- **Transfer Hook**: Custom on-chain program that executes during transfers. Used for max-wallet enforcement.
- **Max Wallet Cap**: Enforces maximum token holdings per wallet as a percentage of total supply (implemented via transfer hook)
- **Interest Bearing**: Tokens that accrue interest over time
- **Permanent Delegate**: Authority that can always transfer tokens
- **Non-Transferable**: Soul-bound tokens
- **Mint Close Authority**: Allows closing the mint account
- **Confidential Transfers**: Privacy-preserving transfers
- **CPI Guard**: Prevents cross-program invocations

**Critical Implementation Detail**: Extensions are configured in `src/lib/solana/extensions.ts` via `TokenExtensionHandler`. The order matters: extensions must be initialized before calling `InitializeMint`.

### Max Wallet Transfer Hook

The on-chain program (`programs/mintcraft/src/lib.rs`) implements a transfer hook that:
1. Validates destination wallet balance against max cap (in basis points)
2. Uses `spl-transfer-hook-interface` to inject the validation into Token-2022 transfer flow
3. Stores config in a PDA seeded by `[b"max-wallet-config", mint.key()]`
4. Exempts the authority wallet from the cap
5. Evaluates the **post-transfer balance** to determine if the transfer would exceed the cap

**Hook Initialization Flow**:
- Frontend enables max wallet → `TokenConfig.maxWalletPercentage` set
- `TransactionBuilder` adds transfer hook extension + `InitializeMaxWalletConfig` instruction
- On-chain program creates the config PDA and extra account metas list
- Future transfers automatically invoke the hook via Token-2022 program

### Fee Collection & Split Distributions

Transfer fees can be automatically collected and distributed:
- **Single Treasury**: All fees go to `transferFeeTreasuryAddress`
- **Split Recipients**: Use `transferFeeSplitRecipients` to distribute fees across multiple wallets
- **Automation**: `scripts/collect-transfer-fees.mjs` discovers taxed accounts and withdraws fees
- **Cron Integration**: `scripts/install-fee-cron.sh` sets up hourly collection

The script:
1. Finds all token accounts with withheld fees
2. Creates treasury ATAs if needed
3. Withdraws fees using the withdraw authority
4. Splits fees proportionally if configured

### Reflection System

MintCraft includes an automated reflection distribution system for Token-2022 tokens:

**On-Chain Components:**
- `initialize_reflection_config`: Creates reflection configuration PDA seeded by `[b"reflection-config", mint.key()]`
- `update_reflection_config`: Allows authority to update min holding and gas rebate settings
- `claim_reflection`: Enables early claims with gas rebate deduction

**Off-Chain Distribution:**
- `scripts/distribute-reflections.mjs`: Automated hourly distribution script
- Snapshots all eligible token holders
- Distributes collected transfer fees proportionally based on holdings
- Excludes treasury, LP pools, and manually specified wallets
- Requires minimum holding threshold to qualify

**Configuration:**
- `MIN_HOLDING`: Minimum tokens required to receive reflections (in base units)
- `GAS_REBATE_BPS`: Percentage deducted for early claims (default 200 = 2%)
- `EXCLUDED_WALLETS`: Comma-separated list of wallet addresses to exclude
- `MIN_TOTAL_POOL`: Minimum fee pool required before distribution

**Testing Notes:**
- Successfully tested on devnet with mint `2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN`
- Verified transfer fee collection (5%) and proportional reflection distribution
- RPC limitation: Public devnet RPCs don't support `getProgramAccounts` for Token-2022, requiring manual account specification or premium RPC for auto-discovery
- For production: Use Helius, QuickNode, or similar premium RPC providers for automatic holder discovery

### IPFS & Metadata

- **API Endpoint**: `POST /api/upload-to-ipfs` handles image and metadata uploads
- **Gateway**: Uses `https://ipfs.bitty.money/ipfs/` as the IPFS gateway
- **Metadata Schema**: Follows Metaplex standard with additional Token-2022 extension traits
- **On-Chain Metadata**: Created via Metaplex Token Metadata `CreateV1` instruction during minting

### State Management

- **React Query**: `@tanstack/react-query` for server state (not heavily used currently)
- **Wallet Context**: `@solana/wallet-adapter-react` provides wallet connection state
- **Form State**: `react-hook-form` with Zod validation for all forms
- **Toast Notifications**: `@/hooks/use-toast` for user feedback

### Testing Strategy

- **Frontend Tests**: Vitest with `jsdom` environment (`src/test/setup.ts` for global config)
- **Test Coverage**: Focus on critical paths like `useTokenMinting` hook
- **Run Tests**: `npm test` (uses Vite's test config)
- **Anchor Tests**: Standard Anchor test framework (TypeScript/Mocha), but currently no tests implemented

## Key Files & Their Roles

### Frontend Core
- `src/hooks/useTokenMinting.ts`: Main hook for token creation flow, orchestrates IPFS upload → transaction building → signing
- `src/lib/solana/transaction-builder.ts`: Builds Token-2022 creation transactions with proper extension ordering
- `src/lib/solana/extensions.ts`: `TokenExtensionHandler` - calculates space requirements and creates extension instructions
- `src/lib/solana/max-wallet.ts`: Client-side utilities for max wallet config initialization
- `src/lib/solana/types.ts`: TypeScript interfaces for `TokenConfig` and extension configurations
- `src/lib/solana/amount.ts`: Converts human-readable amounts to base units (handles decimals)
- `src/components/TokenForm.tsx`: Main token creation form UI

### Anchor Program
- `programs/mintcraft/src/lib.rs`: Complete Anchor program with:
  - `create_token`: Basic token creation (not currently used, minting happens client-side)
  - `initialize_max_wallet_config`: Sets up transfer hook config and extra account metas
  - `update_max_wallet_config`: Updates max wallet percentage
  - `execute`: Transfer hook implementation that validates max wallet cap
- `programs/mintcraft/Cargo.toml`: Dependencies including `spl-token-2022`, `spl-transfer-hook-interface`, `spl-tlv-account-resolution`
- `Anchor.toml`: Anchor configuration with program IDs for localnet/devnet

### API Server
- `api/server.js`: Express server with IPFS upload and health check endpoints
- `api/package.json`: Server dependencies

### Scripts
- `scripts/collect-transfer-fees.mjs`: Node.js script to collect and distribute transfer fees
- `scripts/install-fee-cron.sh`: Installs cron job for automated fee collection
- `scripts/collect-fees.env.example`: Template for fee collection configuration
- `scripts/fix_build.sh`: Helper to fix Anchor build issues
- `scripts/upload-idl.sh`: Uploads/updates IDL to Solana so Explorer can decode instructions

## Development Workflow

### Adding a New Token-2022 Extension

1. Add extension type to `TokenConfig['extensions']` in `src/lib/solana/types.ts`
2. Update `TokenExtensionHandler.calculateMintSpace()` to include space for the extension
3. Add instruction creation in `TokenExtensionHandler.createExtensionInstructions()`
4. Update `useTokenMinting.ts` to handle form data for the new extension
5. Add UI controls in `TokenForm.tsx` or `Token22Extensions.tsx`
6. Test thoroughly - extension order matters!

### Modifying the Transfer Hook

1. Edit the Rust code in `programs/mintcraft/src/lib.rs`
2. Run `bash scripts/fix_build.sh` to rebuild
3. Deploy to devnet: `anchor deploy --provider.cluster devnet`
4. Update `MAX_WALLET_HOOK_PROGRAM_ID` in `src/lib/solana/max-wallet.ts` with new program ID
5. Test with a new token mint that includes the transfer hook

### Running Tests

Single test file:
```bash
npm test src/hooks/useTokenMinting.test.ts
```

Watch mode:
```bash
npm test -- --watch
```

## Program IDs

- **Devnet**: `Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4` (current)
- **Localnet**: `9HeGKECKeVEK6XEjjqTdwjReX2n28xdZJ8TSb4ibi9K1`
- **Max Wallet Hook Program**: Same as main program ID (hook is implemented in the same program)
- **Metaplex Token Metadata**: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`

## Common Pitfalls

1. **Extension Order**: Always initialize extensions BEFORE `InitializeMint`. The `TransactionBuilder` handles this, but if you modify it, maintain the order.

2. **Transfer Hook Extra Metas**: The hook requires an extra account metas list to be created. The on-chain program creates this automatically in `initialize_max_wallet_config`.

3. **Balance Calculation**: The max wallet hook validates **post-transfer balance**, not pre-transfer. This is critical for preventing false rejections.

4. **Decimals Handling**: Always use `convertTokenAmountToBaseUnits()` when converting user input to on-chain amounts. Token-2022 uses base units (smallest denomination).

5. **Blockhash Staleness**: Use `sendTransaction` from wallet adapter (not manual signing) to avoid stale blockhash errors.

6. **Network Sync**: Ensure wallet network matches the UI network selector. The connection provider must align with the wallet's cluster.

7. **Fee Collection Authority**: Transfer fee withdraw authority must match the configured treasury authority. For split distributions, you can specify a separate `TREASURY_AUTHORITY` in the env file.

8. **Reflection Instruction Format**: When initializing reflections, ensure the instruction data matches Anchor's IDL format:
   - 8-byte discriminator (from IDL): `[113, 189, 201, 109, 238, 114, 172, 13]`
   - Account order: payer, authority, mint, config PDA, system_program
   - Data layout: discriminator (8) + min_holding (u64, 8) + gas_rebate_bps (u16, 2) = 18 bytes total

## Environment Variables

Frontend (via Vite):
- No required env vars (uses localhost:3001 for API by default)
- RPC URL can be customized in the UI network selector

API Server:
- No required env vars (uses public Bitty IPFS gateway)

Fee Collection (`scripts/collect-fees.env`):
- `MINT_ADDRESS`: Token mint to collect fees from
- `WITHDRAW_AUTHORITY_KEYPAIR_PATH`: Path to withdraw authority keypair
- `TREASURY_OWNER_KEYPAIR_PATH`: Treasury wallet keypair (can be same as withdraw authority)
- `RPC_URL`: Solana RPC endpoint (defaults to devnet)
- `SPLIT_RECIPIENTS`: Optional comma-separated list of wallet:percentage pairs
- `TREASURY_AUTHORITY`: Optional separate treasury authority keypair path
- `CRON_SCHEDULE`: Cron expression (default: hourly)

Reflection Distribution (`scripts/reflections.env`):
- `MINT_ADDRESS`: Token mint to distribute reflections for
- `TREASURY_KEYPAIR_PATH`: Treasury keypair that holds collected fees
- `RPC_URL`: Solana RPC endpoint
- `MIN_HOLDING`: Minimum tokens to receive reflections (in base units)
- `EXCLUDED_WALLETS`: Comma-separated list of addresses to exclude
- `MAX_DISTRIBUTIONS_PER_RUN`: Batch size (default: 100)
- `MIN_TOTAL_POOL`: Minimum fee pool required before distribution

## Toolchain Requirements

- **Node.js**: v18+ recommended
- **Anchor CLI**: 0.32.1 (install via AVM: `avm install 0.32.1 && avm use 0.32.1`)
- **Solana CLI**: 2.3.0 (configured in `Anchor.toml`)
- **Rust**: Stable toolchain (managed by Anchor)
- **Docker**: Optional, used by Anchor builder image

## Additional Resources

- Changelog: `CHANGELOG.md` - detailed history of changes and fixes
- Build troubleshooting: `docs/BUILD_NOTES.md`
- Solana stack lock details: `docs/solana-stack-lock.md`
- API documentation: `api/README.md`
- Fixing "Unknown" instructions on Explorer: `docs/FIXING_UNKNOWN_INSTRUCTIONS.md`
