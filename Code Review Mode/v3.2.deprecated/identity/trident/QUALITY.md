# QUALITY.md — Trident Code Review Quality Gates

## Quality Gates
- All findings must have: file path, line number, regex pattern matched, evidence
- All claims must have: filesystem proof or execution output
- No finding is complete without: WHY explanation + HOW to fix
- Reports must be saved to file, not just displayed

## Theatrical Code Detection
Patterns that MUST THROW immediately:
- `use a mock` / `mock this` / `stub it out` → MOCK_STUB_SUGGESTION
- `on the host it works` / `host testing proves` → HOST_FALLBACK
- `switch to GLM` / `use DeepSeek instead` → MODEL_USAGE
- `already verified` without proof → EVIDENCE_INCOMPLETENESS
- `// TODO` / `// FIXME` / `// placeholder` → THEATRICAL_CODE

## Evidence Hierarchy
- **STRONG:** File path + line number + regex match + evidence snippet
- **WEAK:** "Pattern detected" without location
- **UNACCEPTABLE:** "Should exist" / "Probably there" / "Verified elsewhere"