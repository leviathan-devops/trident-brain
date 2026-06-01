# Kraken-Brain-Edition-v1.0

**Embedded-only boilerplate for building Kraken multi-brain orchestrator brains.**

No external dependencies. No OpenFang bridge. Pure in-process brain that runs inside the OpenCode plugin.

Derived from the working Prefrontal Cortex (PFC) architecture. Use this for brains that DON'T need an out-of-process counterpart (no OpenFang Hand, no Dragon Server bridge).

## What's Included

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

## Quick Start

### 1. Fork the boilerplate

```bash
cp -r Kraken-Brain-Edition-v1.0 /path/to/your-new-brain
cd /path/to/your-new-brain
```

### 2. Rename directories

```bash
mv src/brains/your-brain src/brains/YOUR_BRAIN_DIR
mv src/tools/your-brain-tools.ts src/tools/YOUR_BRAIN_DIR-tools.ts
mv src/hooks/your-brain-hook.ts src/hooks/YOUR_BRAIN_DIR-hook.ts
```

### 3. Find-and-replace all placeholders

| Find | Replace With | Example |
|------|-------------|---------|
| `{YOUR_BRAIN_ID}` | Lower-hyphen brain ID | `kraken-memory` |
| `{YOUR_BRAIN_NAME}` | PascalCase class name | `MemoryBrain` |
| `{YOUR_BRAIN_DIR}` | Lower-hyphen directory name | `memory-brain` |
| `{YOUR_BRAIN_LABEL}` | Title Case display name | `Memory Brain` |
| `{YOUR_DOMAIN_ID}` | Lower-hyphen state domain | `memory-state` |

### 4. Rename files to match YOUR_BRAIN_NAME

| Template File | Rename To |
|-------------|-----------|
| `your-brain-brain.ts` | `{YOUR_BRAIN_DIR}-brain.ts` |
| `your-brain-store.ts` | `{YOUR_BRAIN_DIR}-store.ts` |
| `your-brain-tools.ts` | `{YOUR_BRAIN_DIR}-tools.ts` |
| `your-brain-hook.ts` | `{YOUR_BRAIN_DIR}-hook.ts` |

### 5. Update `domain-ownership.ts`

Add your brain ID and domain to the type unions and ownership map. Follow the `// [EDIT]` comments.

### 6. Update imports and `// [EDIT]` markers

Every file has `// [EDIT]` comments marking lines that need customization.

### 7. Build and test

```bash
bun build src/index.ts --outdir dist --target=node --sourcemap=none
bun test tests/brain-template.test.ts
```

## When to Use This vs External Edition

| Use Case | Boilerplate |
|----------|-------------|
| Pure in-process brain, no external counterpart | **Kraken-Brain-Edition-v1.0** (this one) |
| Brain communicates with OpenFang Hand | **Kraken-Brain-External-Edition-v1.0** |
| Brain bridges to Dragon Server | **Kraken-Brain-External-Edition-v1.0** + add Dragon bridge |
