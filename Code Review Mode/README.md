# Trident Brain v3.3.3-FIXED — Code Review Mode

**Version:** 3.3.3-FIXED
**Status:** SHIP READY
**Date:** 2026-05-28

---

## What Is This?

Trident Brain is a self-aware algorithmic code review plugin for OpenCode. It:

1. **Blocks write/edit/bash tools** for the Trident agent (documentation-only enforcement)
2. **Does NOT block other agents** (agent-scoped via safeHook)
3. **Knows its own identity** (responds "I am TRIDENT BRAIN" on first message)
4. **Generates audit artifacts** (TRIDENT_CODE_REVIEW_*.md and TRIDENT_BUILD_REPORT_*.md)

### Core Principle

> "Trident Documents. Humans Fix."

Trident is a documentation-only agent. It scans code for:
- Theatrical patterns (mocks, stubs, placeholders)
- Security vulnerabilities (SQL injection, XSS, command injection)
- Code quality issues (complexity, resource leaks, empty catch blocks)
- Architectural problems (import cycles, global state pollution)

It generates detailed reports with WHY explanations and HOW to fix, but never edits code itself.

---

## Quick Start

### Deploy

```bash
cd "Code Review Mode"
bash scripts/deploy-from-global-anchor.sh
# Restart OpenCode for changes to take effect
```

### Use

```bash
opencode --agent trident

> who are you
# → "I am TRIDENT BRAIN."

> trident-audit /path/to/code
# → Generates TRIDENT_CODE_REVIEW_TRIDENT_CODEBASE_ANALYSIS_YYYY-MM-DD.md
# → Generates TRIDENT_BUILD_REPORT_TRIDENT_CODEBASE_ANALYSIS_YYYY-MM-DD.md

> trident-status
# → Shows current audit state

> trident-report
# → Shows full detailed report
```

---

## Architecture

### Plugin Structure

```
dist/
├── index.js                    # Main entry (safeHook, identity injection, tool blocking)
├── algorithmic-core.js         # Audit engine (50+ regex patterns, 7 scan layers)
├── artifact-writer.js          # Report generator (WHY/HOW explanations)
└── identity/
    ├── index.js                # Re-exports
    ├── loader.js               # Identity file loader (import.meta.url based)
    ├── injector.js             # Identity injection into system prompt
    └── types.js                # Type definitions

identity/trident/
├── TRIDENT.md                  # Core identity (soul)
├── IDENTITY.md                 # Role definition
├── EXECUTION.md                # Behavior patterns
└── QUALITY.md                  # Quality gates
```

### Hook Registration

| Hook | Purpose | Blocking |
|------|---------|----------|
| `tool.execute.before` | Block write/edit/bash for Trident agent | Yes |
| `chat.message` | Register session agent mapping | No |
| `experimental.chat.system.transform` | Inject identity into system prompt | No |

### Agent Scoping

The `safeHook` wrapper ensures hooks only fire for the Trident agent:

1. Checks `input.session.agentName` (direct)
2. Falls back to `input.agent` (alternative field)
3. Falls back to `sessionAgentMap.get(sessionID)` (cross-hook)

Non-trident agents are never blocked.

### Identity Injection

Identity is injected via `experimental.chat.system.transform`:

1. Loads identity files from `identity/trident/`
2. Formats concise header: `[TRIDENT BRAIN ACTIVE] You are the Trident Brain code review agent...`
3. Pushes to end of system prompt array (preserves default OpenCode prompt)
4. Model responds "I am TRIDENT BRAIN" on first message

### Tool Blocking

When Trident agent tries to use a blocked tool:

1. `tool.execute.before` hook fires
2. `safeHook` checks agent identity
3. Handler checks tool against `BLOCKED_TOOLS_FOR_TRIDENT` list
4. Throws `Error` with block reason
5. OpenCode catches error and blocks tool execution
6. Model sees block message and adapts response

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

## Available Tools

| Tool | Description |
|------|-------------|
| `trident-audit` | Run code audit on a directory |
| `trident-status` | Show current audit state |
| `trident-report` | Show full audit report |
| `trident-help` | Show available commands |

---

## Audit Output

Artifacts are written to:
```
/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/
├── TRIDENT_CODE_REVIEW_TRIDENT_CODEBASE_ANALYSIS_YYYY-MM-DD.md
└── TRIDENT_BUILD_REPORT_TRIDENT_CODEBASE_ANALYSIS_YYYY-MM-DD.md
```

### Code Review (Layer 1)

- Security vulnerabilities (SQL injection, XSS, command injection)
- Theatrical patterns (mocks, stubs, simulated execution)
- Code quality issues (complexity, resource leaks, empty catch blocks)

### Build Report (Layer 2)

- Logic errors and race conditions
- Architecture anti-patterns
- Error handling gaps
- API contract violations

---

## Container Testing

Test in an isolated Docker container before deploying:

```bash
bash scripts/test-container-comprehensive.sh
```

**IMPORTANT:** `opencode run` does NOT fire hooks. You must use the TUI for testing. The container test script uses tmux to interact with the TUI.

---

## Requirements

- **OpenCode:** v1.14.34 or compatible
- **Container:** Ubuntu 24.04+ (for testing)
- **API Key:** Any OpenCode-supported provider

---

## Configuration

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["file:///path/to/Code Review Mode/dist/index.js"],
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

**CRITICAL:**
- Plugin path must point to `dist/index.js` specifically
- Without `"permission"` block, permission prompts block all tool execution

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Identity not loading | Check `identity/trident/` directory exists alongside `dist/` |
| Tools not blocked | Check `dist/index.js` has `throw err;` in safeHook catch |
| Artifacts not generated | Check `TRIDENT_ARTIFACT_DIR` path is correct |
| Other agents blocked | Check `safeHook` checks agent name before handler |
| Permission prompts | Add `"permission": { "*": { "*": "allow" } }` to config |

---

## Documentation

- [BUILD_LOG.md](docs/BUILD_LOG.md) — Build history
- [DEBUG_LOG.md](docs/DEBUG_LOG.md) — Issues found and fixed
- [CHANGELOG.md](docs/CHANGELOG.md) — Version changes
- [SHIP_REPORT.md](docs/SHIP_REPORT.md) — Deployment instructions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.3.3-FIXED | 2026-05-28 | Fixed tool blocking, identity injection, agent scoping |
| 3.3.2 | 2026-05-12 | Added safeHook for agent isolation |
| 3.3.1 | 2026-05-07 | Added session-based hook scoping |
| 3.3.0 | 2026-05-01 | Identity awareness, hook-based blocking |

---

## License

MIT

---

*Trident Brain v3.3.3-FIXED — "Trident Documents. Humans Fix."*
