# MintCraft Changelog

# MintCraft Changelog

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
