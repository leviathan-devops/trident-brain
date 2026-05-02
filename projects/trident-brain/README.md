# TRIDENT BRAIN

Multi-mode algorithmic intelligence system for OpenCode.
Four reasoning modes: Context Synthesis, Deep Planning, Problem Solving, and Code Review.

---

## MODES

| # | Mode | Type | Location | Status |
|---|------|------|----------|--------|
| 1 | Context Synthesis | Intelligence | `src/modes/context-synthesis/` | Stable |
| 2 | Deep Planning | Intelligence | `src/modes/planning/` | Stable |
| 3 | Problem Solving | Intelligence | `src/modes/problem-solving/` | Stable |
| 4 | **Code Review** | Execution | `code-review-mode/` | v3.2 SHIP READY |

---

## CODE REVIEW MODE v3.2

Self-contained OpenCode plugin with automatic artifact generation.
Trident audits code, generates findings with WHY/HOW structure, and NEVER edits.

### Quick Deploy
```bash
cd code-review-mode/v3.2
./scripts/deploy.sh
```

### Tools
| Tool | Description |
|------|-------------|
| `trident-audit [target]` | Run code audit, generates TRIDENT_CODE_REVIEW_*.md artifact |
| `trident-status` | Show current audit state and findings |
| `trident-report` | Show full detailed findings report |
| `trident-help` | Show available commands |

### Core Principle
> **"Trident Documents. Humans Fix."**

### Structure
```
code-review-mode/
├── overview/               # Architecture & specification (7-layer audit design)
│   ├── ARCHITECTURE/       # System architecture docs
│   ├── META/              # Audit logs & design reasoning
│   ├── SPEC/              # Full Trident specification
│   ├── TEMPLATES/         # Layer templates (L0-L6)
│   └── 00_INDEX.md        # Mode index
└── v3.2/                  # Working plugin implementation
    ├── src/               # TypeScript source (3 files)
    ├── dist/              # Built output (self-contained bundle)
    ├── scripts/           # build.sh, deploy.sh, test.sh
    └── docs/              # Build reports, debug logs, ship docs
```

---

## OTHER MODES

See `src/modes/` for Context Synthesis, Deep Planning, and Problem Solving implementations.

---

*Trident Brain — Documents, Never Edits*
