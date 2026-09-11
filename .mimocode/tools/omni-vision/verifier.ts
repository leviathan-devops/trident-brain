export type VerifySignal = "CONTEXT_MISMATCH" | "REGRESSION" | "EXACT_VALUE_VIOLATION" | "BLANK_INPUT" | "CONTINUITY_BREAK";

export function verifyAnalysis(analysis: string, _brief: string): VerifySignal[] {
  const signals: VerifySignal[] = [];
  if (analysis.trim().length === 0) return ["BLANK_INPUT"];
  if (/\bexactly\s+\d+\.\d+.*confirmed\b/i.test(analysis)) signals.push("EXACT_VALUE_VIOLATION");
  return signals;
}
