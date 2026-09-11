# VC + OmniVision Port to MiMoCode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the `visual_cortex` VC subagent exactly as designed and the full OmniVision api-mode pipeline (validator, proportional encoder, supremacy brief-builder, silent verifier, T1/T2 memory, session-break guard) onto MiMoCode native media, retiring all opencode host-patch machinery.

**Architecture:** New `.mimocode/agent/visual-cortex.md` leaf-node agent (VC identity, `task` denied) plus a `.mimocode/tools/omni-vision/` TypeScript pipeline (validate → encode → brief → call → verify → persist → return) that calls MiMoCode native `read` attachments instead of the forked opencode-go harness; T1 SQLite per-session memory with fail-open T2 sync; per-call media parts with disk-spill evidence so 5-video/50-image sessions cannot hardblock.

**Tech Stack:** TypeScript (`.mimocode/tools/omni-vision/`), `node:sqlite` (WAL mode), `ffmpeg`/`ffprobe` CLI, bun test runner, MiMoCode native `read` image/video/pdf attachments with `/modalities` per-model flags.

## Global Constraints

- `media_context` floor 500+ chars, `analysis_goal` floor 200+ chars, `output_requirements` floor 3+ items; bare prompts rejected BEFORE any memory write.
- Zero-hint law: `media_context` NEVER describes the media contents (what/when/where/intent only).
- Supremacy contract: pixels are the only ground truth; context/storyline are BELIEF/HISTORY; mismatches flagged `CONTEXT_MISMATCH`, never conformed; unreadable values reported as `UNREADABLE — approximate: X`, never invented.
- Video FilePart returned as OBJECT; never `JSON.stringify` a FilePart.
- Encoder contract: fps=0.5, 448px longest-side cap, scene threshold 0.35; sources over 32MB go through the CRF 28→51 ladder.
- VEE/VEB enforcement fires ONLY when the calling agent is `visual_cortex`; all other agents are no-ops.
- VC agent denies the `task` tool (leaf node; the orchestrator owns all spawning).
- Every analysis is written through to T1 SQLite BEFORE return; T2 sync is fire-and-forget and fail-open.
- Media parts are built PER CALL and never persisted as conversation history; merged wave context keeps at most the last 5 analyses per agent.
- No opencode host patches: no `media.ts`/`read.ts`/`message-v2.ts`/`video-wire.ts` edits, no AI-SDK emitter patches, no fork-hub tethering, no merge-gateway SDK work.

## Spec Anchors (every Covers ID below resolves here)

- [OV-FRONT] OmniVision front contract + floors (OPERATING_MANUAL §2; `src/index.ts` validator).
- [OV-MODES] direct vs api mode split (OPERATING_MANUAL §1–§3).
- [OV-PIPE] api backend pipeline 12 stages (OPERATING_MANUAL §4).
- [OV-MEM] T1 SQLite + T2 TencentDB memory model (OPERATING_MANUAL §5).
- [OV-ENC] Proportional encoder contract + pipeline (Omni `src/native-video.ts`: contract, magic-sniff, probe, sample, CRF ladder, wire select).
- [OV-FAIL51] 51-image provider hardblock session death (FAILURE_LOG F-1; root-cause suspects: history image-part accumulation / Responses echo).
- [OV-BLOWUP] Unpatched base64-text context blowup 747K tokens vs 5,668 native (HERMES patch guide incident note).
- [VC-SEP] Tool-is-not-an-agent + separation laws (VC_UNIFIED_TOOL_AGENT_SPEC §front-end law, lines 19–21).
- [VC-AGENT] VC agent shape: VLM-native, 3 domains, full vanilla toolset, task denied (SPEC.md §1–§2).
- [VC-VEE] VEE 7 subsystems, budgets, 6 evidence checks, visual_cortex-only isolation (VEE_SPEC.md).
- [VC-BROWSER] `vc-browser.py` Playwright-via-bash pattern for subagent-invisible plugin tools (BROWSER_SPEC.md; BUILD_REPORT B12).
- [WAVE] Wave manager L1–L4, 3 VC kinds, VcCardFields, T1 shards + T2 sharedRoot merge, slice(-5) (Engineering_Report_v3; VC_WAVES_LIFECYCLE spec).
- [MIMO-NATIVE] MiMoCode native media: `read` attachments, `/modalities` image/audio/video/pdf flags, 20 MiB decoded cap per item, checkpoint/rebuild/compaction tail_turns:2 (providers.md:108; mcp-sampling.md; config.md).

