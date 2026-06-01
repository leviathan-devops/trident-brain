# BUILD SPEC — Kraken Brain Boilerplate (Embedded Edition)

**Objective:** Build a new embedded Kraken orchestrator brain using the Edition boilerplate.

## Prerequisites

- bun runtime (v1.3+)
- Access to Kraken Agent baseline (v1.2.9.2+)

## Build Steps

### Phase 1: Define Types
1. Open `src/brains/YOUR_BRAIN/types.ts`
2. Replace `YourBrainState` with your brain's state interface
3. Define domain-specific types
4. Set operational constants

### Phase 2: Implement Brain
1. Open `src/brains/YOUR_BRAIN/YOUR_BRAIN-brain.ts`
2. Add brain-specific methods
3. Wire sub-components (store, tracer)
4. Handle inter-brain messages in `handleBrainMessage()`

### Phase 3: Implement Store (if needed)
1. Open `src/brains/YOUR_BRAIN/YOUR_BRAIN-store.ts`
2. Define data shape in `StoreData`
3. Add CRUD methods
4. Test persistence round-trip

### Phase 4: Wire Integration
1. Open `src/index.ts`
2. Replace all placeholders
3. Wire your brain into the plugin factory
4. Add tool.execute.before/after if needed

### Phase 5: Add Tests
1. Open `tests/brain-template.test.ts`
2. Test: init, state, cleanup, idempotency
3. Test: store persistence
4. Test: error handling paths

### Phase 6: Build + Verify
```bash
bun build src/index.ts --outdir dist --target=node --sourcemap=none
bun test tests/brain-template.test.ts
bun tsc --noEmit
```

## Integration with Kraken Baseline

To merge into the existing Kraken agent:
1. Copy `src/brains/YOUR_BRAIN/` to the baseline's `src/brains/`
2. Copy `src/tools/YOUR_BRAIN-tools.ts` to baseline's `src/tools/`
3. Copy `src/hooks/YOUR_BRAIN-hook.ts` to baseline's `src/hooks/`
4. Add your brain ID to `domain-ownership.ts`
5. Wire PFC-style init block in baseline's `src/index.ts`
6. Build and container-test
