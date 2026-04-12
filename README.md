# TRIDENT BRAIN

**Status:** ⚠️ ARCHITECTURE SPECIFICATION ONLY — NOT YET IMPLEMENTED  
**Version:** 1.0.0  
**Created:** 2026-04-12

---

## ⚠️ IMPORTANT: This is an Architecture Spec, Not Code

**This repository contains architecture specifications and design documents only.**  
There is no `src/` or `dist/` folder in the root because this has not been built yet.

The purpose of this repo is to document the reasoning architecture that can be used to build agents with deep, structured thinking patterns.

**Implementation code** (when built) will be in the `projects/trident-brain/` directory.

---

## What is Trident Brain?

Trident Brain is a **multi-mode reasoning architecture** for OpenCode agents. It provides specialized reasoning processes for different thinking tasks, each with mechanical gate enforcement to prevent shallow reasoning and derailment.

**Core Philosophy:**
- **Mechanical Gates** - Evidence-based transitions (can't advance without proof)
- **Structural Enforcement** - Requirements that force deep thinking
- **Injectable Output** - Artifacts designed for other agents to consume
- **Layered Depth** - Each layer goes deeper into the problem

---

## Modes Implemented

| Mode | Purpose | Layers | Status |
|------|---------|--------|--------|
| **Deep Planning Mode** | Generate complete project plans from first principles | 3 | Architecture Complete |
| **Problem Solving Mode** | Evidence-based debugging and root cause analysis | 6 | Architecture Complete |
| **Context Synthesis Mode** | Dynamically synthesize context into <2k token injection | 4 | Architecture Complete |

---

## Quick Start

### For Architecture Review
Start with this README, then explore each mode's folder.

### For Implementation
See `projects/trident-brain/` for TypeScript implementation (when built).

---

## Directory Structure

```
trident-brain/
├── Deep Planning Mode/           # Project planning mode
│   ├── 00_INDEX.md             # Mode entry point
│   ├── ARCHITECTURE/           # Full architecture
│   ├── SPEC/                   # Technical specification
│   ├── META/                  # Design reasoning + audit
│   └── TEMPLATES/              # Layer enforcement templates
│
├── Problem Solving Mode/         # Debugging/RCA mode
│   ├── 00_INDEX.md
│   ├── ARCHITECTURE/
│   ├── SPEC/
│   ├── META/
│   └── TEMPLATES/              # 6 layer templates
│
├── Context Synthesis Mode/       # Context injection mode
│   ├── 00_INDEX.md
│   ├── ARCHITECTURE/
│   ├── SPEC/
│   ├── META/
│   └── TEMPLATES/              # 4 layer templates
│
└── 00_INDEX.md                  # Main index
```

---

## Mode Details

### 1. Deep Planning Mode

**Purpose:** Generate complete, injectable project plans from first principles

**Layers:**
1. **Initial Plan** — "What is this really?" → First principles, surface understanding
2. **Detailed Workflow** — "How does it decompose?" → Components, sequences, risks
3. **Context Library** — "Can I explain to another agent?" → Architecture, interfaces, mental model

**Output:** Self-contained context library another agent can read and execute

---

### 2. Problem Solving Mode

**Purpose:** Evidence-based debugging and root cause analysis

**Layers:**
1. **Assumption Statement** — "What do I assume?"
2. **Action with Prediction** — "What action + expected output?"
3. **Observation & Evidence** — "What actually happened?"
4. **Gap Analysis & Adjustment** — "What does the gap tell me?"
5. **Meta-Cognitive Reflection** — "What should I have done differently?"
6. **Verification & Confirmation** — "How do I confirm fix works?"

**Key Feature:** Prevents 14 categories of derailment

**Derived from:** GOLD STANDARD docs analysis (AGENT_BUILD_LOGIC_CHAIN.md, SHARK_AGENT_1ST_BUILD_REPORT.md, SPACE_INVADERS_BUILD_LOG.md)

---

### 3. Context Synthesis Mode

**Purpose:** Dynamically synthesize T1/T2/T3/T4 context into <2k token injection stream

**Layers:**
1. **Context Collection** — "What context exists?"
2. **Relevance Scoring** — "What matters most?"
3. **Compression** — "How to compress?"
4. **Injection Format** — "How to inject?"

**Inspired by:** Kraken V2.0 compaction-manager.ts, Hermes Memory Overhaul L0/L1/L2

---

## How It Works

### Mechanical Gate Enforcement

Each mode uses **mechanical gates** - you cannot advance to the next layer without meeting structural requirements:

```
Layer N: Complete requirements → Gate Check → Layer N+1
```

### Example: Problem Solving Mode Flow

```
PROBLEM
    │
    ▼
Layer 1: Assumption Statement
├── Must state explicit assumption
├── Must document reasoning chain
├── Must define success criteria
└── Cannot advance without these
    │
    ▼
Layer 2: Action with Prediction
├── Must specify exact command
├── Must document expected output
├── Must capture environment state
└── Cannot advance without these
    │
    ▼
... and so on for all 6 layers
```

---

## Building (When Ready)

To implement this as an OpenCode plugin:

```bash
cd projects/trident-brain
npm install
npm run build
```

---

## Comparison to Other Systems

| Feature | Manta Agent | Kraken V2.0 | Trident Brain |
|---------|-------------|---------------|----------------|
| Mode Types | Single (Build Brain) | Multi-brain orchestrator | Multi-mode reasoning |
| Gate System | PLAN/BUILD/TEST | PLAN/BUILD/TEST/VERIFY/AUDIT/DELIVERY | Per-mode layers |
| Context | Direct execution | Compaction management | Mode-specific synthesis |
| Output | Implementation | Orchestration | Thinking artifacts |

---

## Notes

- **Architecture only** — This is specification, not implementation
- **For OpenCode** — Designed as OpenCode plugin
- **Mechanical enforcement** — Key differentiator from other agent architectures
- **Injectable artifacts** — Designed for cross-agent communication

---

## License

Internal use — Architecture specification from Leviathan's OpenCode workspace

---

*Trident Brain — Modular reasoning architecture with mechanical gate enforcement*
*Last updated: 2026-04-12*