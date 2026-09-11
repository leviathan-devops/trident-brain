export type ApiArgs = {
  file_path: string | string[];
  media_context?: string;
  analysis_goal?: string;
  output_requirements?: string[];
  prompt?: string;
  storyline?: string;
  art_direction?: string;
};

export function validateApiArgs(args: ApiArgs): { ok: true } | { ok: false; error: string } {
  if (!args.file_path || (Array.isArray(args.file_path) && args.file_path.length === 0))
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: file_path is required." };
  if (typeof args.media_context !== "string" || args.media_context.length < 500)
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: media_context must be 500+ chars (WHAT/when/where/intent — NEVER the contents)." };
  if (typeof args.analysis_goal !== "string" || args.analysis_goal.length < 200)
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: analysis_goal must be 200+ chars." };
  if (!Array.isArray(args.output_requirements) || args.output_requirements.length < 3)
    return { ok: false, error: "ARGUMENT VALIDATION FAILED: output_requirements needs 3+ report sections." };
  return { ok: true };
}
