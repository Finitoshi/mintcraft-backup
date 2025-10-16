#!/usr/bin/env bash

# Wrapper that collects transfer fees while logging output to timestamped files.
# Example (set executable): chmod +x scripts/collect-transfer-fees.cron.sh
# Usage (cron safely handles single pipeline):
#   MINT=<mint> AUTHORITY=/path/to/keypair.json TREASURY=<treasury_owner> \
#     RPC_URL=https://api.devnet.solana.com \
#     ./scripts/collect-transfer-fees.cron.sh

set -euo pipefail

if [[ -z "${MINT:-}" || -z "${AUTHORITY:-}" || -z "${TREASURY:-}" ]]; then
  echo "Missing required environment variables: MINT, AUTHORITY, TREASURY." >&2
  exit 1
fi

RPC_ARG=()
if [[ -n "${RPC_URL:-}" ]]; then
  RPC_ARG=(--url "${RPC_URL}")
fi

PROGRAM_ARG=()
if [[ -n "${PROGRAM_ID:-}" ]]; then
  PROGRAM_ARG=(--program "${PROGRAM_ID}")
fi

SPLIT_ARG=()
if [[ -n "${SPLIT_RECIPIENTS:-}" ]]; then
  SPLIT_ARG=(--split "${SPLIT_RECIPIENTS}")
fi

TREASURY_AUTHORITY_ARG=()
if [[ -n "${TREASURY_AUTHORITY:-}" ]]; then
  TREASURY_AUTHORITY_ARG=(--treasury-authority "${TREASURY_AUTHORITY}")
fi

LOG_DIR="${LOG_DIR:-$HOME/.mintcraft/logs}"
mkdir -p "${LOG_DIR}"
NOW="$(date +"%Y-%m-%d_%H-%M-%S")"
LOG_FILE="${LOG_DIR}/collect-fees-${NOW}.log"

{
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting fee collection..."
  npm --prefix "$(dirname "$0")/.." run collect:fees -- \
    --mint "${MINT}" \
    --authority "${AUTHORITY}" \
    --treasury "${TREASURY}" \
    "${RPC_ARG[@]}" \
    "${PROGRAM_ARG[@]}" \
    "${SPLIT_ARG[@]}" \
    "${TREASURY_AUTHORITY_ARG[@]}"
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Completed."
} >> "${LOG_FILE}" 2>&1
