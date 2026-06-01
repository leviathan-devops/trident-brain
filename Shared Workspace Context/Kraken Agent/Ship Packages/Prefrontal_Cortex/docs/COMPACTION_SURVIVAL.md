# COMPACTION SURVIVAL — Kraken Prefrontal Cortex v1.3.1

**Last Updated:** 2026-06-01
**Build Status:** v1.3.1 — bugs fixed, runtime verified in container TUI, 98/98 tests pass, Trident audited
**Bundle**: `kraken-prefrontal-cortex/dist/index.js` (0.64MB, 126 modules)
**Tests**: 98/98 pass (34 pressure + 12 tracer + 11 sync + 21 lineage + 20 e2e)
**Runtime**: Container 1 VERIFIED (docker exec -it, T2 protocol). Container 2 ACTIVATED (OpenFang Hand).
**Audit**: Trident v3.3 — no theatrical garbage. 2 minor bugs fixed (silent catch, optional chaining).

## Quick Recovery

If context is lost during compaction, read this file first.

## Project Identity
- **Project**: Kraken Prefrontal Cortex (PFC) — the 4th brain
- **Type**: Evolutionary optimization + soft intuition injection for Kraken orchestrator
- **Baseline**: v1.2.9.2-bricked-config-solved
- **Architecture**: Soft intuition injection (primary output), trajectory recording, evolutionary lineage, anti-slop guardrails, OpenFang Hand (FeedbackBrain)
- **NOT compaction survival** — that's vanilla Kraken. PFC is PFC-specific architecture only.

## Key Paths
- **Project root**: `/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Kraken Agent/Active Projects/Prefrontal_Cortex/`
- **Runtime codebase**: `kraken-prefrontal-cortex/` (forked baseline + PFC modules)
- **Architecture docs**: `00_ARCHITECTURE.md` (1,537 lines), `01_BUILD_SPEC.md` (525 lines)
- **Build report**: `BUILD_REPORT.md`
- **Test suites**: `pressure-test.ts` (34), `src/tests/prefrontal/` (64 tests across 4 files)
- **Container image**: `opencode-test:1.14.34`
- **Binary**: `opencode-linux-x64-baseline/bin/opencode`
- **T2 TUI Testing Bible**: `~/.local/share/opencode/hive-mind/kraken/context/T2_TUI_TESTING.md`

