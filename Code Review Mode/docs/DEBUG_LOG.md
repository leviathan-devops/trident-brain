# TRIDENT v3.3.3-FIXED — DEBUG LOG

**Date:** 2026-05-28
**Status:** ALL ISSUES RESOLVED

---

## Issue #1: safeHook Swallowing Errors

**Symptom:** Tool blocking completely non-functional. Model could write/edit/bash files freely.

**Root Cause:** safeHook catch block logged errors but didn't rethrow them. OpenCode received resolved promises (no error), so tools executed normally.

**Fix:** Added `throw err;` to safeHook catch block.

**Verification:** Container test showed `[TRIDENT TOOL BLOCK]` message and file NOT created.

---

## Issue #2: Handler Returning Block Objects

**Symptom:** Even with safeHook fix, blocking still didn't work consistently.

**Root Cause:** Handler functions changed from `throw new Error()` to `return { blocked: true }`. OpenCode's hook API returns `Promise<void>`, so return values are ignored.

**Fix:** Changed handlers back to `throw new Error()` pattern (matching v3.3.2).

**Verification:** Container test showed blocking working on first attempt.

---

## Issue #3: Agent Detection Failing for tool.execute.before

**Symptom:** Hook fired but agent check always failed, so handler never executed.

**Root Cause:** `input.session.agentName` is undefined for `tool.execute.before` hook. The hook only receives `{ tool, sessionID, callID }`.

**Fix:** Created `resolveHookAgent(input)` function with `sessionAgentMap` fallback via sessionID.

**Verification:** Container test showed `agent="trident"` in diagnostic output.

---

## Issue #4: Identity Injection Timing (Push vs Replace)

**Symptom:** Model responded as "opencode" on first message.

**Root Cause:** Used `output.system = [header]` which replaces the entire system prompt. OpenCode adds default "You are opencode" AFTER the hook, overwriting the replacement.

**Fix:** Changed to `output.system.push(header)` (Kraken pattern).

---

## Issue #5: PATH_ALLOWLIST Rejecting Valid Paths

**Symptom:** Artifact generation failed with "PATH_ALLOWLIST: Write rejected" error.

**Root Cause:** Regex tested full path instead of basename.

**Fix:** Extract basename via `targetPath.split('/').pop()` before regex test.

---

## Issue #6: Deploy Script Missing Identity Files

**Symptom:** Identity not loaded after deployment.

**Root Cause:** `deploy.sh` copied dist files but not `identity/trident/*.md` files.

**Fix:** Added identity file copying to all deploy scripts.

---

## Issue #7: Console Log Spillover

**Symptom:** `[TRIDENT DIAG]` messages appearing in TUI output for every hook invocation, polluting other agents' context.

**Root Cause:** 5 `console.error` calls in safeHook and catch block fired on every hook invocation.

**Fix:** Removed all 5 `console.error` calls. Result: 0 diagnostic output in production code.

---

## Issue #8: Duplicate systemTransformHandler

**Symptom:** Dead code — `systemTransformHandler` function defined but never used (identity injection was inlined in hooks registration).

**Root Cause:** Multiple edits left behind a redundant function definition.

**Fix:** Removed the unused `systemTransformHandler` function entirely.

---

## Issue #9: Cross-Agent Identity Corruption (Tab Toggle)

**Symptom:** Tab-toggling from Trident to Build agent caused Build to respond "I am TRIDENT BRAIN" — Trident identity leaked to other agents.

**Root Cause:** `experimental.chat.system.transform` fires for ALL sessions regardless of agent. No per-agent sandboxing mechanism existed. OpenCode 1.14.34 does not provide agent info in this hook (`input.agent` and `output.agent` are always undefined).

**Debug Process:**
1. Dumped hook input/output keys at runtime — confirmed only `["sessionID","model"]` for input, `["system"]` for output
2. Tested `event` hook for `session.created` events — only fires `installation.update-available`
3. Tested `process.argv` check — not available in plugin context
4. Tested `output.system` agent instruction check — instructions not yet populated at hook time
5. Read Shark v4.9 source — discovered `messages.transform` + `setCurrentAgent` pattern
6. Logged hook execution order — confirmed `messages.transform` fires BEFORE subsequent `system.transform` calls

