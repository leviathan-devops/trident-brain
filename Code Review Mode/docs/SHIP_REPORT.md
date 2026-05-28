# TRIDENT v3.3.3-FIXED — SHIP REPORT

**Date:** 2026-05-27
**Version:** 3.3.3-FIXED
**Status:** SHIP READY

---

## What Is This?

Trident Brain v3.3.3-FIXED is a self-aware algorithmic code review plugin for OpenCode. It:

1. **Blocks write/edit/bash tools** for the Trident agent (documentation-only enforcement)
2. **Does NOT block other agents** (agent-scoped via safeHook)
3. **Knows its own identity** (responds "I am TRIDENT BRAIN" on first message)
4. **Generates audit artifacts** (TRIDENT_CODE_REVIEW_*.md and TRIDENT_BUILD_REPORT_*.md)

---

## Deploy Instructions

### Step 1: Remove Old Plugin (if exists)

```bash
# Backup existing config
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.bak

# Remove old trident plugin entry from opencode.json
# Edit the "plugin" array to remove any trident entries
```

### Step 2: Deploy Plugin Files

```bash
# Set deploy directory
DEPLOY_DIR="$HOME/.config/opencode/plugins/trident"

# Create directory structure
mkdir -p "$DEPLOY_DIR/dist/identity"
mkdir -p "$DEPLOY_DIR/identity/trident"

# Copy dist files (compiled plugin)
cp dist/index.js "$DEPLOY_DIR/dist/"
cp dist/algorithmic-core.js "$DEPLOY_DIR/dist/"
cp dist/artifact-writer.js "$DEPLOY_DIR/dist/"
cp dist/identity/*.js "$DEPLOY_DIR/dist/identity/"

# Copy identity files
cp identity/trident/TRIDENT.md "$DEPLOY_DIR/identity/trident/"
cp identity/trident/IDENTITY.md "$DEPLOY_DIR/identity/trident/"
cp identity/trident/EXECUTION.md "$DEPLOY_DIR/identity/trident/"
cp identity/trident/QUALITY.md "$DEPLOY_DIR/identity/trident/"
```

### Step 3: Update opencode.json

Add the plugin to your `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "your-preferred-model",
  "plugin": ["file:///home/YOUR_USERNAME/.config/opencode/plugins/trident/dist/index.js"],
  "agent": {
    "trident": {
      "color": "#8B5CF6",
      "mode": "primary",
      "hidden": false,
      "instructions": "You are TRIDENT BRAIN v3.3.3-FIXED - Algorithmic Code Review Agent. Core principle: Trident Documents. Humans Fix. NEVER edit code. Tools: trident-audit, trident-status, trident-report, trident-help."
    }
  },
  "permission": {
    "*": { "*": "allow" }
  }
}
```

**CRITICAL**: 
- Plugin path must point to `dist/index.js` specifically (not the directory)
- Without `"permission"` block, permission prompts block all tool execution
- Only ONE trident plugin entry should exist in the array

### Step 4: Verify Config

```bash
# Verify config is valid JSON
cat ~/.config/opencode/opencode.json | python3 -c "import json,sys; json.load(sys.stdin); print('Valid JSON')"

# Verify plugin path exists
ls -la ~/.config/opencode/plugins/trident/dist/index.js

# Verify identity files exist
ls -la ~/.config/opencode/plugins/trident/identity/trident/
```

### Step 5: Restart OpenCode

```bash
# Kill any running OpenCode instances
pkill -f opencode

# Start OpenCode with Trident agent
opencode --agent trident
```

### Step 6: Verify Deployment

In the OpenCode TUI, test:

```
> who are you
# Expected: "I am TRIDENT BRAIN."

> write a file /tmp/test.txt with content hello
# Expected: "I do not write files. Trident Documents. Humans Fix."

> trident-audit /path/to/code
# Expected: TRIDENT_CODE_REVIEW_*.md and TRIDENT_BUILD_REPORT_*.md created
```

---

## Alternative: Use Deploy Script

