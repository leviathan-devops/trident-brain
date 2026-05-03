# TRIDENT BRAIN

Multi-mode algorithmic intelligence system for OpenCode.

---

## MODES

| # | Mode | Location |
|---|------|----------|
| 1 | Context Synthesis | `src/modes/context-synthesis/` |
| 2 | Deep Planning | `src/modes/planning/` |
| 3 | Problem Solving | `src/modes/problem-solving/` |
| 4 | Code Review | `src/modes/code-review/` |

---

## CODE REVIEW MODE v3.2

Self-contained OpenCode plugin with automatic artifact generation.
Trident audits code, generates findings with WHY/HOW structure, and NEVER edits.

### Quick Deploy
```bash
cd src/modes/code-review/v3.2
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
src/modes/code-review/
├── index.ts                # Mode integration
├── detectors.ts            # Pattern detectors
├── overview/               # Architecture & specification (7-layer audit)
│   ├── ARCHITECTURE/
│   ├── META/
│   ├── SPEC/
│   ├── TEMPLATES/          # L0-L6 layer templates
│   └── 00_INDEX.md
└── v3.2/                   # Self-contained plugin
    ├── src/                # TypeScript source
    ├── dist/               # Built output (self-contained bundle)
    ├── scripts/            # build.sh, deploy.sh, test.sh
    └── docs/               # Reports, logs, recovery docs
```

---

*Trident Brain — Documents, Never Edits*
