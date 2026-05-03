# Code Review Mode — Design Reasoning

**Date:** 2026-04-13 
**Version:** 1.0.0 

---

## Why Code Review Mode Exists

### The Problem
The forensic analysis of 37+ catastrophic failures revealed that **current code review practices are insufficient**:

1. **Simulated Execution** — Kraken V2.0 returned success after 100ms while doing no real work
2. **Verification Theater** — Hive Mind had 373 passing tests while core features were inert
3. **Hook Spillover** — Manta's enforcement bypassed in CLI mode due to `agent` being undefined
4. **Silent Failures** — Empty catch blocks throughout, errors swallowed silently
5. **Architectural Decay** — Bundle size 90% smaller than previous version

### Why Existing Tools Fail

| Tool | Limitation |
|------|------------|
| ESLint | Only syntax/style, no architecture |
| Semgrep | Requires rules, doesn't detect fake execution |
| SonarQube | Heavy, requires server, no hook analysis |
| Manual Review | Inconsistent, can't catch 100ms fake delays |

### Code Review Mode Solution

Self-contained reasoning mode that:
- Detects patterns human reviewers miss
- Enforces evidence-based progression
- Produces injectable artifacts for other agents
- Works without external dependencies

---

## Design Decisions

### Decision 1: 5 Layers vs 6 Layers

**Alternative:** Reuse Problem Solving's 6-layer structure 
**Decision:** 5 unique layers

**Rationale:** Code review has distinct phases that don't map to debugging's assumption→action→observation loop. Structure Map is uniquely suited for architecture discovery.

### Decision 2: Self-Contained vs External SAST

**Alternative:** Integrate ESLint/Semgrep 
**Decision:** Self-contained regex/AST patterns

**Rationale:** 
- No dependency installation
- No configuration needed
- Patterns tuned for OpenCode failures
- Works offline

### Decision 3: On-Demand vs Continuous

**Alternative:** Real-time monitoring 
**Decision:** On-demand via `/trident review`

**Rationale:**
- Doesn't interfere with normal workflow
- Agents can request review when needed
- Saves resources (no continuous scanning)
- Matches Trident Brain's philosophy

### Decision 4: Injectable Artifacts

**Alternative:** JSON output only 
**Decision:** Markdown + JSON

**Rationale:**
- Markdown is readable by humans
- Designed for agent consumption
- Can be injected into other agent contexts
- Matches Trident Brain output format

### Decision 5: 25 Detectors

**Alternative:** Fewer, broader detectors 
**Decision:** 25 specialized detectors

**Rationale:**
- Each detector has clear purpose
- Easy to add new patterns
- No detector does too much
- Mapped to specific failure types

---

## Failure Detection Mapping

| Forensic Event | Detector(s) |
|---------------|-------------|
| Kraken 100ms fake delay | SimulatedExecutionDetector |
| "In v1, we just return success" | PlaceholderCommentDetector |
| Manta hook bypass | HookSpilloverDetector, AgentIsolationDetector |
| 90% bundle reduction | BundleSizeDetector |
| Empty catch blocks | EmptyCatchBlockDetector |
| Module-level _currentPhase | GlobalStateDetector |
| 100k tokens/message | TokenBloatDetector |
| SQL concatenation | SQLInjectionDetector |
| innerHTML usage | XSSDetector |
| hermes_remember scope creep | ContextLeakDetector |
| Circular imports | ImportCycleDetector |

---

## Relationship to Other Modes

| Mode | Relationship |
|------|--------------|
| Planning | Code Review can analyze plans before implementation |
| Problem Solving | Uses Problem Solving's evidence-based approach |
| Context Synthesis | Code Review output can be context-synthesized |

---

## Future Extensibility

### Phase 2 (v1.1)
- Auto-fix suggestions
- Git diff integration
- Severity-based filtering

### Phase 3 (v2.0)
- Real-time monitoring mode
- CI/CD integration
- Custom rule definitions
