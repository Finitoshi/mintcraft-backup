# Build notes (MintCraft)

This repo has been tuned to build with a newer Anchor builder image so we avoid old Cargo/Rust issues (e.g. `edition2024` from `base64ct >= 1.8.0`).

## What the helper script does
- Ensures root `[profile.release]` has `overflow-checks = true` (Anchor requirement).
- Removes any `[patch.crates-io]` blocks that reference `base64ct` (they can clash with registry resolution).
- Appends/updates `[docker] image = "backpackapp/build:v0.32.1"` in `Anchor.toml` so we compile with a newer toolchain.
- Runs `anchor clean` and `anchor build -v`.

## One-shot fix / build
```bash
bash scripts/fix_build.sh
```

If you still see an error about `edition2024` from `base64ct`, run:
```bash
cargo update -p base64ct --precise 1.7.0
```
then re-run the script.

If you need to revert anything, check backups saved under `.stack_bak/`.
