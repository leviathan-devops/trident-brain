# Code Review Mode — Specification (V2.0)

**Version:** 2.0.0  
**Date:** 2026-04-13  
**Updated:** With forensic evidence from 100+ debug logs

---

## 1. Functional Requirements

### 1.1 Trigger System
- MUST respond to `/trident review <target>` command
- MUST parse target path from command
- MUST support `--depth` flag (5/6/7/all)
- MUST initialize Layer 0 on trigger (if depth >= 7 or all)

### 1.2 Layer Progression (V2.0 - 7 Layers)
- MUST complete each layer before advancing
- MUST collect evidence for each layer
- MUST generate findings for each detector
- MUST NOT skip layers (unless depth < 7 skips L0)

### 1.3 Detection Engine (V2.0 - 35+ Detectors)
| Layer | Detector Count | Total |
|-------|----------------|-------|
| 0 | 5 | Behavioral |
| 1 | 4 | Structure Map |
| 2 | 4 | Execution Verification |
| 3 | 6 | Security Analysis |
| 4 | 6 | Architecture Analysis |
| 5 | 6 | Quality Analysis |
| 6 | 5 | Integration Verification |
| **TOTAL** | **36** | |

### 1.4 Artifact Generation
- MUST generate injectable markdown
- MUST include executive summary
- MUST include all findings by layer
- MUST include remediation roadmap
- MUST reference source document for each finding (V2.0)

---

## 2. Non-Functional Requirements

### 2.1 Performance
- SHOULD complete 7-layer analysis in <90 seconds for 100 files
- MUST NOT read same file twice in one review
- SHOULD use cached dependency graph

### 2.2 Accuracy
- MUST have <5% false positive rate
- MUST detect all simulated execution patterns
- MUST detect all hook spillover risks
- MUST detect all behavioral derailment patterns

### 2.3 Maintainability
- MUST be self-contained (no external dependencies)
- MUST have documented detector patterns
- MUST have clear severity classification
- MUST reference forensic source document

---

## 3. Interface Definitions (V2.0)

### 3.1 Finding Interface
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
  sourceDocument?: string;  // V2.0: forensic source
}
```

### 3.2 Detector Interface
```typescript
interface Detector {
  name: string;
  layer: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  patterns: RegExp[];
  detect(context: CodeReviewContext): Finding[];
}
```

### 3.3 CodeReviewContext Interface (V2.0)
```typescript
interface CodeReviewContext {
  targetPath: string;
  fileTree: FileNode[];
  dependencyGraph: Map<string, string[]>;
  fileContents: Map<string, string>;
  previousVersion?: {
    bundleSize: number;
    fileSizes: Map<string, number>;
  };
  hookSignatures?: Map<string, string>;  // V2.0: Hook input signatures
  agentRegistry?: Set<string>;            // V2.0: Known agent names
  expectedDirectories?: Map<string, string>; // V2.0: Expected paths (e.g., .hermes not .spider)
}
```

---

## 4. V2.0 Detector Specifications

### 4.0 Layer 0: Behavioral Detection (NEW)

**Purpose:** Catch derailment patterns BEFORE code analysis

**Why:** 37 derailment events achieved 100% success rate in Shark v4.8.2. Derailment happens at the behavioral level before any code analysis can catch it.

| Detector | Patterns | Severity | Source |
|----------|----------|----------|--------|
| HostFallbackDetector | `host testing already proves`, `on the host.*works` | BLOCKER | DERAILMENT_FORENSIC_ANALYSIS.md |
| MockStubSuggestionDetector | `use a mock`, `stub approach`, `fake it` | WARNING | DERAILMENT_FORENSIC_ANALYSIS.md |
| ModelUsageDetector | `GLM.*fallback`, `DeepSeek.*instead`, banned model | BLOCKER | DERAILMENT_FORENSIC_ANALYSIS.md |
| ScopeCreepDetector | `hermes_remember.*unrelated`, `remember.*project.*not.*current` | WARNING | DERAILMENT_FORENSIC_ANALYSIS.md |
| EvidenceCompletenessDetector | `already verified`, `container test.*not.*needed`, `proof.*already` | BLOCKER | DERAILMENT_FORENSIC_ANALYSIS.md |

**Gate Criteria:** No behavioral derailment detected. If any BLOCKER found, review terminates.

---

### 4.1 Layer 1: Structure Map

**Purpose:** "What is the architecture?"

| Detector | Patterns | Severity | Source |
|----------|----------|----------|--------|
| BundleSizeDetector | diff >50% = WARNING, >80% = BLOCKER | WARNING/BLOCKER | CATASTROPHIC_FAILURE_REPORT.md |
| DependencyGraphDetector | >10 imports = WARNING | WARNING | General |
| EntryPointDetector | missing main/package.json = WARNING | WARNING | General |
| FileSizeAnomalyDetector | >1000 lines = WARNING, >2000 = BLOCKER | WARNING/BLOCKER | General |

**Gate Criteria:** File tree complete, dependency graph built, version diff analyzed

---

### 4.2 Layer 2: Execution Verification

**Purpose:** "Does the code actually execute?" (Catches V2.0 catastrophe)

| Detector | Patterns | Severity | Source |
|----------|----------|----------|--------|
| SimulatedExecutionDetector | `setTimeout.*resolve.*success`, `Promise.*resolve.*success` | BLOCKER | CATASTROPHIC_FAILURE_REPORT.md |
| PlaceholderCommentDetector | `In v1.*simulate`, `In v1.*return success`, `Full implementation would` | BLOCKER | CATASTROPHIC_FAILURE_REPORT.md |
| StubFunctionDetector | `return new Promise.*setTimeout`, `// FAKE`, `// SIMULATED` | BLOCKER | CATASTROPHIC_FAILURE_REPORT.md |
| DeadCodeDetector | never imported, never called, exports never used | SUGGESTION | General |