**Final Working Fix:** Two hooks working together:
1. **`messages.transform`** — finds LAST user message with `info.agent` → calls `setCurrentAgent(agent, sessionID)` for Trident or `undefined` for others
2. **`system.transform`** — calls `getCurrentAgent(sessionID)` → only injects if agent IS Trident

Bug encountered: first version picked FIRST message with agent info (from old Trident session), causing Build to be treated as Trident. Fixed by iterating to LAST user message instead.

**Verification:** Container test with MiMo V2 Pro — Build agent responds "I'm opencode" (NOT corrupted), Trident responds "I am TRIDENT BRAIN".

---

## Issue #10: Identity Header Too Weak for Live Multi-Plugin Environment

**Symptom:** Trident identity worked in single-plugin container test but FAILED in live environment with Kraken+Shark+Hive loaded. Model responded "I am opencode" instead of "I am TRIDENT BRAIN."

**Root Cause:** Plain-text identity header was too weak. The OpenCode default "You are opencode" system prompt overrode it. Read `identity-testing.md` — Shark v4.9 succeeded where Trident failed because Shark uses CRITICAL box-character formatted identity binding that the model treats as a SYSTEM directive.

**Debug Process:**
1. Read `identity-testing.md` — confirmed Kraken also failed (same weak identity issue)
2. Confirmed Shark succeeded — model explicitly reads "CRITICAL: You ARE SHARK v4.9... This identity is NON-NEGOTIABLE"
3. Read Shark v4.9 source — identity is formatted with Unicode box-drawing characters (┏━┓, ┃, ┗━┛) and CRITICAL/NON-NEGOTIABLE language
4. Shark's identity spans 7+ sections (IDENTITY, PERSONA, TRIPLE-BRAIN ARCHITECTURE, 8 CORE DIRECTIVES, GATE CHAIN, 24 FIREWALL LAYERS, ANTI-HALLUCINATION PROTOCOL, MANTRA)

**Fix:** Rewrote `formatIdentityHeader` in `dist/identity/injector.js` to build a Shark-style CRITICAL box-character identity binding. The header loads ALL sections from the identity files (TRIDENT.md, IDENTITY.md, EXECUTION.md, QUALITY.md) via the parsed `bundle` object:
- CORE DIRECTIVES (from TRIDENT.md directives)
- CORE MANTRA (from TRIDENT.md mantra)
- EXPERTISE (from IDENTITY.md expertise)
- NEVER DO (from EXECUTION.md neverDo)
- ANTI-THEATRICAL PROTOCOL
- OUTPUT FORMAT
- AVAILABLE TOOLS
- BLOCKED TOOLS

**Verification:** Container test with MiMo V2 Pro — model's thinking explicitly references the identity binding and responds exactly as specified: "I am TRIDENT BRAIN, an Algorithmic Code Review Agent. Trident Documents. Humans Fix."

---

## Issue #11: Artifact Folder Not Configured

**Symptom:** Artifacts written to `process.cwd()` instead of a dedicated Trident directory.

**Root Cause:** No `TRIDENT_ARTIFACT_DIR` constant existed. All writes used `path.join(process.cwd(), ...)`.

**Fix:** Added `TRIDENT_ARTIFACT_DIR` constant and replaced all `process.cwd()` artifact writes. Result: 0 `process.cwd()` calls in artifact paths.

---

## Issue #12: Semantic Naming Uses Filepath Derivation

**Symptom:** Report filenames derived from filepaths (e.g., `TRIDENT_CODE_REVIEW_root_config_opencode_plugins_trident_dist_2026-05-27.md`) — unreadable, inconsistent.

**Root Cause:** `getSemanticReportName` derived context from target path sanitization.

**Fix:** Changed signature to accept `contextLabel` parameter. Standardized across all calls to `'TRIDENT_CODEBASE_ANALYSIS'`.

---

## Summary

12 issues identified and resolved across 5 engineering sessions. Each fix verified in live container tests with real TUI and real model responses (MiMo V2 Pro, Big Pickle, Nemotron 3 Super Free).

Key architectural learnings:
1. OpenCode 1.14.34 `system.transform` hook provides NO agent info — must use `messages.transform` for agent detection
2. `messages.transform` must use LAST user message for agent detection (first message can be from stale sessions)
3. Identity header MUST use CRITICAL box-character formatting to override OpenCode default system prompt
4. The `event` hook only fires `installation.update-available` in OpenCode 1.14.34 — not usable for session tracking
