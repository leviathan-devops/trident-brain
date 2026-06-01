# Kraken-Brain-External-Edition-v1.0

**Runtime-grade boilerplate for building Kraken multi-brain orchestrator brains with external (out-of-process) bridges.**

Derived from the working Prefrontal Cortex (PFC) architecture. Build, test, and ship a new Kraken brain in minutes.

## What's Included

### Embedded (in-process) scaffolding
| Component | File | Status |
|-----------|------|--------|
| Brain class with lifecycle | `src/brains/your-brain/your-brain-brain.ts` | TEMPLATE |
| Types + constants | `src/brains/your-brain/types.ts` | TEMPLATE |
| Persistent JSON store | `src/brains/your-brain/your-brain-store.ts` | TEMPLATE |
| Execution recording (tracer) | `src/brains/your-brain/tracer.ts` | TEMPLATE |
| Agent tools | `src/tools/your-brain-tools.ts` | TEMPLATE |
| Context hooks | `src/hooks/your-brain-hook.ts` | TEMPLATE |
| Plugin integration wiring | `src/index.ts` | TEMPLATE |
| Barrel exports | `src/brains/your-brain/index.ts` | TEMPLATE |
| StateStore (zero-mod) | `src/shared/state-store.ts` | BOILERPLATE |
| BrainMessenger (zero-mod) | `src/shared/brain-messenger.ts` | BOILERPLATE |
| Domain ownership | `src/shared/domain-ownership.ts` | TEMPLATE |
| Test scaffold | `tests/brain-template.test.ts` | TEMPLATE |
| Sample opencode.json | `configs/opencode.json` | SAMPLE |

### External bridge (out-of-process)
| Component | File | Status |
|-----------|------|--------|
| Sync bridge (queue-based) | `src/brains/your-brain/sync-bridge.ts` | TEMPLATE |
| OpenFang Hand manifest | `hands/your-brain/HAND.toml` | TEMPLATE |
| Hand system prompt | `hands/your-brain/SYSTEM_PROMPT.md` | TEMPLATE |
| Hand skill definition | `hands/your-brain/SKILL.md` | TEMPLATE |

## Quick Start

### 1. Fork the boilerplate

```bash
cp -r Kraken-Brain-External-Edition-v1.0 /path/to/your-new-brain
cd /path/to/your-new-brain
```

### 2. Rename directories

```bash
mv src/brains/your-brain src/brains/YOUR_BRAIN_DIR
mv src/tools/your-brain-tools.ts src/tools/YOUR_BRAIN_DIR-tools.ts
mv src/hooks/your-brain-hook.ts src/hooks/YOUR_BRAIN_DIR-hook.ts
mv hands/your-brain hands/YOUR_BRAIN_DIR
```

### 3. Find-and-replace all placeholders

| Find | Replace With | Example |
|------|-------------|---------|
| `{YOUR_BRAIN_ID}` | Lower-hyphen brain ID | `kraken-prefrontal` |
| `{YOUR_BRAIN_NAME}` | PascalCase class name | `PrefrontalCortex` |
| `{YOUR_BRAIN_DIR}` | Lower-hyphen directory name | `prefrontal-cortex` |
| `{YOUR_BRAIN_LABEL}` | Title Case display name | `Prefrontal Cortex` |
| `{YOUR_DOMAIN_ID}` | Lower-hyphen state domain | `prefrontal-state` |
| `{YOUR_HAND_ID}` | Lower-hyphen hand ID | `kraken-prefrontal-cortex` |
| `{YOUR_HAND_LABEL}` | Title Case hand name | `Kraken Prefrontal Cortex` |
| `{YOUR_HAND_DESCRIPTION}` | One-line description | `Evolutionary optimization engine for Kraken` |

### 4. Rename files to match YOUR_BRAIN_NAME

| Template File | Rename To |
|-------------|-----------|
| `your-brain-brain.ts` | `{YOUR_BRAIN_DIR}-brain.ts` |
| `your-brain-store.ts` | `{YOUR_BRAIN_DIR}-store.ts` |
| `your-brain-tools.ts` | `{YOUR_BRAIN_DIR}-tools.ts` |
| `your-brain-hook.ts` | `{YOUR_BRAIN_DIR}-hook.ts` |

### 5. Update imports

Every file has `// [EDIT]` comments marking lines that need customization:
- `types.ts` — Define your brain state interface and domain types
- `your-brain-brain.ts` — Add brain-specific logic, methods, sub-components
- `your-brain-store.ts` — Define your persistent data shape
- `sync-bridge.ts` — Define your external protocol message types
- `your-brain-tools.ts` — Define agent-facing tools
- `your-brain-hook.ts` — Define what context to inject
- `index.ts` — Wire tools and hooks into plugin factory
- `domain-ownership.ts` — Add your brain ID and domain

### 6. Build and test

```bash
bun install
bun build src/index.ts --outdir dist --target=node --sourcemap=none
bun test tests/brain-template.test.ts
```

## Architecture Decision

**Two-layer architecture**: Every Kraken brain has an embedded (in-process) core and MAY have an external (out-of-process) bridge.

- **Embedded**: Synchronous, zero-latency, tied to OpenCode session lifecycle. Never blocks execution.
- **External bridge**: Async, batch-processed, runs in OpenFang or Dragon Server. Crash-isolated.

The sync bridge communicates via shared JSON files (queue). The embedded brain writes outbound messages, the external hand polls and processes them, writes results back.

## When to Remove the External Bridge

If your brain has no out-of-process counterpart:
1. Delete `hands/YOUR_BRAIN/` directory
2. Delete `src/brains/YOUR_BRAIN/sync-bridge.ts`
3. Remove SyncBridge from `your-brain-brain.ts`
4. Use `Kraken-Brain-Edition-v1.0` instead (embedded-only)
