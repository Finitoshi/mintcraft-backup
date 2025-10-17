# MintCraft Changelog

## [Unreleased]

### Added

- **Hourly Reflections System:** Complete automatic reflection distribution system for Token-2022 tokens
  - On-chain reflection config with `initialize_reflection_config` and `claim_reflection` instructions in Anchor program
  - Off-chain hourly distribution script (`npm run distribute:reflections`) that snapshots holders and distributes proportionally
  - Gas rebate mechanism: Users can claim early with a configurable percentage deducted (default 2%), offsetting treasury's SOL costs
  - Configurable minimum holding requirement to receive reflections
  - Excluded wallets list (LP pools, CEX wallets, treasury auto-excluded)
  - Cron job installer (`scripts/install-reflection-cron.sh`) for automated hourly distributions
  - Frontend UI toggle for enabling reflections with configuration inputs (min holding, gas rebate %, excluded wallets)
  - TypeScript types for reflection config, user claim state, and claim results
  - Transaction builder support for initializing reflection config during token creation
  - **Reflection Dashboard** (`/reflections` route) with comprehensive stats:
    - Real-time token balance and fee pool display
    - User's share percentage calculation
    - Estimated reflection amount with gas rebate breakdown
    - Claim button for early withdrawal (with gas rebate deduction)
    - Token information card with mint address and explorer links
    - Reflection configuration display (min holding, gas rebate, schedule)
    - Navigation link from main forge page
- Transfer fee configuration controls for Token-2022 mints, including UI inputs for percentage and optional max-per-transfer caps that flow into the mint builder.
- Treasury wallet support for transfer fees, plus a helper script (`npm run collect:fees`) to sweep withheld taxes into the treasury on a schedule.
- Cron-friendly wrapper with installation script (`scripts/install-fee-cron.sh`) and env template so creators can enable hourly fee collection with one command.
- Optional split distributions for collected taxes with `--split` / `SPLIT_RECIPIENTS`, including automatic ATA creation and support for a dedicated treasury signer.
- Transfer-fee form now supports configuring optional split recipients so creators can capture multi-treasury payout plans alongside the main withdraw authority.

### Changed

- **Reflection Integration:** Token minting flow now supports configuring and initializing reflection parameters
  - `TokenFormData` interface extended with `reflectionMinHolding`, `reflectionGasRebatePercentage`, and `reflectionExcludedWallets`
  - `useTokenMinting` hook validates and converts reflection inputs to on-chain format
  - `TokenConfig` type includes reflection extension configuration
- **Anchor Program Build:** Updated dependencies and fixed compilation issues
  - Added `init-if-needed` feature to anchor-lang for user claim state initialization
  - Resolved TokenAccount naming conflicts by aliasing spl-token-2022 types
  - Fixed InterfaceAccount usage for Token-2022 compatibility
- IPFS metadata uploads now include transfer fee traits and updated tests cover the new blanket tax flow.
- README now walks through copying `scripts/collect-fees.env` and running `scripts/install-fee-cron.sh` to enable hourly sweeps.
- Transfer console inspects mint TLV data and falls back to standard transfers when no hook is configured, keeping fee-only tokens working out of the box.

### Fixed

- **Reflection Initialization Transaction Fix:** Corrected the `initialize_reflection_config` instruction to match Anchor's IDL format
  - Fixed instruction discriminator from 1-byte `[0]` to correct 8-byte Anchor hash `[113, 189, 201, 109, 238, 114, 172, 13]`
  - Corrected account ordering to match IDL: payer, authority, mint, config, system_program
  - Fixed instruction data layout: 8 bytes discriminator + 8 bytes u64 (min_holding) + 2 bytes u16 (gas_rebate_bps)
  - **Testing:** Successfully created Token-2022 mint `2EycdJ8rshabeCSs4dhBZ2tTj6md4rABDcgHbctZPKAN` on devnet with reflections enabled
  - **Verified:** End-to-end flow working: token creation → transfer fees (5%) → fee collection (750 tokens) → reflection distribution (proportional to holdings)
