#!/bin/bash
# Install/Update cron job for hourly reflection distributions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/reflections.env"

echo "🔧 MintCraft Reflection Cron Installer"
echo "======================================"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    echo ""
    echo "Please create it from the example:"
    echo "  cp $SCRIPT_DIR/reflections.env.example $ENV_FILE"
    echo "  nano $ENV_FILE"
    exit 1
fi

# Load configuration
source "$ENV_FILE"

# Validate required variables
if [ -z "$MINT_ADDRESS" ]; then
    echo "❌ Error: MINT_ADDRESS not set in $ENV_FILE"
    exit 1
fi

if [ -z "$CRON_SCHEDULE" ]; then
    echo "⚠️  Warning: CRON_SCHEDULE not set, using default (hourly)"
    CRON_SCHEDULE="0 * * * *"
fi

echo "📋 Configuration:"
echo "  Mint: $MINT_ADDRESS"
echo "  Schedule: $CRON_SCHEDULE"
echo "  Min Holding: $MIN_HOLDING"
echo ""

# Create wrapper script
WRAPPER_SCRIPT="$SCRIPT_DIR/distribute-reflections.cron.sh"

cat > "$WRAPPER_SCRIPT" <<EOF
#!/bin/bash
# Auto-generated wrapper for reflection distribution cron job
# Generated: $(date)

set -a
source "$ENV_FILE"
set +a

cd "$SCRIPT_DIR/.."

# Run distribution script
node scripts/distribute-reflections.mjs >> "\${LOG_FILE:-\$HOME/.mintcraft/logs/reflections.log}" 2>&1
EOF

chmod +x "$WRAPPER_SCRIPT"

echo "✅ Created wrapper script: $WRAPPER_SCRIPT"

# Remove old cron entries for this mint
crontab -l 2>/dev/null | grep -v "distribute-reflections.cron.sh.*$MINT_ADDRESS" | crontab - || true

# Add new cron entry
(crontab -l 2>/dev/null; echo "$CRON_SCHEDULE $WRAPPER_SCRIPT # MintCraft reflections: $MINT_ADDRESS") | crontab -

echo "✅ Cron job installed/updated"
echo ""
echo "📊 Current crontab:"
crontab -l | grep "MintCraft reflections"
echo ""
echo "✅ Setup complete!"
echo ""
echo "💡 To test the distribution manually:"
echo "  node scripts/distribute-reflections.mjs"
echo ""
echo "📝 Logs will be written to:"
echo "  ${LOG_FILE:-$HOME/.mintcraft/logs/reflections.log}"
echo ""
echo "🔧 To remove the cron job:"
echo "  crontab -e  # then delete the line with 'MintCraft reflections'"
