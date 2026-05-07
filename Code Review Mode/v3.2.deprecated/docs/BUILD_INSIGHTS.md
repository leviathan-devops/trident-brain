# Trident v3.2 Build Insights

## CRITICAL: bun --bundle vs tsc

### The Problem
`bun build --bundle` inlines `@opencode-ai/plugin` incorrectly. It replaces
the real `tool()` function with a stub that just returns its input:

```javascript
// bun --bundle WITHOUT --external produces this BROKEN stub:
function tool(input) { return input; }
```

This means tools like `trident-audit`, `trident-status`, etc. are defined
in the bundle but never actually registered as OpenCode tools. The model
cannot call them.

### The Fix
Always use `--external @opencode-ai/plugin` when building with bun:

```bash
bun build src/index.ts \
  --outdir dist \
  --target bun \
  --format esm \
  --bundle \
  --external @opencode-ai/plugin  # ← REQUIRED
```

This keeps the `@opencode-ai/plugin` import intact so OpenCode resolves
the real `tool()` function at runtime.

### Safe Fallback
```bash
npx tsc  # Keeps all imports intact, works correctly
npm run build  # Same as above
```

### How to Verify
After building, check:
```bash
grep -c "@opencode-ai/plugin" dist/index.js  # Should be 1 (external import)
grep -c "function tool" dist/index.js        # Should be 0 (no stub)
grep -c "tool(" dist/index.js                # Should be 4+ (real tool calls)
```

### The Old Version That Worked
The 15.9KB tsc-built version had the real `@opencode-ai/plugin` import
and proper tool registrations. The 100KB/525KB bun-bundled versions
without `--external` were broken.

## Reload Anchor Locking
The reload anchor at `Reload Anchor v3.2/` is sudo-locked:
- Owner: root:root
- Files: chmod 444 (read-only)
- Dirs: chmod 555 (read+execute)
- Modifications require: sudo + password
