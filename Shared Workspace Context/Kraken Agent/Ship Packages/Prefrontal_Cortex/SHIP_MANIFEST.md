# SHIP MANIFEST — Kraken Prefrontal Cortex v1.3.2

**Ship Date:** 2026-06-01
**Version:** v1.3.2
**Status:** Merge-ready. 0 blocking issues, 0 `as any` on private fields, 0 silent catches.
**Bundle:** 126 modules, 0.64MB (641KB)
**Tests:** 98/98 pass
**Runtime:** Container TUI verified (T2 protocol). OpenFang Hand activated.

---

## Contents

```
Prefrontal_Cortex/
├── SHIP_MANIFEST.md                          (this file)
├── DEPLOY.md                                 (deployment instructions)
├── DEBUG_LOG.md                              (full build progression history)
├── kraken-prefrontal-cortex/
│   ├── dist/
│   │   └── index.js                          (0.64MB bundle — DEPLOY THIS)
│   ├── src/
│   │   ├── index.ts                          (plugin factory — 927 lines)
│   │   ├── brains/prefrontal/
│   │   │   ├── types.ts                      (30+ interfaces)
│   │   │   ├── cortex-store.ts               (JSON file store)
│   │   │   ├── execution-tracer.ts           (tool call recording + 5 public API methods)
│   │   │   ├── intuition-injector.ts         (soft signal system — PRIMARY)
│   │   │   ├── anti-slop-guardrails.ts       (proposal validation)
│   │   │   ├── firewall-injector.ts          (L5 hard blocks — Phase 2)
│   │   │   ├── lineage-tracker.ts            (Merkle chains)
│   │   │   ├── sync-bridge.ts                (OpenFang comms)
│   │   │   ├── prefrontal-cortex-brain.ts    (4th brain)
│   │   │   └── index.ts                      (barrel exports)
│   │   ├── hooks/
│   │   │   ├── prefrontal-context-hook.ts    (context + intuition hooks)
│   │   │   └── cluster-state-hook.ts         (cluster activity tracking)
│   │   ├── tools/
│   │   │   └── prefrontal-tools.ts           (7 agent tools)
│   │   └── shared/
│   │       └── domain-ownership.ts           (brain + domain IDs)
│   ├── tests/prefrontal/
│   │   ├── execution-tracer.test.ts          (12 tests)
│   │   ├── sync-bridge.test.ts               (11 tests)
│   │   ├── lineage.test.ts                   (21 tests)
│   │   └── e2e.test.ts                       (20 tests)
│   ├── pressure-test.ts                      (34 tests)
│   └── hands/kraken-prefrontal-cortex/
│       ├── HAND.toml                         (OpenFang Hand manifest)
│       ├── SYSTEM_PROMPT.md                  (4-phase SIA playbook)
│       └── SKILL.md                          (domain expertise)
└── docs/
    ├── BUILD_REPORT.md                       (full build report)
    └── COMPACTION_SURVIVAL.md                (recovery + deploy docs)
```

---

## Quick Deploy

### 1. Deploy to OpenCode (Kraken Plugin)

```bash
PLUGIN_DIR="/path/to/plugins/kraken-agent"
mkdir -p "$PLUGIN_DIR/dist"
cp kraken-prefrontal-cortex/dist/index.js "$PLUGIN_DIR/dist/"
```

Merge `src/index.ts` changes into the baseline's `src/index.ts` (PFC imports, init, hooks, tools, agent instructions).

### 2. Deploy to OpenFang (FeedbackBrain Hand)

```bash
cp -r kraken-prefrontal-cortex/hands/kraken-prefrontal-cortex ~/.openfang/hands/
openfang start &
sleep 6
openfang hand install ~/.openfang/hands/kraken-prefrontal-cortex
openfang hand activate kraken-prefrontal-cortex
```

### 3. Deploy Source Files

Copy these into the baseline for full merge:
- `src/brains/prefrontal/` (10 files) — PFC brain modules
- `src/hooks/prefrontal-context-hook.ts` — context + intuition hooks
- `src/hooks/cluster-state-hook.ts` — cluster activity tracking (fixed error logging)
- `src/tools/prefrontal-tools.ts` — 7 agent tools
- `src/shared/domain-ownership.ts` — ID additions

---

## Test Commands

```bash
cd kraken-prefrontal-cortex
bun test ./pressure-test.ts                                  # 34/34
bun test src/tests/prefrontal/execution-tracer.test.ts       # 12/12
bun test src/tests/prefrontal/sync-bridge.test.ts            # 11/11
bun test src/tests/prefrontal/lineage.test.ts                # 21/21
bun test src/tests/prefrontal/e2e.test.ts                    # 20/20
```

---

## Runtime Verification Evidence

Container TUI test (2026-06-01, T2 protocol, docker exec -it, baseline binary):

| Hook | Evidence |
|------|----------|
| `[ExecutionTracer]` | `Initialized for session=ses_17fdaeb01ffe5YO5pMMlaXRoAW` |
| `[PFC Tracer]` | `Created and started trajectory` → `After flush, buffer: 0` |
| `[SyncBridge]` | `Sent afferent heartbeat` every 60s |
| Signal detection | `signals: 0` on benign commands (correct) |

---

## Merge Audit Results

Final line-by-line audit (2026-06-01):

| Fix | Status |
|-----|--------|
| PFC init try/catch — protects existing 3-brain orchestrator | DONE |
| `as any` on private fields — replaced with public API | DONE |
| All catch blocks log errors — 0 silent catches | DONE |
| Duplicate manta-alpha-1 definition removed | DONE |
| Trajectories persist via `flushAndPersist()` | DONE |

---

## Files Count

| Category | Files | Lines |
|----------|-------|-------|
| Core PFC modules | 10 | ~2,600 |
| Integration (index.ts + hooks + shared) | 3 | ~1,160 |
| OpenFang Hand | 3 | ~700 |
| Test files | 5 | ~900 |
| Bundle | 1 | 0.64MB |
| Docs | 3 | ~1,000 |
| **Total** | **25** | **~7,000** |
