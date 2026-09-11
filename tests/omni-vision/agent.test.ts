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
  expect(raw).toMatch(/webfetch:\s*true/);
  const toolsBlock = raw.split("tools:")[1].split("---")[0];
  const grants = toolsBlock.match(/^  \w+: true$/gm) ?? [];
  expect(grants.length).toBe(7);
});
