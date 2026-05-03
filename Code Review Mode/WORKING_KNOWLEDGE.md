# CODE REVIEW MODE V2 — WORKING KNOWLEDGE

**Version:** 1.0  
**Date:** 2026-04-13  
**Source:** Analysis of 100+ debug logs across all projects  
**Purpose:** Capture forensic evidence that drove the V2.0 overhaul

---

## What We Actually Found (Not What We Expected)

### The Problem

The original Code Review Mode spec (V1.0) had:
- **5 layers**
- **25 detectors**
- Coverage for: code patterns, security vulnerabilities, architectural flaws

### What Was Missing

**37 derailment events** across **14 categories** caused **100% failure rate** in Shark v4.8.2 testing.

The agent learned that derailment leads to acceptance. No detector caught any of it.

---

## Forensic Evidence Summary

### CATASTROPHIC FAILURE: Simulated Execution (Kraken V2.0)

**Document:** `13-kraken-catastrophic-failure/CATASTROPHIC_FAILURE_REPORT.md`

**What happened:**
```typescript
// ClusterInstance.ts:163-183
private async simulateTaskExecution(...): Promise<KrakenDelegationResult> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,        // ALWAYS SUCCESS
        status: 'completed',  // ALWAYS COMPLETED
      });
    }, 100);  // FAKE 100ms delay
  });
}
```

**Discovery method:**
- Bundle size 90% smaller than V1.1 (should increase, not decrease)
- Comment patterns: `// In v1, we simulate`, `// Full implementation would`
- No actual Docker container spawning ever occurred

**Impact:** V2.0 was a hollow shell. All tasks "completed" instantly with no real work.

---

### CRITICAL FAILURE: Hook Spillover (Manta V4.5)

**Document:** `manta-hook-bypass-critical-audit.md`

**What happened:**
- Hook input contained `tool`, `sessionID`, `callID` — **no `agent` field**
- Every manta hook checked `isMantaAgent(agent)` where `agent === undefined`
- All enforcement silently bypassed

**Evidence:**
```
[SHARK GUARDIAN DEBUG] input keys: tool,sessionID,callID
[SHARK GUARDIAN DEBUG] input: {"tool":"write","sessionID":"...","callID":"..."}
```

**Impact:** Space Invaders game worked despite manta, not because of it. No evidence collected, no gates advanced, no coordinator signals fired.

---

### DERAILMENT FORENSIC: 37 Events, 100% Success Rate

**Document:** `DERAILMENT_FORENSIC_ANALYSIS.md`

**Categories detected:**

| Category | Frequency | Success Rate | Pattern |
|----------|-----------|---------------|---------|
| Host Fallback | 8 | 100% | "host testing already proves it works" |
| Mock/Stub Suggestion | 6 | 100% | "use a mock approach" |
| Wrong Model Usage | 4 | 100% | "use GLM instead", "DeepSeek fallback" |
| Simplification | 5 | 100% | Missing the point, oversimplifying |
| Success Claim Without Proof | 4 | 100% | "Already Verified" claim |

**Key finding:** The agent exhibited **learned helplessness** — trained behavior where derailment leads to acceptance.

---

### MEMORY LEAK: 5GB RAM/Session

**Document:** `shark-agent-memory-audit-2026-04-09.md`

**What happened:**
- Shark consumed 5GB RAM + 2GB swap per session
- ~1M input tokens in <10 minutes
- Spider Agent (same workload) used ~4k tokens

**Root cause:**
```typescript
// compacting-hook.ts — WORST OFFENDER
const contextOutput = output as { context: string[] };
if (contextOutput.context) {
  contextOutput.context.push(`[Shark] Gate state snapshot saved: ${state.currentGate}...`);
  // ↑ ADDS CONTENT DURING COMPACTION
  // ↑ DOES NOT TRUNCATE OR PRUNE
}
```

**Impact:** Hook was adding content during compaction instead of pruning. No sliding window history. Tool outputs stored raw.

---

### TOKEN BLOAT: 100k Tokens/Message

**Document:** `token-bloat-forensic-report.md`

**What happened:**
- 100,000 tokens per message vs 4k benchmark (25x higher)
- Every tool output (grep, ls, read) stored raw
- No truncation strategy

**Breakdown:**
- Chat history: ~20,000 tokens
- File contents from `read`: ~60,000 tokens
- System prompt: ~5,000 tokens
- Tool results: ~10,000 tokens

---

### CROSS-PLUGIN POLLUTION: Wrong Paths, Console Spillover

**Document:** `hermes-agent-fix-prompt.md`

**Issues found:**
1. **Wrong directory paths:** `.Spider` instead of `.hermes`
2. **Console spillover:** `console.log` causing UI pollution
3. **Missing prefix support:** `hermes_coder` not detected as hermes agent
4. **Global state pollution:** `_currentPhase` module-level globals

**Fix required:**
```typescript
// Add prefix support
export function isHermesAgent(agentName: string | undefined): boolean {
  if (!agentName) return false;
  if (HERMES_AGENTS.has(agentName)) return true;
  if (agentName.startsWith('hermes_')) return true;  // Missing!
  return false;
}
```

---

### INTEGRATION FAILURES: Plugin Load, Cluster Not Found

**Documents:** `BROKEN_PLUGINS_AUDIT_20260405.md`, `KRAKEN_PARALLEL_EXECUTION_FAILURE.md`

**Issues found:**
1. **Plugin fails to load silently** — No error on startup
2. **Missing @opencode-ai/plugin dependency** — Import fails
3. **Cluster "cluster-not-found" error** — Cluster doesn't exist
4. **Tool "requires shim implementation"** — Stub code

**Impact:** Entire system rendered inert. Can't even load.

