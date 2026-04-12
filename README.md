# TRIDENT BRAIN

**Status:** ✅ BUILT — Implementation Complete  
**Version:** 1.0.0  
**Created:** 2026-04-12

---

## What is Trident Brain?

Trident Brain is a **multi-mode reasoning architecture** for OpenCode agents. It provides specialized reasoning processes for different thinking tasks, with mechanical gate enforcement to prevent shallow reasoning and derailment.

**This repo contains BOTH the architecture specification AND the working TypeScript implementation.**

---

## What's Built

| Component | Status | Location |
|-----------|--------|----------|
| **Architecture Spec** | ✅ Complete | `Deep Planning Mode/`, `Problem Solving Mode/`, `Context Synthesis Mode/` |
| **TypeScript Source** | ✅ Built | `src/` |
| **Compiled JavaScript** | ✅ Built | `dist/` |
| **Build System** | ✅ Passes | `npm run build` |

---

## Project Structure

```
trident-brain/
├── src/                              # TypeScript source
│   ├── index.ts                      # Main plugin entry
│   ├── modes/
│   │   ├── planning/                # Deep Planning Mode (3 layers)
│   │   ├── problem-solving/        # Problem Solving Mode (6 layers)
│   │   └── context-synthesis/      # Context Synthesis Mode (4 layers)
│   └── shared/
│       ├── mode-coordinator.ts      # Mode routing & validation
│       ├── layer-templates.ts       # Markdown templates per layer
│       ├── artifact-generator.ts    # Generates injectable outputs
│       └── state-persistence.ts     # Iteration tracking
│
├── dist/                             # Compiled JavaScript
│   ├── index.js
│   ├── modes/
│   └── shared/
│
├── Deep Planning Mode/               # Architecture spec (layer templates)
├── Problem Solving Mode/            # Architecture spec (layer templates)
├── Context Synthesis Mode/          # Architecture spec (layer templates)
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Modes

### Deep Planning Mode (3 layers)
Generate complete project plans from first principles

| Layer | Thinking | Enforces |
|-------|----------|----------|
| 1 | "What is this really?" | First principles, surface understanding |
| 2 | "How does it decompose?" | Components, sequences, risks |
| 3 | "Can I explain to another agent?" | Architecture, interfaces, mental model |

### Problem Solving Mode (6 layers)
Evidence-based debugging and root cause analysis

| Layer | Thinking | Enforces |
|-------|----------|----------|
| 1 | "What do I assume?" | Explicit assumption + reasoning |
| 2 | "What action + expected?" | Exact command + expected output |
| 3 | "What actually happened?" | Raw evidence, logs, comparison |
| 4 | "What does gap tell me?" | Updated hypothesis |
| 5 | "What should I have done?" | Pattern extraction |
| 6 | "How confirm fix works?" | Target environment test |

### Context Synthesis Mode (4 layers)
Dynamically synthesize context into <2k token injection stream

| Layer | Thinking | Enforces |
|-------|----------|----------|
| 1 | "What context exists?" | Complete collection of sources |
| 2 | "What matters most?" | Relevance scoring (urgency × importance) |
| 3 | "How to compress?" | Synthesis into <2k tokens |
| 4 | "How to inject?" | T0-ready format output |

---

## Building

```bash
npm install
npm run build    # Compiles src/ → dist/
```

**Build verified:** ✅ Passes

---

## Design Sources

- **Problem Solving Mode** — Reverse-engineered from GOLD STANDARD docs:
  - `AGENT_BUILD_LOGIC_CHAIN.md` — Mattermost slash command debugging
  - `SHARK_AGENT_1ST_BUILD_REPORT.md` — Space Invaders build
  - `SPACE_INVADERS_BUILD_LOG.md` — 13-agent parallel execution

- **Context Synthesis Mode** — Inspired by:
  - Kraken V2.0 `compaction-manager.ts` — Token budget management
  - Hermes Memory Overhaul — L0/L1/L2 tier structure

---

## Key Features

- **Mechanical Gates** — Can't advance without meeting structural requirements
- **Structural Enforcement** — Requirements that force deep thinking
- **Injectable Output** — Artifacts designed for other agents to consume
- **Iteration Loops** — V1.0 → V1.1 → V1.2 for deepening
- **Anti-Derailment** — Prevents 14 categories of failure (Host Fallback, Success Claims Without Proof, Mock/Stub, etc.)

---

## Comparison to Other Systems

| Feature | Manta Agent | Kraken V2.0 | Trident Brain |
|---------|-------------|-------------|--------------|
| Mode Types | Single | Multi-brain | Multi-mode reasoning |
| Gate System | PLAN/BUILD/TEST | 6 gates | Per-mode layers |
| Context | Direct execution | Compaction | Mode-specific synthesis |
| Output | Implementation | Orchestration | Thinking artifacts |

---

## Next Steps (To Use in OpenCode)

1. Copy `dist/` to OpenCode plugins directory
2. Add to `opencode.json` plugins array
3. Use `/trident planning` or `/trident problem-solving` to activate modes

---

## License

Internal use — Leviathan's OpenCode workspace

---

*Trident Brain — Multi-mode reasoning architecture with mechanical gate enforcement*
*Last updated: 2026-04-12*