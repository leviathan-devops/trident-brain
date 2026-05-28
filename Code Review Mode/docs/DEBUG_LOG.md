# TRIDENT v3.3.3-FIXED — DEBUG LOG

**Date:** 2026-05-27
**Status:** ALL ISSUES RESOLVED

---

## Issue #1: safeHook Swallowing Errors

**Symptom:** Tool blocking completely non-functional. Model could write/edit/bash files freely.

**Root Cause:** safeHook catch block logged errors but didn't rethrow them. OpenCode received resolved promises (no error), so tools executed normally.

**Debug Process:**
1. Verified hook was firing (diagnostic logging confirmed)
2. Verified agent detection was working (sessionAgentMap fallback)
3. Verified handler was throwing errors (checkToolBlock returned { blocked: true })
4. Discovered safeHook catch block had no `throw err;` statement

**Fix:** Added `throw err;` to safeHook catch block.

**Verification:** Container test showed `[TRIDENT TOOL BLOCK]` message and file NOT created.

---

## Issue #2: Handler Returning Block Objects

**Symptom:** Even with safeHook fix, blocking still didn't work consistently.

**Root Cause:** Handler functions changed from `throw new Error()` to `return { blocked: true }`. OpenCode's hook API returns `Promise<void>`, so return values are ignored.

**Debug Process:**
1. Read OpenCode plugin API types (`@opencode-ai/plugin`)
2. Confirmed `tool.execute.before` signature returns `Promise<void>`
3. Understood that only thrown errors propagate to OpenCode

**Fix:** Changed handlers back to `throw new Error()` pattern (matching v3.3.2).

**Verification:** Container test showed blocking working on first attempt.

---

## Issue #3: Agent Detection Failing for tool.execute.before

**Symptom:** Hook fired but agent check always failed, so handler never executed.

**Root Cause:** `input.session.agentName` is undefined for `tool.execute.before` hook. The hook only receives `{ tool, sessionID, callID }`, not agent info.

**Debug Process:**
1. Added diagnostic logging to safeHook: `console.error('[TRIDENT DIAG] agent=' + agentName)`
2. Saw `agent=""` in output - empty string means no agent info
3. Realized sessionAgentMap could provide fallback via sessionID

**Fix:** Created `resolveHookAgent(input)` function that:
1. Checks `input.session.agentName` (direct)
2. Falls back to `input.agent` (alternative field)
3. Falls back to `sessionAgentMap.get(input.sessionID)` (cross-hook)

**Verification:** Container test showed `agent="trident"` in diagnostic output.

---

## Issue #4: Identity Injection Timing

**Symptom:** Model responded as "opencode" on first message, even though identity was injected.

**Root Cause:** Used `output.system = [header]` which replaces the entire system prompt. OpenCode adds default "You are opencode" AFTER the hook, so replacement was overwritten.

**Debug Process:**
1. Read Kraken plugin source code
2. Discovered Kraken uses `output.system.push()` not `output.system = [header]`
3. Understood that push adds to END, preserving default prompt

**Fix:** Changed to `output.system = output.system || []; output.system.push(header);`

**Verification:** Container test showed model mentioning "TRIDENT BRAIN" in response.

---

## Issue #5: Identity Header Too Defensive

**Symptom:** Model still identified as "opencode" even with identity injection.

**Root Cause:** Identity header said "You are NOT opencode" which fought against the default system prompt. Model tried to reconcile both instructions.

**Debug Process:**
1. Read Kraken's identity injection pattern
2. Kraken uses concise, action-oriented identity: "[KRAKEN ORCHESTRATION LAYER ACTIVE]"
3. Understood that identity should ASSERT, not DEFEND

**Fix:** Changed to concise, authoritative header:
```
[TRIDENT BRAIN ACTIVE]
You are the Trident Brain code review agent — Algorithmic Code Review Agent.
Your name is TRIDENT BRAIN. You are NOT "opencode". When users ask who you are, say "I am TRIDENT BRAIN".
```

**Verification:** Container test showed model saying "I am TRIDENT BRAIN." on first message.

---

## Issue #6: PATH_ALLOWLIST Rejecting Valid Paths

**Symptom:** Artifact generation failed with "PATH_ALLOWLIST: Write rejected" error.

**Root Cause:** Regex tested full path instead of basename. Absolute paths like `/opt/opencode/TRIDENT_CODE_REVIEW_*.md` failed because they don't start with `TRIDENT_`.

**Debug Process:**
1. Added logging to PATH_ALLOWLIST function
2. Saw full path being tested: `/opt/opencode/TRIDENT_CODE_REVIEW_...`
3. Regex `^(\/|TRIDENT_)(CODE_REVIEW_|BUILD_REPORT_).+\.md$` didn't match

**Fix:** Changed to extract basename first:
```javascript
const filename = targetPath.split('/').pop();
const pattern = /^(\/|TRIDENT_)(CODE_REVIEW_|BUILD_REPORT_).+\.md$/;
```

**Verification:** Container test showed artifacts created successfully.

---

## Issue #7: Deploy Script Missing Identity Files

**Symptom:** Identity not loaded after deployment.

**Root Cause:** `deploy.sh` copied dist files but not `identity/trident/*.md` files.

**Debug Process:**
1. Checked deployed directory structure
2. Found `identity/trident/` directory was empty
3. Realized deploy script only copied `dist/` files

**Fix:** Added identity file copying to all deploy scripts.

**Verification:** Container test showed `state.identityLoaded = true`.

---

## Summary

All 7 issues identified and resolved. Each fix verified in live container tests with real TUI and real model responses.
