#!/bin/bash
# TRIDENT BRAIN v3.3 - CONTAINER TEST SCRIPT
# Tests deployment in isolated container before live deploy

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

AGENT_NAME="trident"
AGENT_COLOR="#8B5CF6"
PLUGIN_SRC="$SCRIPT_DIR"
PROJECT_PATH="$SCRIPT_DIR"

echo "=== TRIDENT v3.3 CONTAINER TEST ==="

# Create snap directory
SNAP=$(mktemp -d -p /tmp snap.XXXX)
echo "SNAP=$SNAP"

mkdir -p "$SNAP/config/plugins/$AGENT_NAME/dist/identity"
mkdir -p "$SNAP/config/plugins/$AGENT_NAME/identity/trident"

# Copy plugin files
cp "$PLUGIN_SRC/dist/index.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/algorithmic-core.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/artifact-writer.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/identity/"* "$SNAP/config/plugins/$AGENT_NAME/dist/identity/"

# Copy identity files
cp "$PLUGIN_SRC/identity/trident/TRIDENT.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"
cp "$PLUGIN_SRC/identity/trident/IDENTITY.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"
cp "$PLUGIN_SRC/identity/trident/EXECUTION.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"
cp "$PLUGIN_SRC/identity/trident/QUALITY.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"

# Create opencode.json
cat > "$SNAP/config/opencode.json" << EOF
{
  "plugin": ["file:///root/.config/opencode/plugins/$AGENT_NAME/dist/index.js"],
  "agent": {
    "$AGENT_NAME": {
      "color": "$AGENT_COLOR",
      "mode": "primary",
      "hidden": false
    }
  },
  "permission": {
    "*": {
      "*": "allow"
    }
  }
}
EOF

# Kill any existing test container
docker rm -f $AGENT_NAME 2>/dev/null || true

# Start container
echo "[1] Starting container..."
docker run -d --rm -it \
  --name $AGENT_NAME \
  --entrypoint "" \
  -v "$SNAP/config:/root/.config/opencode" \
  -v "$PROJECT_PATH:/workspace" \
  opencode-test:1.14.29 \
  /bin/sh -c 'opencode --agent $AGENT_NAME'

echo "[2] Waiting for startup..."
sleep 15

# Check container is running
if ! docker ps | grep -q $AGENT_NAME; then
    echo "ERROR: Container not running"
    docker logs $AGENT_NAME
    exit 1
fi

echo "[3] Running tests..."

# Test 1: who are you
echo ""
echo "=== TEST 1: who are you ==="
sleep 5
docker exec $AGENT_NAME sh -c '/usr/local/bin/opencode run --agent trident "who are you" 2>&1' | grep -E "(Trident|BRAIN|v3.3)" | head -5

# Test 2: edit blocking
echo ""
echo "=== TEST 2: edit blocking ==="
docker exec $AGENT_NAME sh -c 'touch /workspace/test.txt' 2>/dev/null || true
docker exec $AGENT_NAME sh -c '/usr/local/bin/opencode run --agent trident "edit /workspace/test.txt to say blocked" 2>&1' | grep -E "(BLOCK|blocked|Trident)" | head -5

echo ""
echo "[4] Cleanup..."
docker rm -f $AGENT_NAME 2>/dev/null || true
rm -rf /tmp/snap.* 2>/dev/null || true

echo ""
echo "=== CONTAINER TEST COMPLETE ==="