# TRIDENT CODE REVIEW MODE v3.2 — ARCHITECTURE OVERVIEW

**Version:** 3.2.0
**Date:** 2026-05-02
**Status:** WORKING ✅

---

## WHAT IS CODE REVIEW MODE?

Code Review Mode is a self-contained OpenCode plugin that performs algorithmic code audits using pure pattern matching. It NEVER edits code — only documents findings with WHY/HOW explanations and mechanical verification commands.

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRIDENT CODE REVIEW MODE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    PLUGIN ENTRY (index.ts)                    │    │
│  │                                                               │    │
│  │  Tools:                                                       │    │
│  │    - trident-audit [target]  → runAudit()                     │    │
│  │    - trident-status          → getStatus()                   │    │
│  │    - trident-report          → generateFullReport()           │    │
│  │    - trident-help            → getHelp()                    │    │
│  │                                                               │    │
│  │  Agent Config:                                                 │    │
│  │    - name: trident                                        │    │
│  │    - instructions: "Trident Documents. Humans Fix."          │    │
│  │    - mode: primary                                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              AUDIT ENGINE (algorithmic-core.ts)               │    │
│  │                                                               │    │
│  │  Pattern Detectors (50+ categories):                            │    │
│  │    - SIMULATED_EXECUTION (CRITICAL - BANNED)                  │    │
│  │    - THEATRICAL_CODE (CRITICAL - BANNED)                      │    │
│  │    - STUB_CODE (HIGH - BANNED)                               │    │
│  │    - SQL_INJECTION (CRITICAL)                                │    │
│  │    - SECRET_EXPOSURE (CRITICAL)                              │    │
│  │    - AUTH_BYPASS (CRITICAL)                                 │    │
│  │    - XSS (HIGH)                                             │    │
│  │    - EMPTY_CATCH (MEDIUM)                                   │    │
│  │    - HOOK_SPILLOVER (HIGH)                                  │    │
│  │    ...                                                       │    │
│  │                                                               │    │
│  │  Scanner: scanFile() → Finding[]                            │    │
│  │  AuditState: status, config, findings                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              ARTIFACT WRITER (artifact-writer.ts)           │    │
│  │                                                               │    │
│  │  generate(findings, auditState, config) → markdown          │    │
│  │                                                               │    │
│  │  3-Layer Structure:                                          │    │
│  │    Layer 1: INITIAL ANALYSIS                                 │    │
│  │              - What Is This Project                          │    │
│  │              - What Went Wrong                               │    │
│  │              - Success Criteria                               │    │
│  │                                                               │    │
│  │    Layer 2: FINDINGS BY CATEGORY                             │    │
│  │              - CRITICAL (BANNED PATTERNS)                    │    │
│  │              - HIGH PRIORITY                                 │    │
│  │              - MEDIUM PRIORITY                               │    │
│  │              - LOW PRIORITY                                  │    │
│  │              Each with: WHY / HOW / Mechanical Verification  │    │
│  │                                                               │    │
│  │    Layer 3: CONSOLIDATED FIX WORKFLOW                        │    │
│  │              - Critical Path (fix in order)                  │    │
│  │              - Verification Commands                        │    │
│  │              - Prevention Recommendations                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DATA FLOW

```
1. User: "audit this /path/to/project"
       │
       ▼
2. trident-audit tool called with target path
       │
       ▼
3. runAudit() →
       - auditEngine.startAudit(config)
       - auditEngine.scanDirectory(target) → Map<string, string>
       - scanner.scanFile(filePath, content) → Finding[]
       │
       ▼
4. For each Finding:
       - severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
       - category: SIMULATED_EXECUTION | SQL_INJECTION | etc
       - title: Human-readable title
       - file: File path
       - line: Line number
       - evidence: Code snippet
       - remediation: How to fix
       │
       ▼
5. artifactWriter.generate(findings, state, config) → markdown
       │
       ▼
6. fs.writeFileSync(artifactPath, artifactContent)
       │
       ▼
7. Return summary to user
```

---

## TOOLS

### trident-audit

```typescript
trident-audit: tool({
  description: 'Run a code audit on a target directory',
  args: {
    target: string.optional().describe('Target directory to audit'),
    depth: number.optional().describe('Audit depth 1-7'),
  },
  execute: async (args, ctx) => {
    const target = args.target || process.cwd();
    return await runAudit(target, {});
  },
})
```

