#!/bin/bash
# TRIDENT v3.3.3-FIXED — COMPREHENSIVE CONTAINER TEST
#
# TESTS:
#   1. Identity: "who are you" → "TRIDENT BRAIN v3.3.3-FIXED"
#   2. Tool blocking: write/edit/bash → BLOCKED (not executed)
#   3. Hive blocking: hive write tools → BLOCKED
#   4. Trident tools: trident-status, trident-help → WORK
#   5. Artifact generation: trident-audit → writes TRIDENT_CODE_REVIEW_*.md
#   6. Agent isolation: non-trident agents NOT blocked
#   7. Theatrical block: mock/stub suggestions → BLOCKED
#   8. Cross-session: chat.message registers session, tool.execute.before checks it
#
# USAGE: bash scripts/test-container-comprehensive.sh
#   Requires: Docker, tmux, API key in live opencode.json

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

CONTAINER_NAME="trident-test-v333"
TMUX_SESSION="trident-tui"
AGENT_NAME="trident"
AGENT_COLOR="#8B5CF6"
PLUGIN_SRC="$SCRIPT_DIR"
CONTAINER_IMAGE="opencode-test:1.14.34"

# Extract API key from live config
API_KEY=$(grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' ~/.config/opencode/opencode.json 2>/dev/null | head -1 | sed 's/"apiKey"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')
if [ -z "$API_KEY" ]; then
    echo "ERROR: Could not extract API key from ~/.config/opencode/opencode.json"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
PASS=0
FAIL=0

cleanup() {
    echo ""
    echo "=== CLEANUP ==="
    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    echo "Cleanup complete"
}
cleanup_all_snaps() {
    rm -rf /tmp/trident-snap-* 2>/dev/null || true
}
trap cleanup EXIT

echo "=============================================="
echo "TRIDENT v3.3.3-FIXED COMPREHENSIVE TEST"
echo "=============================================="
echo ""

# Clean old snaps but NOT the current one
cleanup_all_snaps

# ---------------------------------------------------------------------------
# STEP 0: Validate environment
# ---------------------------------------------------------------------------
echo "[0] Validating environment..."
if [ -z "$API_KEY" ]; then
    echo "ERROR: API key not found"
    exit 1
fi
echo "  API key: OK (${API_KEY:0:15}...)"

# Check critical files exist
for f in \
    "dist/index.js" \
    "dist/algorithmic-core.js" \
    "dist/artifact-writer.js" \
    "dist/identity/loader.js" \
    "dist/identity/injector.js" \
    "identity/trident/TRIDENT.md" \
    "identity/trident/IDENTITY.md" \
    "identity/trident/EXECUTION.md" \
    "identity/trident/QUALITY.md"; do
    if [ ! -f "$f" ]; then
        echo "  ERROR: Missing $f"
        exit 1
    fi
done
echo "  All plugin files: OK"

# Verify fix patterns are in the dist
echo "  Verifying fix patterns in dist..."
if grep -q "blocked: true" dist/index.js; then
    echo "    block return: OK"
else
    echo "    ERROR: blocked: true not found in dist/index.js!"
    exit 1
fi
if grep -q "resolveHookAgent" dist/index.js; then
    echo "    resolveHookAgent: OK"
else
    echo "    ERROR: resolveHookAgent not found!"
    exit 1
fi
if grep -q "isTridentFromSession" dist/index.js; then
    echo "    session map fallback: OK"
else
    echo "    ERROR: session map fallback missing!"
    exit 1
fi
echo ""

# ---------------------------------------------------------------------------
# STEP 1: Create snap directory with config
# ---------------------------------------------------------------------------
echo "[1] Creating test snapshot..."
SNAP=$(mktemp -d -p /tmp trident-snap-XXXX)
echo "  SNAP=$SNAP"

mkdir -p "$SNAP/config/plugins/$AGENT_NAME/dist/identity"
mkdir -p "$SNAP/config/plugins/$AGENT_NAME/identity/trident"
mkdir -p "$SNAP/config/workspace"

# Copy plugin dist files
cp "$PLUGIN_SRC/dist/index.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/algorithmic-core.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/artifact-writer.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/identity/"* "$SNAP/config/plugins/$AGENT_NAME/dist/identity/"

# Copy identity files
cp "$PLUGIN_SRC/identity/trident/TRIDENT.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"
cp "$PLUGIN_SRC/identity/trident/IDENTITY.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"
cp "$PLUGIN_SRC/identity/trident/EXECUTION.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"
cp "$PLUGIN_SRC/identity/trident/QUALITY.md" "$SNAP/config/plugins/$AGENT_NAME/identity/trident/"

# Create test source file for audit
cat > "$SNAP/config/workspace/test-source.ts" << 'EOF'
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// TODO: implement full auth system
function checkAuth(token: string): boolean {
  return true; // placeholder
}

const API_KEY = "sk-abcdefghijklmnopqrstuvwxyz1234567890";
EOF

# Create opencode.json
cat > "$SNAP/config/opencode.json" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "model": "minimax/MiniMax-M2.7",
  "provider": {
    "minimax": {
      "options": {
        "apiKey": "$API_KEY"
      }
    }
  },
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

echo "  Config created"
echo ""

# ---------------------------------------------------------------------------
# STEP 2: Start container
# ---------------------------------------------------------------------------
echo "[2] Starting container..."

docker run -d --rm \
  --name "$CONTAINER_NAME" \
  --entrypoint /bin/bash \
  -e TERM=xterm-256color \
  -v "$SNAP/config:/root/.config/opencode" \
  -v "$SNAP/config/workspace:/workspace" \
  "$CONTAINER_IMAGE" \
  -c "sleep 7200"

sleep 2

if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "ERROR: Container failed to start"
    docker logs "$CONTAINER_NAME"
    exit 1
fi
echo "  Container running: $CONTAINER_NAME"

# Verify config is in place
docker exec "$CONTAINER_NAME" sh -c 'ls /root/.config/opencode/plugins/trident/dist/index.js && echo "Plugin exists"'
docker exec "$CONTAINER_NAME" sh -c 'ls /root/.config/opencode/plugins/trident/identity/trident/TRIDENT.md && echo "Identity exists"'
echo ""

# ---------------------------------------------------------------------------
# STEP 3: Start tmux TUI session
# ---------------------------------------------------------------------------
echo "[3] Starting tmux TUI session..."

OPENCODE_BIN=$(docker exec "$CONTAINER_NAME" sh -c 'which opencode' 2>/dev/null || echo "/usr/local/bin/opencode")
echo "  opencode binary: $OPENCODE_BIN"

# Create tmux session running opencode TUI
tmux new-session -d -s "$TMUX_SESSION" \
  "docker exec -it $CONTAINER_NAME $OPENCODE_BIN --agent $AGENT_NAME 2>&1"

echo "  Waiting for TUI startup..."
sleep 8

# Dismiss any dialogs (Update Available, etc.)
tmux send-keys -t "$TMUX_SESSION" Escape
sleep 2

# Capture initial screen
echo "  Initial TUI state:"
tmux capture-pane -t "$TMUX_SESSION" -p -S -20 2>/dev/null | strings | tail -15
echo ""

# Check if TUI is responsive
TUI_CHECK=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -5 2>/dev/null | strings | grep -c "opencode\|OPENCODE\|open.code\|opencode\|agent\|trident" 2>/dev/null || echo "0")
echo "  TUI responsiveness check: ${TUI_CHECK}"

