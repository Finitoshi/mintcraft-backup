# MintCraft Technical Overview

## Architecture

MintCraft is a hybrid decentralized application with three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   React Frontend (Vite + TypeScript)                   │ │
│  │   - Token Form UI                                      │ │
│  │   - Wallet Integration (Solana Wallet Adapter)         │ │
│  │   - Transaction Builder (Client-Side)                  │ │
│  └────────┬───────────────────────────┬───────────────────┘ │
└───────────┼───────────────────────────┼─────────────────────┘
            │                           │
            │ IPFS Upload               │ Sign & Send Transaction
            ▼                           ▼
    ┌───────────────┐          ┌────────────────────┐
    │  API Server   │          │  Solana Blockchain │
    │  (Express.js) │          │  - Token-2022      │
    │  - IPFS Pin   │          │  - Mintcraft Hook  │
    │  - Metadata   │          │  - Metaplex        │
    └───────────────┘          └────────────────────┘
```

## Component Details

### 1. Frontend (React + Vite)

**Tech Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Solana Wallet Adapter for wallet integration
- shadcn/ui + Tailwind CSS for UI
- React Hook Form + Zod for validation
- Vitest for testing

**Key Modules:**

#### Transaction Builder (`src/lib/solana/transaction-builder.ts`)
Orchestrates the complete token creation flow:

```typescript
class TransactionBuilder {
  async buildTokenCreationTransaction(
    connection: Connection,
    config: TokenConfig,
    payerWallet: PublicKey,
    mintKeypair: Keypair
  ): Promise<{ transaction: Transaction; associatedTokenAccount: PublicKey }>
}
```

**Transaction Order (Critical!):**
1. Create mint account (System Program)
2. Initialize extensions (BEFORE mint init)
   - Transfer Fee
   - Transfer Hook
   - Other extensions
3. Initialize Mint (Token-2022)
4. Create associated token account
5. Mint initial supply
6. Create metadata (Metaplex)
7. Initialize max wallet config (if enabled)

**Why order matters:** Token-2022 requires extensions to be initialized before the mint itself. Reversing this order causes the transaction to fail.

#### Extension Handler (`src/lib/solana/extensions.ts`)
Manages Token-2022 extension space calculation and instruction creation:

```typescript
class TokenExtensionHandler {
  // Calculate required space for mint account
  calculateMintSpace(extensions: TokenConfig['extensions']): number

