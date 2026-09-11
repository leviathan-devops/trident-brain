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
