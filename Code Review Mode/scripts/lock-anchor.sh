#!/bin/bash
# TRIDENT v3.3.3-FIXED — LOCK ANCHOR (chattr +i)
# Run this to make the anchor immutable and prevent any edits
#
# USAGE: bash scripts/lock-anchor.sh
#   Locks this GLOBAL NUKE RELOAD anchor from all future modifications
#
# REVERT: sudo chattr -Ri /path/to/anchor

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=============================================="
echo "TRIDENT v3.3.3-FIXED ANCHOR LOCK"
echo "Target: $PLUGIN_ROOT"
echo "=============================================="
echo ""
echo "WARNING: This will make the entire anchor directory"
echo "IMMUTABLE. No file can be modified, deleted, or renamed."
echo "This includes the dist/, identity/, scripts/ directories."
echo ""
echo "This anchor has been verified with:"
echo "  - safeHook block propagation (returns { blocked: true })"
echo "  - PATH_ALLOWLIST filename extraction"
echo "  - Semantic context 60-char limit"
echo "  - Identity-aware path resolution"
echo "  - Hyphen/underscore agent name matching"
echo ""

# Verify anchor is intact before locking
echo "[1] Verifying anchor integrity..."
FAILED=0
for f in \
    "dist/index.js" \
    "dist/algorithmic-core.js" \
    "dist/artifact-writer.js" \
    "dist/identity/loader.js" \
    "dist/identity/injector.js" \
    "identity/trident/TRIDENT.md" \
    "identity/trident/IDENTITY.md" \
    "identity/trident/EXECUTION.md" \
    "identity/trident/QUALITY.md" \
    "package.json" \
    "scripts/deploy-from-global-anchor.sh"; do
    if [ ! -f "$PLUGIN_ROOT/$f" ]; then
        echo "  MISSING: $f"
        FAILED=1
    fi
done
if [ "$FAILED" = "1" ]; then
    echo "ERROR: Anchor is incomplete. Fix before locking."
    exit 1
fi
echo "  All anchor files verified"

# Verify fixes are present
echo "[2] Verifying critical fixes..."
if grep -q "blocked: true" "$PLUGIN_ROOT/dist/index.js"; then
    echo "  FIX OK: safeHook block propagation"
else
    echo "  MISSING: safeHook fix! Build fixed code first."
    exit 1
fi
if grep -q "filename = targetPath.split" "$PLUGIN_ROOT/dist/artifact-writer.js"; then
    echo "  FIX OK: PATH_ALLOWLIST filename extraction"
else
    echo "  MISSING: PATH_ALLOWLIST fix!"
    exit 1
fi
if grep -q "substring(0, 60)" "$PLUGIN_ROOT/dist/index.js"; then
    echo "  FIX OK: Semantic context 60-char limit"
else
    echo "  MISSING: semantic context fix!"
    exit 1
fi
if grep -q "startsWith.*trident-" "$PLUGIN_ROOT/dist/index.js"; then
    echo "  FIX OK: Hyphen agent name matching"
else
    echo "  MISSING: hyphen agent name fix!"
    exit 1
fi
if grep -q "PLUGIN_ROOT" "$PLUGIN_ROOT/dist/identity/loader.js"; then
    echo "  FIX OK: Self-aware identity path resolution"
else
    echo "  MISSING: self-aware path resolution!"
    exit 1
fi

echo ""
echo "[3] Locking anchor with chattr +i..."
find "$PLUGIN_ROOT" -type f | while read f; do
    chattr +i "$f" 2>/dev/null || echo "  WARNING: Could not lock $f (run with sudo?)"
done
find "$PLUGIN_ROOT" -type d | while read d; do
    chattr +i "$d" 2>/dev/null || true
done

echo ""
echo "[4] Verifying lock..."
if lsattr "$PLUGIN_ROOT/dist/index.js" 2>/dev/null | grep -q "----i"; then
    echo "  LOCKED: dist/index.js is immutable"
else
    echo "  WARNING: dist/index.js is NOT locked"
    echo "  Run: sudo chattr -R +i $PLUGIN_ROOT"
fi

echo ""
echo "=============================================="
echo "ANCHOR LOCKED"
echo "=============================================="
echo ""
echo "Trident v3.3.3-FIXED is now immutable at:"
echo "  $PLUGIN_ROOT"
echo ""
echo "This anchor will survive 400+ builds across 8+ months."
echo ""
echo "TO UNLOCK (emergency only):"
echo "  sudo chattr -Ri $PLUGIN_ROOT"
echo ""
echo "TO DEPLOY FROM THIS ANCHOR:"
echo "  bash scripts/deploy-from-global-anchor.sh"
