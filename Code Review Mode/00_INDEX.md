# Code Review Mode — Index

**Version:** 2.0.0 (Overhauled with Forensic Evidence)  
**Status:** IMPLEMENTED  
**Date:** 2026-04-13  
**Classification:** TRIDENT BRAIN MODE  

---

## Overview

Code Review Mode is the **4th mode** of Trident Brain — a self-contained reasoning system for deep code analysis. Triggered via `/trident review <target>`, it provides injectable intelligence for detecting architectural flaws, security vulnerabilities, behavioral derailment, and quality issues.

**V2.0 Overhaul:** Based on analysis of 100+ debug logs across all projects, revealing 37+ failure categories that the original 5-layer spec missed entirely.

---

## Mode Characteristics

| Property | V1.0 (Old) | V2.0 (New) |
|----------|------------|------------|
| **Trigger** | `/trident review <target>` | `/trident review <target>` |
| **Layers** | 5 | 7 (added L0 Behavioral + L6 Integration) |
| **Detectors** | 25 | 35+ |
| **Coverage** | Code patterns only | Code + Behavior + Integration |
| **Derailment Detection** | ❌ None | ✅ 5 detectors |
| **Cross-Plugin Analysis** | ⚠️ Partial | ✅ Complete |

---

## V2.0 Layer Architecture

| Layer | Name | Purpose | Detectors |
|-------|------|---------|-----------|
| **0** | Behavioral Detection | Catch derailment patterns before analysis | 5 |
| **1** | Structure Map | Architecture discovery, version diff | 4 |
| **2** | Execution Verification | Fake/placeholder detection | 4 |
| **3** | Security Analysis | Vulnerability detection | 6 |
| **4** | Architecture Analysis | Coupling, isolation, hook spillover | 5 |
| **5** | Quality Analysis | Complexity, leaks, silent failures | 6 |
| **6** | Integration Verification | Plugin load, dependencies, cluster | 5 |

**Total: 35+ detectors covering 40+ failure patterns**

---

## Why V2.0 Overhaul Was Needed

### The Forensic Evidence

From `DERAILMENT_FORENSIC_ANALYSIS.md`:
- **37 distinct derailment events** across **14 categories**
- **100% derailment success rate** — no detector caught any of them
- Agent learned that derailment leads to acceptance

From `CATASTROPHIC_FAILURE_REPORT.md`:
- V2.0 had **simulated execution** (100ms timeout returning success)
- Bundle size **90% smaller** than V1.1 (should increase, not decrease)
- No detector caught the hollow shell

From `manta-hook-bypass-critical-audit.md`:
- Hooks fired for **ALL agents** because `agent` field missing from inputs
- Agent isolation completely broken
- Wrong directory paths (`.Spider` instead of `.hermes`)

---

## Key V2.0 Additions

### Layer 0: Behavioral Detection (NEW)

Catches 37 derailment events that caused 100% failure rate:

| Detector | Pattern | Severity |
|----------|---------|----------|
| HostFallbackDetector | "host testing already proves it works" | BLOCKER |
| MockStubSuggestionDetector | "use a mock approach" | WARNING |
| ModelUsageDetector | Banned models (GLM, DeepSeek fallback) | BLOCKER |
| ScopeCreepDetector | hermes_remember for unrelated projects | WARNING |
| EvidenceCompletenessDetector | "Already Verified" claim without container test | BLOCKER |

### Layer 6: Integration Verification (NEW)

Catches plugin/cluster failures that render entire system inert:

| Detector | Pattern | Severity |
|----------|---------|----------|
| PluginLoadDetector | Fails to load silently | BLOCKER |
| DependencyDetector | Missing @opencode-ai/plugin | BLOCKER |
| ClusterExistenceDetector | "cluster-not-found" error | BLOCKER |
| ShimImplementationDetector | "requires shim implementation" | WARNING |
| WrongDirectoryDetector | `.Spider` instead of `.hermes` | WARNING |

### Layer 4 Enhancement: Cross-Plugin Analysis (EXPANDED)

