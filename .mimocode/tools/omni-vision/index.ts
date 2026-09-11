import { validateApiArgs, type ApiArgs } from "./validator";
import { buildBrief } from "./brief";
import { verifyAnalysis } from "./verifier";
import { openMemory, appendAnalysis, loadChain } from "./memory";
import { budgetParts, MAX_PARTS_PER_CALL } from "./session-guard";

export function prepareApiCall(args: ApiArgs, memoryRoot: string) {
  const v = validateApiArgs(args);
  if (!v.ok) throw new Error((v as { error: string }).error);
  const files = (Array.isArray(args.file_path) ? args.file_path : args.file_path.split(",")).map((s) => s.trim()).filter((s) => s.length > 0);
  if (files.length === 0) throw new Error("ARGUMENT VALIDATION FAILED: file_path contains no usable paths.");
  const batches = budgetParts(files);
  if (batches.length > 1) throw new Error(`MEDIA BUDGET: ${files.length} parts exceed per-call cap ${MAX_PARTS_PER_CALL} — split into ${batches.length} sequential calls with disk-spill evidence.`);
  const mem = openMemory(memoryRoot);
  try {
    const brief = buildBrief(args, loadChain(mem));
    return { brief, files };
  } finally {
    mem.close();
  }
}

// No re-validation: args were validated at prepareApiCall; finalize trusts the prepared args.
export function finalizeApiCall(args: ApiArgs, analysisText: string, memoryRoot: string) {
  const mem = openMemory(memoryRoot);
  try {
    const brief = buildBrief(args, loadChain(mem));
    const signals = verifyAnalysis(analysisText, brief);
    const seq = appendAnalysis(mem, analysisText);
    return { signals, seq };
  } finally {
    mem.close();
  }
}
