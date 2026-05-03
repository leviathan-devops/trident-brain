# TRIDENT BRAIN

Multi-mode algorithmic intelligence system for OpenCode.
Four reasoning modes: Context Synthesis, Deep Planning, Problem Solving, Code Review.

---

## MODES

| # | Mode | Architecture Spec | Implementation |
|---|------|-------------------|----------------|
| 1 | Context Synthesis | `Context Synthesis Mode/` | `src/modes/context-synthesis/` |
| 2 | Deep Planning | `Deep Planning Mode/` | `src/modes/planning/` |
| 3 | Problem Solving | `Problem Solving Mode/` | `src/modes/problem-solving/` |
| 4 | Code Review | `Code Review Mode/` | `src/modes/code-review/` |

---

## CODE REVIEW MODE v3.2

Self-contained OpenCode plugin with automatic artifact generation.

### Quick Deploy
```bash
cd "Code Review Mode/v3.2"
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
Code Review Mode/
├── 00_INDEX.md              # Mode index
├── ARCHITECTURE/            # System architecture
├── META/                    # Audit logs & design reasoning
├── SPEC/                    # Full specification
├── TEMPLATES/               # L0-L6 layer templates
└── v3.2/                    # Self-contained plugin
    ├── src/                 # TypeScript source
    ├── dist/                # Built output
    ├── scripts/             # build.sh, deploy.sh, test.sh
    ├── docs/                # Reports & logs
    └── INDEX.md             # Reload anchor index
```

---

*Trident Brain — Documents, Never Edits*
