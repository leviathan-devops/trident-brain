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