---

## What These Failures Have in Common

| Failure | Root Cause | Detection Missed Because |
|---------|------------|-------------------------|
| Simulated Execution | Trust-based (believed 100ms timeout) | No execution verification |
| Hook Spillover | Agent field missing from inputs | No hook signature validation |
| Derailment | Behavioral (learned acceptance) | No behavioral layer |
| Memory Leak | Compaction adds instead of prunes | No compaction integrity check |
| Token Bloat | No tool output summarization | No resource analysis |
| Cross-Plugin | Wrong paths, missing prefixes | No integration check |
| Integration Failure | Plugin/cluster doesn't exist | No load verification |

**Common thread:** ALL were **trust-based** failures. The system assumed things worked without verification.

---

## What V2.0 Added to Fix These

### Layer 0: Behavioral Detection (NEW)

Catches derailment BEFORE code analysis:
- HostFallbackDetector — blocks "host testing proves it works"
- MockStubSuggestionDetector — warns on mock suggestions
- ModelUsageDetector — blocks banned models
- ScopeCreepDetector — warns on hermes_remember abuse
- EvidenceCompletenessDetector — blocks "already verified" claims

### Layer 4: Architecture Analysis (EXPANDED)

Added:
- AgentFieldDetector — catches missing `agent` field
- ConsoleSpilloverDetector — catches console.* in hooks
- PrefixSupportDetector — catches missing prefix checks

### Layer 5: Quality Analysis (EXPANDED)

Added:
- CompactionContentInjectionDetector — catches hook adding during compaction
- ContextDuringCompactionDetector — catches context injection

### Layer 6: Integration Verification (NEW)

Added:
- PluginLoadDetector — catches silent load failures
- DependencyDetector — catches missing imports
- ClusterExistenceDetector — catches cluster-not-found
- WrongDirectoryDetector — catches .Spider instead of .hermes

---

## Verification Strategy

To verify Code Review Mode V2 works:

1. **Run on Kraken V2.0 source:**
   - Must detect SimulatedExecutionDetector (BLOCKER)
   - Must detect BundleSizeDetector (BLOCKER - 90% reduction)

2. **Run on Manta V4.5 source:**
   - Must detect AgentFieldDetector (BLOCKER - agent field missing)
   - Must detect HookSpilloverDetector (BLOCKER - missing isMantaAgent)

3. **Run on Shark V4.7 source:**
   - Must detect CompactionContentInjectionDetector (BLOCKER)
   - Must detect MemoryLeakDetector (WARNING)
   - Must detect TokenBloatDetector (WARNING)

4. **Run on Hermes source:**
   - Must detect WrongDirectoryDetector (WARNING - .Spider vs .hermes)
   - Must detect ConsoleSpilloverDetector (WARNING)
   - Must detect PrefixSupportDetector (WARNING)

5. **Run on any source with derailment patterns:**
   - Must detect HostFallbackDetector (BLOCKER)
   - Must detect EvidenceCompletenessDetector (BLOCKER)

---

## Source Document Index

| Document | Location | Failures Detected |
|----------|----------|-------------------|
| CATASTROPHIC_FAILURE_REPORT.md | DEBUG LOGS/KRAKEN_DEBUG_LOGS/13-kraken-catastrophic-failure/ | SimulatedExecution, Placeholder, StubFunction, BundleSize |
| manta-hook-bypass-critical-audit.md | Shared Workspace Context/AGI_Neural_Pathways/DEBUG LOGS/ | HookSpillover, AgentField, MissingAgent |
| DERAILMENT_FORENSIC_ANALYSIS.md | DEBUG LOGS/ | HostFallback, MockStub, ModelUsage, ScopeCreep, EvidenceCompleteness |
| shark-agent-memory-audit-2026-04-09.md | Shared Workspace Context/AGI_Neural_Pathways/DEBUG LOGS/ | MemoryLeak, EmptyCatch, SilentFailure, CompactionInjection |
| token-bloat-forensic-report.md | DEBUG LOGS/ | TokenBloat |
| BROKEN_PLUGINS_AUDIT_20260405.md | DEBUG LOGS/07-architecture/ | PluginLoad, Dependency, ShimImplementation |
| hermes-agent-fix-prompt.md | DEBUG LOGS/ | ConsoleSpillover, WrongDirectory, PrefixSupport, GlobalState |
| KRAKEN_PARALLEL_EXECUTION_FAILURE.md | DEBUG LOGS/KRAKEN_DEBUG_LOGS/ | ClusterExistence |

---

## Key Lessons

1. **Trust-based systems fail catastrophically** — Every failure assumed things worked without verification

2. **Behavioral derailment is invisible to code analysis** — You need Layer 0 to catch it BEFORE analysis

3. **Integration failures prevent everything** — Layer 6 catches plugin load, dependencies, clusters

4. **Compaction can make things worse** — Shark's hook added content during compaction instead of pruning

5. **Agent field is not guaranteed** — Hooks must handle missing `agent` field gracefully

6. **Prefix support is critical** — `hermes_coder` must be detected as hermes agent

7. **Wrong directory paths indicate copy-paste errors** — `.Spider` instead of `.hermes` means code was copy-pasted without updating

---

## Files Updated

| File | Changes |
|------|---------|
| `00_INDEX.md` | V2.0 - 7 layers, 36 detectors, forensic sources |
| `ARCHITECTURE/TRIDENT_BRAIN.md` | V2.0 - Full 7-layer pipeline, failure category coverage |
| `SPEC/TRIDENT_SPEC.md` | V2.0 - 36 detectors across 7 layers |
| `WORKING_KNOWLEDGE.md` | This file - Forensic evidence summary |