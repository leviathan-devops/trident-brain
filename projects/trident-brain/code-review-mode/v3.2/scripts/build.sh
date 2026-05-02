#!/bin/bash
# TRIDENT v3.2 - Build Script

set -e

echo "=== TRIDENT v3.2 BUILD ==="

cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

echo "Verifying dist files..."
if [ ! -f "dist/index.js" ]; then
  echo "ERROR: dist/index.js not found"
  exit 1
fi

if [ ! -f "dist/artifact-writer.js" ]; then
  echo "ERROR: dist/artifact-writer.js not found"
  exit 1
fi

echo ""
echo "=== BUILD COMPLETE ==="
echo "Files in dist/:"
ls -la dist/