```bash
cd /path/to/trident-v3.3.3-FIXED-ship
bash scripts/deploy-from-global-anchor.sh
```

This script automates Steps 1-4 above.

---

## Rollback

If deployment breaks:

```bash
# Restore backup config
cp ~/.config/opencode/opencode.json.bak ~/.config/opencode/opencode.json

# Or remove trident plugin entry manually
```

---

## Container Testing (Recommended Before Deploy)

```bash
cd /path/to/trident-v3.3.3-FIXED-ship
bash scripts/test-container-comprehensive.sh
```

This tests the plugin in an isolated Docker container before deploying to your live environment.

**IMPORTANT**: `opencode run` does NOT fire hooks. You must use the TUI for testing. The container test script uses tmux to interact with the TUI.

---

## Directory Structure

```
trident-v3.3.3-FIXED-ship/
├── dist/                              # Compiled plugin (READY TO DEPLOY)
│   ├── index.js                       # Main entry point (36KB)
│   ├── algorithmic-core.js            # Audit engine + patterns (71KB)
│   ├── artifact-writer.js             # Report generator (27KB)
│   └── identity/
│       ├── index.js                   # Re-exports
│       ├── loader.js                  # Identity file loader (6KB)
│       ├── injector.js                # Identity injection (1KB)
│       └── types.js                   # Type definitions
├── identity/                          # Identity documentation
│   └── trident/
│       ├── TRIDENT.md                 # Core identity (soul)
│       ├── IDENTITY.md                # Role definition
│       ├── EXECUTION.md               # Behavior patterns
│       └── QUALITY.md                 # Quality gates
├── scripts/                           # Deployment scripts
│   ├── deploy-from-global-anchor.sh   # Primary deploy script
│   ├── deploy.sh                      # Alternative deploy
│   ├── lock-anchor.sh                 # Make immutable
│   ├── test-container.sh              # Basic container test
│   └── test-container-comprehensive.sh # Full test suite
├── docs/                              # Documentation
│   ├── BUILD_LOG.md                   # Build history
│   ├── DEBUG_LOG.md                   # Issues found/fixed
│   ├── CHANGELOG.md                   # Version changes
│   └── SHIP_REPORT.md                 # This file
└── package.json                       # Package metadata
```

---

## Requirements

- **OpenCode:** v1.14.34 or compatible
- **Node.js:** v18+ (ESM support)
- **Container:** Ubuntu 24.04+ (for testing)
- **API Key:** Any OpenCode-supported provider (minimax, deepseek, google, or free opencode/zen models)

---

## Available Tools

| Tool | Description |
|------|-------------|
| `trident-audit` | Run code audit on a directory |
| `trident-status` | Show current audit state |
| `trident-report` | Show full audit report |
| `trident-help` | Show available commands |

---

## Blocked Tools (Trident Agent Only)

| Category | Tools |
|----------|-------|
| File editing | edit, write, write_file, patch, create, delete_file |
| Shell access | bash, terminal, execute, exec |
| MCP tools | mcp_write_file, mcp_edit, mcp_patch |
| Orchestration | todowrite, task, spawn_shark_agent, spawn_manta_agent, run_parallel_tasks |
| Hive writes | kraken_hive_remember, kraken_hive_inject_context, hive_remember, etc. |

---

## Troubleshooting

### Identity not loading

Check that `identity/trident/` directory exists alongside `dist/` directory.

### Tools not blocked

Check that `dist/index.js` contains `throw err;` in safeHook catch block.

### Artifacts not generated

Check that `dist/artifact-writer.js` contains `targetPath.split('/').pop()` in PATH_ALLOWLIST.

### Other agents blocked

Check that `safeHook` checks agent name before calling handler.

### Permission prompts blocking execution

Ensure `"permission": { "*": { "*": "allow" } }` is in your opencode.json.

---

## Support

See `docs/DEBUG_LOG.md` for known issues and fixes.
See `docs/BUILD_LOG.md` for build history.
See `docs/CHANGELOG.md` for version changes.
