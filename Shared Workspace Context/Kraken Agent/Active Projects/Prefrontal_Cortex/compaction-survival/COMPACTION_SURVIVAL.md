# COMPACTION SURVIVAL — Kraken Prefrontal Cortex v1.3

**Last Updated:** 2026-06-01
**Build Status:** v1.3 — tool.execute.before restored, intuition injection wired, 98/98 tests pass
**Bundle**: `kraken-prefrontal-cortex/dist/index.js` (0.68MB, 124 modules)
**Tests**: 98/98 pass (34 pressure + 12 tracer + 11 sync + 21 lineage + 20 e2e)

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
- **Test suites**: `pressure-test.ts` (34), `src/tests/prefrontal/` (64 tests across 4 files)
- **Container image**: `opencode-test:1.14.34`
- **Binary**: `opencode-linux-x64-baseline/bin/opencode`

## Architecture Decision
- **PRIMARY OUTPUT**: Dynamic context injection via IntuitionInjector — soft `[PFC INTUITION]` signals at decision points
- **SECONDARY (Phase 2)**: FirewallInjector — hard L5 pattern blocks
- **QUALITY GATE**: AntiSlopGuardrails on all autonomous FeedbackBrain proposals
- **STORAGE**: JSON file-based (NOT SQLite — `bun:sqlite` unavailable in OpenCode's Node.js process)
- **SOFT INJECTION ONLY** — agents CAN ignore signals, not hard blocks
- **OpenFang Hand** — FeedbackBrain defined (HAND.toml + SYSTEM_PROMPT.md + SKILL.md)

## File Inventory (12 core + 3 Hand + 5 tests)

### Core PFC Files (12)
| File | Purpose |
|---|---|
| `src/brains/prefrontal/types.ts` | 30+ interfaces, 313 lines |
| `src/brains/prefrontal/cortex-store.ts` | JSON file store, 375 lines |
| `src/brains/prefrontal/execution-tracer.ts` | Tool call + LLM recording, 233 lines |
| `src/brains/prefrontal/intuition-injector.ts` | Soft signal system — PRIMARY output, 258 lines |
| `src/brains/prefrontal/anti-slop-guardrails.ts` | Proposal validation, ~300 lines |
| `src/brains/prefrontal/firewall-injector.ts` | L5 pattern injection, 154 lines |
| `src/brains/prefrontal/lineage-tracker.ts` | Merkle chains + generations, 245 lines |
| `src/brains/prefrontal/sync-bridge.ts` | OpenFang comms via JSON queue, 131 lines |
| `src/brains/prefrontal/prefrontal-cortex-brain.ts` | 4th brain, 299 lines |
| `src/brains/prefrontal/index.ts` | Barrel exports |
| `src/tools/prefrontal-tools.ts` | 7 agent tools, 155 lines |
| `src/hooks/prefrontal-context-hook.ts` | Context + intuition hooks, 71 lines |

### OpenFang Hand Files (3)
| File | Purpose |
|---|---|
| `hands/kraken-prefrontal-cortex/HAND.toml` | Hand manifest (~100 lines) |
| `hands/kraken-prefrontal-cortex/SYSTEM_PROMPT.md` | 4-phase SIA Feedback Agent playbook (~300 lines) |
| `hands/kraken-prefrontal-cortex/SKILL.md` | 7-section domain reference (~300 lines) |

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

## What Changed in v1.3
1. **`tool.execute.before` RESTORED** — raw async function with intuition detection + injection (was a stub)
2. **System transform intuition injection** — `experimental.chat.system.transform` now calls both `prefrontalContextHook` AND `prefrontalIntuitionHook`
3. **OpenFang Hand files** — HAND.toml, SYSTEM_PROMPT.md, SKILL.md (3 new files)
4. **4 new test files** — 64 new tests (98 total)
5. **Intuition hook reads more context** — now extracts `input.text`, `input.message`, `input.messages`

## Build Command
```bash
cd kraken-prefrontal-cortex
bun build src/index.ts --outdir dist --target bun --format esm
```

## Test Commands
```bash
cd kraken-prefrontal-cortex
bun run pressure-test.ts                                    # 34/34
bun run src/tests/prefrontal/execution-tracer.test.ts       # 12/12
bun run src/tests/prefrontal/sync-bridge.test.ts            # 11/11
bun run src/tests/prefrontal/lineage.test.ts                # 21/21
bun run src/tests/prefrontal/e2e.test.ts                    # 20/20
```

## Container Test Protocol (T2 TUI Testing Bible v1.14.x)

Source: `~/.local/share/opencode/hive-mind/kraken/context/T2_TUI_TESTING.md`
Key: use `docker exec -it` (NOT `docker attach`), use baseline binary directly.

```bash
PROJECT="pfc-v13-$(date +%m%d%H%M%S)"
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

## Deploy
```bash
PLUGIN_DIR="/path/to/plugins/kraken-agent"
cp kraken-prefrontal-cortex/dist/index.js "$PLUGIN_DIR/dist/"
```