### trident-status

```typescript
trident-status: tool({
  description: 'Show current Trident audit state',
  args: {},
  execute: async () => getStatus(),
})
```

### trident-report

```typescript
trident-report: tool({
  description: 'Show full audit report',
  args: {},
  execute: async () => generateFullReport(),
})
```

---

## ARTIFACT FORMAT

```markdown
# TRIDENT CODE REVIEW - {PROJECT_NAME}

**Version:** 3.2.0
**Date:** {ISO_TIMESTAMP}
**Target:** `{target_path}`
**Semantic Context:** {CONTEXT}
**Status:** ❌ FAILED | ✅ PASSED
**Duration:** {seconds}s

---

## LAYER 1: INITIAL ANALYSIS

### What Is This Project?
{description}

### What Went Wrong?
{finding_count} issues found. CRITICAL alert if banned patterns detected.

### Success Criteria
- [ ] Zero CRITICAL (BANNED) findings
- [ ] Zero theatrical code patterns
- [ ] All HIGH severity issues addressed

---

## LAYER 2: FINDINGS BY CATEGORY

### 🚫 CRITICAL (BANNED PATTERNS) - FIX IMMEDIATELY

**File:** `{file}:{line}`
**Category:** {CATEGORY}
**Evidence:** `{evidence}`

**WHY this is a problem:**
{mechanistic_explanation}

**HOW to fix:**
{step_by_step_instructions}

---

## LAYER 3: CONSOLIDATED FIX WORKFLOW

### Critical Path (Fix in Order)
1. **{title}** - `{file}:{line}**

### Verification Commands
```bash
# Review finding
sed -n '{line}p' {file}
```

### Prevention Recommendations
1. Enable pre-commit hooks
2. Add ESLint rules
3. Document patterns in CONTRIBUTING.md
4. Regular audits

---

*Generated by Trident Brain v3.2 - "Trident Documents. Humans Fix."*
```

---

## BUILD & DEPLOY

### Build (Self-Contained Bundle)

```bash
cd code-review-mode/v3.2
bun build src/index.ts \
  --outdir dist \
  --target bun \
  --format esm \
  --bundle

# Output: dist/index.js (530KB, self-contained)
```

### Deploy

```bash
cp dist/index.js ~/.config/opencode/plugins/trident-brain/dist/
```

Or use `./scripts/deploy.sh`

---

## opencode.json Registration

```json
{
  "plugin": [
    "file:///home/leviathan/OPENCODE_WORKSPACE/plugins/trident-brain/dist/index.js"
  ],
  "agent": {
    "trident": {
      "name": "trident",
      "mode": "primary",
      "color": "#8B5CF6"
    }
  }
}
```

---

## VERIFICATION

```bash
# Check bundle has tools
grep -c "trident-audit" dist/index.js
# Output: 1 (tool found)

# Check bundle is self-contained
grep "@opencode-ai/plugin" dist/index.js | wc -c
# Output: > 0 (dependency bundled)

# Container TUI test
docker run -d --name trident-test opencode-test:1.4.3
docker exec trident-test opencode --agent trident
# Say: "call trident-status"
```

---

## PATTERN CATEGORIES

| Pattern | Severity | Description |
|---------|----------|-------------|
| SIMULATED_EXECUTION | CRITICAL (BANNED) | Fake success responses, setTimeout resolve |
| THEATRICAL_CODE | CRITICAL (BANNED) | TODO placeholders, mock comments |
| STUB_CODE | HIGH (BANNED) | Empty implementations returning null |
| SQL_INJECTION | CRITICAL | User input in SQL queries |
| SECRET_EXPOSURE | CRITICAL | Hardcoded passwords, API keys |
| AUTH_BYPASS | CRITICAL | Hardcoded auth checks returning true |
| XSS | HIGH | Untrusted input in HTML |
| EMPTY_CATCH | MEDIUM | Silent error swallowing |
| HOOK_SPILLOVER | HIGH | Cross-agent contamination |
| SILENT_FAILURE | MEDIUM | Errors not logged |

---

*Generated by Trident Brain v3.2 - "Trident Documents. Humans Fix."*