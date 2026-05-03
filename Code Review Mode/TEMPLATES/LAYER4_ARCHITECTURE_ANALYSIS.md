# Code Review Mode — Layer 4: Architecture Analysis

**Layer:** 4 of 5  
**Question:** "How do components interact?"  

---

## Purpose

Layer 4 detects **architectural flaws** — coupling issues, hook spillover risks, and isolation failures that could cause cross-plugin contamination or maintenance problems.

## Outputs

| Output | Description |
|--------|-------------|
| `importCycles` | Circular dependency chains |
| `hookSpillover` | Missing agent checks |
| `globalState` | Module-level globals |
| `agentIsolation` | Wrong agent hook firing |
| `contextLeaks` | Cross-plugin context bleed |

## Detectors (5)

### ImportCycleDetector
Finds circular import dependencies.

**Detection:**
- Build directed graph from imports
- Run cycle detection (DFS)
- Report full cycle chain

**Severity:** BLOCKER  
**Evidence:** `A.ts → B.ts → A.ts`

### HookSpilloverDetector
Finds missing agent identity checks.

**Patterns:**
```typescript
/isSharkAgent\s*\(\s*\w+\s*\)/,
/isMantaAgent\s*\(\s*\w+\s*\)/,
/isReviewAgent\s*\(\s*\w+\s*\)/,
```

**Checks:**
- All hooks MUST check agent identity
- Missing `isXxxAgent()` = BLOCKER
- `agent` can be undefined in CLI mode

**Severity:** BLOCKER  
**Evidence:** `isMantaAgent(agent)` where agent can be undefined

### GlobalStateDetector
Finds module-level global state.

**Patterns:**
```typescript
/^const\s+_[A-Z]\w*\s*=/m,
/^let\s+_[A-Z]\w*\s*=/m,
/^var\s+_[A-Z]\w*\s*=/m,
/_currentPhase\s*=/,
/_activeAgents\s*=/,
```

**Severity:** WARNING  
**Evidence:** `const _currentPhase = "idle"` (never reset)

### AgentIsolationDetector
Finds hooks that fire for wrong agents.

**Checks:**
- Guardian should only fire for target agent
- Gate hooks should only fire for target agent
- System transform should only fire for target agent

**Severity:** BLOCKER  
**Evidence:** Hook fires for ALL agents instead of just Shark

### ContextLeakDetector
Finds cross-plugin context bleeding.

**Patterns:**
```typescript
/hermes_remember.*unrelated/,
/hive_context.*other.*project/,
/memread.*session.*not.*current/,
```

**Severity:** WARNING  
**Evidence:** hermes_remember used for unrelated project context

---

## Template

```markdown
## LAYER 4: ARCHITECTURE ANALYSIS

### Import Cycles
| Severity | Cycle | Files |
|----------|-------|-------|
| BLOCKER | A → B → A | file1.ts, file2.ts |
| BLOCKER | A → B → C → A | file1.ts, file2.ts, file3.ts |

### Hook Spillover Risks
| Severity | File | Line | Issue |
|----------|------|------|-------|
| BLOCKER | {file} | {n} | `isMantaAgent(agent)` - agent can be undefined |
| BLOCKER | {file} | {n} | No agent check in hook |

### Global State Issues
| Severity | File | Variable | Issue |
|----------|------|----------|-------|
| WARNING | {file} | `_currentPhase` | Module-level global not reset |

### Agent Isolation Violations
| Severity | File | Hook | Issue |
|----------|------|------|-------|
| BLOCKER | {file} | {name} | Fires for ALL agents |

### Context Leakage
| Severity | File | Pattern | Issue |
|----------|------|---------|-------|
| WARNING | {file} | hermes_remember | Used for unrelated project |

### Architecture Assessment
- **Critical (BLOCKER):** {n}
- **Structural (WARNING):** {n}
- **Total Issues:** {n}
```

---

## Gate Criteria

To advance to Layer 5, MUST have:
- [ ] No import cycles
- [ ] All hooks have agent checks
- [ ] No unreset global state
- [ ] Agent isolation verified

## Next Layer

**Layer 5:** Quality Analysis — "What are the resource implications?"
