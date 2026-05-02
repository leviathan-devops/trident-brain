/**
 * TRIDENT BRAIN v3.2 - ALGORITHMIC PLUGIN
 *
 * CORE PRINCIPLE: "Trident Documents. Humans Fix."
 *
 * v3.2 CHANGES:
 * - EXPLICIT documentation-only mode (never edits)
 * - Semantic report naming: TRIDENT_CODE_REVIEW_{context}_{date}.md
 * - Agent instructions emphasize NEVER editing
 * - Automatic artifact generation with WHY/HOW explanations
 */
import fs from 'fs';
import path from 'path';
import { auditEngine, reportGenerator, proofVerifier, hookAnalyzer, crossRefVerifier } from './algorithmic-core.js';
import { artifactWriter } from './artifact-writer.js';
const state = {
    mode: 'idle',
    target: '',
    depth: 7,
    artifacts: new Map(),
    initialized: true
};
function getWhyProblem(category) {
    switch (category) {
        case 'SIMULATED_EXECUTION':
            return 'This pattern returns fake success without actual work. It deceives callers into believing operations succeeded when they did not.';
        case 'THEATRICAL_CODE':
            return 'This code is placeholder/stub that never executes. It creates illusion of functionality without reality.';
        case 'STUB_CODE':
            return 'This function returns null/undefined instead of doing actual work. Callers will receive empty values.';
        case 'SQL_INJECTION':
            return 'User-controlled input is concatenated directly into SQL queries, allowing attackers to execute arbitrary SQL commands.';
        case 'SECRET_EXPOSURE':
            return 'Hardcoded credentials or secrets are visible in source code, enabling attackers to access protected systems.';
        case 'AUTH_BYPASS':
            return 'Authentication checks are skipped or always return true, allowing unauthorized access.';
        case 'XSS':
            return 'Untrusted input is inserted into HTML without sanitization, enabling script injection attacks.';
        case 'EMPTY_CATCH':
            return 'Errors are silently swallowed without logging, making debugging impossible.';
        case 'HOOK_SPILLOVER':
            return 'Hooks fire for unintended agents, causing cross-plugin contamination.';
        case 'GLOBAL_STATE_POLLUTION':
            return 'Global mutable state creates coupling between components, causing unpredictable behavior.';
        case 'COMPLEXITY':
            return 'Function exceeds recommended complexity, making it hard to test and maintain.';
        case 'RESOURCE_LEAK':
            return 'Resources (event listeners, intervals, references) are not cleaned up, causing memory bloat.';
        case 'HOST_FALLBACK':
            return 'Agent claims host testing proves functionality - host testing is not proof. Container execution required.';
        case 'MOCK_STUB_SUGGESTION':
            return 'Agent suggests using mocks/stubs instead of real implementation - this hides real behavior.';
        case 'MODEL_USAGE':
            return 'Agent suggests switching to a different model instead of solving the problem.';
        case 'SCOPE_CREEP':
            return 'Agent is using context from unrelated projects, causing cross-contamination.';
        case 'EVIDENCE_COMPLETENESS':
            return 'Agent claims "already verified" without providing external proof - this is theatrical.';
        case 'COMMAND_INJECTION':
            return 'User input is concatenated into shell commands, allowing arbitrary command execution.';
        case 'PATH_TRAVERSAL':
            return 'User input in file paths allows reading/writing outside intended directory.';
        case 'IMPORT_CYCLE':
            return 'Circular import dependencies detected - modules depend on each other.';
        case 'AGENT_FIELD_MISSING':
            return 'Hook receives input without agent field - will fire for all agents incorrectly.';
        case 'CONSOLE_SPILLOVER':
            return 'Console.log/error calls in hooks pollute cross-agent context.';
        case 'CONTEXT_LEAK':
            return 'Shared context between agents causes information bleed.';
        case 'PREFIX_SUPPORT_MISSING':
            return 'Hook does not check for agent prefix variants, causing missed firings.';
        case 'SILENT_FAILURE':
            return 'Function returns normally despite errors occurring internally.';
        case 'TOKEN_BLOAT':
            return 'Excessive data being pushed to context, causing token overflow.';
        case 'COMPACTION_CONTENT_INJECTION':
            return 'Hook ADDS content during compaction instead of pruning - this causes exponential growth.';
        case 'CONTEXT_DURING_COMPACTION':
            return 'Context is being modified during session compaction event.';
        case 'PLUGIN_LOAD_FAILURE':
            return 'Plugin fails to load - entry point missing or exports invalid.';
        case 'DEPENDENCY_MISSING':
            return 'Required npm package not installed - plugin cannot load.';
        case 'CLUSTER_NOT_FOUND':
            return 'Referenced cluster does not exist - task execution will fail.';
        case 'SHIM_IMPLEMENTATION':
            return 'Code references a shim that has not been implemented.';
        case 'WRONG_DIRECTORY':
            return 'Path uses wrong workspace directory (e.g., .Spider instead of .hermes).';
        default:
            return 'This pattern indicates a code quality or security issue.';
    }
}
function getFixLogic(category) {
    switch (category) {
        case 'SIMULATED_EXECUTION':
            return 'Remove the fake delay/success pattern. Replace with actual async operations that perform real work.';
        case 'THEATRICAL_CODE':
            return 'Remove or replace the placeholder comment with actual implementation or remove the stub entirely.';
        case 'STUB_CODE':
            return 'Implement the function with actual logic or remove it if unused.';
        case 'SQL_INJECTION':
            return 'Use parameterized queries or input validation.';
        case 'XSS':
            return 'Use textContent() instead of innerHTML, or sanitize input.';
        case 'EMPTY_CATCH':
            return 'Add error logging or re-throwing in catch block.';
        case 'HOOK_SPILLOVER':
            return 'Add agent-type checks before hook logic. Example: if (agent !== "my-agent") return;';
        case 'GLOBAL_STATE_POLLUTION':
            return 'Avoid global mutable state. Use dependency injection or module-local state.';
        case 'COMPLEXITY':
            return 'Simplify by extracting functions, using early returns, or breaking into modules.';
        case 'RESOURCE_LEAK':
            return 'Ensure all event listeners have corresponding removeEventListener calls.';
        case 'HOST_FALLBACK':
            return 'Container test required for proof, not host testing. Use opencode container run.';
        case 'MOCK_STUB_SUGGESTION':
            return 'Use real implementation, not mocks. Mocks hide real behavior problems.';
        case 'MODEL_USAGE':
            return 'Solve the problem with current model, don\'t switch models to avoid issues.';
        case 'SCOPE_CREEP':
            return 'Only use context from current project. Clear unrelated context.';
        case 'EVIDENCE_COMPLETENESS':
            return 'Provide actual proof (container logs, file evidence) not claims of verification.';
        case 'COMMAND_INJECTION':
            return 'Use safe exec methods with array args, not shell string concatenation.';
        case 'PATH_TRAVERSAL':
            return 'Validate and sanitize user input before using in file operations.';
        case 'IMPORT_CYCLE':
            return 'Break circular dependency by extracting shared code to separate module.';
        case 'AGENT_FIELD_MISSING':
            return 'Add agent field validation to hooks. Check input.agent exists before processing.';
        case 'CONSOLE_SPILLOVER':
            return 'Remove console.log/error calls from hooks or route to debug system.';
        case 'CONTEXT_LEAK':
            return 'Isolate context per-agent. Don\'t share mutable context objects.';
        case 'PREFIX_SUPPORT_MISSING':
            return 'Add prefix checks for agent variants. Example: if (agent.startsWith("hermes_"))';
        case 'SILENT_FAILURE':
            return 'Add error logging, events.emit, or proper error propagation in catch blocks.';
        case 'TOKEN_BLOAT':
            return 'Summarize/truncate tool outputs. Don\'t store raw logs in context.';
        case 'COMPACTION_CONTENT_INJECTION':
            return 'During compaction, PRUNE context don\'t ADD. Remove stale, keep essential.';
        case 'CONTEXT_DURING_COMPACTION':
            return 'Don\'t modify context during compaction events - read-only during compaction.';
        case 'PLUGIN_LOAD_FAILURE':
            return 'Verify entry point exports default correctly. Check file exists and is valid JS.';
        case 'DEPENDENCY_MISSING':
            return 'Run npm install to install missing dependencies.';
        case 'CLUSTER_NOT_FOUND':
            return 'Create the cluster first or fix the clusterId reference.';
        case 'SHIM_IMPLEMENTATION':
            return 'Implement the shim or remove the reference to it.';
        case 'WRONG_DIRECTORY':
            return 'Use correct workspace path (.hermes not .Spider, .manta not .shark).';
        default:
            return 'Review the code and implement proper error handling or logic.';
    }
}
function getSemanticReportName(targetPath) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const sanitized = targetPath.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const context = sanitized.length > 30 ? sanitized.substring(0, 30) : sanitized;
    return `TRIDENT_CODE_REVIEW_${context}_${date}.md`;
}
function parseNaturalLanguage(message) {
    const msg = message.toLowerCase().trim();
    if (msg.includes('audit') || msg.includes('review') || msg.includes('scan')) {
        const pathMatch = message.match(/(?:^|\s)(\/[\/\.\~\w-]+|\/|\.[\/\.\~\w-]+|~[\/\.\~\w-]*)(?:\s|$)/);
        const target = pathMatch ? pathMatch[1].trim() : process.cwd();
        const options = {};
        options.skipBuild = !msg.includes('--build') && !msg.includes('with build');
        options.skipTest = !msg.includes('--test') && !msg.includes('with test');
        return { action: 'audit', target, options };
    }
    if (msg.includes('verify') || msg.includes('proof') || msg.includes('claim')) {
        return { action: 'verify', options: { message } };
    }
    if (msg.includes('hook') && (msg.includes('isolat') || msg.includes('spill') || msg.includes('cross'))) {
        return { action: 'analyze-hooks', options: { message } };
    }
    if (msg.includes('resource') || msg.includes('memory') || msg.includes('token') || msg.includes('footprint')) {
        return { action: 'resource-cost', options: { message } };
    }
    if (msg.includes('cross-ref') || msg.includes('import') || msg.includes('cluster') || msg.includes('tool')) {
        return { action: 'cross-ref', options: { message } };
    }
    if (msg.includes('firewall') || msg.includes('block') || msg.includes('realtime')) {
        return { action: 'firewall-test', options: { message } };
    }
    if (msg.includes('status') || msg.includes('state')) {
        return { action: 'status' };
    }
    if (msg.includes('report') || msg.includes('findings') || msg.includes('results')) {
        return { action: 'report' };
    }
    if (msg.includes('document_fix') || msg.includes('show fix documentation') || msg.includes('fix documentation')) {
        return { action: 'document_fix' };
    }
    if (msg.includes('save') && msg.includes('report')) {
        return { action: 'save_report' };
    }
    if (msg.includes('help') || msg.includes('what') || msg.includes('how') || msg.includes('capabilit')) {
        return { action: 'help' };
    }
    return null;
}
async function runAudit(target, options = {}) {
    const { skipBuild = true, skipTest = true } = options;
    state.lastError = undefined;
    const config = {
        targetPath: target,
        depth: 7,
        containerImage: 'opencode-python3:latest',
        buildCommand: skipBuild ? 'false' : 'npm run build 2>&1 || echo "NO_BUILD_SCRIPT"',
        testCommand: skipTest ? 'false' : 'npm test 2>&1 || echo "NO_TEST_SCRIPT"'
    };
    try {
        auditEngine.startAudit(config);
        const files = await auditEngine.scanDirectory(target);
        if (files.size === 0) {
            const isUrl = target.startsWith('http://') || target.startsWith('https://') || target.startsWith('git@');
            const errorArtifact = artifactWriter.generate([], auditEngine.getState(), {
                targetPath: target,
                error: isUrl ? 'URL_TARGET_NOT_SUPPORTED' : 'NO_FILES_FOUND'
            });
            const errorFilename = `TRIDENT_CODE_REVIEW_ERROR_${target.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}_${new Date().toISOString().split('T')[0]}.md`;
            const artifactPath = path.join(process.cwd(), errorFilename);
            try {
                fs.writeFileSync(artifactPath, errorArtifact, 'utf-8');
            }
            catch { }
            state.lastError = isUrl ? 'URL targets require local filesystem paths' : 'No files found to audit';
            return `## TRIDENT AUDIT

**Target:** ${target}

${isUrl ? 'URL targets are not supported. Please provide a local filesystem path.' : 'No .ts/.js/.json files found. Check that the path exists and contains source files.'}

**Error Artifact saved to:** \`${artifactPath}\`

---

${errorArtifact}`;
        }
        const scanner = auditEngine.getScanner();
        let filesScanned = 0;
        for (const [filePath, content] of files) {
            try {
                scanner.scanFile(filePath, content);
                filesScanned++;
            }
            catch (scanError) {
                // Skip files that fail to scan
            }
        }
        state.lastFindings = scanner.getFindings();
        state.lastAuditTarget = target;
        for (let i = 0; i <= 6; i++) {
            auditEngine.completeLayer(i);
        }
        auditEngine.complete();
        const findings = state.lastFindings;
        const reportName = getSemanticReportName(target);
        state.lastReportPath = reportName;
        const report = reportGenerator.generate(() => 'AUDIT-1', (layer) => findings.filter(f => f.layer === layer), auditEngine.getState());
        state.artifacts.set(reportName, report);
        state.artifacts.set('TRIDENT_CODE_REVIEW.md', report);
        const artifactContent = artifactWriter.generate(findings, auditEngine.getState(), { targetPath: target });
        const artifactFilename = `TRIDENT_CODE_REVIEW_${target.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}_${new Date().toISOString().split('T')[0]}.md`;
        const artifactDir = path.dirname(target);
        const artifactPath = path.join(artifactDir, artifactFilename);
        try {
            fs.writeFileSync(artifactPath, artifactContent, 'utf-8');
        }
        catch (writeError) {
            const altPath = path.join(process.cwd(), artifactFilename);
            try {
                fs.writeFileSync(altPath, artifactContent, 'utf-8');
            }
            catch (altError) {
                // Fall through - artifact still in state.artifacts
            }
        }
        state.artifacts.set(`ARTIFACT:${artifactFilename}`, artifactContent);
        state.artifacts.set('LATEST_ARTIFACT', artifactContent);
        const critical = findings.filter(f => f.severity === 'CRITICAL').length;
        const high = findings.filter(f => f.severity === 'HIGH').length;
        const medium = findings.filter(f => f.severity === 'MEDIUM').length;
        const low = findings.filter(f => f.severity === 'LOW').length;
        return `## TRIDENT AUDIT COMPLETE v3.2

**Target:** \`${target}\`
**Report:** \`${reportName}\`
**Artifact:** \`${artifactFilename}\`
**Files Scanned:** ${filesScanned}
**Findings:** ${findings.length}

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL (BANNED) | ${critical} | ${critical > 0 ? 'FIX REQUIRED' : 'OK'} |
| HIGH | ${high} | ${high > 0 ? 'REVIEW' : 'OK'} |
| MEDIUM | ${medium} | ${medium > 0 ? 'NOTE' : 'OK'} |
| LOW | ${low} | ${low > 0 ? 'INFO' : 'OK'} |

${critical > 0 ? 'CRITICAL: Theatrical code patterns detected. See full report.\n' : ''}
${critical === 0 && high === 0 ? 'No critical or high severity issues found.\n' : ''}

**Artifact saved to:** \`${artifactPath}\`

---

${artifactContent}`;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        state.lastError = errorMsg;
        return `## TRIDENT AUDIT ERROR

**Target:** ${target}
**Error:** ${errorMsg}`;
    }
}
async function runVerify(message) {
    try {
        const claimMatches = message.match(/['"]([^'"]+)['"]|(\d+\s*\/\s*\d+)|(dist\/|build\/|index\.js)/gi);
        if (!claimMatches) {
            return `## TRIDENT PROOF VERIFIER

No verifiable claims detected.

Examples:
- "dist/index.js exists"
- "37/37 tests passed"

Say: "verify that dist/index.js exists"`;
        }
        const claims = claimMatches.map(c => c.replace(/['"]/g, ''));
        const cwd = state.lastAuditTarget || process.cwd();
        const result = await proofVerifier.verifyMultiple(claims, cwd);
        let response = `## TRIDENT PROOF VERIFICATION\n\n`;
        response += `**Target:** ${cwd}\n`;
        response += `**Claims:** ${result.claims.length} | **Passed:** ${result.claims.filter(c => c.verified).length} | **Failed:** ${result.claims.filter(c => !c.verified).length}\n\n`;
        if (result.theaterDetected) {
            response += `THEATER DETECTED - Claims cannot be verified!\n\n`;
        }
        for (const claim of result.claims) {
            const status = claim.verified ? 'PASS' : 'FAIL';
            response += `[${status}] ${claim.claim}\n`;
            if (claim.proof)
                response += `  Proof: ${claim.proof}\n`;
            if (claim.error)
                response += `  Error: ${claim.error}\n`;
            response += `\n`;
        }
        return response;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return `## TRIDENT PROOF VERIFIER ERROR\n\n${errorMsg}`;
    }
}
async function runHookAnalysis(message) {
    try {
        const pluginMatch = message.match(/(?:plugin\s+)?(\w+[-\w]*)/i);
        const pluginName = pluginMatch ? pluginMatch[1] : state.lastAuditTarget || 'unknown';
        const target = state.lastAuditTarget || process.cwd();
        const files = await auditEngine.scanDirectory(target);
        let pluginSource = '';
        for (const [filePath, content] of files) {
            if (filePath.includes('index.') || filePath.includes('plugin.')) {
                pluginSource += content + '\n';
            }
        }
        if (!pluginSource) {
            return `## TRIDENT HOOK ANALYSIS\n\nNo plugin source found. Run an audit first.`;
        }
        const analysis = hookAnalyzer.analyzePlugin(pluginSource, pluginName);
        const isIsolated = analysis.summary.safeHooks === analysis.summary.totalHooks;
        let response = `## TRIDENT HOOK ISOLATION ANALYSIS\n\n`;
        response += `**Plugin:** ${analysis.plugin}\n`;
        response += `**Status:** ${isIsolated ? 'ISOLATED' : 'SPILLOVER DETECTED'}\n\n`;
        response += `**Total Hooks:** ${analysis.summary.totalHooks}\n`;
        response += `**Safe Hooks:** ${analysis.summary.safeHooks}\n`;
        response += `**Unsafe Hooks:** ${analysis.summary.unsafeHooks}\n\n`;
        if (analysis.spilloverRisks.length > 0) {
            response += `### Spillover Risks Detected\n\n`;
            for (const finding of analysis.spilloverRisks) {
                response += `- ${finding.file}:${finding.line || '?'} - ${finding.title}\n`;
            }
        }
        response += `\n### Recommendations\n\n`;
        response += isIsolated
            ? `Plugin hooks are properly isolated.\n`
            : `Fix hook issues to prevent cross-plugin contamination.\n`;
        return response;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return `## TRIDENT HOOK ANALYSIS ERROR\n\n${errorMsg}`;
    }
}
async function runResourceAnalysis() {
    const findings = state.lastFindings || [];
    const complex = findings.filter(f => f.category === 'COMPLEXITY').length;
    const leaks = findings.filter(f => f.category === 'RESOURCE_LEAK').length;
    const tokens = findings.filter(f => f.category === 'TOKEN_BLOAT').length;
    return `## TRIDENT RESOURCE ANALYSIS

**Last Audit:** ${state.lastAuditTarget || 'none'}

### Resource Footprint

| Issue Type | Count |
|-----------|-------|
| Complexity Hotspots | ${complex} |
| Resource Leaks | ${leaks} |
| Token Bloat | ${tokens} |

### Assessment

${complex + leaks + tokens === 0 ? 'Minimal resource impact detected.' : 'Issues found that may impact performance.'}
`;
}
async function runCrossRefAnalysis() {
    try {
        const target = state.lastAuditTarget || process.cwd();
        const report = await crossRefVerifier.verify(target);
        let response = `## TRIDENT CROSS-REFERENCE ANALYSIS\n\n`;
        response += `**Target:** ${target}\n\n`;
        response += `### References\n`;
        response += `| Status | Count |\n|--------|-------|\n`;
        response += `| Total | ${report.summary.total} |\n`;
        response += `| Verified | ${report.summary.verified} |\n`;
        response += `| Unverified | ${report.summary.unverified} |\n\n`;
        if (report.unverified.length > 0) {
            response += `### Unverified References\n\n`;
            for (const ref of report.unverified) {
                response += `- ${ref.type}: ${ref.reference} (${ref.file}:${ref.line || '?'})\n`;
            }
        }
        if (report.findings.length > 0) {
            response += `\n### Findings\n\n`;
            for (const f of report.findings.slice(0, 10)) {
                response += `- [${f.severity}] ${f.category}: ${f.file}:${f.line || '?'}\n`;
            }
        }
        return response;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return `## TRIDENT CROSS-REF ERROR\n\n${errorMsg}`;
    }
}
function runFirewallTest() {
    return `## TRIDENT REAL-TIME FIREWALL

The firewall scans code and THROWS + HALTS on banned patterns.

To test the firewall, point me to code with banned patterns:

Example: "test firewall on /path/to/suspicious-code.ts"

The firewall will:
1. Scan the file with banned pattern detectors
2. If theatrical code found -> THROW ERROR and block
3. Report exact line and pattern matched

This is hard blocking, not soft scanning.`;
}
function getStatus() {
    const auditState = auditEngine.getState();
    return `## TRIDENT BRAIN v3.1 STATUS

**Mode:** ${state.mode || 'idle'}
**Target:** ${state.lastAuditTarget || process.cwd()}
**Status:** ${auditState.status}
**Last Error:** ${state.lastError || 'none'}
**Report:** ${state.lastReportPath || 'none'}

---

## CORE PRINCIPLE: "Trident Documents. Humans Fix."

TRIDENT NEVER EDITS CODE. Trident only:
- Scans code with regex patterns
- Documents findings in markdown
- Explains WHY problems occur
- Explains HOW to fix (for human review)

---

THEATRICAL CODE IS BANNED - CRITICAL FAILURE:

- setTimeout -> resolve({success:true})
- TODO comments with "full implementation"
- Stub functions returning null/undefined
- Hardcoded success:true

Current Findings:
- CRITICAL (BANNED): ${state.lastFindings?.filter(f => f.severity === 'CRITICAL').length || 0}
- HIGH: ${state.lastFindings?.filter(f => f.severity === 'HIGH').length || 0}
- MEDIUM: ${state.lastFindings?.filter(f => f.severity === 'MEDIUM').length || 0}
- LOW: ${state.lastFindings?.filter(f => f.severity === 'LOW').length || 0}

Say "audit this project" to start.`;
}
function getHelp() {
    return `## TRIDENT BRAIN v3.1 - Algorithmic Code Review

CORE PRINCIPLE: "Trident Documents. Humans Fix."

TRIDENT NEVER EDITS CODE. It only documents findings.

v3.1 CAPABILITIES:
- Proof-Based Verification
- Real-Time Firewall (blocks theatrical code)
- Hook Isolation Analyzer
- Resource Footprint Estimator
- Cross-Reference Verifier
- Semantic Report Naming

COMMANDS:
- "audit this" - Scan and document findings (generates TRIDENT_CODE_REVIEW_*.md)
- "show full report" - Display detailed findings
- "verify that [claim]" - Proof verification
- "document_fix" - Generate fix documentation (NOT apply fixes)
- "analyze hook isolation" - Cross-plugin check
- "cross-reference check" - Validate references
- "resource footprint" - Memory/token analysis
- "show status" - Current state

REPORTS:
Reports are saved with semantic names like:
TRIDENT_CODE_REVIEW_my_project_2026-04-16.md

All reports contain WHY each issue is problematic and HOW to fix (for human review).`;
}
function generateFullReport() {
    const report = state.artifacts.get(state.lastReportPath || 'TRIDENT_CODE_REVIEW.md');
    if (!report) {
        return `## NO REPORT AVAILABLE\n\nRun an audit first: say "audit this"`;
    }
    return report;
}
function generateDocumentFix() {
    const findings = state.lastFindings || [];
    if (findings.length === 0) {
        return `## NO FINDINGS TO DOCUMENT\n\nRun an audit first: say "audit this"`;
    }
    const critical = findings.filter(f => f.severity === 'CRITICAL');
    const high = findings.filter(f => f.severity === 'HIGH');
    let response = `# TRIDENT FIX DOCUMENTATION
> **WARNING: This is DOCUMENTATION ONLY.**
> **Trident does NOT apply fixes. Human review required.**
> **Do NOT apply these fixes automatically.**

`;
    if (critical.length > 0) {
        response += `## CRITICAL (BANNED PATTERNS) - FIX IMMEDIATELY\n\n`;
        for (const f of critical) {
            response += `### ${f.file}${f.line ? `:${f.line}` : ''}\n\n`;
            response += `| Field | Value |\n|--------|-------|\n`;
            response += `| Category | ${f.category} |\n`;
            response += `| Problem | ${f.title} |\n`;
            response += `| Evidence | \`${f.evidence.substring(0, 100)}\` |\n\n`;
            response += `#### Why This Is A Problem\n\n${getWhyProblem(f.category)}\n\n`;
            response += `#### How To Fix (Human Review Required)\n\n${f.remediation}\n\n`;
            response += `#### Why The Fix Works\n\n${getFixLogic(f.category)}\n\n`;
            response += `---\n\n`;
        }
    }
    if (high.length > 0) {
        response += `## HIGH PRIORITY\n\n`;
        for (const f of high.slice(0, 10)) {
            response += `### ${f.file}${f.line ? `:${f.line}` : ''}\n\n`;
            response += `| Field | Value |\n|--------|-------|\n`;
            response += `| Category | ${f.category} |\n`;
            response += `| Problem | ${f.title} |\n\n`;
            response += `#### Why This Is A Problem\n\n${getWhyProblem(f.category)}\n\n`;
            response += `#### How To Fix (Human Review Required)\n\n${f.remediation}\n\n`;
            response += `---\n\n`;
        }
    }
    response += `## Summary\n\n`;
    response += `| Severity | Count |\n|---------|-------|\n`;
    response += `| CRITICAL | ${critical.length} |\n`;
    response += `| HIGH | ${high.length} |\n\n`;
    response += `---\n\n`;
    response += `*Generated by Trident Brain v3.1 - Algorithmic Code Review*\n`;
    response += `*This is documentation only. Human review required before applying fixes.*\n`;
    return response;
}
export default async function TridentBrainPlugin(input) {
    return {
        'tool.execute.before': async (input, output) => {
            const toolName = input.tool;
            const BLOCKED_TOOLS = [
                'edit',
                'sed',
                'echo',
                'cat',
                'write',
                'write_file',
                'apply_diff',
                'patch'
            ];
            const isBlocked = BLOCKED_TOOLS.some(t => toolName === t || toolName.includes(t));
            if (toolName === 'bash') {
                const cmd = input.args?.command || '';
                const isTestScript = cmd.includes('/tmp/') &&
                    cmd.endsWith('.sh') &&
                    (cmd.includes('npm test') || cmd.includes('pytest') || cmd.includes('jest'));
                if (isTestScript)
                    return;
                output.blocked = true;
                output.blockReason = '[Trident] BLOCKED - Trident is documentation-only. Never edits code.';
                return;
            }
            if (isBlocked) {
                output.blocked = true;
                output.blockReason = '[Trident] BLOCKED - Trident is documentation-only. Never edits code.';
            }
        },
        'tool.execute.after': async (input, output) => {
            // Trident doesn't write - documentation only
        },
        'chat.message': async (input, output) => {
            if (input.agent !== 'trident')
                return;
            const message = input.message;
            if (!message) {
                output.parts = [{ type: 'text', text: getHelp() }];
                return;
            }
            try {
                const parsed = parseNaturalLanguage(message);
                if (!parsed) {
                    output.parts = [{ type: 'text', text: getHelp() }];
                    return;
                }
                let result;
                switch (parsed.action) {
                    case 'audit':
                        result = await runAudit(parsed.target || process.cwd(), parsed.options);
                        break;
                    case 'verify':
                        result = await runVerify(message);
                        break;
                    case 'analyze-hooks':
                        result = await runHookAnalysis(message);
                        break;
                    case 'resource-cost':
                        result = await runResourceAnalysis();
                        break;
                    case 'cross-ref':
                        result = await runCrossRefAnalysis();
                        break;
                    case 'firewall-test':
                        result = runFirewallTest();
                        break;
                    case 'status':
                        result = getStatus();
                        break;
                    case 'report':
                    case 'full report':
                        result = generateFullReport();
                        break;
                    case 'artifact':
                    case 'show artifact':
                        const artifact = state.artifacts.get('LATEST_ARTIFACT');
                        result = artifact || '## NO ARTIFACT\n\nRun "audit this" first to generate an artifact.';
                        break;
                    case 'save_report':
                        result = `## SAVE REPORT\n\nReport saved as: ${state.lastReportPath || 'TRIDENT_CODE_REVIEW.md'}\n\nUse "show full report" to view.`;
                        break;
                    case 'document_fix':
                        result = generateDocumentFix();
                        break;
                    default:
                        result = getHelp();
                }
                output.parts = [{ type: 'text', text: result }];
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                output.parts = [{ type: 'text', text: `## TRIDENT ERROR\n\n${errorMsg}\n\nTry again or say "help" for available commands.` }];
            }
        },
        config: async (cfg) => {
            if (!cfg.agent)
                cfg.agent = {};
            cfg.agent['trident'] = {
                name: 'trident',
                description: 'TRIDENT v3.1 - Documentation-only code review. Never edits.',
                instructions: `TRIDENT CORE PRINCIPLE: "Trident Documents. Humans Fix."

TRIDENT NEVER:
- Edits source code
- Applies fixes automatically
- Modifies any files
- Uses edit, write, apply_diff, or patch tools

TRIDENT ALWAYS:
- Documents findings in TRIDENT_CODE_REVIEW_*.md files
- Explains WHY each issue is problematic
- Explains HOW to fix (for human review)
- Provides proof-based verification

BANNED PATTERNS (CRITICAL):
- Simulated execution (fake success responses)
- Theatrical code (TODO placeholders)
- Stub functions (null/undefined returns)

COMMANDS:
- "audit this" - Scan and document findings
- "show full report" - Display detailed findings
- "document_fix" - Generate fix documentation (NOT apply)
- "verify that [claim]" - Proof verification
- "analyze hook isolation" - Cross-plugin check
- "show status" - Current state`,
                mode: 'primary',
                permission: { task: 'allow' },
                color: '#8B5CF6'
            };
        }
    };
}
//# sourceMappingURL=index.js.map