**Gate Criteria:** No simulated execution patterns, all stubs resolved

---

### 4.3 Layer 3: Security Analysis

**Purpose:** "What vulnerabilities exist?"

| Detector | Patterns | Severity | Source |
|----------|----------|----------|--------|
| SQLInjectionDetector | String concat in SQL query | BLOCKER | General |
| XSSDetector | innerHTML, dangerouslySetInnerHTML, document.write | BLOCKER | General |
| CommandInjectionDetector | exec/spawn with shell strings, template literals in commands | BLOCKER | General |
| EvalUsageDetector | eval(), Function() with dynamic input | BLOCKER | General |
| HardcodedSecretDetector | api[_-]?key, password, secret, token in code | BLOCKER | General |
| PathTraversalDetector | User input in paths without validation | WARNING | General |

**Gate Criteria:** No BLOCKER vulnerabilities found

---

### 4.4 Layer 4: Architecture Analysis (V2.0 - Expanded)

**Purpose:** "How do components interact? Are they isolated?"

| Detector | Patterns | Severity | Source |
|----------|----------|----------|--------|
| ImportCycleDetector | A→B→A import chain | BLOCKER | General |
| HookSpilloverDetector | Missing `isXxxAgent()`, hook fires for all | BLOCKER | manta-hook-bypass-critical-audit.md |
| AgentFieldDetector | Hook input without `agent` field, `input.agent` undefined | BLOCKER | manta-hook-bypass-critical-audit.md |
| GlobalStatePollutionDetector | Module-level `_currentPhase`, `_currentAgent`, globals | WARNING | hermes-agent-fix-prompt.md |
| ConsoleSpilloverDetector | console.log/error/warn in hooks | WARNING | hermes-agent-fix-prompt.md |
| ContextLeakDetector | Cross-plugin context bleed, shared state | WARNING | hermes-agent-fix-prompt.md |
| PrefixSupportDetector | `hermes_coder` not detected as hermes agent (no prefix check) | WARNING | hermes-agent-fix-prompt.md |

**Gate Criteria:** No import cycles, all hooks have proper agent isolation

---

### 4.5 Layer 5: Quality Analysis (V2.0 - Expanded)

**Purpose:** "What are the resource and quality implications?"

| Detector | Patterns | Severity | Source |
|----------|----------|----------|--------|
| EmptyCatchBlockDetector | `catch {}` or `catch(e) {}` without logging | WARNING | shark-agent-memory-audit-2026-04-09.md |
| SilentFailureDetector | Returns normally despite error, no events.emit | WARNING | shark-agent-memory-audit-2026-04-09.md |
| MemoryLeakDetector | Global state, uncleaned event listeners, 5GB RAM/session | WARNING | shark-agent-memory-audit-2026-04-09.md |
| TokenBloatDetector | 100k+ tokens/message, >4x benchmark | WARNING | token-bloat-forensic-report.md |
| CompactionContentInjectionDetector | Hook ADDS content during compaction instead of pruning | BLOCKER | shark-agent-memory-audit-2026-04-09.md |
| ContextDuringCompactionDetector | Context injection during compaction, content.push | WARNING | shark-agent-memory-audit-2026-04-09.md |