  // Create extension initialization instructions
  createExtensionInstructions(
    mintPublicKey: PublicKey,
    config: TokenConfig
  ): TransactionInstruction[]
}
```

**Supported Extensions:**
- Transfer Fee Config
- Transfer Hook
- Interest Bearing
- Permanent Delegate
- Non-Transferable
- Mint Close Authority
- Confidential Transfers (placeholder)
- CPI Guard (placeholder)

#### Amount Conversion (`src/lib/solana/amount.ts`)
Handles decimal conversion between human-readable and on-chain amounts:

```typescript
// "1000.5" with 9 decimals → BigInt(1000500000000)
function convertTokenAmountToBaseUnits(
  humanAmount: string,
  decimals: number
): bigint
```

**Edge cases handled:**
- Scientific notation
- Very large numbers
- Precision limits
- Negative values (rejected)

### 2. Anchor Program (Rust)

**Location:** `programs/mintcraft/src/lib.rs`

**Program ID:**
- Devnet: `Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4`

**Instructions:**

#### `initialize_max_wallet_config`
Sets up transfer hook for max wallet enforcement.

```rust
pub fn initialize_max_wallet_config(
    ctx: Context<InitializeMaxWalletConfig>,
    max_wallet_bps: u16, // Basis points (100 = 1%)
) -> Result<()>
```

**What it does:**
1. Creates `MaxWalletConfig` PDA at `[b"max-wallet-config", mint]`
2. Creates extra account metas list for transfer hook interface
3. Stores max wallet percentage in basis points

**Accounts:**
- `payer`: Pays for account creation
- `authority`: Owner of the config (can update later)
- `mint`: The Token-2022 mint
- `config`: PDA storing max wallet settings
- `extra_account_metas`: Extra accounts required by transfer hook

#### `execute` (Transfer Hook)
Automatically called by Token-2022 during transfers.

```rust
pub fn execute(
    ctx: Context<TransferHookExecute>,
    amount: u64,
) -> Result<()>
```

**Validation Logic:**
1. Skip if max_wallet_bps is 0 or 10,000 (disabled)
2. Read mint supply from mint account
3. Calculate cap: `(supply * max_wallet_bps) / 10,000`
4. Read destination token account balance
5. Calculate post-transfer balance: `current_balance + amount`
6. Reject if `post_balance > cap`
7. Allow if destination is authority wallet

**Important:** Uses **post-transfer balance** to avoid false rejections during transfers from the same wallet.

#### `update_max_wallet_config`
Allows authority to change max wallet percentage.

```rust
pub fn update_max_wallet_config(
    ctx: Context<UpdateMaxWalletConfig>,
    max_wallet_bps: u16,
) -> Result<()>
```

**Account Structure:**

```rust
pub struct MaxWalletConfig {
    pub authority: Pubkey,      // 32 bytes
    pub max_wallet_bps: u16,    // 2 bytes
    pub bump: u8,               // 1 byte
    pub reserved: [u8; 5],      // 5 bytes (future use)
}
// Total: 8 (discriminator) + 32 + 2 + 1 + 5 = 48 bytes
```

### 3. API Server (Express.js)

**Location:** `api/server.js`

**Endpoints:**

#### `POST /api/upload-to-ipfs`
Uploads token image and metadata to IPFS.

**Flow:**
1. Receive multipart form data (image + metadata fields)
2. Upload image to Bitty IPFS gateway
3. Construct metadata JSON with image URI
4. Upload metadata JSON to IPFS
5. Return metadata URI for on-chain storage

**Metadata Schema:**
```json
{
  "name": "Token Name",
  "symbol": "SYMBOL",
  "description": "Token description",
  "image": "https://ipfs.bitty.money/ipfs/Qm...",
  "attributes": [
    {
      "trait_type": "Transfer Fee",
      "value": "2.5%"
    },
    {
      "trait_type": "Max Wallet",
      "value": "5%"
    }
  ]
}
```

#### `GET /api/health`
Health check endpoint.

### 4. Fee Collection System

**Script:** `scripts/collect-transfer-fees.mjs`

**Process:**
1. Load configuration from `scripts/collect-fees.env`
2. Discover all token accounts with withheld fees
3. For each account with withheld fees:
   - Create treasury ATA if needed
   - Harvest withheld fees
   - Withdraw to treasury
4. If split recipients configured:
   - Calculate proportional amounts
   - Create recipient ATAs if needed
   - Transfer from treasury to each recipient

**Configuration:**
```bash
MINT_ADDRESS=TokenMintPublicKey
WITHDRAW_AUTHORITY_KEYPAIR_PATH=/path/to/keypair.json
TREASURY_OWNER_KEYPAIR_PATH=/path/to/treasury.json
RPC_URL=https://api.devnet.solana.com
SPLIT_RECIPIENTS=WalletA:40,WalletB:30,WalletC:30
TREASURY_AUTHORITY=/path/to/treasury-authority.json
CRON_SCHEDULE="0 * * * *"  # Hourly
```

**Cron Installation:**
```bash
scripts/install-fee-cron.sh
# Adds entry: 0 * * * * /path/to/mintcraft/scripts/collect-transfer-fees.cron.sh
```

## On-Chain Programs Used

### Token-2022 Program
**Program ID:** `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

MintCraft uses the following Token-2022 instructions:
- `InitializeTransferFeeConfig`
- `InitializeTransferHook`
- `InitializeMint`
- `CreateAssociatedTokenAccountIdempotent`
- `MintToChecked`

### Metaplex Token Metadata
**Program ID:** `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`

Creates on-chain metadata using `CreateV1` instruction with Fungible token standard.

### System Program
**Program ID:** `11111111111111111111111111111111`

Used for:
- Creating mint account
- Creating PDA accounts
- Transferring SOL for rent