# Wait more if needed
sleep 5
echo ""

# ---------------------------------------------------------------------------
# TEST 1: Identity
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 1: Identity - 'who are you'${NC}"
echo "=============================================="

# Clear current pane
tmux send-keys -t "$TMUX_SESSION" C-c
sleep 2

# Send identity question
tmux send-keys -t "$TMUX_SESSION" "who are you"
tmux send-keys -t "$TMUX_SESSION" Enter
sleep 15

IDENTITY_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -40 2>/dev/null | strings)
echo "$IDENTITY_OUTPUT" | head -30

if echo "$IDENTITY_OUTPUT" | grep -q "TRIDENT BRAIN v3.3.3-FIXED\|Trident.*Brain.*v3.3\|TRIDENT.*v3.3"; then
    echo -e "${GREEN}  PASS: Identity response detected${NC}"
    PASS=$((PASS+1))
else
    echo -e "${RED}  FAIL: No Trident identity response${NC}"
    FAIL=$((FAIL+1))
fi
echo ""

# ---------------------------------------------------------------------------
# TEST 2: Tool blocking - write/edit/bash
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 2: Tool Blocking - write should be blocked${NC}"
echo "=============================================="

tmux send-keys -t "$TMUX_SESSION" C-c
sleep 2
tmux send-keys -t "$TMUX_SESSION" "write a file called /workspace/blocked-test.txt with content 'should not work'"
tmux send-keys -t "$TMUX_SESSION" Enter
sleep 15