- Prevented transfer fee configuration without a treasury authority by validating wallet addresses during minting.
- Fixed Anchor program compilation errors related to reflection instructions
  - Resolved `init_if_needed` requires feature flag error
  - Fixed TokenAccount type conflicts between anchor-spl and spl-token-2022
  - Updated ClaimReflection struct to use InterfaceAccount for Token-2022 accounts
  - Added proper initialization checks for UserClaimState on first claim

## [1.0.9] - 2025-10-15

### Added

- Created on-chain token metadata for SPL Token-2022 mints using Metaplex’s `createV1` layout, ensuring explorers display name, symbol, and URI for every newly forged asset.
- In-app transfer console that understands Token-2022 transfer hooks, auto-creates recipient ATAs, and surfaces max-wallet guard failures with friendly messaging.

### Changed

- Swapped the mint flow to wallet-adapter’s `sendTransaction`, resolving stale blockhash failures and reducing the sign flow to a single approval.
- Wired the Token-2022 metadata instruction to include the correct sysvar and token-program accounts plus mint decimals so fungible tokens serialize cleanly.
- Mint and transfer forms now work in human-readable token amounts (with live raw-supply previews), preventing confusion around decimals and supply conversions.
- Transfer hook execution now reads the correct extra-account metas layout, ensuring max-wallet caps are enforced after on-chain configuration.
- Added an “Enable Max Wallet Cap” toggle in the mint form so creators only initialize the transfer hook when they actually want a cap.

### Fixed

- Synced the UI network toggle with the wallet provider to stop accidental mainnet connections while building on devnet.
- Patched the minting hook to partially sign with the mint keypair before handoff, fixing the signature-verification error that blocked token creation.
- Corrected the Token-2022 max-wallet guard to evaluate the post-transfer balance reported by the hook, eliminating false positives after failed simulations.

## [1.0.8] - 2025-10-14

### Fixed

- Restored Vitest configuration so React tests run under `jsdom` with the shared setup file.
- Disabled the unimplemented Token-2022 extension toggles until their mint instructions are available, preventing misconfigured tokens.
- Removed accidental backup artifacts/binaries from version control and expanded `.gitignore` to keep future clutter out of the repo.

## [1.0.7] - 2025-10-14

### Changed

- **Toolchain Alignment:** Bumped `anchor-lang`/`anchor-spl` to 0.32.1, added `spl-token-2022`, and locked the workspace to Solana CLI 2.3.0 via `Anchor.toml`.
- **Program Updates:** Refactored `create_token` to target the Token-2022 program, removed the unused `getrandom` patch, and silenced prior build warnings.

### Fixed

- **Build Stability:** `cargo check` and `anchor build` now succeed on the Anchor 0.32.1 / Solana 2.3.0 stack without the previous `proc_macro2`/`regex-automata` failures.

## [1.0.6] - 2025-07-07

### Changed

- **Anchor Program Dependencies:** Updated `anchor-lang`, `anchor-spl`, `spl-token`, `spl-associated-token-account`, `solana-program`, and `solana-sdk` versions in `programs/mintcraft/Cargo.toml` to align with Anchor 0.30.1 and Solana 1.18.17.

### Fixed

- **IDL Generation & Build Issues:** Addressed persistent build failures and IDL generation issues.
  - Attempted to resolve `proc_macro2::Span::source_file()` error by patching `time` and `ahash` dependencies in `~/.cargo/config.toml`.
  - Attempted to resolve `getrandom`, `atty`, and `termcolor` compilation errors by configuring `getrandom` features and managing Rust toolchains.
  - Cleaned Cargo cache and removed `target` directory multiple times to force clean builds.
  - Cleaned up conflicting `PATH` entries in `~/.bashrc`.

