# Trident Brain v3.3.3-FIXED — Algorithmic Code Review Plugin

**Version:** 3.3.3-FIXED
**Status:** SHIP READY
**Date:** 2026-05-28

---

## What Is This?

Trident Brain is a self-aware algorithmic code review plugin for OpenCode. It is a **documentation-only** agent that scans code for problems and generates detailed audit reports — but never edits code itself.

> **"Trident Documents. Humans Fix."**

### What It Does

1. **Blocks write/edit/bash tools** — Enforces documentation-only mode at the hook level
2. **Knows its identity** — Responds "I am TRIDENT BRAIN" on first message with CRITICAL identity binding
3. **Generates audit artifacts** — Two reports per audit (Code Review + Build Report)
4. **Agent-scoped** — Does NOT block or corrupt other agents (safeHook + per-session agent tracking)

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
```

Then in the TUI:
```
> who are you
→ I am TRIDENT BRAIN, an Algorithmic Code Review Agent. Trident Documents. Humans Fix.

> trident-audit /path/to/code
→ Generates two reports in TRIDENT_REPORTS/

> trident-status
→ Shows current audit state

> trident-report
→ Shows full detailed findings
```

---

## Directory Structure

```
Code Review Mode/
├── dist/                              # Compiled plugin
│   ├── index.js                       # Main entry (safeHook, identity, blocking)
│   ├── algorithmic-core.js            # Audit engine (50+ regex patterns)
│   ├── artifact-writer.js             # Report generator (WHY/HOW explanations)
│   └── identity/
│       ├── loader.js                  # Identity file loader (import.meta.url)
│       ├── injector.js                # Shark-style CRITICAL identity binding
│       └── types.js                   # Type definitions
├── identity/trident/                  # Identity documentation
│   ├── TRIDENT.md                     # Core identity + directives + mantra
│   ├── IDENTITY.md                    # Role + expertise + working style
│   ├── EXECUTION.md                   # Scanning patterns + NEVER do
│   └── QUALITY.md                     # Quality gates + theatrical patterns
├── scripts/                           # Deployment & testing
│   ├── deploy-from-global-anchor.sh   # Primary deploy script
│   ├── deploy.sh                      # Alternative deploy
│   ├── lock-anchor.sh                 # Make immutable
│   └── test-container.sh              # Container test script
├── docs/                              # Documentation
│   ├── BUILD_LOG.md                   # Build history
│   ├── DEBUG_LOG.md                   # Issues found/fixed
│   ├── CHANGELOG.md                   # Version changes
│   └── SHIP_REPORT.md                 # Deployment instructions
└── README.md                          # This file
```

---

## Architecture

### Hook Registration

| Hook | Purpose | Blocking |
|------|---------|----------|
| `tool.execute.before` | Block write/edit/bash for Trident agent | Yes |
| `chat.message` | Register session agent mapping | No |
| `experimental.chat.system.transform` | Inject identity into system prompt | No |
| `experimental.chat.messages.transform` | Detect agent from messages (sandbox) | No |
| `event` | Session lifecycle tracking | No |

### Cross-Agent Sandbox

Trident uses a per-session agent tracking system to prevent identity leakage to other agents:

1. **`messages.transform`** — Finds the LAST user message with agent info → calls `setCurrentAgent(agent, sessionID)`
2. **`system.transform`** — Checks `getCurrentAgent(sessionID)` → only injects identity if agent IS Trident
3. **`chat.message`** — Belt-and-suspenders safety via `setCurrentAgent`
4. **`event`** — Additional safety net for session lifecycle events

When the user tab-toggles from Trident to another agent (Build, Plan, etc.), the new session is detected and Trident identity is NOT injected.

### Identity System

Identity is loaded from four files in `identity/trident/`:

| File | Content | Feeds Into |
|------|---------|-----------|
| **TRIDENT.md** | Core identity, directives, mantra | CORE DIRECTIVES + CORE MANTRA sections |
| **IDENTITY.md** | Role, expertise, working style | Role title + EXPERTISE section |
| **EXECUTION.md** | Scanning patterns, NEVER do rules | NEVER DO section |
| **QUALITY.md** | Quality gates, theatrical patterns | Anti-theatrical protocol |

The `IdentityLoader` parses all four files into a `bundle` object. `formatIdentityHeader(bundle)` builds a **CRITICAL box-character identity binding** (matching Shark v4.9's proven architecture) that overrides OpenCode's default "You are opencode" system prompt.

The injected identity header uses Unicode box-drawing characters (┏━┓, ┃, ┗━┛) with CRITICAL/NON-NEGOTIABLE language — the model treats it as a SYSTEM directive.

---

## Audit Output

Artifacts are written to:
```
/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/TRIDENT_REPORTS/
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

## Blocked Tools

Trident is documentation-only. These tools are blocked at the hook level:

| Category | Tools |
|----------|-------|
| File editing | edit, write, write_file, patch, create, delete_file |
| Shell access | bash, terminal, execute, exec |
| MCP tools | mcp_write_file, mcp_edit, mcp_patch |
| Orchestration | todowrite, task, spawn_shark_agent, spawn_manta_agent |
| Hive writes | kraken_hive_remember, hive_remember |

---

## Available Tools

| Tool | Description |
|------|-------------|
| `trident-audit` | Run algorithmic code audit on a directory |
| `trident-status` | Show current audit state and findings summary |
| `trident-report` | Show the full audit report with detailed findings |
| `trident-help` | Show available commands and pattern categories |

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
      "hidden": false
    }
  },
  "permission": {
    "*": { "*": "allow" }
  }
}
```

**CRITICAL:**
- Plugin path must point to `dist/index.js` specifically (not the directory)
- Without `"permission"` block, permission prompts block all tool execution

---

## Container Testing

Test in an isolated Docker container before deploying:

```bash
bash scripts/test-container.sh
```

**IMPORTANT:** `opencode run` does NOT fire hooks. You must use the TUI for testing.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Identity not loading | Check `identity/trident/` directory exists alongside `dist/` |
| Tools not blocked | Check `dist/index.js` has `throw err;` in safeHook catch |
| Artifacts not generated | Check `TRIDENT_REPORTS/` directory exists |
| Other agents blocked | Check `safeHook` checks agent name before handler |
| Permission prompts | Add `"permission": { "*": { "*": "allow" } }` to config |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.3.3-FIXED | 2026-05-28 | Fixed tool blocking, Shark-style CRITICAL identity, cross-agent sandbox, artifact naming |
| 3.3.2 | 2026-05-12 | Added safeHook for agent isolation |
| 3.3.1 | 2026-05-07 | Added session-based hook scoping |
| 3.3.0 | 2026-05-01 | Identity awareness, hook-based blocking |

---

## Documentation

- [BUILD_LOG.md](docs/BUILD_LOG.md) — Full build history across 5 sessions
- [DEBUG_LOG.md](docs/DEBUG_LOG.md) — 12 issues identified and resolved
- [CHANGELOG.md](docs/CHANGELOG.md) — Version changes
- [SHIP_REPORT.md](docs/SHIP_REPORT.md) — Deployment instructions

---

*Trident Brain v3.3.3-FIXED — "Trident Documents. Humans Fix."*