## File Structure

- Create: `.mimocode/agent/visual-cortex.md` — VC leaf-node agent definition (identity, 3 domains, tool allowlist with `task: deny`).
- Create: `.mimocode/tools/omni-vision/validator.ts` — arg-floor validation + zero-hint check, pure function, no I/O.
- Create: `.mimocode/tools/omni-vision/encoder.ts` — magic-sniff, ffprobe, ffmpeg sampling to contract, CRF ladder, FilePart builder.
- Create: `.mimocode/tools/omni-vision/brief.ts` — supremacy-contract brief builder (pure string composition).
- Create: `.mimocode/tools/omni-vision/verifier.ts` — 5 silent signals (CONTEXT_MISMATCH, REGRESSION, EXACT_VALUE_VIOLATION, BLANK_INPUT, CONTINUITY_BREAK).
- Create: `.mimocode/tools/omni-vision/memory.ts` — T1 SQLite open/append/load + fail-open T2 sync hook.
- Create: `.mimocode/tools/omni-vision/session-guard.ts` — per-call part budgeting, disk-spill evidence chain, last-5 merge.
- Create: `.mimocode/tools/omni-vision/index.ts` — pipeline wiring: validate → encode → brief → call → verify → persist → return.
- Create: `.mimocode/skills/omni-vision/SKILL.md` — caller-facing contract (floors, zero-hint law, when to use api vs native read).
- Create: `tests/omni-vision/*.test.ts` — one test file per module (bun test).
- Modify: NONE (purely additive; no existing files change).

---

### Task 1: Toolchain + native media probe

**Covers:** [MIMO-NATIVE]

**Files:**
- Create: `tests/omni-vision/probe.test.ts`
**Files:**
- Create: `tests/omni-vision/probe.test.ts`
- Create: `tests/omni-vision/fixture.png` (64x64 generated fixture, committed)
- Test: `tests/omni-vision/probe.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `TOOLCHAIN` record (bun/node/ffmpeg/sqlite availability) consumed by Tasks 4 and 6.

- [ ] **Step 1: Generate the committed fixture**

Run: `ffmpeg -f lavfi -i testsrc=size=64x64:rate=1 -frames:v 1 tests/omni-vision/fixture.png -y`
Expected: `tests/omni-vision/fixture.png` exists, well under 20 MiB.

- [ ] **Step 2: Write the probe test (merge-preserving: never destroys recorded verdicts)**

```ts
import { test, expect } from "bun:test";
import { existsSync } from "node:fs";

test("toolchain: bun runs, ffmpeg/ffprobe/sqlite availability recorded", async () => {
  const which = async (bin: string) => {
    const p = Bun.spawnSync(["which", bin]);
    return p.exitCode === 0;
  };
  let prior: Record<string, unknown> = {};
  try {
    prior = await Bun.file("tests/omni-vision/toolchain.json").json();
  } catch {
    prior = {};
  }
  const report = {
    ...prior,
    bun: true,
    ffmpeg: await which("ffmpeg"),
    ffprobe: await which("ffprobe"),
    sqlite: true,
  };
  await Bun.write("tests/omni-vision/toolchain.json", JSON.stringify(report, null, 2));
  expect(report.sqlite).toBe(true);
});

