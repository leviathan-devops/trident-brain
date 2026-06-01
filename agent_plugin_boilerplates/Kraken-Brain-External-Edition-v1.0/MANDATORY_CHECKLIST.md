# MANDATORY CHECKLIST — Kraken Brain Merge Readiness

Use this checklist before integrating a new brain into the Kraken orchestrator baseline.

## Pre-Build (P)
- [ ] Types defined: state interface, domain types, constants
- [ ] Brain class: constructor, initialize(), isInitialized(), cleanup()
- [ ] Singleton factory: create*Brain(), get*Brain()
- [ ] All `{PLACEHOLDER}` instances replaced with actual brain values
- [ ] Domain-ownership.ts updated with new brain ID and domain

## Build (B)
- [ ] `bun build` succeeds (0 errors, 0 warnings)
- [ ] `bun tsc --noEmit` passes
- [ ] Bundle size acceptable (< 1MB for simple brain)

## Tests (T)
- [ ] Brain initializes and reports state correctly
- [ ] Cleanup does not throw
- [ ] Double initialize is idempotent
- [ ] (If store) Persistence round-trip works
- [ ] (If sync bridge) Message send/receive works
- [ ] All error paths are caught and logged

## Integration (I)
- [ ] PFC-style init block is wrapped in try/catch
- [ ] Tools register correctly in agent config
- [ ] Hooks inject context without throwing
- [ ] Compaction survival hook preserves brain state
- [ ] Session end fires cleanup()

## External Bridge (E)
- [ ] HAND.toml parses without errors
- [ ] SYSTEM_PROMPT.md has all operating phases
- [ ] SKILL.md has domain expertise sections
- [ ] Hand can be installed via `openfang hand install`
- [ ] Hand can be activated via `openfang hand activate`

## Security (S)
- [ ] All catch blocks log errors (no silent catches)
- [ ] Brain init failure is wrapped in try/catch (graceful null)
- [ ] No `as any` access to private fields
- [ ] No console.log in production paths (use logger)
- [ ] Hooks never throw — all wrapped in try/catch

## Deployment (D)
- [ ] Bundle copied to plugin directory
- [ ] `opencode.json` updated with plugin path
- [ ] Container TUI test verifies hooks fire
- [ ] Compaction survival test passes
