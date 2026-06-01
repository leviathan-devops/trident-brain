# CONTEXT LIBRARY — Builder Injection Context

**For:** AI builders generating Kraken brains from this boilerplate.

**Read first:** `ARCHITECTURE.md` (the WHAT), `BUILD_SPEC.md` (the HOW), then this file (the INJECTION).

## Placeholder Reference

| Placeholder | Convention | Example |
|-------------|-----------|---------|
| `{YOUR_BRAIN_ID}` | lower-hyphen | `kraken-prefrontal` |
| `{YOUR_BRAIN_NAME}` | PascalCase | `PrefrontalCortex` |
| `{YOUR_BRAIN_DIR}` | lower-hyphen | `prefrontal-cortex` |
| `{YOUR_BRAIN_LABEL}` | Title Case | `Prefrontal Cortex` |
| `{YOUR_DOMAIN_ID}` | lower-hyphen | `prefrontal-state` |
| `{YOUR_HAND_ID}` | lower-hyphen | `kraken-prefrontal-cortex` |
| `{YOUR_HAND_LABEL}` | Title Case | `Kraken Prefrontal Cortex` |
| `{YOUR_HAND_DESCRIPTION}` | Sentence | `Evolutionary optimization for Kraken` |

## File Edit Guide

### `types.ts` — Define your brain's identity
- Replace `YourBrainState` with your actual state interface
- Replace `ExampleRecord`/`ExampleConfig` with your domain types
- Set `BRAIN_ID`, `DOMAIN_ID`, `BRAIN_LABEL` constants
- Set `HEARTBEAT_INTERVAL_MS` and other operational constants

### `YOUR_BRAIN-brain.ts` — The brain class
- Constructor: initialize sub-components (store, tracer, bridge)
- `initialize()`: subscribe to messenger, register state, start heartbeat
- `heartbeatCycle()`: periodic maintenance tasks
- Brain-specific methods: public API for tools/hooks
- `handleBrainMessage()`: route inter-brain messages
- `cleanup()`: stop timers, flush, close

### `YOUR_BRAIN-store.ts` — Persistent storage (optional)
- Define `StoreData` interface with your data shape
- Implement CRUD methods matching your domain
- Follow atomic write pattern: write to `.tmp` → `fs.renameSync()`

### `sync-bridge.ts` — External communication (optional)
- Define `BridgeMessageType` union with your protocol
- Implement `send()` for outgoing, `pollAndProcess()` for incoming
- Heartbeat + connectivity check with timeout threshold

### `YOUR_BRAIN-tools.ts` — Agent tools (optional)
- Each tool wraps a call to `brain.yourMethod()`
- Always check `brain.isInitialized()` first
- Return user-friendly strings

### `YOUR_BRAIN-hook.ts` — Context injection (optional)
- Get brain singleton via `getYourBrainBrain()`
- Check `isInitialized()` first
- Inject context via `output.system.push()`
- Wrap EVERYTHING in try/catch

## Critical Rules (Violations = Theatrical Code)

1. **All catches must log errors** — `console.error('[Prefix]', err.message)`
2. **Brain init failure = graceful null** — NEVER crash the plugin
3. **Hooks must NEVER throw** — wrap everything in try/catch
4. **No `as any` on private fields** — add public API methods instead
5. **No `console.log` in production code paths** — use logger or `console.warn/error`
6. **safeHook breaks `tool.execute.*` hooks** — use raw async functions
7. **Model at top level in opencode.json** — NOT inside provider block
8. **Container test via `docker exec -it`** — NOT `docker attach` or `docker logs`
