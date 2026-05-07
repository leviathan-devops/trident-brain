#!/bin/bash
# TRIDENT BRAIN v3.3 - DEPLOY SCRIPT
# Deploys to live opencode config

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "=== TRIDENT v3.3 DEPLOY ==="

# Build first
echo "[1] Building..."
npm run build

# Target paths
PLUGIN_NAME="trident"
PLUGIN_DIR="$HOME/.config/opencode/plugins/$PLUGIN_NAME"
DIST_DIR="$SCRIPT_DIR/dist"

echo "[2] Creating plugin directory..."
mkdir -p "$PLUGIN_DIR/dist/identity"

echo "[3] Copying dist files..."
cp "$DIST_DIR/index.js" "$PLUGIN_DIR/dist/"
cp "$DIST_DIR/algorithmic-core.js" "$PLUGIN_DIR/dist/"
cp "$DIST_DIR/artifact-writer.js" "$PLUGIN_DIR/dist/"
cp "$DIST_DIR/identity/"* "$PLUGIN_DIR/dist/identity/"

echo "[4] Updating opencode.json..."
CONFIG_FILE="$HOME/.config/opencode/opencode.json"

# Backup existing config
cp "$CONFIG_FILE" "$CONFIG_FILE.bak" 2>/dev/null || true

# Read existing config or create new
if [ -f "$CONFIG_FILE" ]; then
    # Use node to properly merge JSON
    node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));

// Add plugin if not present
const pluginPath = 'file://$PLUGIN_DIR/dist/index.js';
if (!config.plugin) config.plugin = [];
if (!config.plugin.includes(pluginPath)) {
    config.plugin = [pluginPath];
}

// Add trident agent if not present
if (!config.agent) config.agent = {};
if (!config.agent.$PLUGIN_NAME) {
    config.agent.$PLUGIN_NAME = {
        color: '#8B5CF6',
        mode: 'primary',
        hidden: false
    };
}

// Ensure permissions
if (!config.permission) config.permission = {};
if (!config.permission['*']) config.permission['*'] = {};
if (!config.permission['*']['*']) config.permission['*']['*'] = 'allow';

fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2));
console.log('Config updated');
"
else
    cat > "$CONFIG_FILE" << EOF
{
  "plugin": ["file://$PLUGIN_DIR/dist/index.js"],
  "agent": {
    "$PLUGIN_NAME": {
      "color": "#8B5CF6",
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
    echo "Created new opencode.json"
fi

echo "[5] Verifying deployment..."
ls -la "$PLUGIN_DIR/dist/index.js"
echo "Done!"
echo ""
echo "=== DEPLOY COMPLETE ==="
echo "Run 'opencode --agent trident' to test"
echo "Or test in container first with: ./scripts/test-container.sh"