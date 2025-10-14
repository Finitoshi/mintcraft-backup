#!/usr/bin/env bash
set -euo pipefail
cd $(dirname $0)/..

TS=$(date +%s)
mkdir -p .stack_bak
cp -v Cargo.toml .stack_bak/Cargo.toml.$TS || true
cp -v programs/mintcraft/Cargo.toml .stack_bak/mintcraft.Cargo.toml.$TS || true
cp -v Anchor.toml .stack_bak/Anchor.toml.$TS || true

echo "==> Docker image (from Anchor.toml)"
grep -n "image" Anchor.toml || true

echo "==> Resetting Cargo.lock to allow patched base64ct 1.6.0"
rm -f Cargo.lock

echo "==> Clean & build"
anchor clean || true
anchor build -v
