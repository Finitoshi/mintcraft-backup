#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Force Anchor to use the 0.32.1 build image regardless of host env
export ANCHOR_DOCKER_IMAGE=backpackapp/build:v0.32.1

# Helpful echo
echo "ANCHOR_DOCKER_IMAGE=$ANCHOR_DOCKER_IMAGE"
anchor --version

# Clean and build with verbose logs
anchor clean || true
anchor build -v
