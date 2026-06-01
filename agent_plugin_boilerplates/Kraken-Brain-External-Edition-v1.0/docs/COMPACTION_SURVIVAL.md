# COMPACTION SURVIVAL — Kraken Brain Boilerplate

**If context is lost during session compaction, read this file first.**

## Project Identity
- **Project:** [EDIT] Your brain project name
- **Type:** Kraken multi-brain orchestrator brain
- **Boilerplate:** Kraken-Brain-External-Edition-v1.0
- **Derived from:** Prefrontal Cortex (PFC) working architecture

## Key Paths
- **Project root:** [EDIT] e.g., `/home/user/projects/your-brain/`
- **Build:** `bun build src/index.ts --outdir dist --target=node --sourcemap=none`
- **Bundle:** `dist/index.js`
- **Tests:** `tests/brain-template.test.ts`
- **Config:** `configs/opencode.json`

## Quick Recovery

```bash
# 1. Check if bundle exists
ls -la dist/index.js

# 2. Rebuild if missing
bun install && bun build src/index.ts --outdir dist --target=node --sourcemap=none

# 3. Run tests
bun test tests/brain-template.test.ts

# 4. Container test (T2 protocol)
# See: T2_TUI_TESTING.md in Hive Mind (~/.local/share/opencode/hive-mind/kraken/context/)
```

## Critical Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Plugin entry — brain init, tools, hooks |
| `src/brains/YOUR_BRAIN/YOUR_BRAIN-brain.ts` | Brain class — init, cleanup, methods |
| `src/brains/YOUR_BRAIN/types.ts` | Brain state + constants |
| `src/shared/domain-ownership.ts` | Brain ID + domain registration |
| `configs/opencode.json` | Plugin deployment config |

## Critical Bugs (from PFC build)
1. **safeHook breaks tool.execute.* hooks** — Use raw async functions
2. **PFC init must be try/catch** — Plugin crash if init fails
3. **No `as any` on private fields** — Add public API methods
4. **No silent catch blocks** — All catches must log errors
5. **bun:sqlite unavailable** — Use JSON file stores
6. **Container test via docker exec -it** — NOT docker attach
7. **Model at top level** — NOT inside provider in opencode.json
