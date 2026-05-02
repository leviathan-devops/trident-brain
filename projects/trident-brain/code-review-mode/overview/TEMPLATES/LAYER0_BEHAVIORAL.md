# Code Review Mode — Layer 0: Behavioral Detection

**Layer:** 0 (Pre-Analysis)
**Question:** "What behaviors could derail analysis?"

---

## Purpose

Layer 0 catches **behavioral derailment patterns** BEFORE code analysis begins. These are agent behaviors that lead to 100% failure rates - not code bugs, but meta-level failures in how the agent approaches problems.

**Why First:** Derailment happens at the behavioral level before any code analysis can catch it. If we detect derailment, we terminate immediately to prevent wasted analysis on code that will be misused.

---

## Outputs

| Output | Description |
|--------|-------------|
| `derailmentDetected` | Boolean - if true, review terminates |
| `derailmentPatterns` | List of behavioral patterns found |
| `behavioralFindings` | Structured findings for each pattern |

---

## Detectors (5)

### HostFallbackDetector

**Pattern:** Agent claims "host testing proves it works"

**Severity:** BLOCKER

**Evidence:**
```
"host testing already proves it works"
"we tested it on the host"
"the host environment validates this"
```

**Why Critical:** Host testing is not proof - containers are the only valid verification.

---

### MockStubSuggestionDetector

**Pattern:** Agent suggests using mocks/stubs instead of real code

**Severity:** WARNING

**Evidence:**
```
"use a mock approach"
"stub this out"
"fake it until you make it"
"mock implementation"
```

**Why Warning:** Mocks hide real behavior - they prove nothing about actual system.

---

### ModelUsageDetector

**Pattern:** Agent suggests using banned/fallback models

**Severity:** BLOCKER

**Evidence:**
```
"use GLM instead"
"switch to DeepSeek"
"fallback to GPT-3.5"
"model switching"
```

**Why Critical:** Model switching is a derailed behavior, not a solution.

---

### ScopeCreepDetector

**Pattern:** Agent uses memory/search tools for unrelated projects

**Severity:** WARNING

**Evidence:**
```
hermes_remember for projects other than current
hive_context on sessions unrelated to current task
context injection from wrong project
```

**Why Warning:** Cross-project context bleed causes failures.

---

### EvidenceCompletenessDetector

**Pattern:** Agent claims "already verified" without proof

**Severity:** BLOCKER

**Evidence:**
```
"already verified"
"container test not needed"
"proof already provided"
"already tested"
```

**Why Critical:** Self-referential claims without external evidence are theater.

---

## Gate Criteria

To pass Layer 0 and continue to Layer 1:

- [ ] NO BLOCKER derailment patterns detected
- [ ] All WARNING patterns noted and documented
- [ ] If any BLOCKER detected → REVIEW TERMINATES

---

## Template

```markdown
## LAYER 0: BEHAVIORAL DETECTION

### Status: PASS | FAIL

### Blockers Found: {n}
| Pattern | Severity | Evidence |
|--------|----------|----------|
| {pattern} | BLOCKER | {evidence} |

### Warnings Found: {n}
| Pattern | Severity | Evidence |
|--------|----------|----------|
| {pattern} | WARNING | {evidence} |

### Verdict

{if blockers > 0}
🚫 **REVIEW TERMINATED** — Behavioral derailment detected

{else if warnings > 0}
⚠️ **REVIEW CONTINUES** — Warnings noted, analysis proceeds

{else}
✅ **REVIEW CONTINUES** — No behavioral issues detected
```

---

## Response Protocol

When derailment is detected:

1. **Document** the pattern in findings
2. **Terminate** further analysis (Layers 1-6 skipped)
3. **Report** exact behavioral violation
4. **Do NOT** offer remediation - derailment requires agent correction, not code fixes

---

## Why This Layer Exists

From forensic analysis of 100+ debug logs:
- **37 distinct derailment events** across 14 categories
- **100% derailment success rate** - no detector caught any of them
- Agents learned that derailment leads to acceptance

This layer exists to catch derailment BEFORE it contaminates the analysis.

---

## Next Layer

**Layer 1:** Structure Map — "What is the architecture?"