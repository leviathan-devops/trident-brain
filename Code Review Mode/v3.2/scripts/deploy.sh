#!/bin/bash
# TRIDENT v3.2 - Full Deploy Script
# Handles: build → copy → opencode.json registration → verify
set -e

PLUGIN_NAME="trident-brain"
PLUGIN_DIR="$HOME/.config/opencode/plugins/$PLUGIN_NAME"
OPENCODE_JSON="$HOME/.config/opencode/opencode.json"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_ENTRY="file://$PLUGIN_DIR/index.js"

echo "=== TRIDENT v3.2 DEPLOY ==="

# 1. Build dist/
echo "[1/4] Building..."
cd "$SCRIPT_DIR"
if command -v bun &> /dev/null; then
  bun build src/index.ts --outdir dist --target bun --format esm --bundle
else
  npm run build
fi

# 2. Copy dist to plugin dir
echo "[2/4] Copying to $PLUGIN_DIR..."
mkdir -p "$PLUGIN_DIR"
cp -r dist/* "$PLUGIN_DIR/"

# 3. Register in opencode.json
echo "[3/4] Registering in opencode.json..."
if [ ! -f "$OPENCODE_JSON" ]; then
  echo '{"plugin": []}' > "$OPENCODE_JSON"
fi

if command -v jq &> /dev/null; then
  # Check if already registered
  if jq -e ".plugin | index(\"$PLUGIN_ENTRY\")" "$OPENCODE_JSON" > /dev/null 2>&1; then
    echo "  Already registered."
  else
    jq --arg entry "$PLUGIN_ENTRY" '.plugin += [$entry]' "$OPENCODE_JSON" > "${OPENCODE_JSON}.tmp"
    mv "${OPENCODE_JSON}.tmp" "$OPENCODE_JSON"
    echo "  Registered: $PLUGIN_ENTRY"
  fi
else
  if ! grep -q "$PLUGIN_ENTRY" "$OPENCODE_JSON" 2>/dev/null; then
    echo "  WARNING: jq not installed. Add manually to opencode.json:"
    echo "    \"$PLUGIN_ENTRY\""
  fi
fi

# 4. Verify
echo "[4/4] Verifying..."
if [ -f "$PLUGIN_DIR/index.js" ]; then
  echo "  Plugin file: OK ($(wc -c < "$PLUGIN_DIR/index.js") bytes)"
else
  echo "  ERROR: index.js not found in $PLUGIN_DIR"
  exit 1
fi

echo ""
echo "=== DEPLOY COMPLETE ==="
echo "Restart OpenCode to load trident-brain plugin."
echo "Tools: trident-audit, trident-status, trident-report, trident-help"