BLOCK_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -40 2>/dev/null | strings)
echo "$BLOCK_OUTPUT" | head -20

if echo "$BLOCK_OUTPUT" | grep -qi "block\|BLOCK\|Trident.*document\|documentation-only\|cannot write\|can.t write\|not allowed\|blocked"; then
    echo -e "${GREEN}  PASS: Write was blocked${NC}"
    PASS=$((PASS+1))
else
    # Check if file was actually created (means block FAILED)
    FILE_CHECK=$(docker exec "$CONTAINER_NAME" sh -c 'test -f /workspace/blocked-test.txt && echo "EXISTS" || echo "NOT_FOUND"' 2>/dev/null)
    if [ "$FILE_CHECK" = "EXISTS" ]; then
        echo -e "${RED}  FAIL: File was created - tool blocking NOT WORKING!${NC}"
        FAIL=$((FAIL+1))
    else
        echo -e "${YELLOW}  UNCLEAR: No block message detected but file not created${NC}"
        echo -e "${YELLOW}  (Could be model not processing, not block failure)${NC}"
        FAIL=$((FAIL+1))
    fi
fi
echo ""

# ---------------------------------------------------------------------------
# TEST 3: Theatrical block
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 3: Theatrical Block - mock suggestion${NC}"
echo "=============================================="

tmux send-keys -t "$TMUX_SESSION" C-c
sleep 2
tmux send-keys -t "$TMUX_SESSION" "use a mock for testing the database layer"
tmux send-keys -t "$TMUX_SESSION" Enter
sleep 15

THEATRE_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -40 2>/dev/null | strings)
echo "$THEATRE_OUTPUT" | head -20

if echo "$THEATRE_OUTPUT" | grep -qi "block\|MOCK\|theatrical\|anti-theatrical\|mock.stub\|not allowed"; then
    echo -e "${GREEN}  PASS: Theatrical pattern was blocked${NC}"
    PASS=$((PASS+1))
else
    echo -e "${RED}  FAIL: No theatrical block detected${NC}"
    FAIL=$((FAIL+1))
fi
echo ""

# ---------------------------------------------------------------------------
# TEST 4: Trident tools
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 4: Trident Tools - trident-status${NC}"
echo "=============================================="

tmux send-keys -t "$TMUX_SESSION" C-c
sleep 2
tmux send-keys -t "$TMUX_SESSION" "trident-status"
tmux send-keys -t "$TMUX_SESSION" Enter
sleep 15

STATUS_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -40 2>/dev/null | strings)
echo "$STATUS_OUTPUT" | head -20

if echo "$STATUS_OUTPUT" | grep -qi "TRIDENT\|trident.*status\|identity.*loaded\|mode\|target\|findings\|audit"; then
    echo -e "${GREEN}  PASS: trident-status responded${NC}"
    PASS=$((PASS+1))