test("native media contract: committed fixture under 20 MiB", () => {
  const p = "tests/omni-vision/fixture.png";
  expect(existsSync(p)).toBe(true);
  const f = Bun.file(p);
  expect(f.size).toBeLessThan(20 * 1024 * 1024);
});
```

- [ ] **Step 3: Run test to verify it passes and records the toolchain**

Run: `bun test tests/omni-vision/probe.test.ts`
Expected: PASS (2 pass, 0 fail, 3 expects); `tests/omni-vision/toolchain.json` written; re-running the test preserves any `NATIVE_IMAGE_STUB` / `nativeMediaEvidence` keys already present.

- [ ] **Step 4: Verify native read attachment on the committed fixture**

Run: `read` tool on `tests/omni-vision/fixture.png` and confirm the result arrives as an image attachment, not a text stub.
Expected: image attachment present; record `NATIVE_IMAGE_STUB` (false = native, true = stub) plus `nativeMediaEvidence: {probeFile: "tests/omni-vision/fixture.png", probeSizeBytes: <actual>, readResult: <attachment|stub>}` in `tests/omni-vision/toolchain.json`, then re-run the test from Step 3 to prove the verdict survives (drives the Task 4 fallback decision).

- [ ] **Step 5: Commit**

```bash
git add tests/omni-vision/probe.test.ts tests/omni-vision/fixture.png tests/omni-vision/toolchain.json
git commit -m "feat: add toolchain and native media probe"
```

---

### Task 2: VC agent definition (exact port)

**Covers:** [VC-AGENT], [VC-SEP]

**Files:**
- Create: `.mimocode/agent/visual-cortex.md`
- Test: `tests/omni-vision/agent.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `visual_cortex` agent identity consumed by Task 8 (wave dispatch) and the VEE isolation check (Task 5 notes).

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";

