import { validateApiArgs, type ApiArgs } from "./validator";
import { buildBrief } from "./brief";
import { verifyAnalysis } from "./verifier";
import { openMemory, appendAnalysis, loadChain } from "./memory";
import { budgetParts } from "./session-guard";

export function prepareApiCall(args: ApiArgs, memoryRoot: string) {
  const v = validateApiArgs(args);
  if (!v.ok) throw new Error((v as { error: string }).error);
  const files = Array.isArray(args.file_path) ? args.file_path : args.file_path.split(",").map((s) => s.trim());
  const batches = budgetParts(files);
  if (batches.length > 1) throw new Error(`MEDIA BUDGET: ${files.length} parts exceed per-call cap 50 — split into ${batches.length} sequential calls with disk-spill evidence.`);
  const mem = openMemory(memoryRoot);
  try {
    const brief = buildBrief(args, loadChain(mem));
    return { brief, files };
  } finally {
    mem.close();
  }
}

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
