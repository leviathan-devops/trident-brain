# Code Review Mode — Architecture (V2.0)

**Version:** 2.0.0  
**Layer:** Trident Brain Mode  
**Updated:** 2026-04-13 with forensic evidence from 100+ debug logs

---

## Design Philosophy

Code Review Mode V2.0 follows the same mechanical gate enforcement as other Trident Brain modes but specializes in **comprehensive failure detection** — not just code patterns, but behavioral derailment and integration failures that cause catastrophic system failures.

**Critical Insight from Forensic Analysis:**
- The original 5-layer spec missed **37 derailment events** that achieved **100% success rate**
- Simulated execution (100ms timeout) wasn't caught until catastrophic failure
- Hook spillover wasn't detected until agent isolation broke completely
- Integration failures (cluster-not-found, missing dependencies) rendered entire systems inert

**V2.0 Design Goal:** Catch failures BEFORE they become catastrophic, not after.

---

## Trigger

```
/trident review <target> [--depth=7] [--category=all]
```

**Depth options:**
- `--depth=5` (legacy compatibility - stops at Quality Analysis)
- `--depth=6` (adds Integration Verification)
- `--depth=7` (full analysis including Behavioral Detection)
- `--depth=all` or no depth flag = full 7-layer analysis

---

## Gate Chain

```
plan → behavioral → structure → execution → security → architecture → quality → integration → delivery
```

**Gate Progression:**
- Cannot advance past any gate without satisfying its requirements
- BLOCKER findings at any layer halt the entire review
- Each layer produces evidence that feeds the next

---

