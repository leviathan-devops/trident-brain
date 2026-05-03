# Code Review Mode — Layer 5: Quality Analysis

**Layer:** 5 of 5  
**Question:** "What are the resource implications?"  

---

## Purpose

Layer 5 detects **quality issues** — error handling problems, memory leaks, complexity hotspots, and resource management issues that could cause runtime problems.

## Outputs

| Output | Description |
|--------|-------------|
| `emptyCatchBlocks` | Catch blocks without logging |
| `silentFailures` | Operations returning normally on error |
| `memoryLeaks` | uncleaned listeners, global state |
| `tokenBloat` | Large tool outputs without summarization |
| `complexityHotspots` | High cyclomatic complexity |
| `testCoverage` | Missing tests for critical paths |

## Detectors (6)

### EmptyCatchBlockDetector
Finds catch blocks that swallow errors.

**Patterns:**
```typescript
/catch\s*\(\s*\)\s*\{\s*\}/,
/catch\s*\(\s*\w+\s*\)\s*\{\s*\}/,
/catch\s*\{\s*\}/,
/catch\s*\(\s*\w+\s*\)\s*\{\s*\}\s*;/,
```

**Checks:**
- Does catch block log the error?
- Does catch block rethrow?
- Does catch block handle gracefully?

**Severity:** WARNING  
**Evidence:** `catch {}` or `catch(e) {}`

### SilentFailureDetector
Finds operations that fail silently.

**Patterns:**
```typescript
/\.then\s*\(\s*\w+\s*\)\s*\.catch\s*\(\s*\)\s*;/,
/try\s*\{[^}]*\}\s*catch[^}]*\{\s*\}/,  // empty catch
/if\s*\(error\)\s*\{\s*\}/,  // empty error handling
```

**Severity:** WARNING  
**Evidence:** Promise chain with empty catch

### MemoryLeakDetector
Finds potential memory leak patterns.

**Patterns:**
```typescript
/addEventListener.*addEventListener.*never.*removeEventListener/,
/global\s*\w+\s*=/,  // global state
/subscriptions?\s*\.push.*never.*unsubscribe/,
/setInterval.*never.*clearInterval/,
```

**Severity:** WARNING  
**Evidence:** `addEventListener` without corresponding `removeEventListener`

### TokenBloatDetector
Finds patterns causing token bloat.

**Patterns:**
```typescript
/read.*\.json.*entire\s*file/i,
/grep.*-r.*large.*codebase/i,
/ls\s+-R.*huge.*directory/i,
/context.*push.*tool.*output/i,  // adding during compaction
```

**Severity:** WARNING  
**Evidence:** Hook adds content during compaction instead of truncating

### ComplexityHotspotDetector
Finds high cyclomatic complexity.

**Thresholds:**
- >10: SUGGESTION
- >20: WARNING
- >50: BLOCKER

**Detection:**
- Count if/else/case statements
- Count logical operators
- Count loops

**Severity:** SUGGESTION/WARNING  
**Evidence:** `if (a) if (b) if (c) if (d) if (e) ...`

### TestCoverageDetector
Finds missing test coverage.

**Checks:**
- Are there test files?
- Do tests cover critical paths?
- Are security-sensitive functions tested?

**Severity:** WARNING  
**Evidence:** No tests found for critical security functions

---

## Template

```markdown
## LAYER 5: QUALITY ANALYSIS

### Empty Catch Blocks
| Severity | File | Line | Remediation |
|----------|------|------|-------------|
| WARNING | {file} | {n} | Add error logging |
| WARNING | {file} | {n} | Rethrow or handle gracefully |

### Silent Failures
| Severity | File | Line | Issue |
|----------|------|------|-------|
| WARNING | {file} | {n} | Empty catch in promise chain |

### Memory Leak Risks
| Severity | File | Issue | Remediation |
|----------|------|-------|-------------|
| WARNING | {file} | addEventListener without removeEventListener | Add cleanup |
| WARNING | {file} | Global state never reset | Reset on session end |

### Token Bloat Risks
| Severity | File | Issue | Remediation |
|----------|------|-------|-------------|
| WARNING | {file} | Hook adds content during compaction | Truncate instead |

### Complexity Hotspots
| Severity | File | Function | Complexity | Threshold |
|----------|------|----------|-----------|-----------|
| SUGGESTION | {file} | {name} | {n} | >10 |
| WARNING | {file} | {name} | {n} | >20 |

### Test Coverage Gaps
| Severity | File | Issue | Remediation |
|----------|------|-------|-------------|
| WARNING | {file} | No tests for {func} | Add unit tests |

### Quality Assessment
- **Critical (WARNING):** {n}
- **Suggestions:** {n}
- **Total Issues:** {n}
```

---

## Gate Criteria

To complete review, MUST have:
- [ ] All empty catch blocks documented
- [ ] All silent failures documented
- [ ] Memory leak risks identified
- [ ] Complexity hotspots flagged
- [ ] Test coverage gaps noted

## Review Complete

After Layer 5, generate final **Code Review Report** with all findings.
