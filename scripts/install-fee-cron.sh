#!/usr/bin/env bash

# Install (or update) an hourly cron job that collects Token-2022 transfer fees.
# Reads configuration from an environment file (default: scripts/collect-fees.env).

set -euo pipefail

ENV_FILE=${1:-"scripts/collect-fees.env"}

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Environment file '${ENV_FILE}' not found."
  echo "Copy scripts/collect-fees.env.example and fill in your values:"
  echo "  cp scripts/collect-fees.env.example ${ENV_FILE}"
  exit 1
fi

# shellcheck source=/dev/null
source "${ENV_FILE}"

required=(MINT AUTHORITY TREASURY)
for var in "${required[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required variable '${var}' in ${ENV_FILE}" >&2
    exit 1
  fi
done

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 * * * *}"
SCRIPT_PATH="${REPO_DIR}/scripts/collect-transfer-fees.cron.sh"

if [[ ! -x "${SCRIPT_PATH}" ]]; then
  echo "Making ${SCRIPT_PATH} executable..."
  chmod +x "${SCRIPT_PATH}"
fi

cron_command="MINT=${MINT} AUTHORITY=${AUTHORITY} TREASURY=${TREASURY}"

if [[ -n "${RPC_URL:-}" ]]; then
  cron_command+=" RPC_URL=${RPC_URL}"
fi

if [[ -n "${PROGRAM_ID:-}" ]]; then
  cron_command+=" PROGRAM_ID=${PROGRAM_ID}"
fi

if [[ -n "${LOG_DIR:-}" ]]; then
  cron_command+=" LOG_DIR=${LOG_DIR}"
fi

if [[ -n "${SPLIT_RECIPIENTS:-}" ]]; then
  cron_command+=" SPLIT_RECIPIENTS=${SPLIT_RECIPIENTS}"
fi

if [[ -n "${TREASURY_AUTHORITY:-}" ]]; then
  cron_command+=" TREASURY_AUTHORITY=${TREASURY_AUTHORITY}"
fi

cron_command+=" ${SCRIPT_PATH}"

tmp_cron="$(mktemp)"
trap 'rm -f "${tmp_cron}"' EXIT

# Preserve existing cron jobs, removing previous collector entries.
crontab -l 2>/dev/null | grep -v "collect-transfer-fees.cron.sh" > "${tmp_cron}" || true
echo "${CRON_SCHEDULE} ${cron_command}" >> "${tmp_cron}"
crontab "${tmp_cron}"

echo "✅ Installed cron job:"
echo "  ${CRON_SCHEDULE} ${cron_command}"
echo "Logs default to ${LOG_DIR:-$HOME/.mintcraft/logs}"
