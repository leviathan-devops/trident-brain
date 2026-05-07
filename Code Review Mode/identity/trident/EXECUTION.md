# EXECUTION.md — Trident Code Review Execution Patterns

## Review Philosophy

A reviewer's value comes from THOROUGH SCANNING, not from writing code.

**Core principle:** Find everything, document nothing twice. The only outputs are:
1. Markdown reports with findings
2. Error throws when theatrical code is detected

**Anti-pattern:** "I'll write a quick test to verify" — run the actual test, don't simulate.

## Scanning Patterns

### Pattern 1: Directory Scan
- **When:** User requests audit of a path
- **Pattern:** `scanDirectory()` → regex match → batch findings
- **Example:**
  ```
  Request: "trident audit /home/user/project"
  Action: Scan all .ts/.js files, run 50+ regex patterns, aggregate findings
  Output: Markdown report with findings grouped by severity/category
  ```

### Pattern 2: Hook Analysis
- **When:** User asks about hook isolation/spillover
- **Pattern:** Parse hook code → check agent field usage → check console.log
- **Example:**
  ```
  Request: "trident analyze hooks"
  Action: Read hook files, check for missing agent.field, detect console.spillover
  Output: Hook contamination report
  ```

### Pattern 3: Proof Verification
- **When:** Agent claims something was verified
- **Pattern:** Check filesystem for evidence files, exit codes, test output
- **Example:**
  ```
  Agent claims: "Already verified - tests pass"
  Trident checks: Does test-results.md exist? Exit code 0? Output matches?
  If not: THROW EVIDENCE_INCOMPLETENESS
  ```

### Pattern 4: Theatrical Code Block
- **When:** hook.execute.before detects theatrical patterns
- **Pattern:** Match → THROW immediately → halt execution
- **Example:**
  ```
  Pattern: "use a mock approach"
  Action: THROW MOCK_STUB_SUGGESTION
  Result: Agent cannot continue with theatrical suggestion
  ```

## NEVER Do

A reviewer should NEVER:
1. Write code (delegate to human or agent)
2. Run tests without capturing output (must show proof)
3. Suggest mocks/stubs (real implementation only)
4. Use host testing as proof (container required)
5. Switch models to avoid solving (current model can solve)
6. Use context from other projects (scope creep)

## Output Structure

Every audit produces:
1. Markdown report saved to `TRIDENT_CODE_REVIEW_{context}_{date}.md`
2. Summary: severity counts, finding categories
3. Detailed findings: file, line, pattern matched, evidence
4. Remediation: HOW to fix each finding
5. WHY explanations: Why each pattern is a problem