// Wave-adapter unit pins (shard/shared/brief tests) + carry-over integration pins for the merge/index/comma paths this adapter relies on — sole coverage, do not split off.
import { test, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { waveMemoryRoot, sharedRoot, buildWaveBrief } from "../../.mimocode/tools/omni-vision/wave";
import { prepareApiCall, finalizeApiCall } from "../../.mimocode/tools/omni-vision/index";
import { mergeWaveContext } from "../../.mimocode/tools/omni-vision/session-guard";

let roots: string[] = [];
const freshRoot = () => { const r = mkdtempSync(join(tmpdir(), "ov-")); roots.push(r); return r; };
afterEach(() => { for (const r of roots) rmSync(r, { recursive: true, force: true }); roots = []; });

const validArgs = (file_path: string | string[]) => ({
  file_path,
  media_context: "x".repeat(500),
  analysis_goal: "y".repeat(200),
  output_requirements: ["sec-one", "sec-two", "sec-three"],
});

test("per-agent shards isolate, sharedRoot unites", () => {
  const a = waveMemoryRoot("proj", "wave1", "vc-watch");
  const b = waveMemoryRoot("proj", "wave1", "vc-test");
  expect(a).not.toBe(b);
  expect(a).toMatch(/wave1\/vc-watch/);
  expect(sharedRoot("proj", "wave1")).toMatch(/wave1/);
  expect(buildWaveBrief("focus text", sharedRoot("proj", "wave1"))).toMatch(/HISTORY — VERIFY, DO NOT CONFORM/);
  expect(() => waveMemoryRoot("..", "wave1", "vc-watch")).toThrow(/\[wave\] unsafe path segment/);
  expect(waveMemoryRoot("proj", "wave1", "a/b")).toMatch(/a_b/);
});

test("mergeWaveContext dedupes others-first own-last with slice(-5) window", () => {
  const merged = mergeWaveContext(["b", "c"], [["a", "b"]]);
  expect(merged).toEqual(["a", "b", "c"]);
  const windowed = mergeWaveContext(["1", "2", "3", "4", "5", "6", "7"], []);
  expect(windowed).toEqual(["3", "4", "5", "6", "7"]);
  expect(windowed.length).toBe(5);
});

test("mergeWaveContext: 5+ own entries fully evict others", () => {
  const merged = mergeWaveContext(["a", "b", "c", "d", "e"], [["x", "y"]]);
  expect(merged).toEqual(["a", "b", "c", "d", "e"]);
  expect(merged).not.toContain("x");
  expect(merged).not.toContain("y");
});

test("prepareApiCall returns brief+files; finalizeApiCall grows seq 1->2", () => {
  const root = freshRoot();
  const args = validArgs(["/tmp/a.png"]);
  const prep = prepareApiCall(args, root);
  expect(prep.files).toEqual(["/tmp/a.png"]);
  expect(typeof prep.brief).toBe("string");
  expect(prep.brief.length).toBeGreaterThan(0);
  const first = finalizeApiCall(args, "first analysis body", root);
  expect(first.seq).toBe(1);
  const second = finalizeApiCall(args, "second analysis body", root);
  expect(second.seq).toBe(2);
});

test("prepareApiCall throws MEDIA BUDGET on 51 files", () => {
  const root = freshRoot();
  const files = Array.from({ length: 51 }, (_, i) => `/tmp/f${i}.png`);
  expect(() => prepareApiCall(validArgs(files), root)).toThrow(/MEDIA BUDGET/);
});

test("prepareApiCall splits comma-string file_path and filters empties", () => {
  const root = freshRoot();
  const split = prepareApiCall(validArgs("/tmp/a.png, /tmp/b.png"), root);
  expect(split.files).toEqual(["/tmp/a.png", "/tmp/b.png"]);
  const empties = prepareApiCall(validArgs("a,,b"), root);
  expect(empties.files).toEqual(["a", "b"]);
});

test("prepareApiCall throws ARGUMENT VALIDATION FAILED on whitespace-only/empty file_path", () => {
  const root = freshRoot();
  expect(() => prepareApiCall(validArgs("   "), root)).toThrow(/ARGUMENT VALIDATION FAILED/);
  expect(() => prepareApiCall(validArgs(""), root)).toThrow(/ARGUMENT VALIDATION FAILED/);
});
