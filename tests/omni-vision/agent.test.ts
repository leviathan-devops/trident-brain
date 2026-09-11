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
