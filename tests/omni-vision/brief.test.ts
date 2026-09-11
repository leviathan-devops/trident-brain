import { test, expect } from "bun:test";
import { buildBrief } from "../../.mimocode/tools/omni-vision/brief";
import { verifyAnalysis } from "../../.mimocode/tools/omni-vision/verifier";

// bypasses validator floors (2 sections < 3+): tests builder fallbacks, not the gate.
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
  expect(verifyAnalysis("reads exactly 42.00V", "brief")).toContain("EXACT_VALUE_VIOLATION");
  expect(verifyAnalysis("approximately 42.00 units observed", "brief")).toContain("EXACT_VALUE_VIOLATION");
  expect(verifyAnalysis("FINDINGS: panel visible. ENVIRONMENT: lab bench.", "brief")).toEqual([]);
});

test("brief threads storyline lens and keeps last-5 chain", () => {
  expect(buildBrief({ ...args, storyline: "ep3" }, [])).toMatch(/STORYLINE/);
  const chained = buildBrief(args, ["h0", "h1", "h2", "h3", "h4", "h5", "h6"]);
  expect(chained).toMatch(/h6/);
  expect(chained).not.toMatch(/\bh0\b/);
});

test("verifier flags blank input", () => {
  expect(verifyAnalysis("   ", "brief")).toContain("BLANK_INPUT");
});
