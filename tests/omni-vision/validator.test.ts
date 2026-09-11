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
