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
