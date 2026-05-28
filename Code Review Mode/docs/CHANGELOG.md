# TRIDENT v3.3.3-FIXED — CHANGELOG

**Date:** 2026-05-27
**Version:** 3.3.3-FIXED
**Previous Version:** 3.3.2

---

## Changes from v3.3.2 to v3.3.3-FIXED

### Added

- **safeHook wrapper:** Agent-scoped hook execution with timeout protection
- **resolveHookAgent function:** Fallback agent detection via sessionAgentMap
- **sessionAgentMap:** Cross-hook agent tracking (chat.message registers, tool.execute.before checks)
- **Diagnostic logging:** `[TRIDENT DIAG]` messages for all hook firings
- **Identity file loading:** Loads TRIDENT.md, IDENTITY.md, EXECUTION.md, QUALITY.md from `identity/trident/`
- **Identity injection:** System prompt injection via `experimental.chat.system.transform`
- **Build report generation:** `TRIDENT_BUILD_REPORT_*.md` alongside code review
- **Hive blocking:** `HIVE_BLOCKED_TOOLS_FOR_TRIDENT` list for hive-context-read-only enforcement

### Changed

- **safeHook error handling:** Now rethrows errors instead of swallowing them
- **Handler error pattern:** Returns `throw new Error()` instead of `return { blocked: true }`
- **Identity injection method:** Uses `output.system.push()` instead of `output.system = [header]`
- **Identity header format:** Concise, authoritative instead of defensive
- **PATH_ALLOWLIST:** Extracts basename before regex test
- **Version strings:** All updated to 3.3.3-FIXED
- **Deploy scripts:** Now copy identity files alongside dist files

### Fixed

- **Tool blocking:** Now actually blocks write/edit/bash tools (was completely broken)
- **Agent detection:** Now works for tool.execute.before hook (was always failing)
- **Identity injection:** Now visible to model on first message (was invisible)
- **Artifact generation:** Now writes to correct paths (was rejected by PATH_ALLOWLIST)
- **Deploy completeness:** Now includes identity files (was missing)

---

## File Changes

### dist/index.js

| Line Range | Change |
|------------|--------|
| 112-121 | Added `resolveHookAgent` function |
| 122-168 | Rewrote `safeHook` with proper error rethrow |
| 649-657 | Changed `toolExecuteBeforeHandler` to throw errors |
| 701-717 | Changed `system.transform` to use push-based injection |

### dist/identity/injector.js

| Line Range | Change |
|------------|--------|
| 36-43 | Rewrote `formatIdentityHeader` to be concise and authoritative |

### dist/artifact-writer.js

| Line Range | Change |
|------------|--------|
| 199-208 | Fixed `PATH_ALLOWLIST` to extract basename before regex test |

### identity/trident/TRIDENT.md

| Line | Change |
|------|--------|
| 15 | Updated version to 3.3.3-FIXED |
| 32 | Updated version to 3.3.3-FIXED |

### identity/trident/IDENTITY.md

| Line | Change |
|------|--------|
| 31 | Updated self-knowledge to v3.3.3-FIXED |

### scripts/deploy.sh

| Line Range | Change |
|------------|--------|
| 22-28 | Added identity file copying |

### scripts/deploy-from-global-anchor.sh

| Line Range | Change |
|------------|--------|
| 73-80 | Updated verification to check for `blocked: true` pattern |

### scripts/lock-anchor.sh

| Line Range | Change |
|------------|--------|
| 24-25 | Updated verification description |
| 60-65 | Updated verification to check for `blocked: true` pattern |

---

## Breaking Changes

None. This is a bugfix release that restores functionality broken in v3.3.3.

---

## Migration from v3.3.2

1. Replace `dist/` directory with new files
2. Replace `identity/trident/` directory with new files
3. Replace `scripts/` directory with new files
4. Restart OpenCode for changes to take effect

No configuration changes required.
