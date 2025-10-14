#!/usr/bin/env bash
set -euo pipefail

# Prefer a newer build image with a Cargo that supports edition2024
export ANCHOR_DOCKER_IMAGE=backpackapp/build:v0.32.1

echo "Using Anchor CLI: $(anchor --version 2>/dev/null || echo unknown)"
echo "Using Docker image: ${ANCHOR_DOCKER_IMAGE}"

anchor clean || true
anchor build -v