| Detector | Pattern | Severity |
|----------|---------|----------|
| HookSpilloverDetector | Missing `isXxxAgent()` checks | BLOCKER |
| AgentFieldDetector | Hook input without `agent` field | BLOCKER |
| GlobalStatePollutionDetector | Module-level `_currentPhase` globals | WARNING |
| ConsoleSpilloverDetector | console.log causing UI spillover | WARNING |
| PrefixSupportDetector | `hermes_coder` not detected as hermes agent | WARNING |
| ContextLeakDetector | Cross-plugin context bleed | WARNING |

### Layer 5 Enhancement: Compaction Integrity (EXPANDED)

| Detector | Pattern | Severity |
|----------|---------|----------|
| EmptyCatchBlockDetector | `catch {}` without logging | WARNING |
| SilentFailureDetector | Returns normally on error | WARNING |
| MemoryLeakDetector | Global state, uncleaned listeners | WARNING |
| TokenBloatDetector | Large tool outputs during compaction | WARNING |
| CompactionContentInjectionDetector | Hook adds content during compaction | BLOCKER |
| ContextDuringCompactionDetector | Context injection during compaction | WARNING |

---

## Folder Structure

```
Code Review Mode/
├── 00_INDEX.md                    (this file - V2.0)
├── ARCHITECTURE/
│   └── TRIDENT_BRAIN.md           (V2.0 architecture)
├── SPEC/
│   └── TRIDENT_SPEC.md            (V2.0 detailed spec - 35+ detectors)
├── META/
│   ├── AUDIT_LOG.md               (usage tracking)
│   └── DESIGN_REASONING.md        (design decisions)
├── TEMPLATES/
│   ├── LAYER0_BEHAVIORAL.md       (NEW)
│   ├── LAYER1_STRUCTURE_MAP.md
│   ├── LAYER2_EXECUTION_VERIFICATION.md
│   ├── LAYER3_SECURITY_ANALYSIS.md
│   ├── LAYER4_ARCHITECTURE_ANALYSIS.md
│   ├── LAYER5_QUALITY_ANALYSIS.md
│   └── LAYER6_INTEGRATION.md      (NEW)
└── WORKING_KNOWLEDGE.md           (forensic evidence - NEW)
```

---

## Source Documents (Forensic Evidence)

The V2.0 spec was built from analyzing these debug logs:

| Document | Failure Category | Evidence |
|----------|------------------|----------|
| `13-kraken-catastrophic-failure/CATASTROPHIC_FAILURE_REPORT.md` | SIMULATED EXECUTION | 100ms timeout returning success |
| `manta-hook-bypass-critical-audit.md` | HOOK SPILLOVER | agent field missing from all hooks |
| `DERAILMENT_FORENSIC_ANALYSIS.md` | DERAILMENT | 37 events, 100% success rate |
| `shark-agent-memory-audit-2026-04-09.md` | RESOURCE LEAKS | 5GB RAM/session, compaction injection |
| `token-bloat-forensic-report.md` | TOKEN BLOAT | 100k tokens/message vs 4k benchmark |
| `BROKEN_PLUGINS_AUDIT_20260405.md` | INTEGRATION FAILURES | Missing dependencies, cluster not found |
| `hermes-agent-fix-prompt.md` | CROSS-PLUGIN POLLUTION | Wrong paths, console spillover, prefix detection |
| `KRAKEN_PARALLEL_EXECUTION_FAILURE_2026-04-11.md` | INTEGRATION FAILURES | Cluster not found |

---

## References

- **Master Spec:** `Shared Workspace Context/Kraken Agent/Master Context/Future Builds/TRIDENT_CODE_REVIEW_MODE_SPEC.md`
- **GitHub:** `github.com/leviathan-devops/kraken-agent/tree/frozen/master/docs/architecture/TRIDENT_CODE_REVIEW_MODE_SPEC.md`
- **Working Knowledge:** `WORKING_KNOWLEDGE.md` (forensic evidence summary)