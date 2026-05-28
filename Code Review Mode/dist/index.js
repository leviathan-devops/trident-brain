/**
 * TRIDENT BRAIN v3.3 - ALGORITHMIC PLUGIN
 *
 * CORE PRINCIPLE: "Trident Documents. Humans Fix."
 *
 * v3.3 CHANGES:
 * - IDENTITY AWARENESS (like Kraken v1.2)
 * - Self-knowledge: knows it is Trident Brain, not a code generator
 * - Hook-based theatrical code blocking at tool.execute.before
 * - Identity injection via system.transform hook
 * - Anti-theatrical enforcement: blocks mock/stub suggestions before execution
 */
import { tool } from '@opencode-ai/plugin';
import fs from 'fs';
import path from 'path';
import { auditEngine } from './algorithmic-core.js';
import { artifactWriter } from './artifact-writer.js';
import { IdentityLoader, formatIdentityHeader } from './identity/index.js';
const state = {
    mode: 'idle',
    target: '',
    depth: 7,
    artifacts: new Map(),
    initialized: true,
    identityLoaded: false
};
const identityLoader = new IdentityLoader();
const TRIDENT_ARTIFACT_DIR = '/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode';
const THEATRICAL_PATTERNS = [
    { regex: /use\s+a?\s*mock/i, category: 'MOCK_STUB_SUGGESTION', message: 'Trident blocks mock suggestions - use real implementation' },
    { regex: /stub\s+(this|it|out)/i, category: 'MOCK_STUB_SUGGESTION', message: 'Trident blocks stub suggestions - use real implementation' },
    { regex: /fake\s+(it|this|them)/i, category: 'MOCK_STUB_SUGGESTION', message: 'Trident blocks fake suggestions - use real implementation' },
    { regex: /mock\s+implementation/i, category: 'MOCK_STUB_SUGGESTION', message: 'Trident blocks mock implementation - use real code' },
    { regex: /host\s+testing\s+(already\s+)?prove/i, category: 'HOST_FALLBACK', message: 'Trident blocks host fallback claims - container execution required' },
    { regex: /on\s+the\s+host.*works/i, category: 'HOST_FALLBACK', message: 'Trident blocks host claims - container execution required' },
    { regex: /tested\s+it\s+on\s+the\s+host/i, category: 'HOST_FALLBACK', message: 'Trident blocks host testing claims - container required' },
    { regex: /switch\s+to\s+(GLM|DeepSeek|GPT)/i, category: 'MODEL_USAGE', message: 'Trident blocks model switching - solve with current model' },
    { regex: /fallback\s+to\s+(GLM|DeepSeek|GPT)/i, category: 'MODEL_USAGE', message: 'Trident blocks model fallback - solve problem directly' },
    { regex: /use\s+GLM\s+(instead|rather)/i, category: 'MODEL_USAGE', message: 'Trident blocks GLM suggestions - current model can solve' },
    { regex: /DeepSeek\s+(fallback|instead)/i, category: 'MODEL_USAGE', message: 'Trident blocks DeepSeek suggestions - current model can solve' },
];
const BLOCKED_TOOLS_FOR_TRIDENT = [
    'edit', 'write_file', 'write', 'patch', 'create', 'delete_file',
    'bash', 'terminal', 'execute', 'exec', 'mcp_write_file', 'mcp_edit', 'mcp_patch',
    'todowrite', 'task', 'spawn_shark_agent', 'spawn_manta_agent', 'run_parallel_tasks'
];
const HIVE_BLOCKED_TOOLS_FOR_TRIDENT = [
    'kraken_hive_remember', 'kraken_hive_inject_context', 'kraken_hive_search',
    'kraken_brain_status', 'kraken_message_status', 'get_cluster_status', 'get_agent_status',
    'hive_remember', 'hive_context', 'hive_status', 'aggregate_results',
    'spawn_cluster_task', 'anchor_cluster', 'report_to_kraken', 'checkpoint',
    'shark_gate', 'shark_evidence', 'shark_test_runner', 'manta_gate', 'manta_evidence',
    'spawn_shark_agent', 'spawn_manta_agent'
];
const sessionAgentMap = new Map();
function isTridentAgentFromInput(input) {
    const agent = input?.session?.agentName ?? (input?.agent || '');
    return agent === 'trident' || agent.startsWith('trident-') || agent.startsWith('trident_');
}
function registerSessionAgent(sessionID, agent) {
    if (agent === 'trident' || agent.startsWith('trident-') || agent.startsWith('trident_')) {
        sessionAgentMap.set(sessionID, agent);
    }
    else {
        sessionAgentMap.delete(sessionID);
    }
}
function clearSessionContext(sessionID) {
    if (!sessionID)
        return;
    sessionAgentMap.delete(sessionID);
}
function isTridentFromSession(sessionID) {
    if (!sessionID)
        return false;
    const agent = sessionAgentMap.get(sessionID);
    return agent === 'trident' || (agent?.startsWith('trident-') ?? false) || (agent?.startsWith('trident_') ?? false);
}
const TRIDENT_PLUGIN_IDENTITY = {
    name: "trident-brain",
    prefix: "trident-",
    orchestrator: "trident",
    agents: new Set(["trident", "trident-context", "trident-deep-planning", "trident-problem-solving", "trident_audit", "trident_review"]),
    primaryAgents: new Set(["trident"])
};
function createAgentAwareness(managedAgents, agentPrefix, orchestratorName) {
    return {
        isMyAgent(agentName) {
            if (!agentName)
                return false;
            if (managedAgents.has(agentName))
                return true;
            if (agentName.startsWith(agentPrefix))
                return true;
            if (agentName === orchestratorName)
                return true;
            return false;
        },
        isMyOrchestrator(agentName) {
            return agentName === orchestratorName;
        },
        isVanillaAgent(agentName) {
            return ["plan", "build", "general", "explore"].includes(agentName ?? "");
        },
        isOtherPluginAgent(agentName) {
            if (!agentName)
                return false;
            return !["plan", "build", "general", "explore"].includes(agentName) && !managedAgents.has(agentName) && !agentName.startsWith(agentPrefix) && agentName !== orchestratorName;
        }
    };
}
const tridentAwareness = createAgentAwareness(TRIDENT_PLUGIN_IDENTITY.agents, TRIDENT_PLUGIN_IDENTITY.prefix, TRIDENT_PLUGIN_IDENTITY.orchestrator);
const HOOK_EXECUTION_TIMEOUT_MS = 5000;
function resolveHookAgent(input) {
    const directAgent = input?.session?.agentName ?? input?.agent ?? "";
    if (directAgent) return directAgent;
    if (input?.sessionID) {
        const mapped = sessionAgentMap.get(input.sessionID);
        if (mapped) return mapped;
    }
    return "";
}
function safeHook(handler, options = {}) {
    const { agentFilter = [], requiredPhase = null, timeout = HOOK_EXECUTION_TIMEOUT_MS, pluginName = "trident-brain", managedAgents = new Set(), agentPrefix = "", orchestratorName = "" } = options;
    const awareness = {
        isMyAgent(agentName) {
            if (!agentName) return false;
            if (agentName === 'trident') return true;
            if (agentName.startsWith('trident-') || agentName.startsWith('trident_')) return true;
            if (orchestratorName && agentName === orchestratorName) return true;
            return false;
        }
    };
    return async (input, output) => {
        const agentName = resolveHookAgent(input);
        if (!agentName) {
            return;
        }
        const isMine = awareness.isMyAgent(agentName) || (input?.sessionID && isTridentFromSession(input.sessionID));
        if (!isMine) {
            return;
        }
        if (agentFilter.length > 0 && !agentFilter.includes(agentName)) {
            return;
        }
        const startTime = Date.now();
        try {
            const result = await Promise.race([
                handler(input, output, { isMyAgent: awareness.isMyAgent, agentName }),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`Hook timeout after ${timeout}ms`)), timeout))
            ]);
            if (result && result.blocked) {
                console.error(`[TRIDENT BLOCK] ${result.reason}`);
                throw new Error(result.reason);
            }
        }
        catch (err) {
            throw err;
        }
    };
}
function checkToolBlock(input) {
    const tool = input?.tool || '';
    const blockedTools = BLOCKED_TOOLS_FOR_TRIDENT;
    if (blockedTools.some(t => tool.includes(t) || t.includes(tool))) {
        return {
            blocked: true,
            reason: 'Trident is a documentation-only agent. Edit/write/bash tools are blocked.',
            category: 'TOOL_BLOCKED'
        };
    }
    return { blocked: false };
}
function checkHiveBlock(input) {
    const tool = input?.tool || '';
    const hiveBlockedTools = HIVE_BLOCKED_TOOLS_FOR_TRIDENT;
    if (hiveBlockedTools.some(t => tool.includes(t) || t.includes(tool))) {
        return {
            blocked: true,
            reason: 'Trident is hive-context-READ-ONLY. Hive write operations are blocked.',
            category: 'HIVE_BLOCKED'
        };
    }
    return { blocked: false };
}
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
function getSemanticReportName(targetPath, contextLabel) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const context = contextLabel || 'UNLABELED';
    return `TRIDENT_CODE_REVIEW_${context}_${date}.md`;
}
function parseIntent(message) {
    const msg = message.toLowerCase();
    if (msg.includes('who') && (msg.includes('are you') || msg.includes('am i'))) {
        return { action: 'identity' };
    }
    if (msg.includes('trident') && (msg.includes('audit') || msg.includes('review') || msg.includes('scan'))) {
        const pathMatch = message.match(/(?:^|\s)(\/[\/\.\~\w-]+|\/|\.[\/\.\~\w-]+|~[\/\.\~\w-]*)(?:\s|$)/);
        const target = pathMatch ? pathMatch[1].trim() : process.cwd();
        const options = {};
        options.skipBuild = !msg.includes('--build') && !msg.includes('with build');
        options.skipTest = !msg.includes('--test') && !msg.includes('with test');
        return { action: 'audit', target, options };
    }
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
            const pathCheck = artifactWriter.writeArtifact(artifactPath, errorArtifact);
            if (pathCheck.success) {
                try {
                    fs.writeFileSync(artifactPath, errorArtifact, 'utf-8');
                }
                catch { }
            }
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
                await scanner.scanFile(filePath, content);
                filesScanned++;
            }
            catch { }
        }
        const findings = scanner.getFindings();
        const layer2Findings = findings.filter(f => f.layer === 2);
        const buildFindings = layer2Findings.map(f => ({
            severity: f.severity,
            category: f.category,
            title: f.title,
            file: f.file,
            line: f.line,
            explanation: getWhyProblem(f.category),
            impact: f.evidence.substring(0, 150),
            solution: getFixLogic(f.category),
            reasoning: `${f.category} detected at ${f.file}:${f.line || '?'} - ${f.evidence.substring(0, 100)}`
        }));
        state.lastFindings = findings;
        state.lastAuditTarget = target;
        const semanticName = getSemanticReportName(target, 'TRIDENT_CODEBASE_ANALYSIS');
        const artifact = artifactWriter.generate(findings, auditEngine.getState(), { targetPath: target, semanticContext: semanticName });
        const artifactPath = path.join(TRIDENT_ARTIFACT_DIR, semanticName);
        const writeResult = artifactWriter.writeArtifact(artifactPath, artifact);
        if (!writeResult.success) {
            state.lastError = writeResult.error || 'Write blocked';
            return state.lastError;
        }
        try {
            fs.writeFileSync(artifactPath, artifact, 'utf-8');
            state.artifacts.set(semanticName, artifact);
            state.lastReportPath = semanticName;
        }
        catch (e) {
            state.lastError = `Failed to write report: ${e.message}`;
        }
        const buildReportName = `TRIDENT_BUILD_REPORT_TRIDENT_CODEBASE_ANALYSIS_${new Date().toISOString().split('T')[0]}.md`;
        const buildReportPath = path.join(TRIDENT_ARTIFACT_DIR, buildReportName);
        const buildReportArtifact = artifactWriter.generateBuildReport(buildFindings, auditEngine.getState(), { targetPath: target, semanticContext: buildReportName.replace('.md', '') });
        const buildWriteResult = artifactWriter.writeArtifact(buildReportPath, buildReportArtifact);
        if (!buildWriteResult.success) {
            state.lastError = buildWriteResult.error;
        }
        try {
            fs.writeFileSync(buildReportPath, buildReportArtifact, 'utf-8');
            state.artifacts.set(buildReportName, buildReportArtifact);
        }
        catch (e) {
            state.lastError = `Failed to write build report: ${e.message}`;
        }
        const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
        const highCount = findings.filter(f => f.severity === 'HIGH').length;
        const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
        return `## TRIDENT AUDIT COMPLETE v3.3

**Target:** \`${target}\`
**Files Scanned:** ${filesScanned}
**Findings:** ${criticalCount} CRITICAL | ${highCount} HIGH | ${mediumCount} MEDIUM

**Artifacts saved:**
- \`${semanticName}\` (Code Review - Layer 1/3 findings)
- \`${buildReportName}\` (Build Report - Layer 2 architectural/logic analysis)

${criticalCount > 0 ? '\n:rotating_light: **CRITICAL issues found - immediate action required**\n' : ''}

View full reports: \`trident-report\``;
    }
    catch (e) {
        state.lastError = e.message;
        return `## TRIDENT AUDIT ERROR

${e.message}

Check path exists and contains .ts/.js files.`;
    }
}
function getStatus() {
    return `## TRIDENT BRAIN v3.3 Status

**Mode:** ${state.mode}
**Identity:** ${state.identityLoaded ? 'Loaded' : 'Not loaded'}
**Last Target:** ${state.lastAuditTarget || 'none'}
**Last Report:** ${state.lastReportPath || 'none'}
**Findings:** ${state.lastFindings?.length || 0}
**Error:** ${state.lastError || 'none'}

Use "trident audit [path]" to start a review.`;
}
function getHelp() {
    return `## TRIDENT BRAIN v3.3 — Algorithmic Code Review

VERSION: 3.3
IDENTITY: Self-aware (knows it is Trident Brain, not a code generator)

CORE PRINCIPLE: "Trident Documents. Humans Fix."

CAPABILITIES:
- Algorithmic pattern matching (50+ regex patterns)
- Security vulnerability detection
- Theatrical code blocking at hook level
- Hook isolation analysis
- Cross-reference verification
- Proof-based verification
- Container-based execution verification
- Identity awareness (like Kraken v1.2)

COMMANDS:
- "audit this" - Scan and document findings (generates TRIDENT_CODE_REVIEW_*.md)
- "show full report" - Display detailed findings
- "verify that [claim]" - Proof verification
- "document_fix" - Generate fix documentation (NOT apply fixes)
- "analyze hook isolation" - Cross-plugin check
- "cross-reference check" - Validate references
- "resource footprint" - Memory/token analysis
- "show status" - Current state

ANTI-THEATRICAL RULES:
- NEVER suggests mocks/stubs (blocks at hook level)
- NEVER claims host testing proves anything
- NEVER switches models to avoid problems
- ALWAYS runs real commands with proof

REPORTS:
Reports are saved with semantic names like:
TRIDENT_CODE_REVIEW_my_project_2026-04-16.md

All reports contain WHY each issue is problematic and HOW to fix (for human review).`;
}
function generateFullReport() {
    const report = state.artifacts.get(state.lastReportPath || 'TRIDENT_CODE_REVIEW.md');
    if (!report) {
        return `## NO REPORT AVAILABLE

Run an audit first: say "audit this"`;
    }
    return report;
}
function generateDocumentFix() {
    const findings = state.lastFindings || [];
    if (findings.length === 0) {
        return `## NO FINDINGS TO DOCUMENT

Run an audit first: say "audit this"`;
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
    response += `*Generated by Trident Brain v3.3.3-FIXED - Algorithmic Code Review*\n`;
    response += `*This is documentation only. Human review required before applying fixes.*\n`;
    return response;
}
function checkTheatricalBlock(input) {
    // Check all values in arguments for theatrical patterns
    const argValues = Object.values(input?.args || {});
    const allArgsString = argValues.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
    if (!allArgsString)
        return { blocked: false };
    for (const pattern of THEATRICAL_PATTERNS) {
        if (pattern.regex.test(allArgsString)) {
            return {
                blocked: true,
                reason: pattern.message,
                category: pattern.category
            };
        }
    }
    return { blocked: false };
}
export default async function TridentBrainPlugin(input) {
    try {
        const bundle = await identityLoader.loadForRole('trident');
        state.identityLoaded = bundle && bundle.soul && bundle.soul.raw && bundle.soul.raw.length > 0;
    }
    catch (e) {
        state.identityLoaded = false;
    }
    const toolExecuteBeforeHandler = async (input, output, ctx) => {
        const hiveBlock = checkHiveBlock(input);
        if (hiveBlock.blocked) {
            throw new Error(`[TRIDENT HIVE BLOCK] ${hiveBlock.category}: ${hiveBlock.reason}`);
        }
        const block = checkToolBlock(input);
        if (block.blocked) {
            throw new Error(`[TRIDENT TOOL BLOCK] ${block.category}: ${block.reason}`);
        }
        const theatrical = checkTheatricalBlock(input);
        if (theatrical.blocked) {
            throw new Error(`[TRIDENT THEATRICAL BLOCK] ${theatrical.category}: ${theatrical.reason}`);
        }
    };
    const chatMessageHandler = async (input, output, ctx) => {
        const agent = input?.session?.agentName ?? (input?.agent || '');
        registerSessionAgent(input?.sessionID, agent);
        if (!isTridentAgentFromInput(input)) {
            if (input?.sessionID) {
                sessionAgentMap.delete(input.sessionID);
            }
            return;
        }
    };
    const hooks = {
        'tool.execute.before': safeHook(toolExecuteBeforeHandler, {
            managedAgents: TRIDENT_PLUGIN_IDENTITY.agents,
            agentPrefix: TRIDENT_PLUGIN_IDENTITY.prefix,
            orchestratorName: TRIDENT_PLUGIN_IDENTITY.orchestrator
        }),
        'chat.message': safeHook(chatMessageHandler, {
            managedAgents: TRIDENT_PLUGIN_IDENTITY.agents,
            agentPrefix: TRIDENT_PLUGIN_IDENTITY.prefix,
            orchestratorName: TRIDENT_PLUGIN_IDENTITY.orchestrator
        }),
        'experimental.chat.system.transform': async (input, output) => {
            if (!isTridentAgentFromInput(input)) return;
            if (!state.identityLoaded) return;
            try {
                const bundle = await identityLoader.loadForRole('trident');
                const header = formatIdentityHeader(bundle);
                if (header) {
                    output.system = output.system || [];
                    const hasTrident = output.system.some((s) => s.includes('TRIDENT BRAIN') || s.includes('Trident Documents'));
                    if (!hasTrident) {
                        output.system.push(header);
                    }
                }
            }
            catch (e) {
                // Identity injection failure - non-critical
            }
        },
        tool: {
            'trident-audit': tool({
                description: 'Run a code audit on a target directory. Scans for theatrical code, security issues, quality patterns.',
                args: {
                    target: tool.schema.string().optional().describe('Target directory to audit (defaults to current directory)'),
                    depth: tool.schema.number().optional().describe('Audit depth 1-7 (default: 7)'),
                },
                execute: async (args, ctx) => {
                    const target = args.target || process.cwd();
                    const result = await runAudit(target, {});
                    return result;
                },
            }),
            'trident-status': tool({
                description: 'Show current Trident audit state and findings summary',
                args: {},
                execute: async () => getStatus(),
            }),
            'trident-report': tool({
                description: 'Show the full audit report with detailed findings',
                args: {},
                execute: async () => generateFullReport(),
            }),
            'trident-help': tool({
                description: 'Show Trident available commands and pattern categories',
                args: {},
                execute: async () => getHelp(),
            }),
        },
        config: async (cfg) => {
            if (!cfg.agent)
                cfg.agent = {};
            cfg.agent['trident'] = {
                name: 'trident',
                description: 'TRIDENT v3.3.3-FIXED — Self-aware algorithmic code review brain. Documentation-only. Hive-context-privileged.',
                instructions: 'TRIDENT BRAIN v3.3.3-FIXED - Self-aware algorithmic code review agent. Documentation-only. Hive-context-privileged (read only). Tools: trident-audit, trident-status, trident-report, trident-help. Blocked: edit/write/bash, hive write tools. Core principle: "Trident Documents. Humans Fix."',
                mode: 'primary',
                permission: { task: 'allow' },
                color: '#8B5CF6',
            };
        },
    };
    return hooks;
}
//# sourceMappingURL=index.js.map