# Solana/Anchor build lock (Mintcraft)

**Updated:** 2025-10-14

### Toolchain
- Anchor CLI: 0.31.1 (avm)
- Docker builder image: `backpackapp/build:v0.32.1` (set in `Anchor.toml`)
- Solana crates resolved by builder: `1.18.26` family

### Program dependencies (programs/mintcraft/Cargo.toml)
- `anchor-lang = "0.31.1"`
- `anchor-spl = "0.30.1"`
- `spl-associated-token-account = { version = "3.0.4", features = ["no-entrypoint"] }`
- `spl-token-2022 = { version = "3.0.5", features = ["no-entrypoint"] }`
- `base64ct = "=1.6.0"` (explicit, avoids Edition 2024 in newer 1.7+/1.8+ releases)

### Workspace/root (`Cargo.toml`)
- `[profile.release]` with `overflow-checks = true` + perf flags.
- `[patch.crates-io] base64ct` redirected to RustCrypto formats repo tag `base64ct/v1.6.0` to ensure the pre-Edition-2024 crate is used across the graph.

### Why this setup
- The default Anchor docker image used to have Cargo 1.79, which cannot compile crates that require the **Rust 2024 edition** (e.g. `base64ct 1.7+/1.8+`).
- Pinning/patching `base64ct` to **1.6.0** sidesteps that until we move to a builder with a newer Rust toolchain.

### Build
```bash
chmod +x scripts/fix_build.sh
./scripts/fix_build.sh
```

If the builder still prints `Using image "backpackapp/build:v0.30.1"`, double-check `Anchor.toml`'s `[docker] image` entry and ensure `anchor build` is reading the file from project root.