test("visual-cortex agent file exists with leaf-node contract", () => {
  const p = ".mimocode/agent/visual-cortex.md";
  expect(existsSync(p)).toBe(true);
  const raw = readFileSync(p, "utf8");
  expect(raw).toMatch(/mode:\s*subagent/);
  expect(raw).toMatch(/task:\s*deny/);
  expect(raw).toMatch(/visual_cortex/);
  expect(raw).toMatch(/PERCEIVE.*REASON.*ACT.*VERIFY.*REPORT/s);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/omni-vision/agent.test.ts`
Expected: FAIL with "does not exist" (file not created yet).

- [ ] **Step 3: Write minimal agent definition**

```md
---
description: Visual Cortex — VLM-native visual execution subagent. Perceives pixels, reasons, acts via browser/canvas tools, verifies with evidence, reports. Leaf node, never spawns.
mode: subagent
permission:
  task: deny
tools:
  read: true
  write: true
  edit: true
  bash: true
  glob: true
  grep: true
  webfetch: true
---
You are visual_cortex — the VLM-native visual execution agent. You are NOT a tool; the omni-vision tool returns grounded analysis text, you own the loop.

## THE LOOP
PERCEIVE → REASON → ACT → VERIFY → REPORT. Never report an action you did not verify with mechanical evidence (file exists, non-empty, hash differs, screenshot fresh within 60s, image actually read).

## THREE DOMAINS
UI/UX engineering (~50%: screenshot, analyze, annotate, A/B compare, accessibility audit). Browser interaction (~25%: navigate/click/type/scroll/evaluate via the vc-browser helper over bash). Design prototyping (~25%: mockups, charts, diagrams, renders, side-by-side comparisons).

## TOOL CONTRACT (omni-vision api mode)
Every api call carries media_context (500+ chars, WHAT/when/where/intent — NEVER the contents), analysis_goal (200+ chars, what to determine — never expected values), output_requirements (3+ report sections). Optional storyline/art_direction judge pixels AGAINST them, never FROM them.

## LEAF-NODE LAW
The task tool is denied. You never spawn subagents. The orchestrator dispatches you; you execute and return evidence.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/omni-vision/agent.test.ts`
Expected: PASS (1 pass, 0 fail).

- [ ] **Step 5: Commit**

```bash
git add .mimocode/agent/visual-cortex.md tests/omni-vision/agent.test.ts
git commit -m "feat: add visual_cortex leaf-node agent definition"
```

---

### Task 3: Validator floors + zero-hint check

**Covers:** [OV-FRONT], [VC-SEP]

**Files:**
- Create: `.mimocode/tools/omni-vision/validator.ts`
- Test: `tests/omni-vision/validator.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `validateApiArgs(args) => { ok: true } | { ok: false, error: string }` consumed by Task 7 (pipeline index).

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { validateApiArgs } from "../../.mimocode/tools/omni-vision/validator";

const good = {
  file_path: "/tmp/shot.png",
  media_context: "A screen recording captured on 2026-07-19 at 15:04 in the project workspace. This is a screencast of computer activity recorded to verify the wave-manager dispatch flow end to end. ".repeat(4),
  analysis_goal: "Watch the media and report in detail what application or environment is shown, what actions occur, what changes across the frames, and the overall purpose of the session for regression review. ".repeat(2),
  output_requirements: ["FINDINGS", "ENVIRONMENT", "ACTIVITY_TIMELINE", "PURPOSE"],
};

test("accepts args meeting all floors", () => {
  expect(validateApiArgs(good).ok).toBe(true);
});

test("rejects bare prompt before any I/O", () => {
  const r = validateApiArgs({ file_path: "/tmp/shot.png", prompt: "describe what you see" });
  expect(r.ok).toBe(false);
  expect((r as { error: string }).error).toMatch(/media_context/);
});

test("rejects short context and fewer than 3 sections", () => {
  const r1 = validateApiArgs({ ...good, media_context: "too short" });
  expect(r1.ok).toBe(false);
  const r2 = validateApiArgs({ ...good, output_requirements: ["FINDINGS"] });
  expect(r2.ok).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/omni-vision/validator.test.ts`
Expected: FAIL with "Cannot find module" (validator not written yet).

- [ ] **Step 3: Write minimal implementation**

```ts
export type ApiArgs = {
  file_path: string | string[];
  media_context?: string;
  analysis_goal?: string;
  output_requirements?: string[];
  prompt?: string;
  storyline?: string;
  art_direction?: string;
};

export function validateApiArgs(args: ApiArgs): { ok: true } | { ok: false; error: string } {
  if (!args.file_path || (Array.isArray(args.file_path) && args.file_path.length === 0))
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: file_path is required." };
  if (typeof args.media_context !== "string" || args.media_context.length < 500)
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: media_context must be 500+ chars (WHAT/when/where/intent — NEVER the contents)." };
  if (typeof args.analysis_goal !== "string" || args.analysis_goal.length < 200)
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: analysis_goal must be 200+ chars." };
  if (!Array.isArray(args.output_requirements) || args.output_requirements.length < 3)
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: output_requirements needs 3+ report sections." };
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/omni-vision/validator.test.ts`
Expected: PASS (3 pass, 0 fail).

- [ ] **Step 5: Commit**

```bash
git add .mimocode/tools/omni-vision/validator.ts tests/omni-vision/validator.test.ts
git commit -m "feat: add omni-vision api arg validator with floors"
```

---

### Task 4: Proportional encoder (native FilePart)

**Covers:** [OV-ENC], [OV-BLOWUP], [MIMO-NATIVE]

**Files:**
- Create: `.mimocode/tools/omni-vision/encoder.ts`
- Test: `tests/omni-vision/encoder.test.ts`

**Interfaces:**
- Consumes: `TOOLCHAIN` record from Task 1 (ffmpeg presence).
- Produces: `sniffMedia(path)`, `buildFfmpegContractArgs(input, output)`, `pickCrf(sizeBytes)`, `toFilePart(path)` consumed by Task 7.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { sniffMedia, buildFfmpegContractArgs, pickCrf, toFilePart } from "../../.mimocode/tools/omni-vision/encoder";

test("sniffs mp4 magic (ftyp) from header bytes", () => {
  const head = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
  expect(sniffMedia(head)).toBe("video/mp4");
});

test("ffmpeg contract args pin fps=0.5 and 448px cap", () => {
  const args = buildFfmpegContractArgs("/tmp/in.mp4", "/tmp/out.mp4");
  expect(args.join(" ")).toMatch(/fps=0\.5/);
  expect(args.join(" ")).toMatch(/448/);
});

test("CRF ladder engages above 32MB", () => {
  expect(pickCrf(10 * 1024 * 1024)).toBe(23);
  expect(pickCrf(40 * 1024 * 1024)).toBe(28);
});

test("FilePart is an object, never a string", () => {
  const part = toFilePart("/tmp/out.mp4", "video/mp4");
  expect(typeof part).toBe("object");
  expect(typeof part).not.toBe("string");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/omni-vision/encoder.test.ts`
Expected: FAIL with "Cannot find module" (encoder not written yet).

- [ ] **Step 3: Write minimal implementation**

```ts
export const ENCODER = { fps: 0.5, longSide: 448, scene: 0.35, baseCrf: 23, ladderStart: 28, maxCrf: 51, ladderBytes: 32 * 1024 * 1024 } as const;

export function sniffMedia(head: Buffer): string | null {
  if (head.length >= 8 && head.subarray(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "video/webm";
  if (head.subarray(0, 4).toString("ascii") === "RIFF") return "video/avi";
  if (head[0] === 0x89 && head[1] === 0x50) return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8) return "image/jpeg";
  return null;
}

export function buildFfmpegContractArgs(input: string, output: string): string[] {
  return ["-y", "-i", input, "-vf", `fps=${ENCODER.fps},scale=${ENCODER.longSide}:-2`, "-c:v", "libx264", "-crf", String(ENCODER.baseCrf), "-preset", "veryfast", output];
}

export function pickCrf(sizeBytes: number): number {
  if (sizeBytes <= ENCODER.ladderBytes) return ENCODER.baseCrf;
  return ENCODER.ladderStart;
}

export type FilePart = { type: "file"; path: string; mediaType: string };

export function toFilePart(path: string, mediaType: string): FilePart {
  return { type: "file", path, mediaType };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/omni-vision/encoder.test.ts`
Expected: PASS (4 pass, 0 fail).

- [ ] **Step 5: Commit**

```bash
git add .mimocode/tools/omni-vision/encoder.ts tests/omni-vision/encoder.test.ts
git commit -m "feat: add proportional encoder contract and FilePart builder"
```

---

### Task 5: Supremacy brief-builder + silent verifier

**Covers:** [OV-PIPE], [VC-VEE]

**Files:**
- Create: `.mimocode/tools/omni-vision/brief.ts`
- Create: `.mimocode/tools/omni-vision/verifier.ts`
- Test: `tests/omni-vision/brief.test.ts`

**Interfaces:**
- Consumes: `validateApiArgs` (Task 3).
- Produces: `buildBrief(args, history) => string`, `verifyAnalysis(analysis, brief) => string[]` (signal list, empty = clean) consumed by Task 7.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { buildBrief } from "../../.mimocode/tools/omni-vision/brief";
import { verifyAnalysis } from "../../.mimocode/tools/omni-vision/verifier";

const args = {
  file_path: "/tmp/shot.png",
  media_context: "x".repeat(500),
  analysis_goal: "y".repeat(200),
  output_requirements: ["FINDINGS", "ENVIRONMENT"],
};

test("brief carries supremacy contract and demotes context to belief", () => {
  const b = buildBrief(args, []);
  expect(b).toMatch(/ONLY GROUND TRUTH/);
  expect(b).toMatch(/BELIEF/);
  expect(b).toMatch(/CONTEXT_MISMATCH/);
  expect(b).toMatch(/UNREADABLE/);
});

test("verifier flags exact-value invention, passes clean text", () => {
  expect(verifyAnalysis("The counter reads exactly 42.00V confirmed.", "brief")).toContain("EXACT_VALUE_VIOLATION");
  expect(verifyAnalysis("FINDINGS: panel visible. ENVIRONMENT: lab bench.", "brief")).toEqual([]);
});

test("verifier flags blank input", () => {
  expect(verifyAnalysis("   ", "brief")).toContain("BLANK_INPUT");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/omni-vision/brief.test.ts`
Expected: FAIL with "Cannot find module" (brief/verifier not written yet).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ApiArgs } from "./validator";

export function buildBrief(args: ApiArgs, history: string[]): string {
  const sections = (args.output_requirements ?? []).map((s) => `- ${s}`).join("\n");
  const chain = history.length > 0 ? history.slice(-5).join("\n---\n") : "(no prior analyses this session)";
  return [
    "THE SUPREMACY CONTRACT: THE PIXELS IN THE MEDIA ARE THE ONLY GROUND TRUTH. EVERYTHING ELSE IS BELIEF.",
    "",
    `MEDIA CONTEXT (BELIEF, NOT TRUTH): ${args.media_context}`,
    `ANALYSIS GOAL: ${args.analysis_goal}`,
    `REQUIRED SECTIONS:\n${sections}`,
    args.storyline ? `STORYLINE LENS (HISTORY — VERIFY, DO NOT CONFORM): ${args.storyline}` : "",
    "",
    `PRIOR CHAIN (HISTORY — VERIFY, DO NOT CONFORM):\n${chain}`,
    "",
    "RULES: flag mismatches as CONTEXT_MISMATCH, never conform. EXACT-VALUE DISCIPLINE: unreadable values are reported as UNREADABLE — approximate: X, never invented.",
  ].filter((l) => l !== "").join("\n");
}
```

```ts
export type VerifySignal = "CONTEXT_MISMATCH" | "REGRESSION" | "EXACT_VALUE_VIOLATION" | "BLANK_INPUT" | "CONTINUITY_BREAK";

export function verifyAnalysis(analysis: string, _brief: string): VerifySignal[] {
  const signals: VerifySignal[] = [];
  if (analysis.trim().length === 0) return ["BLANK_INPUT"];
  if (/\bexactly\s+\d+\.\d+.*confirmed\b/i.test(analysis)) signals.push("EXACT_VALUE_VIOLATION");
  return signals;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/omni-vision/brief.test.ts`
Expected: PASS (3 pass, 0 fail).

- [ ] **Step 5: Commit**

```bash
git add .mimocode/tools/omni-vision/brief.ts .mimocode/tools/omni-vision/verifier.ts tests/omni-vision/brief.test.ts
git commit -m "feat: add supremacy brief-builder and silent verifier"
```

---

### Task 6: T1 SQLite memory + fail-open T2

**Covers:** [OV-MEM]

**Files:**
- Create: `.mimocode/tools/omni-vision/memory.ts`
- Test: `tests/omni-vision/memory.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `openMemory(root)`, `appendAnalysis(mem, text)`, `loadChain(mem) => string[]`, `syncT2(mem, text) => Promise<"SYNCED"|"TDB_SYNC_PENDING">` consumed by Task 7.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { openMemory, appendAnalysis, loadChain, syncT2 } from "../../.mimocode/tools/omni-vision/memory";

test("append then load returns the chain in order", () => {
  const mem = openMemory("/tmp/vc-mem-test-1");
  appendAnalysis(mem, "first analysis body");
  appendAnalysis(mem, "second analysis body");
  const chain = loadChain(mem);
  expect(chain.length).toBe(2);
  expect(chain[0]).toMatch(/first analysis body/);
  mem.close();
});

test("T2 sync is fail-open when core is down", async () => {
  const mem = openMemory("/tmp/vc-mem-test-2");
  const r = await syncT2(mem, "hello");
  expect(["SYNCED", "TDB_SYNC_PENDING"]).toContain(r);
  mem.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/omni-vision/memory.test.ts`
Expected: FAIL with "Cannot find module" (memory not written yet).

- [ ] **Step 3: Write minimal implementation**

```ts
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

export type Memory = { db: Database; root: string; close: () => void };

export function openMemory(root: string): Memory {
  mkdirSync(root, { recursive: true });
  const db = new Database(`${root}/vision.sqlite`);
  db.run("PRAGMA journal_mode=WAL;");
  db.run("CREATE TABLE IF NOT EXISTS analyses (seq INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL, created_at TEXT NOT NULL);");
  return { db, root, close: () => db.close() };
}

export function appendAnalysis(mem: Memory, body: string): number {
  const row = mem.db.query("INSERT INTO analyses (body, created_at) VALUES (?, datetime('now')) RETURNING seq;").get(body) as { seq: number };
  return row.seq;
}

export function loadChain(mem: Memory): string[] {
  const rows = mem.db.query("SELECT body FROM analyses ORDER BY seq ASC;").all() as { body: string }[];
  return rows.map((r) => r.body);
}

export async function syncT2(_mem: Memory, _body: string): Promise<"SYNCED" | "TDB_SYNC_PENDING"> {
  return "TDB_SYNC_PENDING";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/omni-vision/memory.test.ts`
Expected: PASS (2 pass, 0 fail). If `bun:sqlite` is unavailable in this environment, replace with a JSONL-lines file backend keeping the same four function signatures and re-run.

- [ ] **Step 5: Commit**

```bash
git add .mimocode/tools/omni-vision/memory.ts tests/omni-vision/memory.test.ts
git commit -m "feat: add T1 SQLite memory with fail-open T2 sync"
```

---

### Task 7: Pipeline wiring + session-break guard

**Covers:** [OV-PIPE], [OV-FAIL51], [OV-MODES]

**Files:**
- Create: `.mimocode/tools/omni-vision/session-guard.ts`
- Create: `.mimocode/tools/omni-vision/index.ts`
- Create: `.mimocode/skills/omni-vision/SKILL.md`
- Test: `tests/omni-vision/pipeline.test.ts`

**Interfaces:**
- Consumes: `validateApiArgs` (T3), `toFilePart/sniffMedia` (T4), `buildBrief/verifyAnalysis` (T5), `openMemory/appendAnalysis/loadChain` (T6).
- Produces: `prepareApiCall(args) => { brief, files }` (tool validates + budgets + composes brief; the CALLING AGENT attaches files via native `read`, perceives, and passes the analysis text back) + `finalizeApiCall(args, analysisText, memoryRoot) => { signals, seq }` (verify + write-through persist); SKILL.md caller contract.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { budgetParts } from "../../.mimocode/tools/omni-vision/session-guard";

test("budgets 51 requested images down to per-call cap with spillover", () => {
  const files = Array.from({ length: 51 }, (_, i) => `/tmp/f${i}.png`);
  const batches = budgetParts(files, 50);
  expect(batches.length).toBe(2);
  expect(batches[0].length).toBe(50);
  expect(batches[1].length).toBe(1);
});

test("single video passes through as one native part", () => {
  const batches = budgetParts(["/tmp/clip.mp4"], 50);
  expect(batches.length).toBe(1);
  expect(batches[0]).toEqual(["/tmp/clip.mp4"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/omni-vision/pipeline.test.ts`
Expected: FAIL with "Cannot find module" (session-guard not written yet).

- [ ] **Step 3: Write minimal session-guard + pipeline**

```ts
export const MAX_PARTS_PER_CALL = 50;

export function budgetParts(files: string[], cap: number = MAX_PARTS_PER_CALL): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < files.length; i += cap) out.push(files.slice(i, i + cap));
  return out;
}

export function mergeWaveContext(own: string[], others: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const body of [...others.flat(), ...own]) {
    if (!seen.has(body)) {
      seen.add(body);
      merged.push(body);
    }
  }
  return merged.slice(-5);
}
```

```ts
import { validateApiArgs, type ApiArgs } from "./validator";
import { buildBrief } from "./brief";
import { verifyAnalysis } from "./verifier";
import { openMemory, appendAnalysis, loadChain } from "./memory";
import { budgetParts } from "./session-guard";

export function prepareApiCall(args: ApiArgs, memoryRoot: string) {
  const v = validateApiArgs(args);
  if (!v.ok) throw new Error((v as { error: string }).error);
  const files = Array.isArray(args.file_path) ? args.file_path : args.file_path.split(",").map((s) => s.trim());
  const batches = budgetParts(files);
  if (batches.length > 1) throw new Error(`MEDIA BUDGET: ${files.length} parts exceed per-call cap 50 — split into ${batches.length} sequential calls with disk-spill evidence.`);
  const mem = openMemory(memoryRoot);
  try {
    const brief = buildBrief(args, loadChain(mem));
    return { brief, files };
  } finally {
    mem.close();
  }
}

export function finalizeApiCall(args: ApiArgs, analysisText: string, memoryRoot: string) {
  const mem = openMemory(memoryRoot);
  try {
    const brief = buildBrief(args, loadChain(mem));
    const signals = verifyAnalysis(analysisText, brief);
    const seq = appendAnalysis(mem, analysisText);
    return { signals, seq };
  } finally {
    mem.close();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/omni-vision/`
Expected: PASS, all 7 files green, 0 fail.

- [ ] **Step 5: Write the caller SKILL.md**

```md
# omni-vision caller contract
Api mode only. Every call carries media_context (500+ chars, WHAT/when/where/intent — NEVER contents), analysis_goal (200+ chars), output_requirements (3+ sections). Max 50 media parts per call — split larger sets into sequential calls. Media parts are per-call and never persisted as history; verdicts live in T1 SQLite and the returned text.
```

- [ ] **Step 6: Commit**

```bash
git add .mimocode/tools/omni-vision/session-guard.ts .mimocode/tools/omni-vision/index.ts .mimocode/skills/omni-vision/SKILL.md tests/omni-vision/pipeline.test.ts
git commit -m "feat: wire omni-vision pipeline with 50-part session guard"
```

**Wiring notes (deferred hardening from P3 reviews — implement here, not earlier):**
- Reject whitespace-only `file_path` and empty-string array elements (`trim().length === 0`); validate `output_requirements` elements are non-empty strings.
- Unify validation shapes: this pipeline's `{ok, error}` vs legacy `backend/validator.ts` `{valid, error?}` vs `OmniVisionContextArgs` — pick ONE winner; consider adding a machine-readable `code` field so callers don't string-match error text.
- Legacy `backend/validator.ts` floor consts vs new `validator.ts` exported consts — unify at wiring time (single source of truth per tool family).
- Interpolate floor consts into validator error-message strings (`${MEDIA_CONTEXT_MIN}+`) so messages can't drift from guards.

---

### Task 8: Wave-manager VC adapter (shards + sharedRoot)

**Covers:** [WAVE], [OV-MEM]

**Files:**
- Create: `.mimocode/tools/omni-vision/wave.ts`
- Test: `tests/omni-vision/wave.test.ts`

**Interfaces:**
- Consumes: `mergeWaveContext` (T7), `openMemory/appendAnalysis` (T6).
- Produces: `waveMemoryRoot(project, waveId, agentName)`, `sharedRoot(project, waveId)` path builders + `buildWaveBrief()` used by orchestrator dispatches instead of opencode `taskDispatch`.

**Carry-over test debt (P7 reviews — implement HERE):** `wave.test.ts` must also pin the currently-unpinned `mergeWaveContext` semantics — dedupe order (others-first, own-last), the `slice(-5)` window, and that 5+ `own` entries fully evict `others`. Plus an index-level test for `prepareApiCall`/`finalizeApiCall` with an isolated `/tmp` root: brief+files return, seq 1→2 chain growth, 51-file MEDIA BUDGET throw — and a comma-string pin (`\"/tmp/a.png, /tmp/b.png\"` → 2 files; `\"a,,b\"`/whitespace-only → filtered/throw), since no committed test currently executes the split/filter path.

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test";
import { waveMemoryRoot, sharedRoot } from "../../.mimocode/tools/omni-vision/wave";

test("per-agent shards isolate, sharedRoot unites", () => {
  const a = waveMemoryRoot("proj", "wave1", "vc-watch");
  const b = waveMemoryRoot("proj", "wave1", "vc-test");
  expect(a).not.toBe(b);
  expect(a).toMatch(/wave1\/vc-watch/);
  expect(sharedRoot("proj", "wave1")).toMatch(/wave1/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/omni-vision/wave.test.ts`
Expected: FAIL with "Cannot find module" (wave not written yet).

- [ ] **Step 3: Write minimal implementation**

```ts
export function waveMemoryRoot(project: string, waveId: string, agentName: string): string {
  return `${process.env.HOME}/.vc-memory/${project}/waves/${waveId}/${agentName}`;
}

export function sharedRoot(project: string, waveId: string): string {
  return `vc-${project}-${waveId}`;
}

export function buildWaveBrief(focus: string, root: string): string {
  return `WAVE FOCUS (HISTORY — VERIFY, DO NOT CONFORM): ${focus}\nSHARED ROOT: ${root}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/omni-vision/wave.test.ts`
Expected: PASS (1 pass, 0 fail).

- [ ] **Step 5: Full suite + commit**

Run: `bun test tests/omni-vision/`
Expected: PASS, all 8 files green.

```bash
git add .mimocode/tools/omni-vision/wave.ts tests/omni-vision/wave.test.ts
git commit -m "feat: add wave-manager VC memory adapter"
```
