#!/bin/bash
# Upload or update the Mintcraft IDL to Solana so Explorer can decode instructions

set -e

PROGRAM_ID="Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4"
IDL_PATH="target/idl/mintcraft.json"
CLUSTER="${1:-devnet}"

echo "🔧 Mintcraft IDL Manager"
echo "========================"
echo "Program ID: $PROGRAM_ID"
echo "Cluster: $CLUSTER"
echo ""

# Check if IDL exists
if [ ! -f "$IDL_PATH" ]; then
    echo "❌ IDL not found at $IDL_PATH"
    echo "Run 'anchor build' first to generate the IDL"
    exit 1
fi

# Check if IDL is already uploaded
echo "📡 Checking if IDL is already uploaded..."
if anchor idl fetch "$PROGRAM_ID" --provider.cluster "$CLUSTER" > /dev/null 2>&1; then
    echo "✅ IDL already exists on-chain"
    echo ""
    read -p "Do you want to upgrade it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "⬆️  Upgrading IDL..."
        anchor idl upgrade \
            --filepath "$IDL_PATH" \
            "$PROGRAM_ID" \
            --provider.cluster "$CLUSTER"
        echo "✅ IDL upgraded successfully!"
    else
        echo "⏭️  Skipping upgrade"
    fi
else
    echo "🆕 IDL not found on-chain, initializing..."
    anchor idl init \
        --filepath "$IDL_PATH" \
        "$PROGRAM_ID" \
        --provider.cluster "$CLUSTER"
    echo "✅ IDL initialized successfully!"
fi

echo ""
echo "🔍 Verifying IDL..."
anchor idl fetch "$PROGRAM_ID" --provider.cluster "$CLUSTER" -o /tmp/mintcraft-fetched.json

if [ -f /tmp/mintcraft-fetched.json ]; then
    echo "✅ IDL successfully uploaded and verified!"
    echo ""
    echo "📋 Instruction names that will now show on Explorer:"
    jq -r '.instructions[].name' /tmp/mintcraft-fetched.json | sed 's/^/  - /'
    echo ""
    echo "🌐 Your token instructions will now display properly on Solana Explorer!"
    rm /tmp/mintcraft-fetched.json
else
    echo "⚠️  Could not verify IDL upload"
fi
