#!/bin/bash
# TRIDENT v3.2 - Build Script
# Produces self-contained dist/ from TypeScript source
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "=== TRIDENT v3.2 BUILD ==="

# Build with bun for self-contained bundle (preferred)
if command -v bun &> /dev/null; then
  echo "[bun] Building self-contained bundle..."
  bun build src/index.ts --outdir dist --target bun --format esm --bundle
else
  # Fallback to tsc + npm
  echo "[tsc] Building TypeScript..."
  npm install --silent 2>/dev/null || true
  npm run build
fi

# Verify output
echo ""
for f in index.js algorithmic-core.js artifact-writer.js; do
  if [ -f "dist/$f" ]; then
    echo "  dist/$f - OK ($(wc -c < "dist/$f") bytes)"
  else
    echo "  dist/$f - MISSING"
    exit 1
  fi
done

echo ""
echo "=== BUILD COMPLETE ==="
