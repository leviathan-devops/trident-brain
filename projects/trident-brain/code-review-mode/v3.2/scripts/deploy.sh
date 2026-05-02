#!/bin/bash
# TRIDENT v3.2 - Deploy Script

set -e

echo "=== TRIDENT v3.2 DEPLOY ==="

cd "$(dirname "$0")"

# Build first
echo "Building..."
./scripts/build.sh

# Deploy
DEPLOY_DIR="$HOME/.config/opencode/plugins/trident-brain"
echo ""
echo "Deploying to $DEPLOY_DIR..."

mkdir -p "$DEPLOY_DIR"
cp -r dist/* "$DEPLOY_DIR/"

echo ""
echo "=== DEPLOY COMPLETE ==="
echo "Deployed files:"
ls -la "$DEPLOY_DIR/"