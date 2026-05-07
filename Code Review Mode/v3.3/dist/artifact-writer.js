/**
 * TRIDENT BRAIN v3.2 - ARTIFACT WRITER
 *
 * Generates comprehensive markdown reports with Deep Planning Mode structure.
 * Layer 1: What is this / What went wrong
 * Layer 2: WHY is it a problem / HOW to fix
 * Layer 3: Verification and prevention
 */
import { SEVERITY } from './algorithmic-core.js';
const WHY_EXPLANATIONS = {
    SIMULATED_EXECUTION: 'This pattern returns fake success without actual work. It deceives callers into believing operations succeeded when they did not. This is dangerous because callers make decisions based on false information, leading to cascading failures downstream.',
    THEATRICAL_CODE: 'This code is placeholder/stub that never executes. It creates illusion of functionality without reality. When this code is called in production, it silently fails or returns empty/invalid data, causing mysterious bugs.',
    STUB_CODE: 'This function returns null/undefined instead of doing actual work. Callers will receive empty values and may throw NullPointerExceptions or worse, silently propagate null through the system.',
    SQL_INJECTION: 'User-controlled input is concatenated directly into SQL queries, allowing attackers to execute arbitrary SQL commands. This can lead to data theft, data destruction, or complete system compromise.',
    SECRET_EXPOSURE: 'Hardcoded credentials or secrets are visible in source code. Anyone with code access can use these credentials to access protected systems. Secrets in code get committed to git history and are accessible to anyone who clones the repo.',
    AUTH_BYPASS: 'Authentication checks are skipped or always return true. This allows unauthorized users to access protected functionality, potentially leading to data breaches or system takeover.',
    XSS: 'Untrusted input is inserted into HTML without sanitization. Attackers can inject malicious scripts that execute in other users\' browsers, stealing session tokens or performing actions on behalf of users.',
    EMPTY_CATCH: 'Errors are silently swallowed without logging. When errors occur, nobody knows about them, making debugging impossible. Problems compound as the system continues running in a broken state.',
    HOOK_SPILLOVER: 'Hooks fire for unintended agents, causing cross-plugin contamination. One agent\'s actions trigger responses in another agent\'s context, leading to information leaks and incorrect behavior.',
    GLOBAL_STATE_POLLUTION: 'Global mutable state creates coupling between components. When one component modifies global state, all other components that depend on it are affected, causing unpredictable behavior and hard-to-reproduce bugs.',
    COMPLEXITY: 'Function exceeds recommended complexity (cyclomatic complexity > 10). Complex functions are hard to test thoroughly, hard to understand, and easy to introduce bugs into. They should be decomposed into smaller, focused functions.',
    RESOURCE_LEAK: 'Resources (event listeners, intervals, file handles, database connections) are not cleaned up. Over time, this causes memory bloat, file descriptor exhaustion, and system slowdown. Eventually the system becomes unusable.',
    HOST_FALLBACK: 'Agent claims host testing proves functionality, but host testing is NOT proof. Container execution is required for proper verification. The host environment differs from production, so tests may pass in dev but fail in production.',
    MOCK_STUB_SUGGESTION: 'Agent suggests using mocks/stubs instead of real implementation. This hides real behavior and creates false confidence. Integration tests should use real implementations whenever possible.',
    MODEL_USAGE: 'Agent suggests switching to a different model instead of solving the problem. This is scope creep and avoids addressing the actual issue. The current model can solve the problem with proper prompting.',
    SCOPE_CREEP: 'Agent is using context from unrelated projects, causing cross-contamination. This pollutes the current session with irrelevant information and can lead to incorrect decisions.',
    EVIDENCE_COMPLETENESS: 'Agent claims "already verified" without providing external proof. This is theatrical - if it was truly verified, proof would exist. Claims without proof should not be trusted.',
    COMMAND_INJECTION: 'User input is concatenated into shell commands without sanitization. Attackers can craft input that executes arbitrary commands on the system, potentially gaining full system access.',
    PATH_TRAVERSAL: 'User input in file paths allows reading/writing outside intended directory. Attackers can use ".." sequences to access sensitive files like /etc/passwd or overwrite system files.',
    IMPORT_CYCLE: 'Circular import dependencies detected. Modules depend on each other circularly, making it impossible to load them independently. This causes startup failures and makes testing difficult.',
    AGENT_FIELD_MISSING: 'Hook receives input without agent field. Without filtering by agent, hooks fire for all agents incorrectly, causing unintended side effects and cross-agent contamination.',
    CONSOLE_SPILLOVER: 'Console.log/error calls in hooks pollute cross-agent context. Output from one agent\'s hooks appears in another agent\'s session, confusing both agents and potentially leaking sensitive information.',
    CONTEXT_LEAK: 'Shared context between agents causes information bleed. Data intended for one agent is accessible to another, violating isolation principles and potentially leaking sensitive information.',
    PREFIX_SUPPORT_MISSING: 'Hook does not check for agent prefix variants. OpenCode agents may have prefixes like "shark/" or "manta/", and hooks that don\'t handle these miss firing for legitimate agent events.',
    SILENT_FAILURE: 'Function returns normally despite errors occurring internally. Callers have no way to know something went wrong, so they continue as if everything succeeded, leading to data corruption or inconsistent state.',
    TOKEN_BLOAT: 'Excessive data being pushed to context. This causes token overflow, making the system unresponsive and potentially causing data loss when context is truncated.',
    COMPACTION_CONTENT_INJECTION: 'Hook ADDS content during compaction instead of pruning. This causes exponential growth - each compaction adds more content, making the problem worse with every iteration.',
    DEFAULT_RISK: 'This pattern may indicate a code quality or security issue. Review the evidence and remediation to understand the specific risk.'
};
const HOW_FIXES = {
    SIMULATED_EXECUTION: (f) => `1. Identify all callers of this function
2. Add real implementation that performs actual work
3. Return meaningful results or throw appropriate errors
4. Add integration tests that verify real behavior
5. Remove any "fake" return values or hollow success signals`,
    THEATRICAL_CODE: (f) => `1. Remove or replace placeholder/stub code
2. Implement actual functionality
3. Add unit tests that verify real execution
4. If intentionally incomplete, document with TODO and track in issue tracker`,
    STUB_CODE: (f) => `1. Implement actual logic in the function
2. If null is valid, return it explicitly and document it
3. Add JSDoc explaining when null is returned
4. Add integration tests for null handling`,
    SQL_INJECTION: (f) => `1. Use parameterized queries/prepared statements
2. Never concatenate user input into SQL strings
3. Use an ORM if possible for automatic escaping
4. Validate and sanitize all user input
5. Apply principle of least privilege to database user`,
    SECRET_EXPOSURE: (f) => `1. Move secrets to environment variables
2. Use a secrets manager (Vault, AWS Secrets Manager)
3. Remove secrets from git history: git filter-branch or BFG
4. Add .env to .gitignore
5. Rotate any exposed credentials immediately`,
    AUTH_BYPASS: (f) => `1. Remove any "return true" or "// skip auth" code
2. Ensure auth checks are at the start of protected functions
3. Add integration tests that verify auth is enforced
4. Audit all protected endpoints for proper auth`,
    XSS: (f) => `1. Sanitize all user input before HTML insertion
2. Use framework-provided escaping (React, Vue)
3. Set Content-Security-Policy headers
4. Use DOMPurify or similar for manual HTML
5. Validate input is the expected type (not just strings)`,
    EMPTY_CATCH: (f) => `1. Add logging in catch block: logger.error(err)
2. Re-throw if error should propagate
3. Add metrics counter for monitoring error rates
4. Include context in error (what operation failed)
5. Consider using a global error handler`,
    HOOK_SPILLOVER: (f) => `1. Add agent field check at start of hook
2. Check for both exact match and prefix variants
3. Add unit test verifying hook only fires for intended agent
4. Document which agents the hook should fire for`,
    GLOBAL_STATE_POLLUTION: (f) => `1. Move global state into a state container/context
2. Pass state explicitly as parameters
3. Use dependency injection
4. If global is needed, make it immutable
5. Add tests that verify state isolation`,
    COMPLEXITY: (f) => `1. Identify distinct responsibilities in the function
2. Extract each responsibility into a separate function
3. Keep functions under 20 lines
4. Use meaningful names for extracted functions
5. Add unit tests for each extracted function`,
    RESOURCE_LEAK: (f) => `1. Identify what resources are opened
2. Ensure cleanup happens in finally blocks or use try-with-resources
3. Remove event listeners when done
4. Clear intervals when no longer needed
5. Use WeakRef where appropriate for garbage collection`,
    HOST_FALLBACK: (f) => `1. Run tests in Docker container matching production
2. Use docker exec or docker run for isolated testing
3. Never claim host testing is production proof
4. Document exact container image used for testing`,
    MOCK_STUB_SUGGESTION: (f) => `1. Use real implementation instead of mocks
2. If mocks needed, mock at boundaries (network, database)
3. Keep mocks minimal and focused
4. Add integration tests with real implementations`,
    MODEL_USAGE: (f) => `1. Refuse to switch models
2. Ask clarifying questions about the actual problem
3. Break down the problem into smaller steps
4. Apply chain-of-thought prompting techniques`,
    SCOPE_CREEP: (f) => `1. Identify what context is relevant
2. Clear irrelevant context from session
3. Start fresh with minimal relevant context
4. Document which projects/contexts are in scope`,
    EVIDENCE_COMPLETENESS: (f) => `1. Demand proof for claims
2. Ask for specific test results, file paths, outputs
3. If proof cannot be provided, do not trust the claim
4. Verify independently where possible`,
    COMMAND_INJECTION: (f) => `1. Never use user input in shell commands
2. Use execFile with array args instead of shell string
3. Validate input against whitelist of allowed values
4. If shell is required, use a proper parser (not string concatenation)`,
    PATH_TRAVERSAL: (f) => `1. Use path.resolve() and check it starts with allowed dir
2. Use path.normalize() to resolve ../
3. Validate file path against whitelist
4. Use chroot or container isolation for untrusted file access`,
    IMPORT_CYCLE: (f) => `1. Identify the cycle: A imports B imports C imports A
2. Move shared code to a third module (D)
3. Have A and B both import D instead of each other
4. Use dynamic imports for lazy loading if needed
5. Consider dependency injection to break cycles`,
    AGENT_FIELD_MISSING: (f) => `1. Add agent field check at start of hook handler
2. Return early if agent doesn't match expected
3. Test with multiple agents to verify isolation
4. Document which agent(s) the hook should respond to`,
    CONSOLE_SPILLOVER: (f) => `1. Remove console.log/error calls from hooks
2. Use structured logging that can be filtered
3. Add log level configuration
4. Route logs to separate files per agent/context`,
    CONTEXT_LEAK: (f) => `1. Isolate context between agents
2. Use separate context objects per agent
3. Audit what data is shared
4. Add tests that verify context isolation`,
    PREFIX_SUPPORT_MISSING: (f) => `1. Add prefix check: agent.startsWith('shark/') || agent === 'shark'
2. Handle common prefixes in hook
3. Test with prefixed and non-prefixed agent names
4. Document supported prefix patterns`,
    SILENT_FAILURE: (f) => `1. Throw errors instead of returning normally
2. If return is needed, use Result/Either type
3. Document failure modes explicitly
4. Add assertion that caller checks return value`,
    TOKEN_BLOAT: (f) => `1. Identify what data is being pushed
2. Prune irrelevant historical context
3. Summarize older context instead of keeping full text
4. Set maximum context limits
5. Implement streaming for large data`,
    COMPACTION_CONTENT_INJECTION: (f) => `1. Hooks should only prune, never add
2. Remove any content the hook is adding
3. If summarization is needed, use external service
4. Add test that verifies compaction only reduces content`,
    DEFAULT_RISK: (f) => `1. Review the specific evidence for this finding
2. Understand what makes this pattern risky
3. Apply appropriate fix based on the pattern type
4. Add test to catch this pattern in future`
};
function getVerificationCommand(finding) {
    const category = finding.category;
    const file = finding.file;
    const line = finding.line || 0;
    const baseCommands = {
        SIMULATED_EXECUTION: '# Verify function is actually called and does work\ngrep -n "' + finding.title + '" ' + file + '\n# Run with debug logging to see actual execution path',
        THEATRICAL_CODE: '# Search for similar theatrical patterns\ngrep -rn "TODO\\|FIXME\\|STUB\\|placeholder" ' + file + ' | head -20',
        STUB_CODE: '# Check function returns\ngrep -A5 "function ' + finding.title + '" ' + file + '\n# Verify actual return value type',
        SQL_INJECTION: '# Search for SQL concatenation vulnerabilities\ngrep -rn "query.*+ |sql.*+ |execute.*+ |" ' + file + ' | head -20',
        SECRET_EXPOSURE: '# Search for hardcoded secrets\ngrep -rn "api_key\\|password\\|secret\\|token" ' + file + ' | grep -v "\\.env\\|process\\.env" | head -10',
        COMMAND_INJECTION: '# Search for shell injection points\ngrep -rn "execSync\\|exec\\|spawn\\|child_process" ' + file + ' | head -20',
        EMPTY_CATCH: '# Find empty catch blocks\ngrep -B2 -A2 "catch.*}" ' + file + ' | head -30',
        COMPLEXITY: '# Measure cyclomatic complexity\neslint --no-eslintrc --parser-options=ecmaVersion:2020 ' + file + ' 2>/dev/null || echo "Run: npx complexity-calculator ' + file + '"',
        RESOURCE_LEAK: '# Search for missing cleanup\ngrep -rn "addEventListener\\|setInterval\\|setTimeout\\|open\\|createReadStream" ' + file + ' | head -20',
        IMPORT_CYCLE: '# Check import dependencies\ngrep -rn "^import.*from" ' + file + ' | head -20\n# Or run: npx madge --circular ' + file,
        DEFAULT_RISK: '# Review the specific code\ngrep -n "' + finding.evidence + '" ' + file + ' | head -5'
    };
    if (baseCommands[category]) {
        return baseCommands[category];
    }
    return '# Review finding in context\nsed -n "' + Math.max(1, line - 5) + ',' + (line + 10) + 'p" ' + file;
}
function extractSemanticContext(targetPath) {
    const parts = targetPath.split('/');
    const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
    const cleaned = lastPart
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toUpperCase()
        .substring(0, 30);
    return cleaned || 'UNKNOWN';
}
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
export class ArtifactWriter {
    generate(findings, auditState, config) {
        const semanticContext = config.semanticContext || extractSemanticContext(config.targetPath);
        const date = formatDate(new Date());
        const filename = `TRIDENT_CODE_REVIEW_${semanticContext}_${date}.md`;
        const duration = Date.now() - auditState.startedAt.getTime();
        const critical = findings.filter(f => f.severity === SEVERITY.CRITICAL);
        const high = findings.filter(f => f.severity === SEVERITY.HIGH);
        const medium = findings.filter(f => f.severity === SEVERITY.MEDIUM);
        const low = findings.filter(f => f.severity === SEVERITY.LOW);
        const info = findings.filter(f => f.severity === SEVERITY.INFO);
        const passStatus = config.error ? '❌ ERROR' : (critical.length === 0 && high.length === 0 ? '✅ PASSED' : '❌ FAILED');
        let artifact = `# TRIDENT CODE REVIEW - ${semanticContext.replace(/_/g, ' ')}

**Version:** 3.2.0
**Date:** ${new Date().toISOString()}
**Target:** \`${config.targetPath}\`
**Semantic Context:** ${semanticContext}
**Status:** ${passStatus}
**Duration:** ${Math.round(duration / 1000)}s

---

## LAYER 1: INITIAL ANALYSIS

### What Is This Project?
${this.describeTarget(config.targetPath)}

### What Went Wrong?
${config.error ? `**ERROR:** ${config.error === 'URL_TARGET_NOT_SUPPORTED' ? 'URL targets are not supported. Please provide a local filesystem path.' : config.error}` : this.describeFindings(findings)}

### Success Criteria
- [ ] Zero CRITICAL (BANNED) findings
- [ ] Zero theatrical code patterns
- [ ] All HIGH severity issues addressed
- [ ] This report generated and reviewed

---

## LAYER 2: FINDINGS BY CATEGORY

`;
        if (critical.length > 0) {
            artifact += `### 🚫 CRITICAL (BANNED PATTERNS) - FIX IMMEDIATELY

`;
            for (const f of critical) {
                artifact += this.formatFinding(f);
            }
        }
        if (high.length > 0) {
            artifact += `### ⚠️ HIGH PRIORITY - Address Before Deployment

`;
            for (const f of high) {
                artifact += this.formatFinding(f);
            }
        }
        if (medium.length > 0) {
            artifact += `### ⚡ MEDIUM PRIORITY - Address When Possible

`;
            for (const f of medium) {
                artifact += this.formatFinding(f);
            }
        }
        if (low.length > 0) {
            artifact += `### 📝 LOW PRIORITY - Consider Addressing

`;
            for (const f of low) {
                artifact += this.formatFinding(f);
            }
        }
        if (info.length > 0) {
            artifact += `### ℹ️ INFORMATIONAL

`;
            for (const f of info) {
                artifact += this.formatFinding(f);
            }
        }
        artifact += `---

## LAYER 3: CONSOLIDATED FIX WORKFLOW

### Critical Path (Fix in Order)

`;
        const sortedFixes = [...critical, ...high].sort((a, b) => (a.line || 0) - (b.line || 0));
        sortedFixes.forEach((f, i) => {
            artifact += `${i + 1}. **${f.title}** - \`${f.file}:${f.line || '?'}\`\n`;
        });
        artifact += `

### Verification Commands

\`\`\`bash
# Full audit re-run
trident audit ${config.targetPath}

# Check specific files
${critical.concat(high).slice(0, 5).map(f => `sed -n '${f.line || 1}p' ${f.file}`).join('\n') || '# No critical/high findings'}
\`\`\`

### Prevention Recommendations

1. **Enable pre-commit hooks** to catch theatrical code before commit
2. **Add ESLint rules** for complexity limits and common anti-patterns
3. **Document acceptable patterns** in CONTRIBUTING.md
4. **Regular audits** - run Trident weekly on critical codebases
5. **Code review checklist** - include security and quality checks

---

## APPENDIX: RAW FINDINGS

| Severity | Category | Title | File | Line |
|----------|----------|-------|------|------|
${findings.map(f => `| ${f.severity} | ${f.category} | ${f.title} | ${f.file} | ${f.line || '?'} |`).join('\n')}

---

*Generated by Trident Brain v3.2 - "Trident Documents. Humans Fix."*
`;
        return artifact;
    }
    describeTarget(targetPath) {
        const parts = targetPath.split('/');
        const projectName = parts[parts.length - 1] || parts[parts.length - 2];
        return `This audit examined code at \`${targetPath}\` (project: ${projectName}). The audit scanned for code quality issues, security vulnerabilities, architectural problems, and patterns that indicate theatrical (non-functional) code.`;
    }
    describeFindings(findings) {
        if (findings.length === 0) {
            return 'No issues found. The codebase passed all automated checks.';
        }
        const categories = new Map();
        for (const f of findings) {
            categories.set(f.category, (categories.get(f.category) || 0) + 1);
        }
        const sorted = Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);
        const topIssues = sorted.slice(0, 5).map(([cat, count]) => `${count} ${cat}`).join(', ');
        const critical = findings.filter(f => f.severity === SEVERITY.CRITICAL).length;
        const high = findings.filter(f => f.severity === SEVERITY.HIGH).length;
        let desc = `This audit found **${findings.length} issues** across ${categories.size} categories. `;
        if (critical > 0) {
            desc += `**CRITICAL alert**: ${critical} banned pattern(s) detected that must be fixed immediately. `;
        }
        if (high > 0) {
            desc += `${high} high-severity issues require attention before deployment. `;
        }
        desc += `Top issues: ${topIssues}.`;
        return desc;
    }
    formatFinding(f) {
        const why = WHY_EXPLANATIONS[f.category] || WHY_EXPLANATIONS.DEFAULT_RISK;
        const how = HOW_FIXES[f.category]?.(f) || HOW_FIXES.DEFAULT_RISK(f);
        const proof = getVerificationCommand(f);
        return `#### ${f.title}

**File:** \`${f.file}:${f.line || '?'}\`
**Category:** ${f.category}
**Severity:** ${f.severity}

**Evidence:** \`${f.evidence}\`

**WHY this is a problem:**
${why}

**HOW to fix:**
${how}

**Mechanical verification:**
\`\`\`bash
${proof}
\`\`\`

---

`;
    }
}
export const artifactWriter = new ArtifactWriter();
//# sourceMappingURL=artifact-writer.js.map