## Architecture Decision
- **PRIMARY OUTPUT**: Dynamic context injection via IntuitionInjector — soft `[PFC INTUITION]` signals at decision points
- **SECONDARY (Phase 2)**: FirewallInjector — hard L5 pattern blocks
- **QUALITY GATE**: AntiSlopGuardrails on all autonomous FeedbackBrain proposals
- **STORAGE**: JSON file-based (NOT SQLite — `bun:sqlite` unavailable in OpenCode's Node.js process)
- **SOFT INJECTION ONLY** — agents CAN ignore signals, not hard blocks
- **OpenFang Hand** — FeedbackBrain installed + activated (agent ID: 36fd9e52-2457-5411-ba1d-2f970561bad6)

## File Inventory (12 core + 3 Hand + 5 tests = 20 PFC files)

### Core PFC Files (12)
| File | Purpose |
|---|---|
| `src/brains/prefrontal/types.ts` | 30+ interfaces, 313 lines |
| `src/brains/prefrontal/cortex-store.ts` | JSON file store, 376 lines |
| `src/brains/prefrontal/execution-tracer.ts` | Tool call + LLM recording, 233 lines |
| `src/brains/prefrontal/intuition-injector.ts` | Soft signal system — PRIMARY output, 258 lines |
| `src/brains/prefrontal/anti-slop-guardrails.ts` | Proposal validation, 319 lines |
| `src/brains/prefrontal/firewall-injector.ts` | L5 pattern injection, 154 lines |
| `src/brains/prefrontal/lineage-tracker.ts` | Merkle chains + generations, 245 lines |
| `src/brains/prefrontal/sync-bridge.ts` | OpenFang comms via JSON queue, 131 lines |
| `src/brains/prefrontal/prefrontal-cortex-brain.ts` | 4th brain, 299 lines |
| `src/brains/prefrontal/index.ts` | Barrel exports |
| `src/tools/prefrontal-tools.ts` | 7 agent tools, 155 lines |
| `src/hooks/prefrontal-context-hook.ts` | Context + intuition hooks, 76 lines |

### OpenFang Hand Files (3)
| File | Purpose |
|---|---|
| `hands/kraken-prefrontal-cortex/HAND.toml` | Hand manifest (116 lines) |
| `hands/kraken-prefrontal-cortex/SYSTEM_PROMPT.md` | 4-phase SIA Feedback Agent playbook |
| `hands/kraken-prefrontal-cortex/SKILL.md` | 7-section domain reference |

### Test Files (5)
| File | Tests |
|---|---|
| `pressure-test.ts` | 34 — CortexStore, IntuitionInjector, AntiSlopGuardrails |
| `src/tests/prefrontal/execution-tracer.test.ts` | 12 — recording, flushing, persistence |
| `src/tests/prefrontal/sync-bridge.test.ts` | 11 — heartbeats, registration, proposals |
| `src/tests/prefrontal/lineage.test.ts` | 21 — generations, Merkle chains, context.md |
| `src/tests/prefrontal/e2e.test.ts` | 20 — full pipeline |

### Modified Files (2)
- `src/shared/domain-ownership.ts` — added kraken-prefrontal + prefrontal-state
- `src/index.ts` — PFC init, tool.execute.after tracer, tool.execute.before with intuition, system.transform with intuition injection, tools, agent instructions

## Changelog

### v1.3.1 (2026-06-01)
1. **Fixed silent catch** in `cluster-state-hook.ts:155` — now logs errors per spec requirement
2. **Fixed optional chaining** in `prefrontal-context-hook.ts:27` — `bestGen.evaluation?.metrics?.accuracy` prevents NPE
3. **Runtime verified** — Container 1 (OpenCode + PFC) confirmed all hooks fire in live TUI
4. **OpenFang Hand activated** — Container 2 (OpenFang + PFC Hand) agent spawned, background loop running
5. **Trident audit passed** — no theatrical garbage, all false positives triaged
6. **Rebuilt bundle** — 126 modules, 0.64MB

### v1.3 (2026-06-01)
1. **`tool.execute.before` RESTORED** — raw async function with intuition detection + injection (was a stub)
2. **System transform intuition injection** — `experimental.chat.system.transform` calls both hooks
3. **OpenFang Hand files** — HAND.toml, SYSTEM_PROMPT.md, SKILL.md (3 new files)
4. **4 new test files** — 64 new tests (98 total)
5. **Intuition hook reads more context** — extracts `input.text`, `input.message`, `input.messages`

## Build Command
```bash
cd kraken-prefrontal-cortex
bun build src/index.ts --outdir dist --target=node --sourcemap=none
```

## Test Commands
```bash
cd kraken-prefrontal-cortex
bun test ./pressure-test.ts                                  # 34/34
bun test src/tests/prefrontal/execution-tracer.test.ts       # 12/12
bun test src/tests/prefrontal/sync-bridge.test.ts            # 11/11
bun test src/tests/prefrontal/lineage.test.ts                # 21/21
bun test src/tests/prefrontal/e2e.test.ts                    # 20/20
```

## Runtime Verification (Container TUI)

### Container 1: OpenCode + PFC Kraken — VERIFIED 2026-06-01

Protocol: T2 TUI Testing Bible (`docker exec -it`, baseline binary, isolated snapshot)

**Hooks confirmed firing in live TUI:**

| Hook | Evidence | Status |
|------|----------|--------|
| `[ExecutionTracer]` | `Initialized for session=ses_17fdaeb01ffe5YO5pMMlaXRoAW, project=opencode` | WORKING |
| `[PFC Tracer]` trajectory creation | `Created and started trajectory` | WORKING |
| `[PFC Tracer]` buffer flush | `Buffer size: 1 Active trajs: 2` → `After flush, buffer: 0` | WORKING |
| `[PFC Tracer]` persistence | `Store trajectories count: 2` | WORKING |
| `[SyncBridge]` heartbeat | `Sent afferent heartbeat` every 60s | WORKING |
| Intuition signal detection | `signals: 0` on benign command (correct) | WORKING |
| Agent identity | Responds as "Kraken" with MiMo-V2.5-Pro | WORKING |
| Safety behavior | Destructive request correctly refused | WORKING |

Container: `test-pfc-v13-0601022307` on `opencode-test:1.14.34`

### Container 2: OpenFang + PFC Hand — ACTIVATED 2026-06-01

```bash
openfang hand install ~/.openfang/hands/kraken-prefrontal-cortex
openfang hand activate kraken-prefrontal-cortex
```

- Agent: "Prefrontal Cortex" (ID: 36fd9e52-2457-5411-ba1d-2f970561bad6)
- Background loop: 60s interval
- Persisted: 12 → 13 agents across daemon restart
- Model: claude-sonnet-4-20250514 via Anthropic provider

### Container Test Protocol (T2 TUI Testing Bible v1.14.x)

Source: `~/.local/share/opencode/hive-mind/kraken/context/T2_TUI_TESTING.md`
Key: use `docker exec -it` (NOT `docker attach`), use baseline binary directly.

```bash
PROJECT="pfc-$(date +%m%d%H%M%S)"
SNAP="/tmp/snap-${PROJECT}"
mkdir -p "$SNAP/plugins/kraken-agent/dist"

cp kraken-prefrontal-cortex/dist/index.js "$SNAP/plugins/kraken-agent/dist/"

cat > "$SNAP/opencode.json" << 'EOF'
{
  "model": "xiaomi-token-plan-sgp/mimo-v2.5-pro",
  "provider": {
    "xiaomi-token-plan-sgp": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://token-plan-sgp.xiaomimimo.com/v1",
        "apiKey": "tp-ssy5nlzfc5vccack4ccierszbs0fojjp0lp3uj37hlp328ci"
      }
    }
  },
  "plugin": ["file:///root/.config/opencode/plugins/kraken-agent/dist/index.js"],
  "agent": {"kraken": {"name": "kraken", "mode": "primary", "tools": {}}},
  "permission": {"*": {"*": "allow"}}
}
EOF

CONTAINER="test-${PROJECT}"
tmux kill-session -t "$CONTAINER" 2>/dev/null || true
docker rm -f "$CONTAINER" 2>/dev/null || true

docker run -d --rm --name "$CONTAINER" \
  --entrypoint "" \
  -v "$SNAP:/root/.config/opencode" \
  opencode-test:1.14.34 \
  /bin/sh -c '/usr/local/lib/node_modules/opencode-ai/node_modules/opencode-linux-x64-baseline/bin/opencode --agent kraken 2>&1; sleep 3600'

sleep 28
docker ps | grep "$CONTAINER" || { echo "Container died!"; docker logs "$CONTAINER"; exit 1; }

tmux new-session -d -s "$CONTAINER" \
  "docker exec -it $CONTAINER /usr/local/lib/node_modules/opencode-ai/node_modules/opencode-linux-x64-baseline/bin/opencode --agent kraken 2>&1; sleep 60"
sleep 8
tmux send-keys -t "$CONTAINER" Escape
sleep 2
tmux send-keys -t "$CONTAINER" "who are you" Enter
sleep 25
tmux capture-pane -t "$CONTAINER" -p | strings | grep -vE '^\[' | grep -vE '^\s*$' | head -40
```

CRITICAL: `model` at TOP LEVEL of opencode.json. `tools` as OBJECT not array. Use baseline binary directly (not npm wrapper, not musl). Use `docker exec -it` (NOT `docker attach`).

## Critical Bugs (historical)
1. **`bun:sqlite` unavailable** — OpenCode runs Node.js. Rewrote to JSON file store.
2. **`safeHook` blocks `tool.execute.*` hooks** — Use raw async functions, not safeHook-wrapped.
3. **Tracer never initialized** — lazy-init in `tool.execute.after`.
4. **FLUSH_THRESHOLD=10** — immediate flush after each tool call.
5. **Wrong API key** — correct key: `tp-ssy5nlzfc5vccack4ccierszbs0fojjp0lp3uj37hlp328ci`
6. **`docker logs` shows wrong process** — use `tmux capture-pane` for hook output.
7. **Silent catch in cluster-state-hook** — FIXED v1.3.1. Now logs errors.
8. **NPE on bestGen.evaluation.metrics** — FIXED v1.3.1. Now uses optional chaining.

## Deploy
```bash
PLUGIN_DIR="/path/to/plugins/kraken-agent"
cp kraken-prefrontal-cortex/dist/index.js "$PLUGIN_DIR/dist/"
```

## Deploy (OpenFang Hand)
```bash
cp -r hands/kraken-prefrontal-cortex ~/.openfang/hands/
openfang start &
sleep 6
openfang hand install ~/.openfang/hands/kraken-prefrontal-cortex
openfang hand activate kraken-prefrontal-cortex
```