## V2.0 Layer Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CODE REVIEW MODE V2.0 — 7 LAYER PIPELINE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 0: BEHAVIORAL DETECTION (NEW — Critical Addition)                     │
│  ─────────────────────────────────────────────────────                        │
│  Question: "What behaviors could derail analysis?"                           │
│                                                                              │
│  Detects derailment patterns BEFORE they affect code review:                 │
│  ├── HostFallbackDetector — "host testing already proves it works"           │
│  ├── MockStubSuggestionDetector — "use a mock approach"                       │
│  ├── ModelUsageDetector — Banned models (GLM, DeepSeek fallback)             │
│  ├── ScopeCreepDetector — hermes_remember for unrelated projects            │
│  └── EvidenceCompletenessDetector — "Already Verified" without proof        │
│                                                                              │
│  WHY FIRST: Derailment caused 100% failure rate in Shark v4.8.2 test        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 1: STRUCTURE MAP                                                      │
│  ────────────────────                                                        │
│  Question: "What is the architecture?"                                        │
│                                                                              │
│  Outputs:                                                                    │
│  ├── Complete file tree with size/bundle info                               │
│  ├── Dependency graph (import/require relationships)                         │
│  ├── Version diff vs previous version (bundle size, line counts)            │
│  └── Entry points and module boundaries                                       │
│                                                                              │
│  Detectors:                                                                  │
│  ├── BundleSizeDetector — Size diff >50% = WARNING, >80% = BLOCKER          │
│  ├── DependencyGraphDetector — >10 imports = WARNING                         │
│  ├── EntryPointDetector — Missing main/package.json = WARNING                │
│  └── FileSizeAnomalyDetector — >1000 lines = WARNING, >2000 = BLOCKER       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 2: EXECUTION VERIFICATION (Critical — Catches Simulated Execution)     │
│  ─────────────────────────────────────                                       │
│  Question: "Does the code actually execute?"                                  │
│                                                                              │
│  Outputs:                                                                    │
│  ├── Execution flow map                                                       │
│  ├── Placeholder detection results                                           │
│  ├── Simulated execution patterns found                                      │
│  └── Dead code identification                                                 │
│                                                                              │
│  Detectors:                                                                  │
│  ├── SimulatedExecutionDetector — `setTimeout.*resolve.*success` = BLOCKER    │
│  ├── PlaceholderCommentDetector — `In v1.*simulate`, `would actually` = BLOCKER│
│  ├── StubFunctionDetector — `return new Promise.*setTimeout` = BLOCKER       │
│  └── DeadCodeDetector — Never imported, never called = SUGGESTION             │
│                                                                              │
│  KEY: This layer catches the V2.0 catastrophic failure pattern              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 3: SECURITY ANALYSIS                                                  │
│  ─────────────────────                                                        │
│  Question: "What vulnerabilities exist?"                                      │
│                                                                              │
│  Outputs:                                                                    │
│  ├── Vulnerability list with severity                                        │
│  ├── Injection vectors mapped                                               │
│  └── Secret exposures flagged                                                │
│                                                                              │
│  Detectors:                                                                  │
│  ├── SQLInjectionDetector — String concat in SQL = BLOCKER                   │
│  ├── XSSDetector — innerHTML, dangerouslySetInnerHTML = BLOCKER             │
│  ├── CommandInjectionDetector — exec/spawn with shell = BLOCKER             │
│  ├── EvalUsageDetector — eval(), Function() = BLOCKER                        │
│  ├── HardcodedSecretDetector — API keys, passwords = BLOCKER                │
│  └── PathTraversalDetector — User input in paths = WARNING                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 4: ARCHITECTURE ANALYSIS (Expanded — Cross-Plugin Coverage)           │
│  ─────────────────────────────────                                          │
│  Question: "How do components interact? Are they isolated?"                  │
│                                                                              │
│  Outputs:                                                                    │
│  ├── Coupling map                                                            │
│  ├── Hook spillover risks                                                     │
│  ├── Cross-plugin pollution detection                                         │
│  └── Import cycles                                                            │
│                                                                              │
│  Detectors:                                                                  │
│  ├── ImportCycleDetector — A→B→A imports = BLOCKER                           │
│  ├── HookSpilloverDetector — Missing `isXxxAgent()` checks = BLOCKER         │
│  ├── AgentFieldDetector — Hook input without `agent` = BLOCKER               │
│  ├── GlobalStatePollutionDetector — Module-level `_currentPhase` = WARNING    │
│  ├── ConsoleSpilloverDetector — console.* causing UI spillover = WARNING      │
│  └── ContextLeakDetector — Cross-plugin context bleed = WARNING              │
│                                                                              │
│  NEW: AgentFieldDetector catches Manta V4.5 failure (agent field missing)    │
│  NEW: ConsoleSpilloverDetector catches Hermes UI pollution                    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 5: QUALITY ANALYSIS (Expanded — Compaction Integrity)                  │
│  ─────────────────────                                                        │
│  Question: "What are the resource and quality implications?"                  │
│                                                                              │
│  Outputs:                                                                    │
│  ├── Memory leak risks                                                        │
│  ├── Silent failure patterns                                                  │
│  ├── Token bloat sources                                                      │
│  └── Compaction integrity issues                                              │
│                                                                              │
│  Detectors:                                                                  │
│  ├── EmptyCatchBlockDetector — `catch {}` without logging = WARNING           │
│  ├── SilentFailureDetector — Returns normally on error = WARNING              │
│  ├── MemoryLeakDetector — Global state, uncleaned listeners = WARNING         │
│  ├── TokenBloatDetector — Large tool outputs = WARNING                       │
│  ├── CompactionContentInjectionDetector — Hook adds during compaction = BLOCKER│
│  └── ContextDuringCompactionDetector — Context injection = WARNING           │
│                                                                              │
│  NEW: CompactionContentInjectionDetector catches Shark's worst offender       │
│       (hook adding content during compaction instead of pruning)              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 6: INTEGRATION VERIFICATION (NEW — Catches System-Wide Failures)        │
│  ─────────────────────────────────                                          │
│  Question: "Does the plugin actually load? Do integrations work?"            │
│                                                                              │
│  Outputs:                                                                    │
│  ├── Plugin load status                                                       │
│  ├── Dependency validation                                                    │
│  ├── Cluster existence verification                                           │
│  └── Directory path validation                                               │
│                                                                              │
│  Detectors:                                                                  │
│  ├── PluginLoadDetector — Fails to load silently = BLOCKER                    │
│  ├── DependencyDetector — Missing @opencode-ai/plugin = BLOCKER              │
│  ├── ClusterExistenceDetector — "cluster-not-found" = BLOCKER                 │
│  ├── ShimImplementationDetector — "requires shim" = WARNING                  │
│  └── WrongDirectoryDetector — `.Spider` instead of `.hermes` = WARNING        │
│                                                                              │
│  WHY LAST: Integration failures prevent the entire system from running       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## V2.0 Failure Category Coverage

