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

test("rejects bare prompt with media_context error", () => {
  const r = validateApiArgs({ file_path: "/tmp/shot.png", prompt: "describe what you see" });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(/media_context/);
});

test("rejects short context and fewer than 3 sections", () => {
  const r1 = validateApiArgs({ ...good, media_context: "too short" });
  expect(r1.ok).toBe(false);
  const r2 = validateApiArgs({ ...good, output_requirements: ["FINDINGS"] });
  expect(r2.ok).toBe(false);
});

test("boundary floors reject n-1 and accept n", () => {
  const r499 = validateApiArgs({ ...good, media_context: "x".repeat(499) });
  expect(r499.ok).toBe(false);
  const r500 = validateApiArgs({ ...good, media_context: "x".repeat(500) });
  expect(r500.ok).toBe(true);
  const g199 = validateApiArgs({ ...good, analysis_goal: "x".repeat(199) });
  expect(g199.ok).toBe(false);
  const g200 = validateApiArgs({ ...good, analysis_goal: "x".repeat(200) });
  expect(g200.ok).toBe(true);
  const o2 = validateApiArgs({ ...good, output_requirements: ["A", "B"] });
  expect(o2.ok).toBe(false);
  const o3 = validateApiArgs({ ...good, output_requirements: ["A", "B", "C"] });
  expect(o3.ok).toBe(true);
});

test("file_path guard runs first and rejects empty array", () => {
  const rAll = validateApiArgs({ file_path: [], media_context: "x", analysis_goal: "x", output_requirements: ["ONLY"] });
  expect(rAll.ok).toBe(false);
  if (!rAll.ok) expect(rAll.error).toMatch(/file_path/);
  const rEmpty = validateApiArgs({ ...good, file_path: [] });
  expect(rEmpty.ok).toBe(false);
});