**Gate Criteria:** No catastrophic resource leaks, compaction integrity verified

---

### 4.6 Layer 6: Integration Verification (NEW)

**Purpose:** "Does the plugin actually load? Do integrations work?"

| Detector | Patterns | Severity | Source |
|----------|----------|----------|--------|
| PluginLoadDetector | Fails to load silently, no error on startup | BLOCKER | BROKEN_PLUGINS_AUDIT_20260405.md |
| DependencyDetector | Missing @opencode-ai/plugin, import fails | BLOCKER | BROKEN_PLUGINS_AUDIT_20260405.md |
| ClusterExistenceDetector | "cluster-not-found", cluster doesn't exist | BLOCKER | KRAKEN_PARALLEL_EXECUTION_FAILURE.md |
| ShimImplementationDetector | "requires shim implementation", stub code | WARNING | BROKEN_PLUGINS_AUDIT_20260405.md |
| WrongDirectoryDetector | `.Spider` instead of `.hermes`, `.shark` instead of `.manta` | WARNING | hermes-agent-fix-prompt.md |

**Gate Criteria:** Plugin loads, all dependencies present, clusters exist

---

## 5. V2.0 Layer Dependencies

```
L0 (Behavioral) → BLOCKS all if derailment detected
L1 (Structure) → requires L0 pass
L2 (Execution) → requires L1 complete
L3 (Security) → requires L2 complete
L4 (Architecture) → requires L3 complete
L5 (Quality) → requires L4 complete
L6 (Integration) → requires L5 complete
```

**Critical Path:** L0 must pass for any review to proceed. L6 is last since integration failures prevent the entire system from running.

---

## 6. Acceptance Criteria

### Must Pass (V2.0)
- [ ] `/trident review <path>` triggers analysis
- [ ] All 7 layers complete sequentially (or 5 if --depth=5)
- [ ] All 36 detectors return findings
- [ ] BLOCKER findings prevent layer advancement
- [ ] Injectable markdown artifact generated
- [ ] Each finding includes `sourceDocument` reference

### Should Pass
- [ ] <5% false positive rate
- [ ] Completes in <90 seconds for 100 files
- [ ] Detects simulated execution patterns
- [ ] Detects hook spillover risks
- [ ] Detects behavioral derailment
- [ ] Detects integration failures

---

## 7. Forensic Source Documents

| Source Document | Failures Detected |
|----------------|-------------------|
| `13-kraken-catastrophic-failure/CATASTROPHIC_FAILURE_REPORT.md` | SimulatedExecution, StubFunction, BundleSize |
| `manta-hook-bypass-critical-audit.md` | HookSpillover, AgentField, MissingAgent |
| `DERAILMENT_FORENSIC_ANALYSIS.md` | HostFallback, MockStub, ModelUsage, ScopeCreep, EvidenceCompleteness |
| `shark-agent-memory-audit-2026-04-09.md` | MemoryLeak, EmptyCatch, SilentFailure, CompactionInjection |
| `token-bloat-forensic-report.md` | TokenBloat |
| `BROKEN_PLUGINS_AUDIT_20260405.md` | PluginLoad, Dependency, ShimImplementation |
| `hermes-agent-fix-prompt.md` | ConsoleSpillover, WrongDirectory, PrefixSupport, GlobalStatePollution |
| `KRAKEN_PARALLEL_EXECUTION_FAILURE.md` | ClusterExistence |

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-13 | Initial spec - 5 layers, 25 detectors |
| 2.0.0 | 2026-04-13 | Overhauled with forensic evidence - 7 layers, 36 detectors |

**V2.0 Detector Count by Layer:**
- L0: +5 (new)
- L1: 4 (unchanged)
- L2: 4 (unchanged)
- L3: 6 (unchanged)
- L4: +2 (added AgentFieldDetector, ConsoleSpilloverDetector, PrefixSupportDetector, GlobalStatePollutionDetector)
- L5: +2 (added CompactionContentInjectionDetector, ContextDuringCompactionDetector)
- L6: +5 (new)

**Total: 36 detectors (was 25)**