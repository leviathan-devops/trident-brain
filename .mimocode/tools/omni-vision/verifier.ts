// FORWARD-DECLARED: CONTEXT_MISMATCH/REGRESSION/CONTINUITY_BREAK emit once the caller threads brief + prior chain into verifyAnalysis (see _brief).
export type VerifySignal = "CONTEXT_MISMATCH" | "REGRESSION" | "EXACT_VALUE_VIOLATION" | "BLANK_INPUT" | "CONTINUITY_BREAK";

export function verifyAnalysis(analysis: string, _brief: string): VerifySignal[] {
  const signals: VerifySignal[] = [];
  if (analysis.trim().length === 0) return ["BLANK_INPUT"];
  if (/\b(exactly|precisely|approximately)\s*\d+\.\d+/i.test(analysis)) signals.push("EXACT_VALUE_VIOLATION");
  return signals;
}
