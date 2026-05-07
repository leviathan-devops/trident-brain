# TRIDENT BRAIN v3.3 - RELOAD ANCHOR
## Self-Contained Recovery Package

**Version:** 3.3.1
**Status:** SHIP READY ✅
**Date:** 2026-05-07
**Container Testing:** VERIFIED ✅

---

## WHAT IS THIS?

This is the **Reload Anchor** for Trident Brain v3.3. It contains everything needed to restore a broken Trident installation or deploy a fresh copy.

**v3.3 Key Features:**
- Full identity awareness — Trident knows it IS Trident Brain
- Responds correctly to "who are you" with Trident identity
- Blocks edit/write/bash tools at the hook level
- Session-based hook scoping (works across all hook types)

---

## FOLDER STRUCTURE

```
Reload Anchor v3.3/
├── src/                    # TypeScript source
│   ├── index.ts           # Main plugin with session-based hook scoping
│   ├── algorithmic-core.ts  # Pattern matching engine
│   ├── artifact-writer.ts   # Report generation
│   └── identity/          # Identity awareness system
│       ├── index.ts
│       ├── loader.ts
│       ├── injector.ts
│       └── types.ts
├── dist/                   # Built plugin (READY TO DEPLOY)
│   ├── index.js           # Main bundle
│   ├── algorithmic-core.js
│   ├── artifact-writer.js
│   └── identity/
├── scripts/
│   ├── deploy.sh          # Deploy to live opencode
│   ├── test-container.sh  # Test in container first
│   └── build.sh           # Build only
├── BUILD_LOG.md           # Build & debug log
├── COMPACTION_SURVIVAL.md # Session knowledge
├── package.json
├── tsconfig.json
└── INDEX.md               # This file
```

---

## QUICK START

### Option 1: Container Test First (Recommended)

```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.3"
./scripts/test-container.sh
```

### Option 2: Deploy Directly to Live

```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.3"
./scripts/deploy.sh
```

---

## LIVE DEPLOYMENT (opencode.json based)

### Prerequisites
- OpenCode installed
- Plugin path: `~/.config/opencode/plugins/trident/`

### Step-by-Step Deploy

```bash
# 1. Navigate to source
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.3"

# 2. Build
npm run build

# 3. Create plugin directory
mkdir -p ~/.config/opencode/plugins/trident/dist/identity

# 4. Copy dist files
cp dist/index.js ~/.config/opencode/plugins/trident/dist/
cp dist/algorithmic-core.js ~/.config/opencode/plugins/trident/dist/
cp dist/artifact-writer.js ~/.config/opencode/plugins/trident/dist/
cp dist/identity/* ~/.config/opencode/plugins/trident/dist/identity/

# 5. Update opencode.json
# Add to "plugin" array:
"file:///home/leviathan/.config/opencode/plugins/trident/dist/index.js"

# Add to "agent" object:
"trident": {
  "color": "#8B5CF6",
  "mode": "primary",
  "hidden": false
}

# 6. Test
opencode --agent trident
```

### opencode.json Template

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "minimax": {}
  },
  "plugin": [
    "file:///home/leviathan/.config/opencode/plugins/trident/dist/index.js"
  ],
  "agent": {
    "trident": {
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
```

---

## CONTAINER TESTING

### Why Container Testing?

```
Local opencode run → hooks DON'T fire in headless mode
Container → hooks fire 100% correctly
```

### Container Test Script

```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.3"
./scripts/test-container.sh
```

### Manual Container Test

```bash
AGENT_NAME="trident"
AGENT_COLOR="#8B5CF6"
PLUGIN_SRC="/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.3"
PROJECT_PATH="/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.3"

SNAP=$(mktemp -d -p /tmp snap.XXXX)
mkdir -p "$SNAP/config/plugins/$AGENT_NAME/dist/identity"
cp "$PLUGIN_SRC/dist/index.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/algorithmic-core.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/artifact-writer.js" "$SNAP/config/plugins/$AGENT_NAME/dist/"
cp "$PLUGIN_SRC/dist/identity/"* "$SNAP/config/plugins/$AGENT_NAME/dist/identity/"

cat > "$SNAP/config/opencode.json" << 'EOF'
{
  "plugin": ["file:///root/.config/opencode/plugins/trident/dist/index.js"],
  "agent": {
    "trident": {
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

docker rm -f $AGENT_NAME 2>/dev/null || true
docker run -d --rm -it \
  --name $AGENT_NAME \
  --entrypoint "" \
  -v "$SNAP/config:/root/.config/opencode" \
  -v "$PROJECT_PATH:/workspace" \
  opencode-test:1.14.29 \
  /bin/sh -c 'opencode --agent trident'

sleep 15

# Test identity
docker exec $AGENT_NAME sh -c '/usr/local/bin/opencode run --agent trident "who are you" 2>&1'

# Test edit blocking
docker exec $AGENT_NAME sh -c 'touch /workspace/test.txt'
docker exec $AGENT_NAME sh -c '/usr/local/bin/opencode run --agent trident "edit /workspace/test.txt to say blocked" 2>&1'

# Cleanup
docker rm -f $AGENT_NAME 2>/dev/null
rm -rf /tmp/snap.* 2>/dev/null
```

---

## EXPECTED TEST RESULTS

| Test | Command | Expected Response |
|------|---------|-------------------|
| Identity | `"who are you"` | "Trident BRAIN v3.3 — Algorithmic Code Review Agent..." |
| Edit block | `"edit /workspace/test.txt"` | "[TRIDENT BLOCK] BLOCKING edit - TOOL_BLOCKED" |
| Status | `trident-status` | Shows Trident Brain v3.3 status |
| Help | `trident-help` | Lists available commands |

---

## BUILD

```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.3"
npm run build
```

Build output: `dist/index.js` (~29KB)

---

## HOOKS ACTIVE IN v3.3

| Hook | Purpose | Scoping Method |
|------|---------|-----------------|
| `tool.execute.before` | Theatrical code blocker | Session-based |
| `chat.message` | Identity response + session registration | Direct + session |
| `experimental.chat.system.transform` | Identity injection | Session-based |

---

## KEY TECHNICAL NOTE: Session-Based Hook Scoping

**Problem:** OpenCode hooks receive agent identity differently:
- `chat.message`: receives `input.agent` directly
- `tool.execute.before` and `system.transform`: only receive `input.sessionID`

**Solution:** Session-based agent tracking:
1. `chat.message` hook registers `sessionID → agent` mapping
2. Other hooks look up agent from `sessionAgentMap`
3. Works across all hook types

```typescript
const sessionAgentMap = new Map<string, string>();

function isTridentFromSession(sessionID: string | undefined): boolean {
  if (!sessionID) return false;
  const agent = sessionAgentMap.get(sessionID);
  return agent === 'trident' || (agent?.startsWith('trident_') ?? false);
}
```

---

## ROLLBACK

If deployment breaks:

```bash
# Restore opencode.json
cp ~/.config/opencode/opencode.json.bak ~/.config/opencode/opencode.json

# Or remove trident from opencode.json manually
```

---

## FILES

| File | Purpose |
|------|---------|
| `src/index.ts` | Main plugin with hook implementations |
| `dist/index.js` | Built bundle for deployment |
| `scripts/deploy.sh` | Live deployment script |
| `scripts/test-container.sh` | Container test script |
| `BUILD_LOG.md` | Build and debug log |
| `COMPACTION_SURVIVAL.md` | Session knowledge |

---

*Trident Brain v3.3.1 — "Trident Documents. Humans Fix."*more content