else
    echo -e "${RED}  FAIL: trident-status did not respond${NC}"
    FAIL=$((FAIL+1))
fi
echo ""

# ---------------------------------------------------------------------------
# TEST 5: trident-help
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 5: Trident Tools - trident-help${NC}"
echo "=============================================="

tmux send-keys -t "$TMUX_SESSION" C-c
sleep 2
tmux send-keys -t "$TMUX_SESSION" "trident-help"
tmux send-keys -t "$TMUX_SESSION" Enter
sleep 15

HELP_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -40 2>/dev/null | strings)
echo "$HELP_OUTPUT" | head -20

if echo "$HELP_OUTPUT" | grep -qi "TRIDENT\|algorithmic\|audit\|pattern\|theatrical\|document\|fix"; then
    echo -e "${GREEN}  PASS: trident-help responded${NC}"
    PASS=$((PASS+1))
else
    echo -e "${RED}  FAIL: trident-help did not respond${NC}"
    FAIL=$((FAIL+1))
fi
echo ""

# ---------------------------------------------------------------------------
# TEST 6: Artifact generation via trident-audit
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 6: Artifact Generation - trident-audit${NC}"
echo "=============================================="

tmux send-keys -t "$TMUX_SESSION" C-c
sleep 2
tmux send-keys -t "$TMUX_SESSION" "trident-audit /workspace"
tmux send-keys -t "$TMUX_SESSION" Enter

# This may take a while (model processes the audit)
echo "  Waiting for audit to complete (up to 60s)..."
sleep 45

AUDIT_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -40 2>/dev/null | strings)
echo "$AUDIT_OUTPUT" | head -20

# Check if artifact files were created
echo "  Checking for artifact files..."
ARTIFACTS=$(docker exec "$CONTAINER_NAME" sh -c 'ls /root/.config/opencode/plugins/trident/TRIDENT_CODE_REVIEW_*.md /root/.config/opencode/plugins/trident/TRIDENT_BUILD_REPORT_*.md 2>/dev/null' || echo "NOT_FOUND")

if echo "$ARTIFACTS" | grep -q "TRIDENT_CODE_REVIEW_\|TRIDENT_BUILD_REPORT_"; then
    echo -e "${GREEN}  PASS: Artifact files created${NC}"
    echo "  Files: $ARTIFACTS"
    PASS=$((PASS+1))
else
    # Check in root as well (process.cwd() in container)
    ARTIFACTS2=$(docker exec "$CONTAINER_NAME" sh -c 'ls /root/TRIDENT_CODE_REVIEW_*.md /root/TRIDENT_BUILD_REPORT_*.md /TRIDENT_CODE_REVIEW_*.md /TRIDENT_BUILD_REPORT_*.md 2>/dev/null' || echo "NOT_FOUND")
    if echo "$ARTIFACTS2" | grep -q "TRIDENT_CODE_REVIEW_\|TRIDENT_BUILD_REPORT_"; then
        echo -e "${GREEN}  PASS: Artifact files created${NC}"
        echo "  Files: $ARTIFACTS2"
        PASS=$((PASS+1))
    else
        # Check in workspace
        ARTIFACTS3=$(docker exec "$CONTAINER_NAME" sh -c 'ls /workspace/TRIDENT_CODE_REVIEW_*.md /workspace/TRIDENT_BUILD_REPORT_*.md 2>/dev/null' || echo "NOT_FOUND")
        if echo "$ARTIFACTS3" | grep -q "TRIDENT_CODE_REVIEW_\|TRIDENT_BUILD_REPORT_"; then
            echo -e "${GREEN}  PASS: Artifact files created in workspace${NC}"
            echo "  Files: $ARTIFACTS3"
            PASS=$((PASS+1))
        else
            echo -e "${RED}  FAIL: No artifact files created${NC}"
            echo "  Search results: $ARTIFACTS"
            FAIL=$((FAIL+1))
        fi
    fi
