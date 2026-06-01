# HOTFIX LOG — Critical Patterns for Kraken Brain Builders

This file documents patterns learned from building the Prefrontal Cortex that are critical for all future Kraken brains.

## 1. `safeHook` vs `tool.execute.*` Hooks

**Problem:** The `safeHook()` wrapper from v4.1 blocks `tool.execute.before` and `tool.execute.after` hooks. Tool hooks wrapped in `safeHook()` are silently never called.

**Fix:** Use raw `async (input, output) => { ... }` functions for `tool.execute.before` and `tool.execute.after`. Do NOT wrap them in `safeHook()`.

**Correct:**
```typescript
'tool.execute.before': async (input: any, output: any) => {
  try { /* ... */ } catch (err) { console.error(err); }
}
```

**Wrong:**
```typescript
'tool.execute.before': safeHook(async (input, output, ctx) => {
  // NEVER CALLED
}, { ... })
```

## 2. PFC Init Must Be Wrapped in Try/Catch

**Problem:** If PFC brain init throws, the ENTIRE plugin factory fails and the Kraken orchestrator won't load.

**Fix:** Always wrap brain creation and init in try/catch, set brain reference to null on failure, guard all usages with optional chaining.

```typescript
let brain;
try {
  brain = createBrain({ stateStore, messenger });
  brain.initialize();
} catch (err) {
  console.error('[Brain] Init failed:', err);
  brain = null;
}
// Later: brain?.isInitialized() ?? false
```

## 3. Private Field Access via `as any`

**Problem:** Accessing `tracer as any` to read private fields (`tAny.toolCallBuffer`, `tAny.cortexStore.data`) silently breaks when fields are renamed — TypeScript private fields are not protected in JS runtime, but the pattern is fragile.

**Fix:** Always add PUBLIC API methods to sub-components rather than accessing private fields.

```typescript
// In the class:
getBufferSize(): number { return this.buffer.length; }

// In hooks:
tracer.getBufferSize()  // NOT: (tracer as any).toolCallBuffer?.length
```

## 4. `bun:sqlite` Unavailable

**Problem:** OpenCode runs on Node.js, not Bun. Node.js does not have `bun:sqlite`.

**Fix:** Use JSON file stores instead. Pattern: Map-based in-memory caches serialized to JSON files with atomic writes (`.tmp` → `rename`).

## 5. Container Testing Requires `docker exec -it`

**Problem:** `docker attach` connects to the sleep process, not the opencode process. `docker logs` shows wrong output.

**Fix:** Use `docker exec -it` for TUI access. Capture output with `tmux capture-pane`.

## 6. `opencode run` Does NOT Fire Hooks

**Problem:** `opencode run --agent kraken --print-logs "..."` does NOT fire `tool.execute.before/after` or `experimental.chat.system.transform` hooks.

**Fix:** Only the TUI (interactive terminal) fires all hooks. Container test must use tmux + `docker exec -it`.

## 7. Model at Top Level of opencode.json

**Problem:** If `"model"` is inside the `"provider"` block, opencode 1.14.x ignores it and falls back to the wrong model.

**Fix:** `"model"` must be at the TOP LEVEL of `opencode.json`, not nested inside `provider`.