### Technical Details

- **Current Build Status:** `anchor build` continues to fail due to complex and persistent environment/dependency conflicts, particularly with `getrandom` and `cargo-build-sbf` resolution.
- **Decision:** Due to intractable environment issues, the decision was made to move to a fresh Debian 11 WSL2 environment for a clean setup.

## [1.0.5] - 2025-07-07

### Changed

- **Anchor Program Dependencies:** Updated `spl-token` to `4.0.3` and `spl-associated-token-account` to `3.0.4` in `programs/mintcraft/Cargo.toml`.

### Fixed

- **IDL Generation & Build Issues:** Addressed persistent build failures and IDL generation issues.
  - Updated `anchor-lang` and `anchor-spl` to `0.30.1` in `programs/mintcraft/Cargo.toml` to resolve version mismatch with Anchor CLI.
  - Attempted to resolve `proc_macro2::Span::source_file()` error by explicitly adding `proc-macro2` dependency and clearing Cargo cache.
  - Attempted to resolve `getrandom`, `atty`, and `termcolor` compilation errors by setting default Rust toolchain to `solana` and explicitly configuring `getrandom` features.
  - Cleaned Cargo cache and removed `target` directory multiple times to force clean builds.

### Technical Details

- **Current Build Status:** `anchor build` continues to fail with `getrandom`, `atty`, and `termcolor` errors, and stack overflow warnings, despite toolchain and dependency updates.

## [1.0.4] - 2025-01-15

### Fixed

- **Solana Toolchain Compatibility:** Resolved critical build issues with Anchor and Solana CLI compatibility
  - Updated Anchor CLI from 0.29.0 to 0.30.1 to support Solana CLI 2.2.17's SBF toolchain
  - Fixed compilation errors in `programs/mintcraft/src/lib.rs`:
    - Added missing lifetime parameters to `Initialize` struct
    - Removed deprecated `rent` field from `anchor_spl::associated_token::Create`
    - Added required `Pack` trait import for `SplMint::LEN`
    - Removed unused imports (`Mint`, `TokenAccount`)
  - **Root Cause:** Anchor 0.29.0 was incompatible with Solana CLI 2.2.17's new SBF (Solana Bytecode Format) toolchain, causing "build-bpf not found" errors
  - **Solution:** Used AVM (Anchor Version Manager) to install and build Anchor 0.30.1 from source, ensuring compatibility with the SBF toolchain

### Technical Details

- **Before:** `anchor build` failed with "no such command: build-bpf" error
- **After:** `anchor build` successfully uses the new SBF toolchain (`cargo-build-sbf`)
- **Tools Used:** AVM (Anchor Version Manager) for version management
- **Build System:** Now properly uses Solana's SBF (Solana Bytecode Format) instead of deprecated BPF

## [1.0.3] - 2025-07-07

### Refactored

- **Client-Side Minting:** Refactored the token minting process to be fully client-side. The backend is no longer used for transaction building, only for IPFS uploads.
- **Removed `/api/mint-token`:** Deleted the unused backend endpoint for token minting.

### Added

- **Anchor `create_token` Instruction:** Added a basic `create_token` instruction and associated structs to `programs/mintcraft/src/lib.rs` as a starting point for on-chain token creation.
- **Frontend Testing:** Implemented Vitest for frontend unit testing.
- **`useTokenMinting` Test:** Added a comprehensive test suite for the `useTokenMinting` hook to ensure client-side minting logic is sound.

### Changed

- **Anchor Program Scaffolding:** Added guiding comments to `programs/mintcraft/src/lib.rs` for defining Anchor program logic.

## [1.0.2] - 2025-07-07

### Changed

- Added `vitest` for testing and configured it in `vite.config.ts`.
- Created a test setup file at `src/test/setup.ts`.
- Scaffolded a new Anchor program in `programs/mintcraft`.
- Added `Anchor.toml` to configure the program.
