#!/bin/bash
# TRIDENT v3.2 - Test Script

set -e

echo "=== TRIDENT v3.2 MECHANICAL TESTS ==="

cd "$(dirname "$0")"

# Ensure dependencies are installed and built
if [ ! -f "dist/artifact-writer.js" ]; then
  echo "Building first..."
  ./scripts/build.sh
fi

# Run the mechanical tests
echo ""
echo "Running mechanical tests..."
npx ts-node --esm test-mechanical.ts

echo ""
echo "=== TESTS COMPLETE ==="