### Associated Token Program
**Program ID:** `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`

Creates deterministic token accounts.

## Security Model

### Client-Side Security

**Private Key Handling:**
- Never transmitted over network
- Wallet adapter handles all signing
- Transactions built locally, signed in wallet
- No backend custody of user funds

**Transaction Verification:**
- User approves all transactions in wallet UI
- Full transaction details visible before signing
- Atomic execution (all-or-nothing)

### On-Chain Security

**Anchor Program:**
- Program Derived Addresses (PDAs) prevent unauthorized access
- Authority checks on all sensitive operations
- Overflow protection on balance calculations
- Bounds checking on basis points (0-10,000)

**Error Handling:**
```rust
#[error_code]
pub enum MaxWalletError {
    InvalidMaxWalletBps,           // 6000
    BumpNotFound,                  // 6001
    InvalidExtraAccountMetaAccount, // 6002
    ExtraAccountMetaSerialization, // 6003
    AccountBorrowFailed,           // 6004
    InvalidMint,                   // 6005
    InvalidTokenAccount,           // 6006
    DestinationMintMismatch,       // 6007
    NumericalOverflow,             // 6008
    MaxWalletExceeded,             // 6009
}
```

## Data Flow

### Token Creation Flow

```
User fills form
    ↓
Upload image to IPFS (if provided)
    ↓
Generate metadata JSON
    ↓
Upload metadata to IPFS
    ↓
Build transaction with extensions
    ↓
User signs in wallet
    ↓
Submit to Solana RPC
    ↓
Wait for confirmation
    ↓
Display success with mint address
```

### Transfer Flow (with Max Wallet)

```
User initiates transfer
    ↓
Token-2022 program processes transfer
    ↓
Transfer Hook Interface triggered
    ↓
Mintcraft execute() called
    ↓
Read config PDA
    ↓
Check destination balance + amount ≤ cap
    ↓
   ├─ Yes → Continue transfer
   └─ No → Reject with MaxWalletExceeded
```

### Fee Collection Flow

```
Cron triggers hourly
    ↓
Query all token accounts for mint
    ↓
Filter accounts with withheld_amount > 0
    ↓
For each account:
    ├─ Harvest withheld fees
    └─ Withdraw to treasury
    ↓
If split recipients:
    ├─ Calculate split amounts
    ├─ Create recipient ATAs
    └─ Transfer proportional amounts
    ↓
Log results
```

## Performance Considerations

### Transaction Size
- Average token creation: ~1,200 bytes
- With max wallet + transfer fee + metadata: ~1,800 bytes
- Well under 1232-byte packet size limit per transaction

### Compute Units
- Token creation: ~50,000 CU
- Transfer with hook: ~20,000 CU (additional)
- Well under 200,000 CU limit

### RPC Optimization
- Uses `getRecentBlockhash` for fresh blockhashes
- Confirms at 'confirmed' commitment level
- Single transaction for entire creation flow

## Extension Points

### Adding New Extensions

1. **Update Types** (`src/lib/solana/types.ts`):
```typescript
export interface TokenConfig {
  extensions: {
    // ... existing
    myNewExtension?: {
      someParameter: PublicKey;
    };
  };
}
```

2. **Update Space Calculation** (`src/lib/solana/extensions.ts`):
```typescript
if (extensions.myNewExtension) {
  extensionTypes.push(ExtensionType.MyNewExtension);
}
```

3. **Add Instruction Creator** (`src/lib/solana/extensions.ts`):
```typescript
if (extensions.myNewExtension) {
  instructions.push(
    createInitializeMyExtensionInstruction(/* ... */)
  );
}
```

4. **Update UI** (`src/components/Token22Extensions.tsx`):
```typescript
// Add toggle and configuration inputs
```

### Custom Transfer Hooks

To implement a different transfer hook:

1. Deploy your Anchor program with `execute` instruction
2. Update `MAX_WALLET_HOOK_PROGRAM_ID` in `src/lib/solana/max-wallet.ts`
3. Implement transfer hook interface from `spl-transfer-hook-interface`
4. Configure extra account metas in your initialize instruction

## Testing

