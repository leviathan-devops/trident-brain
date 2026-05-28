#!/bin/bash
# TRIDENT v3.3.3-FIXED — DEPLOY FROM GLOBAL ANCHOR
# Run this from the GLOBAL NUKE RELOAD anchor to deploy to active opencode plugins
#
# USAGE: bash scripts/deploy-from-global-anchor.sh
#   Deploys to ~/.config/opencode/plugins/trident/
#
# USAGE: TARGET=/custom/path bash scripts/deploy-from-global-anchor.sh
#   Deploys to /custom/path

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="${TARGET:-$HOME/.config/opencode/plugins/trident}"

echo "=============================================="
echo "TRIDENT v3.3.3-FIXED DEPLOY"
echo "Source: $PLUGIN_ROOT"
echo "Target: $DEPLOY_DIR"
echo "=============================================="

# Verify source integrity
if [ ! -f "$PLUGIN_ROOT/dist/index.js" ]; then
    echo "ERROR: dist/index.js not found in source"
    echo "This anchor is corrupted. Do NOT deploy."
    exit 1
fi
if [ ! -f "$PLUGIN_ROOT/identity/trident/TRIDENT.md" ]; then
    echo "ERROR: identity/trident/TRIDENT.md not found in source"
    echo "This anchor is corrupted. Do NOT deploy."
    exit 1
fi

echo "[1] Cleaning old deployment..."
rm -rf "$DEPLOY_DIR"

echo "[2] Creating directory structure..."
mkdir -p "$DEPLOY_DIR/dist/identity"
mkdir -p "$DEPLOY_DIR/identity/trident"

echo "[3] Copying plugin files..."
cp "$PLUGIN_ROOT/dist/index.js" "$DEPLOY_DIR/dist/"
cp "$PLUGIN_ROOT/dist/algorithmic-core.js" "$DEPLOY_DIR/dist/"
cp "$PLUGIN_ROOT/dist/artifact-writer.js" "$DEPLOY_DIR/dist/"
cp "$PLUGIN_ROOT/dist/identity/index.js" "$DEPLOY_DIR/dist/identity/"
cp "$PLUGIN_ROOT/dist/identity/loader.js" "$DEPLOY_DIR/dist/identity/"
cp "$PLUGIN_ROOT/dist/identity/injector.js" "$DEPLOY_DIR/dist/identity/"
cp "$PLUGIN_ROOT/dist/identity/types.js" "$DEPLOY_DIR/dist/identity/"

echo "[4] Copying identity documentation..."
cp "$PLUGIN_ROOT/identity/trident/TRIDENT.md" "$DEPLOY_DIR/identity/trident/"
cp "$PLUGIN_ROOT/identity/trident/IDENTITY.md" "$DEPLOY_DIR/identity/trident/"
cp "$PLUGIN_ROOT/identity/trident/EXECUTION.md" "$DEPLOY_DIR/identity/trident/"
cp "$PLUGIN_ROOT/identity/trident/QUALITY.md" "$DEPLOY_DIR/identity/trident/"

echo "[5] Copying package.json..."
cp "$PLUGIN_ROOT/package.json" "$DEPLOY_DIR/"

echo "[6] Creating index.js entry point..."
cp "$PLUGIN_ROOT/dist/index.js" "$DEPLOY_DIR/index.js"

echo "[7] Verifying deployment..."
if [ ! -f "$DEPLOY_DIR/dist/index.js" ]; then
    echo "ERROR: Deployment verification failed - dist/index.js missing"
    exit 1
fi
if [ ! -f "$DEPLOY_DIR/identity/trident/TRIDENT.md" ]; then
    echo "ERROR: Deployment verification failed - TRIDENT.md missing"
    exit 1
fi

# Verify the fix (blocked return should exist)
if grep -q "blocked: true" "$DEPLOY_DIR/dist/index.js"; then
    echo "FIX VERIFIED: safeHook block propagation is active"
else
    echo "ERROR: safeHook fix NOT found in deployed code"
    echo "This is not the fixed version. Aborting."
    exit 1
fi

# Verify PATH_ALLOWLIST fix
if grep -q "filename = targetPath.split" "$DEPLOY_DIR/dist/artifact-writer.js"; then
    echo "FIX VERIFIED: PATH_ALLOWLIST filename extraction active"
else
    echo "ERROR: PATH_ALLOWLIST fix NOT found in deployed code"
    echo "This is not the fixed version. Aborting."
    exit 1
fi

echo ""
echo "=============================================="
echo "DEPLOY COMPLETE"
echo "=============================================="
echo ""
echo "Plugin deployed to: $DEPLOY_DIR"
echo "Entry point: $DEPLOY_DIR/dist/index.js"
echo ""
echo "NEXT STEPS:"
echo "1. Update opencode.json plugin path to:"
echo "   file://$DEPLOY_DIR/dist/index.js"
echo "2. Lock anchor:  bash scripts/lock-anchor.sh"
echo "3. Restart opencode for changes to take effect"
echo ""
echo "TO VERIFY:"
echo "  opencode --agent trident"
echo "  > who are you"
echo "  > trident-status"
echo "  > trident audit /path"
