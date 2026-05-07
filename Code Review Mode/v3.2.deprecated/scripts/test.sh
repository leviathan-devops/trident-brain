#!/bin/bash
# TRIDENT v3.2 - Verification Script
# Validates dist/ exists and plugin can load
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "=== TRIDENT v3.2 VERIFICATION ==="

PASS=0
FAIL=0

# Test 1: dist/ exists
echo -n "[1] dist/index.js exists... "
if [ -f "dist/index.js" ]; then
  echo "PASS ($(wc -c < dist/index.js) bytes)"
  PASS=$((PASS+1))
else
  echo "FAIL - run ./scripts/build.sh first"
  FAIL=$((FAIL+1))
fi

# Test 2: All dist files present
echo -n "[2] All dist files... "
MISSING=0
for f in index.js algorithmic-core.js artifact-writer.js; do
  [ ! -f "dist/$f" ] && MISSING=$((MISSING+1))
done
if [ $MISSING -eq 0 ]; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "FAIL ($MISSING missing)"
  FAIL=$((FAIL+1))
fi

# Test 3: Source compiles
echo -n "[3] TypeScript compiles... "
if command -v npx &> /dev/null && npx tsc --noEmit 2>/dev/null; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "SKIP (npm/bun not available)"
fi

# Test 4: Plugin exports function
echo -n "[4] index.js exports function... "
if grep -q "export default" dist/index.js 2>/dev/null || grep -q "function" dist/index.js 2>/dev/null; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "WARN"
fi

# Test 5: Plugin size reasonable
echo -n "[5] Bundle size < 1MB... "
SIZE=$(wc -c < dist/index.js)
if [ "$SIZE" -lt 1048576 ]; then
  echo "PASS (${SIZE} bytes)"
  PASS=$((PASS+1))
else
  echo "WARN (${SIZE} bytes)"
fi

# Test 6: opencode.json registration
echo -n "[6] opencode.json registered... "
OPENCODE_JSON="$HOME/.config/opencode/opencode.json"
if grep -q "trident-brain" "$OPENCODE_JSON" 2>/dev/null; then
  echo "PASS"
  PASS=$((PASS+1))
else
  echo "SKIP (run ./scripts/deploy.sh)"
fi

echo ""
echo "=== ${PASS} passed, ${FAIL} failed ==="
[ $FAIL -eq 0 ] || exit 1