### Frontend Tests
```bash
npm test                           # Run all tests
npm test -- --watch               # Watch mode
npm test useTokenMinting.test.ts  # Specific file
```

**Test Coverage:**
- `useTokenMinting` hook: Form validation, amount conversion, transaction building
- Setup: `src/test/setup.ts` configures jsdom + React testing environment

### Anchor Tests
```bash
anchor test                        # Run Anchor test suite
anchor test --skip-local-validator # Use existing validator
```

**Test Structure:**
- Location: `tests/` (if created)
- Framework: Mocha + Chai
- Uses `@coral-xyz/anchor` for program interaction

### Manual Testing Checklist

**Devnet Testing:**
- [ ] Create token with no extensions
- [ ] Create token with transfer fee only
- [ ] Create token with max wallet only
- [ ] Create token with both extensions
- [ ] Test transfer between wallets
- [ ] Verify max wallet rejection
- [ ] Test fee collection script
- [ ] Verify split distribution

## Build & Deployment

### Frontend Build
```bash
npm run build         # Production build → dist/
npm run build:dev     # Dev build with source maps
```

**Output:** Static files in `dist/` ready for hosting on Vercel, Netlify, etc.

### Anchor Program Build
```bash
anchor build                      # Build with Docker image
bash scripts/fix_build.sh        # Build with auto-fixes
```

**Output:**
- Program binary: `target/deploy/mintcraft.so`
- IDL: `target/idl/mintcraft.json`

### Deployment

**Devnet:**
```bash
anchor deploy --provider.cluster devnet
bash scripts/upload-idl.sh devnet
```

**Mainnet:**
```bash
anchor deploy --provider.cluster mainnet
bash scripts/upload-idl.sh mainnet
# Update program ID in src/lib/solana/max-wallet.ts
```

## Monitoring & Observability

### Logs
- Frontend: Browser console
- API: stdout/stderr (capture with PM2 or similar)
- Fee collection: `~/.mintcraft/logs/collect-fees-*.log`

### Metrics to Track
- Token creations per day
- Transfer fee volume
- Max wallet rejections
- IPFS upload success rate
- Transaction failure rate

### Debugging

**Transaction Failed:**
```bash
# Get transaction logs
solana confirm -v SIGNATURE --url devnet
```

**Program Logs:**
```bash
# View program logs
solana logs Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4 --url devnet
```

**Fee Collection Issues:**
```bash
# Check cron is running
crontab -l

# Check recent logs
tail -f ~/.mintcraft/logs/collect-fees-*.log

# Manual run with verbose logging
node scripts/collect-transfer-fees.mjs
```

## API Limits & Quotas

### IPFS (Bitty Gateway)
- No explicit limits documented
- Recommend hosting your own Pinata/Infura for production

### Solana RPC
- Public RPC: Rate limited, use for dev only
- Production: Use Helius, QuickNode, or run own validator
- Recommended: 100 requests/second for production

## Cost Analysis

### Token Creation (Mainnet)
- Rent for mint account: ~0.0015 SOL (permanent)
- Rent for metadata: ~0.0014 SOL (permanent)
- Rent for config PDA: ~0.001 SOL (permanent)
- Transaction fee: ~0.000005 SOL
- **Total: ~0.004 SOL (~$0.40 at $100/SOL)**

### Fee Collection
- Transaction fee per collection: ~0.000005 SOL
- Hourly for 30 days: ~0.0036 SOL/month
- Negligible at scale

## Future Enhancements

### Planned Features
- [ ] Confidential Transfers implementation
- [ ] CPI Guard implementation
- [ ] Burn functionality UI
- [ ] Token freeze/thaw controls
- [ ] Batch token creation
- [ ] Analytics dashboard

### Community Requests
- Custom transfer hook templates
- LP integration helpers
- Airdrop tooling
- Vesting schedules

---

For implementation details, see:
- User guide: `docs/USER_GUIDE.md`
- Build notes: `docs/BUILD_NOTES.md`
- Explorer fixes: `docs/FIXING_UNKNOWN_INSTRUCTIONS.md`
- Main docs: `CLAUDE.md`
