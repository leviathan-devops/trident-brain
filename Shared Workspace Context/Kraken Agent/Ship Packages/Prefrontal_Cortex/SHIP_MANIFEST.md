# SHIP MANIFEST — Kraken Prefrontal Cortex v1.3.1

**Ship Date:** 2026-06-01
**Version:** v1.3.1
**Status:** Runtime verified, audited, 98/98 tests pass

---

## Contents

```
Prefrontal_Cortex/
├── SHIP_MANIFEST.md                          (this file)
├── DEPLOY.md                                 (deployment instructions)
├── kraken-prefrontal-cortex/
│   ├── dist/
│   │   └── index.js                          (0.64MB bundle — DEPLOY THIS)
│   ├── src/brains/prefrontal/
│   │   ├── types.ts                          (30+ interfaces)
│   │   ├── cortex-store.ts                   (JSON file store)
│   │   ├── execution-tracer.ts               (tool call recording)
│   │   ├── intuition-injector.ts             (soft signal system — PRIMARY)
│   │   ├── anti-slop-guardrails.ts           (proposal validation)
│   │   ├── firewall-injector.ts              (L5 hard blocks — Phase 2)
│   │   ├── lineage-tracker.ts                (Merkle chains)
│   │   ├── sync-bridge.ts                    (OpenFang comms)
│   │   ├── prefrontal-cortex-brain.ts        (4th brain)
│   │   └── index.ts                          (barrel exports)
│   ├── src/hooks/
│   │   ├── prefrontal-context-hook.ts        (context + intuition hooks)
│   │   └── cluster-state-hook.ts             (cluster activity tracking)
│   ├── src/tools/
│   │   └── prefrontal-tools.ts               (7 agent tools)
│   ├── src/shared/
│   │   └── domain-ownership.ts               (brain + domain IDs)
│   ├── src/tests/prefrontal/
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

Add to `opencode.json`:
```json
{
  "plugin": ["file:///root/.config/opencode/plugins/kraken-agent/dist/index.js"],
  "agent": {"kraken": {"name": "kraken", "mode": "primary", "tools": {}}}
}
```

### 2. Deploy to OpenFang (FeedbackBrain Hand)

```bash
cp -r kraken-prefrontal-cortex/hands/kraken-prefrontal-cortex ~/.openfang/hands/
openfang start &
sleep 6
openfang hand install ~/.openfang/hands/kraken-prefrontal-cortex
openfang hand activate kraken-prefrontal-cortex
```

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

Container TUI test (2026-06-01, T2 protocol, docker exec -it):

| Hook | Evidence |
|------|----------|
| `[ExecutionTracer]` | `Initialized for session=ses_17fdaeb01ffe5YO5pMMlaXRoAW` |
| `[PFC Tracer]` | `Created and started trajectory` → `After flush, buffer: 0` |
| `[SyncBridge]` | `Sent afferent heartbeat` every 60s |
| Signal detection | `signals: 0` on benign commands (correct) |

---

## Audit Results

Trident v3.3: No theatrical garbage. 2 minor bugs found and fixed in v1.3.1:
1. Silent catch → now logs errors
2. Missing optional chaining → now uses `?.`

---

## Files Count

| Category | Files | Lines |
|----------|-------|-------|
| Core PFC modules | 12 | ~2,600 |
| OpenFang Hand | 3 | ~700 |
| Test files | 5 | ~900 |
| Hooks | 2 | ~234 |
| Shared | 1 | ~100 |
| Docs | 2 | ~400 |
| Bundle | 1 | 0.64MB |
| **Total** | **26** | **~4,900** |