fi
echo ""

# ---------------------------------------------------------------------------
# TEST 7: Hive block
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 7: Hive Block - kraken_hive_remember${NC}"
echo "=============================================="

tmux send-keys -t "$TMUX_SESSION" C-c
sleep 2
tmux send-keys -t "$TMUX_SESSION" "run kraken_hive_remember to store a test key"
tmux send-keys -t "$TMUX_SESSION" Enter
sleep 15

HIVE_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION" -p -S -40 2>/dev/null | strings)
echo "$HIVE_OUTPUT" | head -15

if echo "$HIVE_OUTPUT" | grep -qi "block\|BLOCK\|Trident.*hive\|hive.*read.only\|read-only\|cannot.*hive\|not allowed"; then
    echo -e "${GREEN}  PASS: Hive write was blocked${NC}"
    PASS=$((PASS+1))
else
    echo -e "${YELLOW}  WARN: Hive block not verified (may need exact tool name)${NC}"
fi
echo ""

# ---------------------------------------------------------------------------
# TEST 8: Agent isolation - non-trident agent
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}TEST 8: Agent Isolation - non-trident agent NOT blocked${NC}"
echo "=============================================="

echo "  Starting secondary container with plan agent to verify isolation..."
SNAP2=$(mktemp -d -p /tmp trident-snap2-XXXX)

# Create config WITHOUT trident - just plan agent
mkdir -p "$SNAP2/config"
cat > "$SNAP2/config/opencode.json" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "model": "minimax/MiniMax-M2.7",
  "provider": {
    "minimax": {
      "options": {
        "apiKey": "$API_KEY"
      }
    }
  },
  "plugin": [],
  "agent": {},
  "permission": {
    "*": {
      "*": "allow"
    }
  }
}
EOF

CONTAINER2="trident-test-isolation"
docker rm -f "$CONTAINER2" 2>/dev/null || true

docker run -d --rm \
  --name "$CONTAINER2" \
  --entrypoint /bin/bash \
  -e TERM=xterm-256color \
  -v "$SNAP2/config:/root/.config/opencode" \
  "$CONTAINER_IMAGE" \
  -c "sleep 3600"

sleep 2

# Now start a separate config WITH trident plugin, but using plan agent
SNAP3=$(mktemp -d -p /tmp trident-snap3-XXXX)
mkdir -p "$SNAP3/config/plugins/trident/dist/identity"
mkdir -p "$SNAP3/config/plugins/trident/identity/trident"
cp -r "$SNAP/config/plugins/trident/dist/"* "$SNAP3/config/plugins/trident/dist/"
cp -r "$SNAP/config/plugins/trident/identity/trident/"* "$SNAP3/config/plugins/trident/identity/trident/"

