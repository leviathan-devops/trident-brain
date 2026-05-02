#!/bin/bash
# TRIDENT v3.2 - Build Script
# Creates self-contained bundle with @opencode-ai/plugin included

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== TRIDENT v3.2 BUILD ==="
echo "Project: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo "Building self-contained bundle with bun..."
bun build src/index.ts \
  --outdir dist \
  --target bun \
  --format esm \
  --bundle

if [ ! -f "dist/index.js" ]; then
  echo "ERROR: dist/index.js not found"
  exit 1
fi

echo ""
echo "=== BUILD COMPLETE ==="
echo "Bundle size: $(wc -c < dist/index.js) bytes ($(du -h dist/index.js | cut -f1))"
echo ""
echo "Files in dist/:"
ls -la dist/