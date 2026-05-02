#!/bin/bash
# TRIDENT v3.2 - Deploy Script
# Deploys self-contained bundle to opencode plugins directory

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== TRIDENT v3.2 DEPLOY ==="
cd "$PROJECT_DIR"

# Build first
echo "Building self-contained bundle..."
./scripts/build.sh

# Deploy directory
DEPLOY_DIR="$HOME/.config/opencode/plugins/trident-brain"
echo ""
echo "Deploying to $DEPLOY_DIR..."

mkdir -p "$DEPLOY_DIR"

# Copy ALL dist files (including algorithmic-core, artifact-writer, etc.)
cp -r dist/* "$DEPLOY_DIR/"

# Verify opencode.json has trident plugin registered
OPENCODE_JSON="$HOME/.config/opencode/opencode.json"
if ! grep -q "trident-brain/dist/index.js" "$OPENCODE_JSON" 2>/dev/null; then
  echo ""
  echo "WARNING: trident-brain not found in opencode.json"
  echo "Adding trident plugin to opencode.json..."

  # Backup
  cp "$OPENCODE_JSON" "${OPENCODE_JSON}.backup-$(date +%Y%m%d_%H%M%S)"

  # Add trident plugin if not present
  if grep -q '"plugin":' "$OPENCODE_JSON"; then
    # Use sed to insert after first plugin entry (before first close bracket)
    sed -i '/"plugin": \[/a\    "file:\/\/home\/leviathan\/OPENCODE_WORKSPACE\/plugins\/trident-brain\/dist\/index.js",' "$OPENCODE_JSON"
  fi
fi

echo ""
echo "=== DEPLOY COMPLETE ==="
echo "Deployed files:"
ls -la "$DEPLOY_DIR/"
echo ""
echo "Bundle verification:"
grep -c "trident-audit" "$DEPLOY_DIR/index.js" >/dev/null && echo "✓ trident-audit tool found" || echo "✗ trident-audit tool NOT found"
grep -c "trident-status" "$DEPLOY_DIR/index.js" >/dev/null && echo "✓ trident-status tool found" || echo "✗ trident-status tool NOT found"