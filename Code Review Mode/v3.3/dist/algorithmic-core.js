/**
 * TRIDENT BRAIN - ALGORITHMIC CORE v2.0
 *
 * Algorithmic-First Architecture:
 * - Model is ONLY used to READ code
 * - ALL intelligence is ALGORITHMIC (regex, state machines, classifiers)
 * - No behavioral prompts that can derail
 * - Rigid state machine for layer transitions
 *
 * CORE PRINCIPLE: If a human can write a rule for it, write the rule.
 *
 * NEW v2.0 CAPABILITIES:
 * 1. Proof-Based Verification - filesystem verification of claims
 * 2. Real-Time Firewall - throw+halt on banned patterns
 * 3. Hook Isolation Analyzer - detect cross-plugin contamination
 * 4. Resource Footprint Estimator - memory/token bloat detection
 * 5. Cross-Reference Verifier - validate imports/cluster IDs/tools
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir, stat, access } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { constants } from 'fs';
const execAsync = promisify(exec);
// ============================================================================
// CONSTANTS
// ============================================================================
export const SEVERITY = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    INFO: 'INFO'
};
// ============================================================================
// PATTERN LIBRARY - Algorithmic Classifiers
// ALL intelligence is in REGEX + RULES, not prompts
// THEATRICAL CODE PATTERNS ARE BANNED - CRITICAL SYSTEM FAILURE
// ============================================================================
export const PATTERNS = {
    // ============================================================================
    // LAYER 0: BEHAVIORAL DETECTION - CATCHES DERAILMENT BEFORE CODE ANALYSIS
    // ============================================================================
    HOST_FALLBACK: [
        { regex: /host\s+testing\s+(already\s+)?prove/i, severity: SEVERITY.CRITICAL },
        { regex: /on\s+the\s+host.*works/i, severity: SEVERITY.CRITICAL },
        { regex: /host\s+environment\s+(validates|proves)/i, severity: SEVERITY.CRITICAL },
        { regex: /tested\s+it\s+on\s+the\s+host/i, severity: SEVERITY.CRITICAL },
    ],
    MOCK_STUB_SUGGESTION: [
        { regex: /use\s+a?\s*mock\s+(approach|strategy)/i, severity: SEVERITY.HIGH },
        { regex: /stub\s+(this|it|out)/i, severity: SEVERITY.HIGH },
        { regex: /fake\s+(it|this|them)/i, severity: SEVERITY.HIGH },
        { regex: /mock\s+implementation/i, severity: SEVERITY.HIGH },
        { regex: /test\s+with\s+mocks/i, severity: SEVERITY.HIGH },
    ],
    MODEL_USAGE: [
        { regex: /use\s+GLM\s+(instead|rather|as\s+fallback)/i, severity: SEVERITY.CRITICAL },
        { regex: /DeepSeek\s+(fallback|instead|rather)/i, severity: SEVERITY.CRITICAL },
        { regex: /fallback\s+to\s+(GPT|GLM|DeepSeek)/i, severity: SEVERITY.CRITICAL },
        { regex: /switch\s+to\s+(GLM|DeepSeek|GPT)/i, severity: SEVERITY.CRITICAL },
        { regex: /model\s+switch/i, severity: SEVERITY.CRITICAL },
    ],
    SCOPE_CREEP: [
        { regex: /hermes_remember.*unrelated/i, severity: SEVERITY.HIGH },
        { regex: /hive_context.*different\s+project/i, severity: SEVERITY.HIGH },
        { regex: /remember.*project.*not.*current/i, severity: SEVERITY.HIGH },
        { regex: /cross.project\s+context/i, severity: SEVERITY.HIGH },
    ],
    EVIDENCE_COMPLETENESS: [
        { regex: /already\s+verif(y|ied)/i, severity: SEVERITY.CRITICAL },
        { regex: /container\s+test.*not.*need/i, severity: SEVERITY.CRITICAL },
        { regex: /proof\s+already\s+(provided|exists)/i, severity: SEVERITY.CRITICAL },
        { regex: /already\s+tested/i, severity: SEVERITY.CRITICAL },
        { regex: /no\s+need\s+to\s+verify/i, severity: SEVERITY.CRITICAL },
    ],
    // ============================================================================
    // LAYER 1: STRUCTURE ANALYSIS
    // ============================================================================
    BUNDLE_SIZE_ANOMALY: [
        { regex: /\.min\.js.*\d+kb/i, severity: SEVERITY.MEDIUM },
        { regex: /bundle.*size.*change/i, severity: SEVERITY.MEDIUM },
    ],
    FILE_SIZE_ANOMALY: [
        { regex: /^.{2000,}$/m, severity: SEVERITY.HIGH }, // Lines >2000 chars (proxy for >1000 lines)
    ],
    ENTRY_POINT_MISSING: [
        { regex: /"main"\s*:\s*null/, severity: SEVERITY.MEDIUM },
        { regex: /"main"\s*:\s*""/, severity: SEVERITY.MEDIUM },
    ],
    // ============================================================================
    // LAYER 2: EXECUTION VERIFICATION - THEATRICAL CODE IS BANNED
    // ============================================================================
    SIMULATED_EXECUTION: [
        { regex: /setTimeout\s*\(\s*\(\s*\)\s*=>\s*resolve\s*\(\s*\{\s*success\s*:\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{?\s*resolve\s*\(\s*true\s*\)/i, severity: SEVERITY.CRITICAL },
        { regex: /return\s+Promise\.resolve\s*\(\s*\{\s*success\s*:\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /return\s+await\s+Promise\.resolve\s*\(\s*\{\s*success\s*:\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /async\s+function.*\{\s*return\s+\{\s*success\s*:\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+\{\s*success\s*:\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /setTimeout.*100\s*\)/i, severity: SEVERITY.CRITICAL },
        { regex: /delay.*100.*ms/i, severity: SEVERITY.CRITICAL },
        { regex: /sleep.*100/i, severity: SEVERITY.CRITICAL },
        { regex: /return\s+\{[^}]*success\s*:\s*true[^}]*\}.*100/ms, severity: SEVERITY.CRITICAL },
        { regex: /return\s+\{\s*\n*\s*success\s*:\s*true\s*\n*\}/i, severity: SEVERITY.CRITICAL },
        { regex: /setTimeout.*success.*true/i, severity: SEVERITY.CRITICAL },
    ],
    THEATRICAL_CODE: [
        { regex: /\/\/\s*TODO.*full\s*implementation/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*TODO.*real/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*in\s+v\d+.*we\s+just\s+return/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*Full\s+implementation\s+would/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*mock\s+data/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*fake\s+/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*simulate/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\*[\s\S]*?fake[\s\S]*?\*\//i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*theatrical/i, severity: SEVERITY.CRITICAL },
        { regex: /\/\/\s*placeholder/i, severity: SEVERITY.HIGH },
        { regex: /\/\/\s*stub/i, severity: SEVERITY.HIGH },
    ],
    STUB_CODE: [
        { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+null\s*;?\s*\}/i, severity: SEVERITY.CRITICAL },
        { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+undefined\s*;?\s*\}/i, severity: SEVERITY.CRITICAL },
        { regex: /:\s*\w+\s*=>\s*null/, severity: SEVERITY.HIGH },
        { regex: /:\s*\w+\s*=>\s*undefined/, severity: SEVERITY.HIGH },
        { regex: /async\s+function\s+\w+\([^)]*\)\s*\{\s*\}/i, severity: SEVERITY.CRITICAL },
        { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/i, severity: SEVERITY.HIGH },
        { regex: /throw\s+new\s+Error\s*\(\s*['"]TODO/i, severity: SEVERITY.HIGH },
    ],
    DEAD_CODE: [
        { regex: /\/\/\s*unused.*never\s+call/i, severity: SEVERITY.LOW },
        { regex: /export\s+.*\/\/\s*never\s+import/i, severity: SEVERITY.LOW },
    ],
    // ============================================================================
    // LAYER 3: SECURITY ANALYSIS
    // ============================================================================
    SQL_INJECTION: [
        { regex: /`[^`]*\$\{[^}]+\}[^`]*`(?:query|select|insert|update|delete|where)/i, severity: SEVERITY.CRITICAL },
        { regex: /string\.format.*(?:query|select|insert|update|delete|where)/i, severity: SEVERITY.CRITICAL },
        { regex: /"\s*\+\s*\w+\s*\+\s*"\s*(?:query|select|insert|update|delete|where)/i, severity: SEVERITY.CRITICAL },
        { regex: /"\s*\+.*\+\s*"\s*(?:select|from|where)/i, severity: SEVERITY.CRITICAL },
    ],
    SECRET_EXPOSURE: [
        { regex: /api[_-]?key\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
        { regex: /secret\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
        { regex: /password\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
        { regex: /token\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
        { regex: /sk-[a-zA-Z0-9]{32,}/, severity: SEVERITY.CRITICAL },
        { regex: /ghp_[a-zA-Z0-9]{36,}/, severity: SEVERITY.CRITICAL },
        { regex: /["']ghu_[a-zA-Z0-9]{36,}["']/, severity: SEVERITY.CRITICAL },
    ],
    AUTH_BYPASS: [
        { regex: /if\s*\(\s*true\s*\)\s*\{\s*return\s+true/i, severity: SEVERITY.CRITICAL },
        { regex: /always\s*=\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /bypass\s*=\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /skipAuth\s*=\s*true/i, severity: SEVERITY.CRITICAL },
        { regex: /auth\s*=\s*true\s*;\s*return/i, severity: SEVERITY.CRITICAL },
        { regex: /return\s+true\s*;?\s*$/m, severity: SEVERITY.HIGH },
    ],
    XSS: [
        { regex: /innerHTML\s*=/, severity: SEVERITY.HIGH },
        { regex: /dangerouslySetInnerHTML/, severity: SEVERITY.HIGH },
        { regex: /document\.write\s*\(/, severity: SEVERITY.HIGH },
        { regex: /\.html\s*\(/, severity: SEVERITY.MEDIUM },
    ],
    COMMAND_INJECTION: [
        { regex: /exec\s*\(\s*[`'"].*\$\{/, severity: SEVERITY.CRITICAL },
        { regex: /spawn\s*\([^)]*\$\{/, severity: SEVERITY.CRITICAL },
        { regex: /\|\s*sh\s*/, severity: SEVERITY.CRITICAL },
    ],
    PATH_TRAVERSAL: [
        { regex: /readFile\s*\([^)]*\$\{/, severity: SEVERITY.HIGH },
        { regex: /readFileSync\s*\([^)]*\$\{/, severity: SEVERITY.HIGH },
        { regex: /join\s*\([^)]*\.\.\//, severity: SEVERITY.HIGH },
    ],
    // ============================================================================
    // LAYER 4: ARCHITECTURE ANALYSIS
    // ============================================================================
    IMPORT_CYCLE: [
        { regex: /import\s+.*\s+from\s+['"]\.\/[^['"]+['"]/g, severity: SEVERITY.HIGH },
    ],
    HOOK_SPILLOVER: [
        { regex: /is\w+Agent\s*\(\s*\)\s*===?\s*false/i, severity: SEVERITY.HIGH },
        { regex: /if\s*\(\s*!\s*agent\s*\)\s*\{/i, severity: SEVERITY.HIGH },
        { regex: /agent\s*===\s*undefined/i, severity: SEVERITY.HIGH },
        { regex: /_currentPhase/g, severity: SEVERITY.HIGH },
        { regex: /if\s*\(\s*agent\s*!==?\s*['"]\w+['"]\s*\)/i, severity: SEVERITY.MEDIUM },
    ],
    AGENT_FIELD_MISSING: [
        { regex: /input\.agent\s*===\s*undefined/i, severity: SEVERITY.CRITICAL },
        { regex: /\!input\.agent/i, severity: SEVERITY.HIGH },
        { regex: /hook.*input.*without.*agent/i, severity: SEVERITY.CRITICAL },
    ],
    GLOBAL_STATE_POLLUTION: [
        { regex: /^global\.\w+/m, severity: SEVERITY.MEDIUM },
        { regex: /^globalThis\.\w+/m, severity: SEVERITY.MEDIUM },
        { regex: /^let\s+_\w+\s*=/m, severity: SEVERITY.LOW },
        { regex: /^const\s+_\w+\s*=/m, severity: SEVERITY.LOW },
        { regex: /_\w+\s*=\s*(?:global|window|process)/i, severity: SEVERITY.MEDIUM },
    ],
    CONSOLE_SPILLOVER: [
        { regex: /console\.(log|error|warn|info)\s*\([^)]*\)/g, severity: SEVERITY.MEDIUM },
    ],
    CONTEXT_LEAK: [
        { regex: /context\s*=\s*[^;]+;?\s*(?:context|this\.context)/i, severity: SEVERITY.MEDIUM },
        { regex: /sharedContext/g, severity: SEVERITY.MEDIUM },
    ],
    PREFIX_SUPPORT_MISSING: [
        { regex: /isHermesAgent.*hermes_/i, severity: SEVERITY.MEDIUM },
        { regex: /HERMES_AGENTS\.has.*prefix/i, severity: SEVERITY.MEDIUM },
    ],
    // ============================================================================
    // LAYER 5: QUALITY ANALYSIS
    // ============================================================================
    EMPTY_CATCH: [
        { regex: /catch\s*\([^)]*\)\s*\{\s*\}/, severity: SEVERITY.HIGH },
        { regex: /catch\s*\([^)]*\)\s*\{\s*\/\*\s*\*\/\s*\}/, severity: SEVERITY.HIGH },
    ],
    SILENT_FAILURE: [
        { regex: /catch\s*\{[^}]*return\s*;/, severity: SEVERITY.HIGH },
        { regex: /catch.*\{[^}]*\}/, severity: SEVERITY.MEDIUM }, // catch with no logging
    ],
    MEMORY_LEAK: [
        { regex: /addEventListener\s*\(/g, severity: SEVERITY.MEDIUM },
        { regex: /setInterval\s*\(/g, severity: SEVERITY.MEDIUM },
    ],
    TOKEN_BLOAT: [
        { regex: /\.push\s*\(.*\{.{500,}/, severity: SEVERITY.HIGH }, // Large object push
        { regex: /context\.push\s*\(.*(?:log|output|result)/i, severity: SEVERITY.HIGH },
    ],
    COMPACTION_CONTENT_INJECTION: [
        { regex: /contextOutput\.context\.push/i, severity: SEVERITY.CRITICAL },
        { regex: /context\.push\s*\(\[.*compaction/i, severity: SEVERITY.CRITICAL },
        { regex: /compaction.*context.*push/i, severity: SEVERITY.CRITICAL },
    ],
    CONTEXT_DURING_COMPACTION: [
        { regex: /session\.compacting.*context/i, severity: SEVERITY.MEDIUM },
        { regex: /compacting.*hook.*add.*content/i, severity: SEVERITY.MEDIUM },
    ],
    COMPLEXITY: [
        { regex: /if\s*\(/g, threshold: 10, severity: SEVERITY.MEDIUM },
        { regex: /for\s*\(/g, threshold: 5, severity: SEVERITY.MEDIUM },
        { regex: /while\s*\(/g, threshold: 3, severity: SEVERITY.MEDIUM },
    ],
    // ============================================================================
    // LAYER 6: INTEGRATION VERIFICATION
    // ============================================================================
    PLUGIN_LOAD_FAILURE: [
        { regex: /Cannot\s+find\s+module.*index/i, severity: SEVERITY.CRITICAL },
        { regex: /Plugin.*failed.*load/i, severity: SEVERITY.CRITICAL },
        { regex: /default\s+export.*undefined/i, severity: SEVERITY.CRITICAL },
    ],
    DEPENDENCY_MISSING: [
        { regex: /Cannot\s+find\s+package.*@opencode-ai\/plugin/i, severity: SEVERITY.CRITICAL },
        { regex: /Missing\s+peer\s+dependency/i, severity: SEVERITY.CRITICAL },
        { regex: /npm\s+install\s+failed/i, severity: SEVERITY.CRITICAL },
    ],
    CLUSTER_NOT_FOUND: [
        { regex: /cluster-not-found/i, severity: SEVERITY.CRITICAL },
        { regex: /cluster.*does\s+not\s+exist/i, severity: SEVERITY.CRITICAL },
        { regex: /No\s+cluster\s+with\s+that\s+ID/i, severity: SEVERITY.CRITICAL },
    ],
    SHIM_IMPLEMENTATION: [
        { regex: /requires\s+shim\s+implementation/i, severity: SEVERITY.HIGH },
        { regex: /shim\s+not\s+found/i, severity: SEVERITY.HIGH },
        { regex: /stub\s+implementation/i, severity: SEVERITY.HIGH },
    ],
    WRONG_DIRECTORY: [
        { regex: /\.Spider[^\w]/, severity: SEVERITY.HIGH },
        { regex: /hermes.*path.*\.Spider/i, severity: SEVERITY.HIGH },
        { regex: /workspace.*\.Spider/i, severity: SEVERITY.MEDIUM },
        { regex: /workspace.*\.hermes/i, severity: SEVERITY.MEDIUM },
    ],
};
export class ProofVerifier {
    async verifyClaim(claim, cwd) {
        const normalizedClaim = claim.toLowerCase().trim();
        // File existence claims
        const fileMatch = normalizedClaim.match(/(?:file|dist|index\.js|build|artifact)\s+(?:exists|found)|([\/\.\~\w-]+\.\w+)/);
        if (fileMatch && (normalizedClaim.includes('exists') || normalizedClaim.includes('found') || normalizedClaim.includes('file'))) {
            return this.verifyFileExistence(claim, cwd);
        }
        // Test results claims
        if (normalizedClaim.includes('test') && (normalizedClaim.includes('pass') || normalizedClaim.includes('fail') || normalizedClaim.includes('37'))) {
            return this.verifyTestResults(claim, cwd);
        }
        // Build artifact claims
        if (normalizedClaim.includes('build') || normalizedClaim.includes('dist')) {
            return this.verifyBuildArtifact(claim, cwd);
        }
        // Default: custom claim - require evidence
        return {
            type: 'custom',
            claim,
            verified: false,
            error: 'Cannot verify claim automatically. Requires filesystem evidence.'
        };
    }
    async verifyFileExistence(claim, cwd) {
        // Extract file path from claim
        const pathMatch = claim.match(/[\/\.\~\w-]+\.\w+/);
        if (!pathMatch) {
            return { type: 'file_exists', claim, verified: false, error: 'No file path detected in claim' };
        }
        const filePath = pathMatch[0];
        const fullPath = filePath.startsWith('/') ? filePath : join(cwd, filePath);
        try {
            await access(fullPath, constants.R_OK);
            return { type: 'file_exists', claim, verified: true, proof: `File found at ${fullPath}` };
        }
        catch {
            return { type: 'file_exists', claim, verified: false, error: `File NOT found at ${fullPath}` };
        }
    }
    async verifyTestResults(claim, cwd) {
        // Look for test output files
        const possiblePaths = [
            join(cwd, 'TEST_RESULTS.md'),
            join(cwd, 'test-results.json'),
            join(cwd, 'reports', 'junit.xml'),
            join(cwd, 'coverage', 'coverage-summary.json'),
        ];
        for (const testPath of possiblePaths) {
            try {
                const content = await readFile(testPath, 'utf-8');
                // Verify claim against actual results
                const normalizedContent = content.toLowerCase();
                // Extract numbers from claim
                const numbersMatch = claim.match(/(\d+)\s*\/\s*(\d+)/);
                if (numbersMatch) {
                    const claimedPass = parseInt(numbersMatch[1]);
                    const claimedTotal = parseInt(numbersMatch[2]);
                    // Look for actual numbers in file
                    const actualMatch = normalizedContent.match(/(\d+)\s+(?:passing|passed)/);
                    if (actualMatch) {
                        const actualPass = parseInt(actualMatch[1]);
                        if (actualPass !== claimedPass) {
                            return {
                                type: 'test_results',
                                claim,
                                verified: false,
                                error: `THEATER DETECTED: Claimed ${claimedPass}/${claimedTotal} passed but file shows ${actualPass} passed`
                            };
                        }
                    }
                }
                return { type: 'test_results', claim, verified: true, proof: `Found test results at ${testPath}` };
            }
            catch {
                // File doesn't exist, continue
            }
        }
        return {
            type: 'test_results',
            claim,
            verified: false,
            error: 'No test results file found. Cannot verify test claims. THIS IS THEATER.'
        };
    }
    async verifyBuildArtifact(claim, cwd) {
        const distPath = join(cwd, 'dist');
        const buildPath = join(cwd, 'build');
        try {
            const distStat = await stat(distPath);
            if (distStat.isDirectory()) {
                const files = await readdir(distPath);
                if (files.length === 0) {
                    return { type: 'build_artifact', claim, verified: false, error: 'dist/ exists but is EMPTY - possible theater' };
                }
                return { type: 'build_artifact', claim, verified: true, proof: `dist/ exists with ${files.length} files` };
            }
        }
        catch {
            // dist doesn't exist
        }
        try {
            const buildStat = await stat(buildPath);
            if (buildStat.isDirectory()) {
                return { type: 'build_artifact', claim, verified: true, proof: `build/ exists` };
            }
        }
        catch {
            // build doesn't exist either
        }
        return { type: 'build_artifact', claim, verified: false, error: 'No build artifact directory found' };
    }
    async verifyMultiple(claims, cwd) {
        const results = [];
        let theaterDetected = false;
        const findings = [];
        for (const claim of claims) {
            const result = await this.verifyClaim(claim, cwd);
            results.push(result);
            if (!result.verified) {
                theaterDetected = true;
                findings.push({
                    severity: SEVERITY.CRITICAL,
                    layer: 0,
                    detector: 'ProofVerifier',
                    category: 'THEATER DETECTED',
                    title: 'Claim cannot be verified - THEATRICAL CODE SUSPECTED',
                    file: cwd,
                    evidence: `${result.claim}: ${result.error}`,
                    remediation: 'Do NOT claim work was done without proof. Provide actual file evidence.',
                    evidenceType: 'PROOF',
                    proofVerified: false
                });
            }
        }
        return { passed: results.every(r => r.verified), claims: results, theaterDetected, findings };
    }
}
export class RealTimeFirewall {
    config = {
        throwOnBanned: true,
        throwOnSecurity: true,
        throwOnHookSpillover: true
    };
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * REAL-TIME SCAN: Throws and HALTS on banned patterns
     * Use this in tool.execute.before hook to BLOCK theatrical code
     */
    scanRealtime(code, filePath) {
        const lines = code.split('\n');
        for (const [categoryName, patterns] of Object.entries(PATTERNS)) {
            for (const pattern of patterns) {
                const flags = pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g';
                const regex = new RegExp(pattern.regex.source, flags);
                let match;
                let safetyCount = 0;
                const maxMatches = 100;
                while ((match = regex.exec(code)) !== null && safetyCount < maxMatches) {
                    safetyCount++;
                    const lineNum = code.substring(0, match.index).split('\n').length;
                    const line = lines[lineNum - 1] || '';
                    // Determine if this should throw
                    const isBanned = categoryName === 'SIMULATED_EXECUTION' ||
                        categoryName === 'THEATRICAL_CODE' ||
                        categoryName === 'STUB_CODE';
                    const isSecurity = categoryName === 'SQL_INJECTION' ||
                        categoryName === 'SECRET_EXPOSURE' ||
                        categoryName === 'AUTH_BYPASS';
                    const isHookIssue = categoryName === 'HOOK_SPILLOVER';
                    const shouldThrow = (isBanned && this.config.throwOnBanned) ||
                        (isSecurity && this.config.throwOnSecurity) ||
                        (isHookIssue && this.config.throwOnHookSpillover);
                    if (shouldThrow) {
                        const error = `
══════════════════════════════════════════════════════════════
🚫 TRIDENT REAL-TIME FIREWALL - BLOCKED
══════════════════════════════════════════════════════════════

FILE: ${filePath}:${lineNum}
CATEGORY: ${categoryName}
PATTERN: ${pattern.note || 'Detected'}

EVIDENCE:
${line.trim()}

MATCH: ${match[0].substring(0, 100)}

${isBanned ? '🚫 THIS PATTERN IS BANNED - CRITICAL SYSTEM FAILURE' : ''}
${isSecurity ? '⚠️ SECURITY VULNERABILITY DETECTED' : ''}
${isHookIssue ? '⚠️ HOOK SPILLOVER RISK - CROSS-PLUGIN CONTAMINATION' : ''}

TRIDENT FIREWALL: Blocking execution. Fix before proceeding.
═══════════════════════════════════════════════════════════════
`;
                        throw new Error(error);
                    }
                }
            }
        }
    }
    /**
     * SOFT SCAN: Returns findings without throwing
     * Use for non-blocking analysis
     */
    scanSoft(code, filePath) {
        const findings = [];
        const lines = code.split('\n');
        for (const [categoryName, patterns] of Object.entries(PATTERNS)) {
            for (const pattern of patterns) {
                const flags = pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g';
                const regex = new RegExp(pattern.regex.source, flags);
                let match;
                let safetyCount = 0;
                const maxMatches = 100;
                while ((match = regex.exec(code)) !== null && safetyCount < maxMatches) {
                    safetyCount++;
                    const lineNum = code.substring(0, match.index).split('\n').length;
                    const line = lines[lineNum - 1] || '';
                    findings.push({
                        severity: pattern.severity,
                        layer: 0,
                        detector: 'RealTimeFirewall',
                        category: categoryName,
                        title: `[BLOCKED] ${pattern.note || 'Banned pattern detected'}`,
                        file: filePath,
                        line: lineNum,
                        evidence: line.trim(),
                        remediation: this.getRemediation(categoryName),
                        evidenceType: 'STATIC'
                    });
                }
            }
        }
        return findings;
    }
    getRemediation(category) {
        const map = {
            'SIMULATED_EXECUTION': 'REMOVE theatrical code. Do NOT simulate work. Execute real operations.',
            'THEATRICAL_CODE': 'REMOVE placeholder comments. Implement actual functionality or remove code.',
            'STUB_CODE': 'IMPLEMENT actual logic. Stubs return nothing - they are BANNED.',
            'SQL_INJECTION': 'Use parameterized queries. Never concatenate user input into SQL.',
            'SECRET_EXPOSURE': 'Use environment variables. Never hardcode secrets.',
            'AUTH_BYPASS': 'IMPLEMENT proper authentication. Never bypass auth.',
            'HOOK_SPILLOVER': 'ADD agent identity check before hook logic runs.'
        };
        return map[category] || 'Fix this issue before proceeding.';
    }
}
export class HookIsolationAnalyzer {
    agentCheckPatterns = [
        /if\s*\(\s*agent\s*!==?\s*['"][^'"]+['"]\s*\)/i,
        /if\s*\(\s*agent\s*===\s*['"][^'"]+['"]\s*\)/i,
        /is\w+Agent\s*\(\s*\)/i,
        /agent\s*===\s*undefined/i,
        /!agent\s*\|\|\s*agent\s*===/i,
        /switch\s*\(\s*agent\s*\)/i,
    ];
    analyzePlugin(pluginSource, pluginName) {
        const hooks = [];
        const spilloverRisks = [];
        // Find all hook registrations
        const hookRegex = /['"](chat\.message|tool\.execute\.before|tool\.execute\.after|session\.compacting|experimental\.[^'"]+)['"]\s*:/g;
        let match;
        let safetyCount = 0;
        const maxHooks = 50;
        while ((match = hookRegex.exec(pluginSource)) !== null && safetyCount < maxHooks) {
            safetyCount++;
            const hookName = match[1];
            const lineNum = pluginSource.substring(0, match.index).split('\n').length;
            // Find the function body after this hook registration
            const afterHook = pluginSource.substring(match.index);
            const funcMatch = afterHook.match(/(?:async\s+)?function\s*\([^)]*\)\s*\{[^}]*\}|\([^)]*\)\s*=>\s*\{[^}]*\}/);
            // Check for agent identity checks
            let hasAgentCheck = false;
            let agentCheckPattern;
            for (const pattern of this.agentCheckPatterns) {
                const checkMatch = pluginSource.match(pattern);
                if (checkMatch) {
                    hasAgentCheck = true;
                    agentCheckPattern = checkMatch[0];
                    break;
                }
            }
            // Determine if would fire in wrong context
            const wouldFire = !hasAgentCheck;
            let wrongContextImpact;
            if (wouldFire) {
                wrongContextImpact = this.estimateCrossPluginImpact(hookName, pluginName);
                spilloverRisks.push({
                    severity: SEVERITY.CRITICAL,
                    layer: 4,
                    detector: 'HookIsolationAnalyzer',
                    category: 'HOOK SPILLOVER',
                    title: `Hook '${hookName}' fires WITHOUT agent check`,
                    file: pluginName,
                    line: lineNum,
                    evidence: `No agent identity check found before hook logic`,
                    remediation: `ADD agent check: if (agent !== '${pluginName}') return;`,
                    evidenceType: 'STATIC'
                });
            }
            hooks.push({
                name: hookName,
                file: pluginName,
                line: lineNum,
                hasAgentCheck,
                agentCheckPattern,
                wouldFireInWrongContext: wouldFire,
                wrongContextImpact
            });
        }
        return {
            plugin: pluginName,
            hooks,
            spilloverRisks,
            summary: {
                totalHooks: hooks.length,
                unsafeHooks: hooks.filter(h => h.wouldFireInWrongContext).length,
                safeHooks: hooks.filter(h => !h.wouldFireInWrongContext).length
            }
        };
    }
    estimateCrossPluginImpact(hookName, sourcePlugin) {
        const impacts = {
            'chat.message': `Would transform messages for ALL agents including vanilla 'plan', 'build'`,
            'tool.execute.before': `Would block tools for ALL agents`,
            'tool.execute.after': `Would modify outputs for ALL agents`,
            'session.compacting': `Would affect session cleanup for ALL agents`,
            'experimental.chat.messages.transform': `Would pollute cross-agent message context`
        };
        return impacts[hookName] || `Would affect other agents when they trigger ${hookName}`;
    }
    analyzeHookSource(hookSource, hookName, pluginName) {
        let hasAgentCheck = false;
        let agentCheckPattern;
        for (const pattern of this.agentCheckPatterns) {
            const checkMatch = hookSource.match(pattern);
            if (checkMatch) {
                hasAgentCheck = true;
                agentCheckPattern = checkMatch[0];
                break;
            }
        }
        const lineNum = hookSource.split('\n').length;
        return {
            name: hookName,
            file: pluginName,
            line: lineNum,
            hasAgentCheck,
            agentCheckPattern,
            wouldFireInWrongContext: !hasAgentCheck,
            wrongContextImpact: !hasAgentCheck ? this.estimateCrossPluginImpact(hookName, pluginName) : undefined
        };
    }
}
export class ResourceFootprintEstimator {
    estimate(code) {
        const instantiations = {
            Map: (code.match(/\bnew\s+Map\s*\(/g) || []).length,
            Set: (code.match(/\bnew\s+Set\s*\(/g) || []).length,
            Array: (code.match(/\[\]|\bArray\b/g) || []).length,
            contextPush: (code.match(/\.push\s*\(/g) || []).length,
            contextSplice: (code.match(/\.splice\s*\(/g) || []).length
        };
        const issues = [];
        // Check for context bloat
        const contextRatio = instantiations.contextPush > 0 && instantiations.contextSplice === 0
            ? instantiations.contextPush / Math.max(1, instantiations.contextSplice)
            : 0;
        if (contextRatio > 10) {
            issues.push(`CONTEXT BLOAT: ${instantiations.contextPush} pushes with ${instantiations.contextSplice} splices - ratio ${contextRatio.toFixed(1)}`);
        }
        // Memory estimation
        let memoryEstimate = 'LOW';
        if (instantiations.Map > 20 || instantiations.Set > 20) {
            memoryEstimate = 'HIGH';
            issues.push(`EXCESSIVE COLLECTIONS: ${instantiations.Map} Maps, ${instantiations.Set} Sets`);
        }
        else if (instantiations.Map > 10 || instantiations.Set > 10) {
            memoryEstimate = 'MEDIUM';
        }
        // Token estimation (crude but algorithmic)
        const estimatedTokens = Math.ceil(code.length / 4); // ~1 token per 4 chars
        let tokenEstimate = 'LOW';
        if (estimatedTokens > 100000) {
            tokenEstimate = 'CRITICAL';
            issues.push(`TOKEN BLOAT: Estimated ${estimatedTokens} tokens in context`);
        }
        else if (estimatedTokens > 50000) {
            tokenEstimate = 'HIGH';
        }
        else if (estimatedTokens > 20000) {
            tokenEstimate = 'MEDIUM';
        }
        // Cleanup score
        const cleanupScore = instantiations.contextSplice === 0 && instantiations.contextPush > 0
            ? Math.max(0, 100 - instantiations.contextPush * 5)
            : 100 - Math.abs(instantiations.contextPush - instantiations.contextSplice) * 10;
        return {
            memoryEstimate,
            tokenEstimate,
            cleanupScore: Math.max(0, Math.min(100, cleanupScore)),
            issues,
            instantiations
        };
    }
}
export class CrossReferenceVerifier {
    async verify(projectRoot, opencodeTools) {
        const references = [];
        const findings = [];
        // Find all source files
        const files = await this.findSourceFiles(projectRoot);
        for (const file of files) {
            const content = await readFile(file, 'utf-8');
            // Check imports
            const importMatches = content.matchAll(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
            for (const m of importMatches) {
                const importPath = m[1];
                const resolved = await this.resolveImport(importPath, file, projectRoot);
                references.push({
                    type: 'import',
                    reference: importPath,
                    file: basename(file),
                    line: content.substring(0, m.index).split('\n').length,
                    ...resolved
                });
            }
            // Check cluster IDs
            const clusterMatches = content.matchAll(/cluster[Ii]d|cluster_id|spawn_cluster_task.*['"]([^'"]+)['"]/gi);
            for (const m of clusterMatches) {
                const clusterId = m[1];
                const isValidFormat = /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(clusterId);
                references.push({
                    type: 'cluster_id',
                    reference: clusterId,
                    file: basename(file),
                    line: content.substring(0, m.index).split('\n').length,
                    verified: clusterId.length > 0 && isValidFormat,
                    resolution: isValidFormat ? 'Valid format' : 'Invalid format'
                });
            }
            // Check tool names (generic pattern: word-word or word_word_word)
            const toolMatches = content.matchAll(/['"]([a-z][a-z0-9]*-[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)['"]/gi);
            for (const m of toolMatches) {
                const toolName = m[1];
                // Skip if it looks like a file path, URL, or version string
                if (toolName.includes('/') || toolName.includes('.') || /^\d/.test(toolName))
                    continue;
                const verified = !opencodeTools || opencodeTools.includes(toolName);
                references.push({
                    type: 'tool_name',
                    reference: toolName,
                    file: basename(file),
                    line: content.substring(0, m.index).split('\n').length,
                    verified,
                    resolution: verified ? 'Tool registered' : undefined,
                    error: verified ? undefined : 'Tool not found in OpenCode API'
                });
                if (!verified) {
                    findings.push({
                        severity: SEVERITY.HIGH,
                        layer: 6,
                        detector: 'CrossReferenceVerifier',
                        category: 'UNREGISTERED TOOL',
                        title: `Tool '${toolName}' referenced but not registered`,
                        file: basename(file),
                        evidence: toolName,
                        remediation: 'Register tool in plugin config or remove reference',
                        evidenceType: 'STATIC'
                    });
                }
            }
            // Check environment variables
            const envMatches = content.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
            for (const m of envMatches) {
                const envVar = m[1];
                references.push({
                    type: 'env_var',
                    reference: `process.env.${envVar}`,
                    file: basename(file),
                    line: content.substring(0, m.index).split('\n').length,
                    verified: true, // Assume exists
                    resolution: 'Environment variable reference'
                });
            }
        }
        const unverified = references.filter(r => !r.verified);
        return {
            projectRoot,
            references,
            unverified,
            findings,
            summary: {
                total: references.length,
                verified: references.filter(r => r.verified).length,
                unverified: unverified.length
            }
        };
    }
    async findSourceFiles(root) {
        const files = [];
        try {
            const entries = await readdir(root, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    const subFiles = await this.findSourceFiles(join(root, entry.name));
                    files.push(...subFiles);
                }
                else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
                    files.push(join(root, entry.name));
                }
            }
        }
        catch {
            // Skip inaccessible directories
        }
        return files;
    }
    async resolveImport(importPath, fromFile, projectRoot) {
        // Skip node_modules
        if (importPath.startsWith('@') || !importPath.startsWith('.')) {
            return { verified: true, resolution: 'External module' };
        }
        // Resolve relative import
        const baseDir = dirname(fromFile);
        const resolved = join(baseDir, importPath);
        // Try with extensions
        const extensions = ['', '.ts', '.js', '/index.ts', '/index.js'];
        for (const ext of extensions) {
            try {
                await access(resolved + ext, constants.R_OK);
                return { verified: true, resolution: `${resolved}${ext}` };
            }
            catch {
                // Try next
            }
        }
        return { verified: false, error: `Cannot resolve import '${importPath}'` };
    }
}
// ============================================================================
// ALGORITHMIC SCANNER - Pure deterministic code analysis
// ============================================================================
export class AlgorithmicScanner {
    findingId = 1;
    findings = [];
    reset() {
        this.findings = [];
        this.findingId = 1;
    }
    scanFile(filePath, content) {
        const lines = content.split('\n');
        const fileFindings = [];
        // =========================================================================
        // LAYER 0: BEHAVIORAL DETECTION - CATCHES DERAILMENT BEFORE CODE ANALYSIS
        // =========================================================================
        // SCAN: Host Fallback (Layer 0) - BLOCKER
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.HOST_FALLBACK, 0, 'HOST FALLBACK'));
        // SCAN: Mock/Stub Suggestion (Layer 0) - WARNING
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.MOCK_STUB_SUGGESTION, 0, 'MOCK STUB SUGGESTION'));
        // SCAN: Model Usage (Layer 0) - BLOCKER
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.MODEL_USAGE, 0, 'MODEL USAGE'));
        // SCAN: Scope Creep (Layer 0) - WARNING
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SCOPE_CREEP, 0, 'SCOPE CREEP'));
        // SCAN: Evidence Completeness (Layer 0) - BLOCKER
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.EVIDENCE_COMPLETENESS, 0, 'EVIDENCE COMPLETENESS'));
        // =========================================================================
        // LAYER 1: STRUCTURE ANALYSIS
        // =========================================================================
        // SCAN: Bundle Size Anomaly (Layer 1)
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.BUNDLE_SIZE_ANOMALY, 1, 'BUNDLE SIZE ANOMALY'));
        // SCAN: File Size Anomaly (Layer 1)
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.FILE_SIZE_ANOMALY, 1, 'FILE SIZE ANOMALY'));
        // SCAN: Entry Point Missing (Layer 1)
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.ENTRY_POINT_MISSING, 1, 'ENTRY POINT MISSING'));
        // SCAN: Suspiciously small file (Layer 1)
        if (content.length < 50 && (filePath.endsWith('.ts') || filePath.endsWith('.js'))) {
            fileFindings.push(this.createFinding(SEVERITY.MEDIUM, 1, 'BundleSizeAnomaly', 'ARCHITECTURAL DECAY', 'Suspiciously small file', filePath, `Size: ${content.length} bytes`, 'Verify this file contains real implementation', 'STATIC'));
        }
        // =========================================================================
        // LAYER 2: EXECUTION VERIFICATION - THEATRICAL CODE IS BANNED
        // =========================================================================
        // SCAN: Simulated Execution (Layer 2) - BANNED - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SIMULATED_EXECUTION, 2, 'SIMULATED EXECUTION'));
        // SCAN: Theatrical Code (Layer 2) - BANNED - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.THEATRICAL_CODE, 2, 'THEATRICAL CODE'));
        // SCAN: Stub Code (Layer 2) - BANNED - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.STUB_CODE, 2, 'STUB CODE'));
        // SCAN: Dead Code (Layer 2)
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.DEAD_CODE, 2, 'DEAD CODE'));
        // =========================================================================
        // LAYER 3: SECURITY ANALYSIS
        // =========================================================================
        // SCAN: SQL Injection (Layer 3) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SQL_INJECTION, 3, 'SQL INJECTION'));
        // SCAN: Command Injection (Layer 3) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.COMMAND_INJECTION, 3, 'COMMAND INJECTION'));
        // SCAN: Path Traversal (Layer 3) - HIGH
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.PATH_TRAVERSAL, 3, 'PATH TRAVERSAL'));
        // SCAN: XSS (Layer 3) - HIGH
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.XSS, 3, 'XSS'));
        // SCAN: Secret Exposure (Layer 3) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SECRET_EXPOSURE, 3, 'SECRET EXPOSURE'));
        // SCAN: Auth Bypass (Layer 3) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.AUTH_BYPASS, 3, 'AUTH BYPASS'));
        // =========================================================================
        // LAYER 4: ARCHITECTURE ANALYSIS
        // =========================================================================
        // SCAN: Import Cycle (Layer 4) - HIGH
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.IMPORT_CYCLE, 4, 'IMPORT CYCLE'));
        // SCAN: Hook Spillover (Layer 4) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.HOOK_SPILLOVER, 4, 'HOOK SPILLOVER'));
        // SCAN: Agent Field Missing (Layer 4) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.AGENT_FIELD_MISSING, 4, 'AGENT FIELD MISSING'));
        // SCAN: Global State Pollution (Layer 4) - MEDIUM
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.GLOBAL_STATE_POLLUTION, 4, 'GLOBAL STATE POLLUTION'));
        // SCAN: Console Spillover (Layer 4) - MEDIUM
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CONSOLE_SPILLOVER, 4, 'CONSOLE SPILLOVER'));
        // SCAN: Context Leak (Layer 4) - MEDIUM
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CONTEXT_LEAK, 4, 'CONTEXT LEAK'));
        // SCAN: Prefix Support Missing (Layer 4) - MEDIUM
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.PREFIX_SUPPORT_MISSING, 4, 'PREFIX SUPPORT MISSING'));
        // =========================================================================
        // LAYER 5: QUALITY ANALYSIS
        // =========================================================================
        // SCAN: Empty Catch (Layer 5) - HIGH
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.EMPTY_CATCH, 5, 'EMPTY CATCH'));
        // SCAN: Silent Failure (Layer 5) - HIGH
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SILENT_FAILURE, 5, 'SILENT FAILURE'));
        // SCAN: Memory Leak (Layer 5) - MEDIUM
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.MEMORY_LEAK, 5, 'MEMORY LEAK'));
        // SCAN: Token Bloat (Layer 5) - HIGH
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.TOKEN_BLOAT, 5, 'TOKEN BLOAT'));
        // SCAN: Compaction Content Injection (Layer 5) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.COMPACTION_CONTENT_INJECTION, 5, 'COMPACTION CONTENT INJECTION'));
        // SCAN: Context During Compaction (Layer 5) - MEDIUM
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CONTEXT_DURING_COMPACTION, 5, 'CONTEXT DURING COMPACTION'));
        // SCAN: Complexity Hotspots (Layer 5)
        fileFindings.push(...this.scanComplexity(filePath, lines, 5));
        // SCAN: Resource Leaks (Layer 5)
        fileFindings.push(...this.scanResourceLeaks(filePath, content, 5));
        // =========================================================================
        // LAYER 6: INTEGRATION VERIFICATION
        // =========================================================================
        // SCAN: Plugin Load Failure (Layer 6) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.PLUGIN_LOAD_FAILURE, 6, 'PLUGIN LOAD FAILURE'));
        // SCAN: Dependency Missing (Layer 6) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.DEPENDENCY_MISSING, 6, 'DEPENDENCY MISSING'));
        // SCAN: Cluster Not Found (Layer 6) - CRITICAL
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CLUSTER_NOT_FOUND, 6, 'CLUSTER NOT FOUND'));
        // SCAN: Shim Implementation (Layer 6) - WARNING
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SHIM_IMPLEMENTATION, 6, 'SHIM IMPLEMENTATION'));
        // SCAN: Wrong Directory (Layer 6) - WARNING
        fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.WRONG_DIRECTORY, 6, 'WRONG DIRECTORY'));
        this.findings.push(...fileFindings);
        return fileFindings;
    }
    scanPatterns(filePath, content, lines, patterns, layer, category) {
        const findings = [];
        for (const pattern of patterns) {
            try {
                const flags = pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g';
                const regex = new RegExp(pattern.regex.source, flags);
                let match;
                let safetyCount = 0;
                const maxMatches = 100;
                while ((match = regex.exec(content)) !== null && safetyCount < maxMatches) {
                    safetyCount++;
                    const matchStr = match[0];
                    const lineNum = content.substring(0, match.index).split('\n').length;
                    findings.push(this.createFinding(pattern.severity, layer, this.getDetectorName(category), category, this.generateTitle(category, pattern.note), filePath, matchStr.substring(0, 100), this.generateRemediation(category), 'STATIC', undefined, undefined, lineNum));
                }
            }
            catch (e) {
                // Skip patterns that fail
            }
        }
        return findings;
    }
    scanComplexity(filePath, lines, layer) {
        const findings = [];
        let ifCount = 0;
        let forCount = 0;
        let whileCount = 0;
        for (const line of lines) {
            if (/\bif\s*\(/.test(line))
                ifCount++;
            if (/\bfor\s*\(/.test(line))
                forCount++;
            if (/\bwhile\s*\(/.test(line))
                whileCount++;
        }
        const totalConditionals = ifCount + forCount + whileCount;
        const lineCount = lines.length;
        if (totalConditionals > 10 && lineCount > 100) {
            findings.push(this.createFinding(SEVERITY.MEDIUM, layer, 'ComplexityHotspot', 'COMPLEXITY', `High cyclomatic complexity (${totalConditionals} conditionals)`, filePath, `Conditionals: ${ifCount} if, ${forCount} for, ${whileCount} while in ${lineCount} lines`, 'Simplify by extracting functions or using early returns', 'STATIC'));
        }
        return findings;
    }
    scanResourceLeaks(filePath, content, layer) {
        const findings = [];
        const addListeners = (content.match(/addEventListener\s*\(/g) || []).length;
        const removeListeners = (content.match(/removeEventListener\s*\(/g) || []).length;
        if (addListeners > removeListeners) {
            findings.push(this.createFinding(SEVERITY.MEDIUM, layer, 'MemoryLeak', 'RESOURCE LEAK', `Potential event listener leak: ${addListeners} add vs ${removeListeners} remove`, filePath, `${addListeners} addEventListener, ${removeListeners} removeEventListener`, 'Ensure all addEventListener has corresponding removeEventListener', 'STATIC'));
        }
        return findings;
    }
    createFinding(severity, layer, detector, category, title, file, evidence, remediation, evidenceType, commandExecuted, commandOutput, line) {
        return {
            id: `AUDIT-${this.findingId++}`,
            severity,
            layer,
            detector,
            category,
            title,
            file,
            evidence,
            remediation,
            evidenceType,
            commandExecuted,
            commandOutput,
            line
        };
    }
    getDetectorName(category) {
        const map = {
            'SIMULATED EXECUTION': 'SimulatedExecution',
            'THEATRICAL CODE': 'TheatricalCode',
            'STUB CODE': 'StubFunction',
            'SQL INJECTION': 'SQLInjection',
            'XSS': 'XSSDetector',
            'SECRET EXPOSURE': 'SecretExposure',
            'AUTH BYPASS': 'AuthBypass',
            'SILENT ERROR SWALLOWING': 'EmptyCatch',
            'HOOK SPILLOVER': 'HookSpillover',
            'ISOLATION VIOLATION': 'IsolationViolation',
            'COMPLEXITY': 'ComplexityHotspot',
            'RESOURCE LEAK': 'MemoryLeak',
        };
        return map[category] || 'Unknown';
    }
    generateTitle(category, note) {
        const titles = {
            'SIMULATED EXECUTION': '🚫 THEATRICAL CODE DETECTED - BANNED PATTERN',
            'THEATRICAL CODE': '🚫 PLACEHOLDER/TODO COMMENT - THEATRICAL CODE',
            'STUB CODE': '🚫 STUB FUNCTION - BANNED PATTERN',
            'SQL INJECTION': 'Potential SQL injection vulnerability',
            'XSS': 'Potential XSS vulnerability - unsafe DOM manipulation',
            'SECRET EXPOSURE': 'Hardcoded secret/API key detected',
            'AUTH BYPASS': 'Potential authentication bypass',
            'SILENT ERROR SWALLOWING': 'Empty catch block - error is silently ignored',
            'HOOK SPILLOVER': 'Potential hook spillover pattern',
            'ISOLATION VIOLATION': 'Global state access detected',
            'COMPLEXITY': 'High cyclomatic complexity detected',
            'RESOURCE LEAK': 'Potential resource leak detected',
        };
        return titles[category] || category;
    }
    generateRemediation(category) {
        const remediations = {
            'SIMULATED EXECUTION': 'REMOVE theatrical code. Do NOT simulate work. Execute real operations.',
            'THEATRICAL CODE': 'REMOVE placeholder comments. Implement actual functionality or remove code.',
            'STUB CODE': 'IMPLEMENT actual logic. Stubs that return null/undefined are BANNED.',
            'SQL INJECTION': 'Use parameterized queries or an ORM. Never concatenate user input into SQL strings.',
            'XSS': 'Sanitize user input. Use safe DOM methods or a sanitization library.',
            'SECRET EXPOSURE': 'Move secrets to environment variables. Use a secrets manager in production.',
            'AUTH BYPASS': 'Remove hardcoded auth bypass. Implement proper authentication checks.',
            'SILENT ERROR SWALLOWING': 'Add error logging or handling to catch block.',
            'HOOK SPILLOVER': 'Ensure hooks only fire for intended agents.',
            'ISOLATION VIOLATION': 'Avoid global state. Use dependency injection.',
            'COMPLEXITY': 'Simplify by extracting functions, using early returns, or breaking into modules.',
            'RESOURCE LEAK': 'Ensure all event listeners and intervals have corresponding cleanup.',
        };
        return remediations[category] || 'Review and fix.';
    }
    getFindings() {
        return [...this.findings];
    }
    addFinding(finding) {
        if (!finding.id) {
            finding.id = `AUDIT-${this.findingId++}`;
        }
        this.findings.push(finding);
    }
    addFindings(findings) {
        this.findings.push(...findings);
    }
}
export class AuditEngine {
    state;
    scanner;
    constructor() {
        this.scanner = new AlgorithmicScanner();
        this.state = this.createInitialState();
    }
    createInitialState() {
        return {
            config: {
                targetPath: '',
                depth: 7,
                containerImage: 'opencode-python3:latest',
                buildCommand: 'npm run build 2>&1',
                testCommand: 'npm test 2>&1'
            },
            currentLayer: 0,
            completedLayers: [],
            startedAt: new Date(),
            status: 'IDLE'
        };
    }
    getState() {
        return { ...this.state };
    }
    getScanner() {
        return this.scanner;
    }
    startAudit(config) {
        this.state.config = { ...this.state.config, ...config };
        this.state.currentLayer = 0;
        this.state.completedLayers = [];
        this.state.startedAt = new Date();
        this.state.status = 'SCANNING';
        this.scanner.reset();
    }
    async scanDirectory(targetPath) {
        const files = new Map();
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
        const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total
        let totalSize = 0;
        try {
            const { stdout } = await execAsync(`find "${targetPath}" -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.json" \\) 2>/dev/null | head -200`, { timeout: 30000 });
            const filePaths = stdout.split('\n').filter(p => p.trim());
            for (const filePath of filePaths.slice(0, 100)) {
                if (totalSize >= MAX_TOTAL_SIZE)
                    break;
                try {
                    const stats = await stat(filePath);
                    if (stats.size > MAX_FILE_SIZE)
                        continue;
                    if (totalSize + stats.size > MAX_TOTAL_SIZE)
                        break;
                    const content = await readFile(filePath, 'utf-8');
                    // Validate UTF-8 (binary files cause issues)
                    if (!this.isValidUtf8(content))
                        continue;
                    totalSize += stats.size;
                    files.set(filePath, content);
                }
                catch (e) {
                    // Skip unreadable files
                }
            }
        }
        catch (e) {
            // Directory scan failed - return empty
        }
        return files;
    }
    isValidUtf8(str) {
        try {
            JSON.stringify(str);
            return true;
        }
        catch {
            return false;
        }
    }
    async runBuildTest(targetPath) {
        const command = this.state.config.buildCommand || 'npm run build 2>&1';
        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: targetPath,
                timeout: 120000
            });
            return { success: true, output: stdout + '\n' + stderr };
        }
        catch (e) {
            return { success: false, output: e.message || String(e) };
        }
    }
    async runTestSuite(targetPath) {
        const command = this.state.config.testCommand || 'npm test 2>&1';
        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: targetPath,
                timeout: 180000
            });
            const output = stdout + '\n' + stderr;
            const passMatch = output.match(/(\d+)\s+passing/);
            const failMatch = output.match(/(\d+)\s+fail/);
            return {
                success: !output.includes('error') && !output.includes('FAIL'),
                output,
                passing: passMatch ? parseInt(passMatch[1]) : 0,
                failing: failMatch ? parseInt(failMatch[1]) : 0
            };
        }
        catch (e) {
            return { success: false, output: e.message || String(e) };
        }
    }
    completeLayer(layer) {
        if (!this.state.completedLayers.includes(layer)) {
            this.state.completedLayers.push(layer);
        }
        this.state.currentLayer = layer + 1;
    }
    complete() {
        this.state.status = 'COMPLETE';
    }
}
// ============================================================================
// REPORT GENERATOR - Template-based (algorithmic output)
// ============================================================================
export class ReportGenerator {
    generate(findingId, getFindingsByLayer, state) {
        const allFindings = [];
        for (let i = 0; i <= 6; i++) {
            allFindings.push(...getFindingsByLayer(i));
        }
        const critical = allFindings.filter(f => f.severity === 'CRITICAL').length;
        const high = allFindings.filter(f => f.severity === 'HIGH').length;
        const medium = allFindings.filter(f => f.severity === 'MEDIUM').length;
        const low = allFindings.filter(f => f.severity === 'LOW').length;
        const info = allFindings.filter(f => f.severity === 'INFO').length;
        const passStatus = critical === 0 && high === 0 ? '✅ PASSED' : '❌ FAILED';
        const duration = Date.now() - state.startedAt.getTime();
        let report = `# TRIDENT CODE REVIEW — AUDIT REPORT

**Target:** ${state.config.targetPath}
**Date:** ${state.startedAt.toISOString()}
**Duration:** ${Math.round(duration / 1000)}s
**Status:** ${passStatus}

---

## EXECUTIVE SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL (BANNED) | ${critical} | ${critical > 0 ? '🚨 IMMEDIATE FIX REQUIRED' : '✅'} |
| HIGH | ${high} | ${high > 0 ? '⚠️' : '✅'} |
| MEDIUM | ${medium} | ${medium > 0 ? '⚡' : '✅'} |
| LOW | ${low} | ${low > 0 ? '📝' : '✅'} |
| INFO | ${info} | ℹ️ |

${critical > 0 ? '\n🚨 **CRITICAL: THEATRICAL CODE DETECTED - ALL SUCH PATTERNS ARE BANNED**\n' : ''}

---

## FINDINGS BY LAYER

`;
        const layerNames = {
            0: '🚫 BANNED PATTERNS (Theatrical Code)',
            1: 'Structure Analysis',
            2: 'Execution Verification',
            3: 'Security Analysis',
            4: 'Architecture Analysis',
            5: 'Quality Analysis',
            6: 'Integration Verification'
        };
        for (let layer = 0; layer <= 6; layer++) {
            const layerFindings = getFindingsByLayer(layer);
            if (layerFindings.length === 0)
                continue;
            report += `### Layer ${layer}: ${layerNames[layer] || 'Unknown'}\n\n`;
            for (const f of layerFindings) {
                const icon = { CRITICAL: '🚫', HIGH: '⚠️', MEDIUM: '⚡', LOW: '📝', INFO: 'ℹ️' }[f.severity];
                report += `#### ${icon} [${f.severity}] ${f.title}\n`;
                report += `**File:** ${f.file}${f.line ? `:${f.line}` : ''}\n`;
                report += `**Category:** ${f.category}\n`;
                report += `**Evidence:** \`${f.evidence}\`\n`;
                report += `**Fix:** ${f.remediation}\n\n`;
            }
        }
        report += `

---

## SYSTEM PROMPT FOR FIXING

Copy this to fix the issues:

\`\`\`
TARGET: ${state.config.targetPath}
CRITICAL (BANNED): ${critical}
HIGH: ${high}

🚫 THEATRICAL CODE PATTERNS ARE BANNED - FIX IMMEDIATELY:
1. SIMULATED_EXECUTION - fake success responses
2. THEATRICAL_CODE - TODO placeholders, mock comments
3. STUB_CODE - null/undefined returns

RULES:
1. Fix CRITICAL immediately - theatrical code is BANNED
2. Fix HIGH before deployment
3. Run tests after each fix

ISSUES:
${allFindings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').map((f, i) => `${i + 1}. [${f.severity}] ${f.file}${f.line ? `:${f.line}` : ''}
   ${f.title}
   Fix: ${f.remediation}`).join('\n')}
\`\`\`

---

*Generated by Trident Brain v2.0 — Algorithmic Core*
`;
        return report;
    }
}
// ============================================================================
// SINGLETON EXPORTS
// ============================================================================
export const auditEngine = new AuditEngine();
export const reportGenerator = new ReportGenerator();
export const proofVerifier = new ProofVerifier();
export const realTimeFirewall = new RealTimeFirewall();
export const hookAnalyzer = new HookIsolationAnalyzer();
export const resourceEstimator = new ResourceFootprintEstimator();
export const crossRefVerifier = new CrossReferenceVerifier();
//# sourceMappingURL=algorithmic-core.js.map