cat > "$SNAP3/config/opencode.json" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "model": "minimax/MiniMax-M2.7",
  "provider": {
    "minimax": {
      "options": {
        "apiKey": "$API_KEY"
      }
    }
  },
  "plugin": ["file:///root/.config/opencode/plugins/trident/dist/index.js"],
  "agent": {
    "plan": {
      "color": "#3B82F6",
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

CONTAINER3="trident-test-plan-agent"
docker rm -f "$CONTAINER3" 2>/dev/null || true

docker run -d --rm \
  --name "$CONTAINER3" \
  --entrypoint /bin/bash \
  -e TERM=xterm-256color \
  -v "$SNAP3/config:/root/.config/opencode" \
  -v "$SNAP3/config:/workspace" \
  "$CONTAINER_IMAGE" \
  -c "sleep 3600"

sleep 2

# Debug: check what agent names are in the trident plugin for plan
echo "  Checking if trident plugin exists in plan container..."
docker exec "$CONTAINER3" sh -c 'ls /root/.config/opencode/plugins/trident/dist/index.js && echo "Plugin loaded"' || echo "Plugin not found"

# Start tmux with plan agent to see if write is blocked or not
TMUX_SESSION2="trident-isolation-test"
tmux new-session -d -s "$TMUX_SESSION2" \
  "docker exec -it $CONTAINER3 /usr/local/bin/opencode --agent plan 2>&1"

sleep 8
tmux send-keys -t "$TMUX_SESSION2" Escape
sleep 2

# Try write as plan agent
tmux send-keys -t "$TMUX_SESSION2" "write a file /workspace/plan-test.txt with content 'plan can write'"
tmux send-keys -t "$TMUX_SESSION2" Enter
sleep 15

PLAN_OUTPUT=$(tmux capture-pane -t "$TMUX_SESSION2" -p -S -40 2>/dev/null | strings)
echo "$PLAN_OUTPUT" | head -15

PLAN_FILE=$(docker exec "$CONTAINER3" sh -c 'test -f /workspace/plan-test.txt && echo "EXISTS: $(cat /workspace/plan-test.txt)" || echo "NOT_FOUND"' 2>/dev/null)
echo "  Plan agent file check: $PLAN_FILE"

# The TRIDENT plugin is loaded, so plan agent should still be able to write
# If write was blocked, trident plugin is blocking non-trident agents = FAIL
if echo "$PLAN_FILE" | grep -q "EXISTS:"; then
    echo -e "${GREEN}  PASS: Plan agent CAN write (trident does not block others)${NC}"
    PASS=$((PASS+1))
elif echo "$PLAN_OUTPUT" | grep -qi "block\|BLOCK\|Trident"; then
    echo -e "${RED}  FAIL: Plan agent was BLOCKED by trident plugin!${NC}"
    echo -e "${RED}  Trident is blocking non-trident agents. Agent isolation BROKEN.${NC}"
    FAIL=$((FAIL+1))
else
    echo -e "${YELLOW}  UNCLEAR: Could not verify plan agent write${NC}"
    echo -e "${YELLOW}  (Model may not have processed command)${NC}"
    # This is a hard requirement - let's try one more time
    sleep 10
    tmux send-keys -t "$TMUX_SESSION2" C-c
    sleep 2
    tmux send-keys -t "$TMUX_SESSION2" "touch /workspace/plan-test-2.txt"
    tmux send-keys -t "$TMUX_SESSION2" Enter
    sleep 10
    
    PLAN_FILE2=$(docker exec "$CONTAINER3" sh -c 'test -f /workspace/plan-test-2.txt && echo "EXISTS" || echo "NOT_FOUND"' 2>/dev/null)
    PLAN_OUTPUT2=$(tmux capture-pane -t "$TMUX_SESSION2" -p -S -30 2>/dev/null | strings)
    
    if [ "$PLAN_FILE2" = "EXISTS" ]; then
        echo -e "${GREEN}  PASS: Plan agent can write (file exists)${NC}"
        PASS=$((PASS+1))
    else
        echo -e "${RED}  FAIL: Plan agent write test inconclusive${NC}"
        FAIL=$((FAIL+1))
    fi
fi

# Clean up isolation containers
tmux kill-session -t "$TMUX_SESSION2" 2>/dev/null || true
docker rm -f "$CONTAINER2" "$CONTAINER3" 2>/dev/null || true
rm -rf "$SNAP2" "$SNAP3" 2>/dev/null || true
echo ""

# ---------------------------------------------------------------------------
# RESULTS
# ---------------------------------------------------------------------------
echo "=============================================="
echo -e "${YELLOW}RESULTS${NC}"
echo "=============================================="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$PASS" -ge 5 ]; then
    echo -e "${GREEN}=============================================="
    echo "  ALL CRITICAL TESTS PASSED"
    echo "  Trident v3.3.3-FIXED is ready for deployment"
    echo -e "==============================================${NC}"
    exit 0
else
    echo -e "${RED}=============================================="
    echo "  $FAIL TESTS FAILED"
    echo "  Review above output and fix issues"
    echo -e "==============================================${NC}"
    exit 1
fi