| Category | Source Document | Detection |
|----------|------------------|-----------|
| **SIMULATED EXECUTION** | CATASTROPHIC_FAILURE_REPORT.md | Layer 2: SimulatedExecutionDetector |
| **HOOK SPILLOVER** | manta-hook-bypass-critical-audit.md | Layer 4: HookSpilloverDetector, AgentFieldDetector |
| **AGENT ISOLATION FAILURE** | manta-hook-bypass-critical-audit.md | Layer 4: AgentFieldDetector |
| **VERIFICATION THEATER** | DERAILMENT_FORENSIC_ANALYSIS.md | Layer 0: EvidenceCompletenessDetector |
| **SILENT ERROR SWALLOWING** | shark-agent-memory-audit-2026-04-09.md | Layer 5: EmptyCatchBlockDetector, SilentFailureDetector |
| **RESOURCE LEAKS** | shark-agent-memory-audit-2026-04-09.md | Layer 5: MemoryLeakDetector |
| **TOKEN BLOAT** | token-bloat-forensic-report.md | Layer 5: TokenBloatDetector |
| **COMPACTION INTEGRITY** | shark-agent-memory-audit-2026-04-09.md | Layer 5: CompactionContentInjectionDetector |
| **FIREWALL BYPASS** | FIREWALL_AUDIT.md | Layer 4: HookSpilloverDetector |
| **CROSS-PLUGIN POLLUTION** | hermes-agent-fix-prompt.md | Layer 4: ConsoleSpilloverDetector, ContextLeakDetector |
| **WRONG DIRECTORY PATHS** | hermes-agent-fix-prompt.md | Layer 6: WrongDirectoryDetector |
| **MISSING PREFIX SUPPORT** | hermes-agent-fix-prompt.md | Layer 4: PrefixSupportDetector |
| **DERAILMENT (37 events)** | DERAILMENT_FORENSIC_ANALYSIS.md | Layer 0: 5 behavioral detectors |
| **INTEGRATION FAILURES** | BROKEN_PLUGINS_AUDIT_20260405.md | Layer 6: PluginLoadDetector, DependencyDetector |
| **CLUSTER NOT FOUND** | KRAKEN_PARALLEL_EXECUTION_FAILURE.md | Layer 6: ClusterExistenceDetector |
| **BUNDLE SIZE ANOMALY** | CATASTROPHIC_FAILURE_REPORT.md | Layer 1: BundleSizeDetector |

---

## Layer Dependencies

```
Layer 0 (Behavioral) → must pass before ANY code analysis
Layer 1 (Structure) → requires Layer 0 pass
Layer 2 (Execution) → requires Layer 1 complete
Layer 3 (Security) → requires Layer 2 complete
Layer 4 (Architecture) → requires Layer 3 complete
Layer 5 (Quality) → requires Layer 4 complete
Layer 6 (Integration) → requires Layer 5 complete
```

**Critical Path:** If Layer 0 blocks (derailment detected), review terminates immediately without wasting time on code that will be misused.

---

## Output Format

### Executive Summary (Always Generated)
```
# Code Review — V2.0 Findings

## Summary
- Total Findings: N
- Blockers: N (review halted)
- Warnings: N
- Suggestions: N

## Critical Blockers
[BLOCKER details with file:line]

## Layer Results
[Each layer with findings]
```

### Finding Object
```typescript
interface Finding {
  severity: 'BLOCKER' | 'WARNING' | 'SUGGESTION';
  category: string;
  layer: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  file: string;
  line?: number;
  pattern: string;
  evidence: string;
  remediation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceDocument?: string;  // V2.0 addition - forensic source
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-13 | Initial spec - 5 layers, 25 detectors |
| 2.0.0 | 2026-04-13 | Overhauled with forensic evidence - 7 layers, 35+ detectors |

**V2.0 Changes:**
- Added Layer 0: Behavioral Detection (5 detectors)
- Added Layer 6: Integration Verification (5 detectors)
- Expanded Layer 4: Architecture Analysis (added AgentField, ConsoleSpillover, PrefixSupport)
- Expanded Layer 5: Quality Analysis (added CompactionContentInjection, ContextDuringCompaction)
- Added `sourceDocument` to Finding interface
- Added version diff analysis to Layer 1