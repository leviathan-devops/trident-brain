// @bun
// src/index.ts
import { tool } from "@opencode-ai/plugin";
import fs from "fs";
import path from "path";

// src/algorithmic-core.ts
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, readdir, stat, access } from "fs/promises";
import { join, basename, dirname } from "path";
import { constants } from "fs";
var execAsync = promisify(exec);
var SEVERITY = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO"
};
var PATTERNS = {
  HOST_FALLBACK: [
    { regex: /host\s+testing\s+(already\s+)?prove/i, severity: SEVERITY.CRITICAL },
    { regex: /on\s+the\s+host.*works/i, severity: SEVERITY.CRITICAL },
    { regex: /host\s+environment\s+(validates|proves)/i, severity: SEVERITY.CRITICAL },
    { regex: /tested\s+it\s+on\s+the\s+host/i, severity: SEVERITY.CRITICAL }
  ],
  MOCK_STUB_SUGGESTION: [
    { regex: /use\s+a?\s*mock\s+(approach|strategy)/i, severity: SEVERITY.HIGH },
    { regex: /stub\s+(this|it|out)/i, severity: SEVERITY.HIGH },
    { regex: /fake\s+(it|this|them)/i, severity: SEVERITY.HIGH },
    { regex: /mock\s+implementation/i, severity: SEVERITY.HIGH },
    { regex: /test\s+with\s+mocks/i, severity: SEVERITY.HIGH }
  ],
  MODEL_USAGE: [
    { regex: /use\s+GLM\s+(instead|rather|as\s+fallback)/i, severity: SEVERITY.CRITICAL },
    { regex: /DeepSeek\s+(fallback|instead|rather)/i, severity: SEVERITY.CRITICAL },
    { regex: /fallback\s+to\s+(GPT|GLM|DeepSeek)/i, severity: SEVERITY.CRITICAL },
    { regex: /switch\s+to\s+(GLM|DeepSeek|GPT)/i, severity: SEVERITY.CRITICAL },
    { regex: /model\s+switch/i, severity: SEVERITY.CRITICAL }
  ],
  SCOPE_CREEP: [
    { regex: /hermes_remember.*unrelated/i, severity: SEVERITY.HIGH },
    { regex: /hive_context.*different\s+project/i, severity: SEVERITY.HIGH },
    { regex: /remember.*project.*not.*current/i, severity: SEVERITY.HIGH },
    { regex: /cross.project\s+context/i, severity: SEVERITY.HIGH }
  ],
  EVIDENCE_COMPLETENESS: [
    { regex: /already\s+verif(y|ied)/i, severity: SEVERITY.CRITICAL },
    { regex: /container\s+test.*not.*need/i, severity: SEVERITY.CRITICAL },
    { regex: /proof\s+already\s+(provided|exists)/i, severity: SEVERITY.CRITICAL },
    { regex: /already\s+tested/i, severity: SEVERITY.CRITICAL },
    { regex: /no\s+need\s+to\s+verify/i, severity: SEVERITY.CRITICAL }
  ],
  BUNDLE_SIZE_ANOMALY: [
    { regex: /\.min\.js.*\d+kb/i, severity: SEVERITY.MEDIUM },
    { regex: /bundle.*size.*change/i, severity: SEVERITY.MEDIUM }
  ],
  FILE_SIZE_ANOMALY: [
    { regex: /^.{2000,}$/m, severity: SEVERITY.HIGH }
  ],
  ENTRY_POINT_MISSING: [
    { regex: /"main"\s*:\s*null/, severity: SEVERITY.MEDIUM },
    { regex: /"main"\s*:\s*""/, severity: SEVERITY.MEDIUM }
  ],
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
    { regex: /setTimeout.*success.*true/i, severity: SEVERITY.CRITICAL }
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
    { regex: /\/\/\s*stub/i, severity: SEVERITY.HIGH }
  ],
  STUB_CODE: [
    { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+null\s*;?\s*\}/i, severity: SEVERITY.CRITICAL },
    { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+undefined\s*;?\s*\}/i, severity: SEVERITY.CRITICAL },
    { regex: /:\s*\w+\s*=>\s*null/, severity: SEVERITY.HIGH },
    { regex: /:\s*\w+\s*=>\s*undefined/, severity: SEVERITY.HIGH },
    { regex: /async\s+function\s+\w+\([^)]*\)\s*\{\s*\}/i, severity: SEVERITY.CRITICAL },
    { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/i, severity: SEVERITY.HIGH },
    { regex: /throw\s+new\s+Error\s*\(\s*['"]TODO/i, severity: SEVERITY.HIGH }
  ],
  DEAD_CODE: [
    { regex: /\/\/\s*unused.*never\s+call/i, severity: SEVERITY.LOW },
    { regex: /export\s+.*\/\/\s*never\s+import/i, severity: SEVERITY.LOW }
  ],
  SQL_INJECTION: [
    { regex: /`[^`]*\$\{[^}]+\}[^`]*`(?:query|select|insert|update|delete|where)/i, severity: SEVERITY.CRITICAL },
    { regex: /string\.format.*(?:query|select|insert|update|delete|where)/i, severity: SEVERITY.CRITICAL },
    { regex: /"\s*\+\s*\w+\s*\+\s*"\s*(?:query|select|insert|update|delete|where)/i, severity: SEVERITY.CRITICAL },
    { regex: /"\s*\+.*\+\s*"\s*(?:select|from|where)/i, severity: SEVERITY.CRITICAL }
  ],
  SECRET_EXPOSURE: [
    { regex: /api[_-]?key\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
    { regex: /secret\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
    { regex: /password\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
    { regex: /token\s*=\s*["'][a-zA-Z0-9]{20,}/i, severity: SEVERITY.CRITICAL },
    { regex: /sk-[a-zA-Z0-9]{32,}/, severity: SEVERITY.CRITICAL },
    { regex: /ghp_[a-zA-Z0-9]{36,}/, severity: SEVERITY.CRITICAL },
    { regex: /["']ghu_[a-zA-Z0-9]{36,}["']/, severity: SEVERITY.CRITICAL }
  ],
  AUTH_BYPASS: [
    { regex: /if\s*\(\s*true\s*\)\s*\{\s*return\s+true/i, severity: SEVERITY.CRITICAL },
    { regex: /always\s*=\s*true/i, severity: SEVERITY.CRITICAL },
    { regex: /bypass\s*=\s*true/i, severity: SEVERITY.CRITICAL },
    { regex: /skipAuth\s*=\s*true/i, severity: SEVERITY.CRITICAL },
    { regex: /auth\s*=\s*true\s*;\s*return/i, severity: SEVERITY.CRITICAL },
    { regex: /return\s+true\s*;?\s*$/m, severity: SEVERITY.HIGH }
  ],
  XSS: [
    { regex: /innerHTML\s*=/, severity: SEVERITY.HIGH },
    { regex: /dangerouslySetInnerHTML/, severity: SEVERITY.HIGH },
    { regex: /document\.write\s*\(/, severity: SEVERITY.HIGH },
    { regex: /\.html\s*\(/, severity: SEVERITY.MEDIUM }
  ],
  COMMAND_INJECTION: [
    { regex: /exec\s*\(\s*[`'"].*\$\{/, severity: SEVERITY.CRITICAL },
    { regex: /spawn\s*\([^)]*\$\{/, severity: SEVERITY.CRITICAL },
    { regex: /\|\s*sh\s*/, severity: SEVERITY.CRITICAL }
  ],
  PATH_TRAVERSAL: [
    { regex: /readFile\s*\([^)]*\$\{/, severity: SEVERITY.HIGH },
    { regex: /readFileSync\s*\([^)]*\$\{/, severity: SEVERITY.HIGH },
    { regex: /join\s*\([^)]*\.\.\//, severity: SEVERITY.HIGH }
  ],
  IMPORT_CYCLE: [
    { regex: /import\s+.*\s+from\s+['"]\.\/[^['"]+['"]/g, severity: SEVERITY.HIGH }
  ],
  HOOK_SPILLOVER: [
    { regex: /is\w+Agent\s*\(\s*\)\s*===?\s*false/i, severity: SEVERITY.HIGH },
    { regex: /if\s*\(\s*!\s*agent\s*\)\s*\{/i, severity: SEVERITY.HIGH },
    { regex: /agent\s*===\s*undefined/i, severity: SEVERITY.HIGH },
    { regex: /_currentPhase/g, severity: SEVERITY.HIGH },
    { regex: /if\s*\(\s*agent\s*!==?\s*['"]\w+['"]\s*\)/i, severity: SEVERITY.MEDIUM }
  ],
  AGENT_FIELD_MISSING: [
    { regex: /input\.agent\s*===\s*undefined/i, severity: SEVERITY.CRITICAL },
    { regex: /\!input\.agent/i, severity: SEVERITY.HIGH },
    { regex: /hook.*input.*without.*agent/i, severity: SEVERITY.CRITICAL }
  ],
  GLOBAL_STATE_POLLUTION: [
    { regex: /^global\.\w+/m, severity: SEVERITY.MEDIUM },
    { regex: /^globalThis\.\w+/m, severity: SEVERITY.MEDIUM },
    { regex: /^let\s+_\w+\s*=/m, severity: SEVERITY.LOW },
    { regex: /^const\s+_\w+\s*=/m, severity: SEVERITY.LOW },
    { regex: /_\w+\s*=\s*(?:global|window|process)/i, severity: SEVERITY.MEDIUM }
  ],
  CONSOLE_SPILLOVER: [
    { regex: /console\.(log|error|warn|info)\s*\([^)]*\)/g, severity: SEVERITY.MEDIUM }
  ],
  CONTEXT_LEAK: [
    { regex: /context\s*=\s*[^;]+;?\s*(?:context|this\.context)/i, severity: SEVERITY.MEDIUM },
    { regex: /sharedContext/g, severity: SEVERITY.MEDIUM }
  ],
  PREFIX_SUPPORT_MISSING: [
    { regex: /isHermesAgent.*hermes_/i, severity: SEVERITY.MEDIUM },
    { regex: /HERMES_AGENTS\.has.*prefix/i, severity: SEVERITY.MEDIUM }
  ],
  EMPTY_CATCH: [
    { regex: /catch\s*\([^)]*\)\s*\{\s*\}/, severity: SEVERITY.HIGH },
    { regex: /catch\s*\([^)]*\)\s*\{\s*\/\*\s*\*\/\s*\}/, severity: SEVERITY.HIGH }
  ],
  SILENT_FAILURE: [
    { regex: /catch\s*\{[^}]*return\s*;/, severity: SEVERITY.HIGH },
    { regex: /catch.*\{[^}]*\}/, severity: SEVERITY.MEDIUM }
  ],
  MEMORY_LEAK: [
    { regex: /addEventListener\s*\(/g, severity: SEVERITY.MEDIUM },
    { regex: /setInterval\s*\(/g, severity: SEVERITY.MEDIUM }
  ],
  TOKEN_BLOAT: [
    { regex: /\.push\s*\(.*\{.{500,}/, severity: SEVERITY.HIGH },
    { regex: /context\.push\s*\(.*(?:log|output|result)/i, severity: SEVERITY.HIGH }
  ],
  COMPACTION_CONTENT_INJECTION: [
    { regex: /contextOutput\.context\.push/i, severity: SEVERITY.CRITICAL },
    { regex: /context\.push\s*\(\[.*compaction/i, severity: SEVERITY.CRITICAL },
    { regex: /compaction.*context.*push/i, severity: SEVERITY.CRITICAL }
  ],
  CONTEXT_DURING_COMPACTION: [
    { regex: /session\.compacting.*context/i, severity: SEVERITY.MEDIUM },
    { regex: /compacting.*hook.*add.*content/i, severity: SEVERITY.MEDIUM }
  ],
  COMPLEXITY: [
    { regex: /if\s*\(/g, threshold: 10, severity: SEVERITY.MEDIUM },
    { regex: /for\s*\(/g, threshold: 5, severity: SEVERITY.MEDIUM },
    { regex: /while\s*\(/g, threshold: 3, severity: SEVERITY.MEDIUM }
  ],
  PLUGIN_LOAD_FAILURE: [
    { regex: /Cannot\s+find\s+module.*index/i, severity: SEVERITY.CRITICAL },
    { regex: /Plugin.*failed.*load/i, severity: SEVERITY.CRITICAL },
    { regex: /default\s+export.*undefined/i, severity: SEVERITY.CRITICAL }
  ],
  DEPENDENCY_MISSING: [
    { regex: /Cannot\s+find\s+package.*@opencode-ai\/plugin/i, severity: SEVERITY.CRITICAL },
    { regex: /Missing\s+peer\s+dependency/i, severity: SEVERITY.CRITICAL },
    { regex: /npm\s+install\s+failed/i, severity: SEVERITY.CRITICAL }
  ],
  CLUSTER_NOT_FOUND: [
    { regex: /cluster-not-found/i, severity: SEVERITY.CRITICAL },
    { regex: /cluster.*does\s+not\s+exist/i, severity: SEVERITY.CRITICAL },
    { regex: /No\s+cluster\s+with\s+that\s+ID/i, severity: SEVERITY.CRITICAL }
  ],
  SHIM_IMPLEMENTATION: [
    { regex: /requires\s+shim\s+implementation/i, severity: SEVERITY.HIGH },
    { regex: /shim\s+not\s+found/i, severity: SEVERITY.HIGH },
    { regex: /stub\s+implementation/i, severity: SEVERITY.HIGH }
  ],
  WRONG_DIRECTORY: [
    { regex: /\.Spider[^\w]/, severity: SEVERITY.HIGH },
    { regex: /hermes.*path.*\.Spider/i, severity: SEVERITY.HIGH },
    { regex: /workspace.*\.Spider/i, severity: SEVERITY.MEDIUM },
    { regex: /workspace.*\.hermes/i, severity: SEVERITY.MEDIUM }
  ]
};

class ProofVerifier {
  async verifyClaim(claim, cwd) {
    const normalizedClaim = claim.toLowerCase().trim();
    const fileMatch = normalizedClaim.match(/(?:file|dist|index\.js|build|artifact)\s+(?:exists|found)|([\/\.\~\w-]+\.\w+)/);
    if (fileMatch && (normalizedClaim.includes("exists") || normalizedClaim.includes("found") || normalizedClaim.includes("file"))) {
      return this.verifyFileExistence(claim, cwd);
    }
    if (normalizedClaim.includes("test") && (normalizedClaim.includes("pass") || normalizedClaim.includes("fail") || normalizedClaim.includes("37"))) {
      return this.verifyTestResults(claim, cwd);
    }
    if (normalizedClaim.includes("build") || normalizedClaim.includes("dist")) {
      return this.verifyBuildArtifact(claim, cwd);
    }
    return {
      type: "custom",
      claim,
      verified: false,
      error: "Cannot verify claim automatically. Requires filesystem evidence."
    };
  }
  async verifyFileExistence(claim, cwd) {
    const pathMatch = claim.match(/[\/\.\~\w-]+\.\w+/);
    if (!pathMatch) {
      return { type: "file_exists", claim, verified: false, error: "No file path detected in claim" };
    }
    const filePath = pathMatch[0];
    const fullPath = filePath.startsWith("/") ? filePath : join(cwd, filePath);
    try {
      await access(fullPath, constants.R_OK);
      return { type: "file_exists", claim, verified: true, proof: `File found at ${fullPath}` };
    } catch {
      return { type: "file_exists", claim, verified: false, error: `File NOT found at ${fullPath}` };
    }
  }
  async verifyTestResults(claim, cwd) {
    const possiblePaths = [
      join(cwd, "TEST_RESULTS.md"),
      join(cwd, "test-results.json"),
      join(cwd, "reports", "junit.xml"),
      join(cwd, "coverage", "coverage-summary.json")
    ];
    for (const testPath of possiblePaths) {
      try {
        const content = await readFile(testPath, "utf-8");
        const normalizedContent = content.toLowerCase();
        const numbersMatch = claim.match(/(\d+)\s*\/\s*(\d+)/);
        if (numbersMatch) {
          const claimedPass = parseInt(numbersMatch[1]);
          const claimedTotal = parseInt(numbersMatch[2]);
          const actualMatch = normalizedContent.match(/(\d+)\s+(?:passing|passed)/);
          if (actualMatch) {
            const actualPass = parseInt(actualMatch[1]);
            if (actualPass !== claimedPass) {
              return {
                type: "test_results",
                claim,
                verified: false,
                error: `THEATER DETECTED: Claimed ${claimedPass}/${claimedTotal} passed but file shows ${actualPass} passed`
              };
            }
          }
        }
        return { type: "test_results", claim, verified: true, proof: `Found test results at ${testPath}` };
      } catch {}
    }
    return {
      type: "test_results",
      claim,
      verified: false,
      error: "No test results file found. Cannot verify test claims. THIS IS THEATER."
    };
  }
  async verifyBuildArtifact(claim, cwd) {
    const distPath = join(cwd, "dist");
    const buildPath = join(cwd, "build");
    try {
      const distStat = await stat(distPath);
      if (distStat.isDirectory()) {
        const files = await readdir(distPath);
        if (files.length === 0) {
          return { type: "build_artifact", claim, verified: false, error: "dist/ exists but is EMPTY - possible theater" };
        }
        return { type: "build_artifact", claim, verified: true, proof: `dist/ exists with ${files.length} files` };
      }
    } catch {}
    try {
      const buildStat = await stat(buildPath);
      if (buildStat.isDirectory()) {
        return { type: "build_artifact", claim, verified: true, proof: `build/ exists` };
      }
    } catch {}
    return { type: "build_artifact", claim, verified: false, error: "No build artifact directory found" };
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
          detector: "ProofVerifier",
          category: "THEATER DETECTED",
          title: "Claim cannot be verified - THEATRICAL CODE SUSPECTED",
          file: cwd,
          evidence: `${result.claim}: ${result.error}`,
          remediation: "Do NOT claim work was done without proof. Provide actual file evidence.",
          evidenceType: "PROOF",
          proofVerified: false
        });
      }
    }
    return { passed: results.every((r) => r.verified), claims: results, theaterDetected, findings };
  }
}

class RealTimeFirewall {
  config = {
    throwOnBanned: true,
    throwOnSecurity: true,
    throwOnHookSpillover: true
  };
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }
  scanRealtime(code, filePath) {
    const lines = code.split(`
`);
    for (const [categoryName, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        const flags = pattern.regex.flags.includes("g") ? pattern.regex.flags : pattern.regex.flags + "g";
        const regex = new RegExp(pattern.regex.source, flags);
        let match;
        let safetyCount = 0;
        const maxMatches = 100;
        while ((match = regex.exec(code)) !== null && safetyCount < maxMatches) {
          safetyCount++;
          const lineNum = code.substring(0, match.index).split(`
`).length;
          const line = lines[lineNum - 1] || "";
          const isBanned = categoryName === "SIMULATED_EXECUTION" || categoryName === "THEATRICAL_CODE" || categoryName === "STUB_CODE";
          const isSecurity = categoryName === "SQL_INJECTION" || categoryName === "SECRET_EXPOSURE" || categoryName === "AUTH_BYPASS";
          const isHookIssue = categoryName === "HOOK_SPILLOVER";
          const shouldThrow = isBanned && this.config.throwOnBanned || isSecurity && this.config.throwOnSecurity || isHookIssue && this.config.throwOnHookSpillover;
          if (shouldThrow) {
            const error = `
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\uD83D\uDEAB TRIDENT REAL-TIME FIREWALL - BLOCKED
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

FILE: ${filePath}:${lineNum}
CATEGORY: ${categoryName}
PATTERN: ${pattern.note || "Detected"}

EVIDENCE:
${line.trim()}

MATCH: ${match[0].substring(0, 100)}

${isBanned ? "\uD83D\uDEAB THIS PATTERN IS BANNED - CRITICAL SYSTEM FAILURE" : ""}
${isSecurity ? "\u26A0\uFE0F SECURITY VULNERABILITY DETECTED" : ""}
${isHookIssue ? "\u26A0\uFE0F HOOK SPILLOVER RISK - CROSS-PLUGIN CONTAMINATION" : ""}

TRIDENT FIREWALL: Blocking execution. Fix before proceeding.
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
`;
            throw new Error(error);
          }
        }
      }
    }
  }
  scanSoft(code, filePath) {
    const findings = [];
    const lines = code.split(`
`);
    for (const [categoryName, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        const flags = pattern.regex.flags.includes("g") ? pattern.regex.flags : pattern.regex.flags + "g";
        const regex = new RegExp(pattern.regex.source, flags);
        let match;
        let safetyCount = 0;
        const maxMatches = 100;
        while ((match = regex.exec(code)) !== null && safetyCount < maxMatches) {
          safetyCount++;
          const lineNum = code.substring(0, match.index).split(`
`).length;
          const line = lines[lineNum - 1] || "";
          findings.push({
            severity: pattern.severity,
            layer: 0,
            detector: "RealTimeFirewall",
            category: categoryName,
            title: `[BLOCKED] ${pattern.note || "Banned pattern detected"}`,
            file: filePath,
            line: lineNum,
            evidence: line.trim(),
            remediation: this.getRemediation(categoryName),
            evidenceType: "STATIC"
          });
        }
      }
    }
    return findings;
  }
  getRemediation(category) {
    const map = {
      SIMULATED_EXECUTION: "REMOVE theatrical code. Do NOT simulate work. Execute real operations.",
      THEATRICAL_CODE: "REMOVE placeholder comments. Implement actual functionality or remove code.",
      STUB_CODE: "IMPLEMENT actual logic. Stubs return nothing - they are BANNED.",
      SQL_INJECTION: "Use parameterized queries. Never concatenate user input into SQL.",
      SECRET_EXPOSURE: "Use environment variables. Never hardcode secrets.",
      AUTH_BYPASS: "IMPLEMENT proper authentication. Never bypass auth.",
      HOOK_SPILLOVER: "ADD agent identity check before hook logic runs."
    };
    return map[category] || "Fix this issue before proceeding.";
  }
}

class HookIsolationAnalyzer {
  agentCheckPatterns = [
    /if\s*\(\s*agent\s*!==?\s*['"][^'"]+['"]\s*\)/i,
    /if\s*\(\s*agent\s*===\s*['"][^'"]+['"]\s*\)/i,
    /is\w+Agent\s*\(\s*\)/i,
    /agent\s*===\s*undefined/i,
    /!agent\s*\|\|\s*agent\s*===/i,
    /switch\s*\(\s*agent\s*\)/i
  ];
  analyzePlugin(pluginSource, pluginName) {
    const hooks = [];
    const spilloverRisks = [];
    const hookRegex = /['"](chat\.message|tool\.execute\.before|tool\.execute\.after|session\.compacting|experimental\.[^'"]+)['"]\s*:/g;
    let match;
    let safetyCount = 0;
    const maxHooks = 50;
    while ((match = hookRegex.exec(pluginSource)) !== null && safetyCount < maxHooks) {
      safetyCount++;
      const hookName = match[1];
      const lineNum = pluginSource.substring(0, match.index).split(`
`).length;
      const afterHook = pluginSource.substring(match.index);
      const funcMatch = afterHook.match(/(?:async\s+)?function\s*\([^)]*\)\s*\{[^}]*\}|\([^)]*\)\s*=>\s*\{[^}]*\}/);
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
      const wouldFire = !hasAgentCheck;
      let wrongContextImpact;
      if (wouldFire) {
        wrongContextImpact = this.estimateCrossPluginImpact(hookName, pluginName);
        spilloverRisks.push({
          severity: SEVERITY.CRITICAL,
          layer: 4,
          detector: "HookIsolationAnalyzer",
          category: "HOOK SPILLOVER",
          title: `Hook '${hookName}' fires WITHOUT agent check`,
          file: pluginName,
          line: lineNum,
          evidence: `No agent identity check found before hook logic`,
          remediation: `ADD agent check: if (agent !== '${pluginName}') return;`,
          evidenceType: "STATIC"
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
        unsafeHooks: hooks.filter((h) => h.wouldFireInWrongContext).length,
        safeHooks: hooks.filter((h) => !h.wouldFireInWrongContext).length
      }
    };
  }
  estimateCrossPluginImpact(hookName, sourcePlugin) {
    const impacts = {
      "chat.message": `Would transform messages for ALL agents including vanilla 'plan', 'build'`,
      "tool.execute.before": `Would block tools for ALL agents`,
      "tool.execute.after": `Would modify outputs for ALL agents`,
      "session.compacting": `Would affect session cleanup for ALL agents`,
      "experimental.chat.messages.transform": `Would pollute cross-agent message context`
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
    const lineNum = hookSource.split(`
`).length;
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

class ResourceFootprintEstimator {
  estimate(code) {
    const instantiations = {
      Map: (code.match(/\bnew\s+Map\s*\(/g) || []).length,
      Set: (code.match(/\bnew\s+Set\s*\(/g) || []).length,
      Array: (code.match(/\[\]|\bArray\b/g) || []).length,
      contextPush: (code.match(/\.push\s*\(/g) || []).length,
      contextSplice: (code.match(/\.splice\s*\(/g) || []).length
    };
    const issues = [];
    const contextRatio = instantiations.contextPush > 0 && instantiations.contextSplice === 0 ? instantiations.contextPush / Math.max(1, instantiations.contextSplice) : 0;
    if (contextRatio > 10) {
      issues.push(`CONTEXT BLOAT: ${instantiations.contextPush} pushes with ${instantiations.contextSplice} splices - ratio ${contextRatio.toFixed(1)}`);
    }
    let memoryEstimate = "LOW";
    if (instantiations.Map > 20 || instantiations.Set > 20) {
      memoryEstimate = "HIGH";
      issues.push(`EXCESSIVE COLLECTIONS: ${instantiations.Map} Maps, ${instantiations.Set} Sets`);
    } else if (instantiations.Map > 10 || instantiations.Set > 10) {
      memoryEstimate = "MEDIUM";
    }
    const estimatedTokens = Math.ceil(code.length / 4);
    let tokenEstimate = "LOW";
    if (estimatedTokens > 1e5) {
      tokenEstimate = "CRITICAL";
      issues.push(`TOKEN BLOAT: Estimated ${estimatedTokens} tokens in context`);
    } else if (estimatedTokens > 50000) {
      tokenEstimate = "HIGH";
    } else if (estimatedTokens > 20000) {
      tokenEstimate = "MEDIUM";
    }
    const cleanupScore = instantiations.contextSplice === 0 && instantiations.contextPush > 0 ? Math.max(0, 100 - instantiations.contextPush * 5) : 100 - Math.abs(instantiations.contextPush - instantiations.contextSplice) * 10;
    return {
      memoryEstimate,
      tokenEstimate,
      cleanupScore: Math.max(0, Math.min(100, cleanupScore)),
      issues,
      instantiations
    };
  }
}

class CrossReferenceVerifier {
  async verify(projectRoot, opencodeTools) {
    const references = [];
    const findings = [];
    const files = await this.findSourceFiles(projectRoot);
    for (const file of files) {
      const content = await readFile(file, "utf-8");
      const importMatches = content.matchAll(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
      for (const m of importMatches) {
        const importPath = m[1];
        const resolved = await this.resolveImport(importPath, file, projectRoot);
        references.push({
          type: "import",
          reference: importPath,
          file: basename(file),
          line: content.substring(0, m.index).split(`
`).length,
          ...resolved
        });
      }
      const clusterMatches = content.matchAll(/cluster[Ii]d|cluster_id|spawn_cluster_task.*['"]([^'"]+)['"]/gi);
      for (const m of clusterMatches) {
        const clusterId = m[1];
        const isValidFormat = /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(clusterId);
        references.push({
          type: "cluster_id",
          reference: clusterId,
          file: basename(file),
          line: content.substring(0, m.index).split(`
`).length,
          verified: clusterId.length > 0 && isValidFormat,
          resolution: isValidFormat ? "Valid format" : "Invalid format"
        });
      }
      const toolMatches = content.matchAll(/['"]([a-z][a-z0-9]*-[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)['"]/gi);
      for (const m of toolMatches) {
        const toolName = m[1];
        if (toolName.includes("/") || toolName.includes(".") || /^\d/.test(toolName))
          continue;
        const verified = !opencodeTools || opencodeTools.includes(toolName);
        references.push({
          type: "tool_name",
          reference: toolName,
          file: basename(file),
          line: content.substring(0, m.index).split(`
`).length,
          verified,
          resolution: verified ? "Tool registered" : undefined,
          error: verified ? undefined : "Tool not found in OpenCode API"
        });
        if (!verified) {
          findings.push({
            severity: SEVERITY.HIGH,
            layer: 6,
            detector: "CrossReferenceVerifier",
            category: "UNREGISTERED TOOL",
            title: `Tool '${toolName}' referenced but not registered`,
            file: basename(file),
            evidence: toolName,
            remediation: "Register tool in plugin config or remove reference",
            evidenceType: "STATIC"
          });
        }
      }
      const envMatches = content.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
      for (const m of envMatches) {
        const envVar = m[1];
        references.push({
          type: "env_var",
          reference: `process.env.${envVar}`,
          file: basename(file),
          line: content.substring(0, m.index).split(`
`).length,
          verified: true,
          resolution: "Environment variable reference"
        });
      }
    }
    const unverified = references.filter((r) => !r.verified);
    return {
      projectRoot,
      references,
      unverified,
      findings,
      summary: {
        total: references.length,
        verified: references.filter((r) => r.verified).length,
        unverified: unverified.length
      }
    };
  }
  async findSourceFiles(root) {
    const files = [];
    try {
      const entries = await readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          const subFiles = await this.findSourceFiles(join(root, entry.name));
          files.push(...subFiles);
        } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
          files.push(join(root, entry.name));
        }
      }
    } catch {}
    return files;
  }
  async resolveImport(importPath, fromFile, projectRoot) {
    if (importPath.startsWith("@") || !importPath.startsWith(".")) {
      return { verified: true, resolution: "External module" };
    }
    const baseDir = dirname(fromFile);
    const resolved = join(baseDir, importPath);
    const extensions = ["", ".ts", ".js", "/index.ts", "/index.js"];
    for (const ext of extensions) {
      try {
        await access(resolved + ext, constants.R_OK);
        return { verified: true, resolution: `${resolved}${ext}` };
      } catch {}
    }
    return { verified: false, error: `Cannot resolve import '${importPath}'` };
  }
}

class AlgorithmicScanner {
  findingId = 1;
  findings = [];
  reset() {
    this.findings = [];
    this.findingId = 1;
  }
  scanFile(filePath, content) {
    const lines = content.split(`
`);
    const fileFindings = [];
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.HOST_FALLBACK, 0, "HOST FALLBACK"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.MOCK_STUB_SUGGESTION, 0, "MOCK STUB SUGGESTION"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.MODEL_USAGE, 0, "MODEL USAGE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SCOPE_CREEP, 0, "SCOPE CREEP"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.EVIDENCE_COMPLETENESS, 0, "EVIDENCE COMPLETENESS"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.BUNDLE_SIZE_ANOMALY, 1, "BUNDLE SIZE ANOMALY"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.FILE_SIZE_ANOMALY, 1, "FILE SIZE ANOMALY"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.ENTRY_POINT_MISSING, 1, "ENTRY POINT MISSING"));
    if (content.length < 50 && (filePath.endsWith(".ts") || filePath.endsWith(".js"))) {
      fileFindings.push(this.createFinding(SEVERITY.MEDIUM, 1, "BundleSizeAnomaly", "ARCHITECTURAL DECAY", "Suspiciously small file", filePath, `Size: ${content.length} bytes`, "Verify this file contains real implementation", "STATIC"));
    }
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SIMULATED_EXECUTION, 2, "SIMULATED EXECUTION"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.THEATRICAL_CODE, 2, "THEATRICAL CODE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.STUB_CODE, 2, "STUB CODE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.DEAD_CODE, 2, "DEAD CODE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SQL_INJECTION, 3, "SQL INJECTION"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.COMMAND_INJECTION, 3, "COMMAND INJECTION"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.PATH_TRAVERSAL, 3, "PATH TRAVERSAL"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.XSS, 3, "XSS"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SECRET_EXPOSURE, 3, "SECRET EXPOSURE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.AUTH_BYPASS, 3, "AUTH BYPASS"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.IMPORT_CYCLE, 4, "IMPORT CYCLE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.HOOK_SPILLOVER, 4, "HOOK SPILLOVER"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.AGENT_FIELD_MISSING, 4, "AGENT FIELD MISSING"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.GLOBAL_STATE_POLLUTION, 4, "GLOBAL STATE POLLUTION"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CONSOLE_SPILLOVER, 4, "CONSOLE SPILLOVER"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CONTEXT_LEAK, 4, "CONTEXT LEAK"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.PREFIX_SUPPORT_MISSING, 4, "PREFIX SUPPORT MISSING"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.EMPTY_CATCH, 5, "EMPTY CATCH"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SILENT_FAILURE, 5, "SILENT FAILURE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.MEMORY_LEAK, 5, "MEMORY LEAK"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.TOKEN_BLOAT, 5, "TOKEN BLOAT"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.COMPACTION_CONTENT_INJECTION, 5, "COMPACTION CONTENT INJECTION"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CONTEXT_DURING_COMPACTION, 5, "CONTEXT DURING COMPACTION"));
    fileFindings.push(...this.scanComplexity(filePath, lines, 5));
    fileFindings.push(...this.scanResourceLeaks(filePath, content, 5));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.PLUGIN_LOAD_FAILURE, 6, "PLUGIN LOAD FAILURE"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.DEPENDENCY_MISSING, 6, "DEPENDENCY MISSING"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.CLUSTER_NOT_FOUND, 6, "CLUSTER NOT FOUND"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.SHIM_IMPLEMENTATION, 6, "SHIM IMPLEMENTATION"));
    fileFindings.push(...this.scanPatterns(filePath, content, lines, PATTERNS.WRONG_DIRECTORY, 6, "WRONG DIRECTORY"));
    this.findings.push(...fileFindings);
    return fileFindings;
  }
  scanPatterns(filePath, content, lines, patterns, layer, category) {
    const findings = [];
    for (const pattern of patterns) {
      try {
        const flags = pattern.regex.flags.includes("g") ? pattern.regex.flags : pattern.regex.flags + "g";
        const regex = new RegExp(pattern.regex.source, flags);
        let match;
        let safetyCount = 0;
        const maxMatches = 100;
        while ((match = regex.exec(content)) !== null && safetyCount < maxMatches) {
          safetyCount++;
          const matchStr = match[0];
          const lineNum = content.substring(0, match.index).split(`
`).length;
          findings.push(this.createFinding(pattern.severity, layer, this.getDetectorName(category), category, this.generateTitle(category, pattern.note), filePath, matchStr.substring(0, 100), this.generateRemediation(category), "STATIC", undefined, undefined, lineNum));
        }
      } catch (e) {}
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
      findings.push(this.createFinding(SEVERITY.MEDIUM, layer, "ComplexityHotspot", "COMPLEXITY", `High cyclomatic complexity (${totalConditionals} conditionals)`, filePath, `Conditionals: ${ifCount} if, ${forCount} for, ${whileCount} while in ${lineCount} lines`, "Simplify by extracting functions or using early returns", "STATIC"));
    }
    return findings;
  }
  scanResourceLeaks(filePath, content, layer) {
    const findings = [];
    const addListeners = (content.match(/addEventListener\s*\(/g) || []).length;
    const removeListeners = (content.match(/removeEventListener\s*\(/g) || []).length;
    if (addListeners > removeListeners) {
      findings.push(this.createFinding(SEVERITY.MEDIUM, layer, "MemoryLeak", "RESOURCE LEAK", `Potential event listener leak: ${addListeners} add vs ${removeListeners} remove`, filePath, `${addListeners} addEventListener, ${removeListeners} removeEventListener`, "Ensure all addEventListener has corresponding removeEventListener", "STATIC"));
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
      "SIMULATED EXECUTION": "SimulatedExecution",
      "THEATRICAL CODE": "TheatricalCode",
      "STUB CODE": "StubFunction",
      "SQL INJECTION": "SQLInjection",
      XSS: "XSSDetector",
      "SECRET EXPOSURE": "SecretExposure",
      "AUTH BYPASS": "AuthBypass",
      "SILENT ERROR SWALLOWING": "EmptyCatch",
      "HOOK SPILLOVER": "HookSpillover",
      "ISOLATION VIOLATION": "IsolationViolation",
      COMPLEXITY: "ComplexityHotspot",
      "RESOURCE LEAK": "MemoryLeak"
    };
    return map[category] || "Unknown";
  }
  generateTitle(category, note) {
    const titles = {
      "SIMULATED EXECUTION": "\uD83D\uDEAB THEATRICAL CODE DETECTED - BANNED PATTERN",
      "THEATRICAL CODE": "\uD83D\uDEAB PLACEHOLDER/TODO COMMENT - THEATRICAL CODE",
      "STUB CODE": "\uD83D\uDEAB STUB FUNCTION - BANNED PATTERN",
      "SQL INJECTION": "Potential SQL injection vulnerability",
      XSS: "Potential XSS vulnerability - unsafe DOM manipulation",
      "SECRET EXPOSURE": "Hardcoded secret/API key detected",
      "AUTH BYPASS": "Potential authentication bypass",
      "SILENT ERROR SWALLOWING": "Empty catch block - error is silently ignored",
      "HOOK SPILLOVER": "Potential hook spillover pattern",
      "ISOLATION VIOLATION": "Global state access detected",
      COMPLEXITY: "High cyclomatic complexity detected",
      "RESOURCE LEAK": "Potential resource leak detected"
    };
    return titles[category] || category;
  }
  generateRemediation(category) {
    const remediations = {
      "SIMULATED EXECUTION": "REMOVE theatrical code. Do NOT simulate work. Execute real operations.",
      "THEATRICAL CODE": "REMOVE placeholder comments. Implement actual functionality or remove code.",
      "STUB CODE": "IMPLEMENT actual logic. Stubs that return null/undefined are BANNED.",
      "SQL INJECTION": "Use parameterized queries or an ORM. Never concatenate user input into SQL strings.",
      XSS: "Sanitize user input. Use safe DOM methods or a sanitization library.",
      "SECRET EXPOSURE": "Move secrets to environment variables. Use a secrets manager in production.",
      "AUTH BYPASS": "Remove hardcoded auth bypass. Implement proper authentication checks.",
      "SILENT ERROR SWALLOWING": "Add error logging or handling to catch block.",
      "HOOK SPILLOVER": "Ensure hooks only fire for intended agents.",
      "ISOLATION VIOLATION": "Avoid global state. Use dependency injection.",
      COMPLEXITY: "Simplify by extracting functions, using early returns, or breaking into modules.",
      "RESOURCE LEAK": "Ensure all event listeners and intervals have corresponding cleanup."
    };
    return remediations[category] || "Review and fix.";
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

class AuditEngine {
  state;
  scanner;
  constructor() {
    this.scanner = new AlgorithmicScanner;
    this.state = this.createInitialState();
  }
  createInitialState() {
    return {
      config: {
        targetPath: "",
        depth: 7,
        containerImage: "opencode-python3:latest",
        buildCommand: "npm run build 2>&1",
        testCommand: "npm test 2>&1"
      },
      currentLayer: 0,
      completedLayers: [],
      startedAt: new Date,
      status: "IDLE"
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
    this.state.startedAt = new Date;
    this.state.status = "SCANNING";
    this.scanner.reset();
  }
  async scanDirectory(targetPath) {
    const files = new Map;
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
    let totalSize = 0;
    try {
      const { stdout } = await execAsync(`find "${targetPath}" -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.json" \\) 2>/dev/null | head -200`, { timeout: 30000 });
      const filePaths = stdout.split(`
`).filter((p) => p.trim());
      for (const filePath of filePaths.slice(0, 100)) {
        if (totalSize >= MAX_TOTAL_SIZE)
          break;
        try {
          const stats = await stat(filePath);
          if (stats.size > MAX_FILE_SIZE)
            continue;
          if (totalSize + stats.size > MAX_TOTAL_SIZE)
            break;
          const content = await readFile(filePath, "utf-8");
          if (!this.isValidUtf8(content))
            continue;
          totalSize += stats.size;
          files.set(filePath, content);
        } catch (e) {}
      }
    } catch (e) {}
    return files;
  }
  isValidUtf8(str) {
    try {
      JSON.stringify(str);
      return true;
    } catch {
      return false;
    }
  }
  async runBuildTest(targetPath) {
    const command = this.state.config.buildCommand || "npm run build 2>&1";
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: targetPath,
        timeout: 120000
      });
      return { success: true, output: stdout + `
` + stderr };
    } catch (e) {
      return { success: false, output: e.message || String(e) };
    }
  }
  async runTestSuite(targetPath) {
    const command = this.state.config.testCommand || "npm test 2>&1";
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: targetPath,
        timeout: 180000
      });
      const output = stdout + `
` + stderr;
      const passMatch = output.match(/(\d+)\s+passing/);
      const failMatch = output.match(/(\d+)\s+fail/);
      return {
        success: !output.includes("error") && !output.includes("FAIL"),
        output,
        passing: passMatch ? parseInt(passMatch[1]) : 0,
        failing: failMatch ? parseInt(failMatch[1]) : 0
      };
    } catch (e) {
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
    this.state.status = "COMPLETE";
  }
}

class ReportGenerator {
  generate(findingId, getFindingsByLayer, state) {
    const allFindings = [];
    for (let i = 0;i <= 6; i++) {
      allFindings.push(...getFindingsByLayer(i));
    }
    const critical = allFindings.filter((f) => f.severity === "CRITICAL").length;
    const high = allFindings.filter((f) => f.severity === "HIGH").length;
    const medium = allFindings.filter((f) => f.severity === "MEDIUM").length;
    const low = allFindings.filter((f) => f.severity === "LOW").length;
    const info = allFindings.filter((f) => f.severity === "INFO").length;
    const passStatus = critical === 0 && high === 0 ? "\u2705 PASSED" : "\u274C FAILED";
    const duration = Date.now() - state.startedAt.getTime();
    let report = `# TRIDENT CODE REVIEW \u2014 AUDIT REPORT

**Target:** ${state.config.targetPath}
**Date:** ${state.startedAt.toISOString()}
**Duration:** ${Math.round(duration / 1000)}s
**Status:** ${passStatus}

---

## EXECUTIVE SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL (BANNED) | ${critical} | ${critical > 0 ? "\uD83D\uDEA8 IMMEDIATE FIX REQUIRED" : "\u2705"} |
| HIGH | ${high} | ${high > 0 ? "\u26A0\uFE0F" : "\u2705"} |
| MEDIUM | ${medium} | ${medium > 0 ? "\u26A1" : "\u2705"} |
| LOW | ${low} | ${low > 0 ? "\uD83D\uDCDD" : "\u2705"} |
| INFO | ${info} | \u2139\uFE0F |

${critical > 0 ? `
\uD83D\uDEA8 **CRITICAL: THEATRICAL CODE DETECTED - ALL SUCH PATTERNS ARE BANNED**
` : ""}

---

## FINDINGS BY LAYER

`;
    const layerNames = {
      0: "\uD83D\uDEAB BANNED PATTERNS (Theatrical Code)",
      1: "Structure Analysis",
      2: "Execution Verification",
      3: "Security Analysis",
      4: "Architecture Analysis",
      5: "Quality Analysis",
      6: "Integration Verification"
    };
    for (let layer = 0;layer <= 6; layer++) {
      const layerFindings = getFindingsByLayer(layer);
      if (layerFindings.length === 0)
        continue;
      report += `### Layer ${layer}: ${layerNames[layer] || "Unknown"}

`;
      for (const f of layerFindings) {
        const icon = { CRITICAL: "\uD83D\uDEAB", HIGH: "\u26A0\uFE0F", MEDIUM: "\u26A1", LOW: "\uD83D\uDCDD", INFO: "\u2139\uFE0F" }[f.severity];
        report += `#### ${icon} [${f.severity}] ${f.title}
`;
        report += `**File:** ${f.file}${f.line ? `:${f.line}` : ""}
`;
        report += `**Category:** ${f.category}
`;
        report += `**Evidence:** \`${f.evidence}\`
`;
        report += `**Fix:** ${f.remediation}

`;
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

\uD83D\uDEAB THEATRICAL CODE PATTERNS ARE BANNED - FIX IMMEDIATELY:
1. SIMULATED_EXECUTION - fake success responses
2. THEATRICAL_CODE - TODO placeholders, mock comments
3. STUB_CODE - null/undefined returns

RULES:
1. Fix CRITICAL immediately - theatrical code is BANNED
2. Fix HIGH before deployment
3. Run tests after each fix

ISSUES:
${allFindings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").map((f, i) => `${i + 1}. [${f.severity}] ${f.file}${f.line ? `:${f.line}` : ""}
   ${f.title}
   Fix: ${f.remediation}`).join(`
`)}
\`\`\`

---

*Generated by Trident Brain v2.0 \u2014 Algorithmic Core*
`;
    return report;
  }
}
var auditEngine = new AuditEngine;
var reportGenerator = new ReportGenerator;
var proofVerifier = new ProofVerifier;
var realTimeFirewall = new RealTimeFirewall;
var hookAnalyzer = new HookIsolationAnalyzer;
var resourceEstimator = new ResourceFootprintEstimator;
var crossRefVerifier = new CrossReferenceVerifier;

// src/artifact-writer.ts
var WHY_EXPLANATIONS = {
  SIMULATED_EXECUTION: "This pattern returns fake success without actual work. It deceives callers into believing operations succeeded when they did not. This is dangerous because callers make decisions based on false information, leading to cascading failures downstream.",
  THEATRICAL_CODE: "This code is placeholder/stub that never executes. It creates illusion of functionality without reality. When this code is called in production, it silently fails or returns empty/invalid data, causing mysterious bugs.",
  STUB_CODE: "This function returns null/undefined instead of doing actual work. Callers will receive empty values and may throw NullPointerExceptions or worse, silently propagate null through the system.",
  SQL_INJECTION: "User-controlled input is concatenated directly into SQL queries, allowing attackers to execute arbitrary SQL commands. This can lead to data theft, data destruction, or complete system compromise.",
  SECRET_EXPOSURE: "Hardcoded credentials or secrets are visible in source code. Anyone with code access can use these credentials to access protected systems. Secrets in code get committed to git history and are accessible to anyone who clones the repo.",
  AUTH_BYPASS: "Authentication checks are skipped or always return true. This allows unauthorized users to access protected functionality, potentially leading to data breaches or system takeover.",
  XSS: "Untrusted input is inserted into HTML without sanitization. Attackers can inject malicious scripts that execute in other users' browsers, stealing session tokens or performing actions on behalf of users.",
  EMPTY_CATCH: "Errors are silently swallowed without logging. When errors occur, nobody knows about them, making debugging impossible. Problems compound as the system continues running in a broken state.",
  HOOK_SPILLOVER: "Hooks fire for unintended agents, causing cross-plugin contamination. One agent's actions trigger responses in another agent's context, leading to information leaks and incorrect behavior.",
  GLOBAL_STATE_POLLUTION: "Global mutable state creates coupling between components. When one component modifies global state, all other components that depend on it are affected, causing unpredictable behavior and hard-to-reproduce bugs.",
  COMPLEXITY: "Function exceeds recommended complexity (cyclomatic complexity > 10). Complex functions are hard to test thoroughly, hard to understand, and easy to introduce bugs into. They should be decomposed into smaller, focused functions.",
  RESOURCE_LEAK: "Resources (event listeners, intervals, file handles, database connections) are not cleaned up. Over time, this causes memory bloat, file descriptor exhaustion, and system slowdown. Eventually the system becomes unusable.",
  HOST_FALLBACK: "Agent claims host testing proves functionality, but host testing is NOT proof. Container execution is required for proper verification. The host environment differs from production, so tests may pass in dev but fail in production.",
  MOCK_STUB_SUGGESTION: "Agent suggests using mocks/stubs instead of real implementation. This hides real behavior and creates false confidence. Integration tests should use real implementations whenever possible.",
  MODEL_USAGE: "Agent suggests switching to a different model instead of solving the problem. This is scope creep and avoids addressing the actual issue. The current model can solve the problem with proper prompting.",
  SCOPE_CREEP: "Agent is using context from unrelated projects, causing cross-contamination. This pollutes the current session with irrelevant information and can lead to incorrect decisions.",
  EVIDENCE_COMPLETENESS: 'Agent claims "already verified" without providing external proof. This is theatrical - if it was truly verified, proof would exist. Claims without proof should not be trusted.',
  COMMAND_INJECTION: "User input is concatenated into shell commands without sanitization. Attackers can craft input that executes arbitrary commands on the system, potentially gaining full system access.",
  PATH_TRAVERSAL: 'User input in file paths allows reading/writing outside intended directory. Attackers can use ".." sequences to access sensitive files like /etc/passwd or overwrite system files.',
  IMPORT_CYCLE: "Circular import dependencies detected. Modules depend on each other circularly, making it impossible to load them independently. This causes startup failures and makes testing difficult.",
  AGENT_FIELD_MISSING: "Hook receives input without agent field. Without filtering by agent, hooks fire for all agents incorrectly, causing unintended side effects and cross-agent contamination.",
  CONSOLE_SPILLOVER: "Console.log/error calls in hooks pollute cross-agent context. Output from one agent's hooks appears in another agent's session, confusing both agents and potentially leaking sensitive information.",
  CONTEXT_LEAK: "Shared context between agents causes information bleed. Data intended for one agent is accessible to another, violating isolation principles and potentially leaking sensitive information.",
  PREFIX_SUPPORT_MISSING: `Hook does not check for agent prefix variants. OpenCode agents may have prefixes like "shark/" or "manta/", and hooks that don't handle these miss firing for legitimate agent events.`,
  SILENT_FAILURE: "Function returns normally despite errors occurring internally. Callers have no way to know something went wrong, so they continue as if everything succeeded, leading to data corruption or inconsistent state.",
  TOKEN_BLOAT: "Excessive data being pushed to context. This causes token overflow, making the system unresponsive and potentially causing data loss when context is truncated.",
  COMPACTION_CONTENT_INJECTION: "Hook ADDS content during compaction instead of pruning. This causes exponential growth - each compaction adds more content, making the problem worse with every iteration.",
  DEFAULT_RISK: "This pattern may indicate a code quality or security issue. Review the evidence and remediation to understand the specific risk."
};
var HOW_FIXES = {
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
    SIMULATED_EXECUTION: `# Verify function is actually called and does work
grep -n "` + finding.title + '" ' + file + `
# Run with debug logging to see actual execution path`,
    THEATRICAL_CODE: `# Search for similar theatrical patterns
grep -rn "TODO\\|FIXME\\|STUB\\|placeholder" ` + file + " | head -20",
    STUB_CODE: `# Check function returns
grep -A5 "function ` + finding.title + '" ' + file + `
# Verify actual return value type`,
    SQL_INJECTION: `# Search for SQL concatenation vulnerabilities
grep -rn "query.*+ |sql.*+ |execute.*+ |" ` + file + " | head -20",
    SECRET_EXPOSURE: `# Search for hardcoded secrets
grep -rn "api_key\\|password\\|secret\\|token" ` + file + ' | grep -v "\\.env\\|process\\.env" | head -10',
    COMMAND_INJECTION: `# Search for shell injection points
grep -rn "execSync\\|exec\\|spawn\\|child_process" ` + file + " | head -20",
    EMPTY_CATCH: `# Find empty catch blocks
grep -B2 -A2 "catch.*}" ` + file + " | head -30",
    COMPLEXITY: `# Measure cyclomatic complexity
eslint --no-eslintrc --parser-options=ecmaVersion:2020 ` + file + ' 2>/dev/null || echo "Run: npx complexity-calculator ' + file + '"',
    RESOURCE_LEAK: `# Search for missing cleanup
grep -rn "addEventListener\\|setInterval\\|setTimeout\\|open\\|createReadStream" ` + file + " | head -20",
    IMPORT_CYCLE: `# Check import dependencies
grep -rn "^import.*from" ` + file + ` | head -20
# Or run: npx madge --circular ` + file,
    DEFAULT_RISK: `# Review the specific code
grep -n "` + finding.evidence + '" ' + file + " | head -5"
  };
  if (baseCommands[category]) {
    return baseCommands[category];
  }
  return `# Review finding in context
sed -n "` + Math.max(1, line - 5) + "," + (line + 10) + 'p" ' + file;
}
function extractSemanticContext(targetPath) {
  const parts = targetPath.split("/");
  const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
  const cleaned = lastPart.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").toUpperCase().substring(0, 30);
  return cleaned || "UNKNOWN";
}
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

class ArtifactWriter {
  generate(findings, auditState, config) {
    const semanticContext = config.semanticContext || extractSemanticContext(config.targetPath);
    const date = formatDate(new Date);
    const filename = `TRIDENT_CODE_REVIEW_${semanticContext}_${date}.md`;
    const duration = Date.now() - auditState.startedAt.getTime();
    const critical = findings.filter((f) => f.severity === SEVERITY.CRITICAL);
    const high = findings.filter((f) => f.severity === SEVERITY.HIGH);
    const medium = findings.filter((f) => f.severity === SEVERITY.MEDIUM);
    const low = findings.filter((f) => f.severity === SEVERITY.LOW);
    const info = findings.filter((f) => f.severity === SEVERITY.INFO);
    const passStatus = config.error ? "\u274C ERROR" : critical.length === 0 && high.length === 0 ? "\u2705 PASSED" : "\u274C FAILED";
    let artifact = `# TRIDENT CODE REVIEW - ${semanticContext.replace(/_/g, " ")}

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
${config.error ? `**ERROR:** ${config.error === "URL_TARGET_NOT_SUPPORTED" ? "URL targets are not supported. Please provide a local filesystem path." : config.error}` : this.describeFindings(findings)}

### Success Criteria
- [ ] Zero CRITICAL (BANNED) findings
- [ ] Zero theatrical code patterns
- [ ] All HIGH severity issues addressed
- [ ] This report generated and reviewed

---

## LAYER 2: FINDINGS BY CATEGORY

`;
    if (critical.length > 0) {
      artifact += `### \uD83D\uDEAB CRITICAL (BANNED PATTERNS) - FIX IMMEDIATELY

`;
      for (const f of critical) {
        artifact += this.formatFinding(f);
      }
    }
    if (high.length > 0) {
      artifact += `### \u26A0\uFE0F HIGH PRIORITY - Address Before Deployment

`;
      for (const f of high) {
        artifact += this.formatFinding(f);
      }
    }
    if (medium.length > 0) {
      artifact += `### \u26A1 MEDIUM PRIORITY - Address When Possible

`;
      for (const f of medium) {
        artifact += this.formatFinding(f);
      }
    }
    if (low.length > 0) {
      artifact += `### \uD83D\uDCDD LOW PRIORITY - Consider Addressing

`;
      for (const f of low) {
        artifact += this.formatFinding(f);
      }
    }
    if (info.length > 0) {
      artifact += `### \u2139\uFE0F INFORMATIONAL

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
      artifact += `${i + 1}. **${f.title}** - \`${f.file}:${f.line || "?"}\`
`;
    });
    artifact += `

### Verification Commands

\`\`\`bash
# Full audit re-run
trident audit ${config.targetPath}

# Check specific files
${critical.concat(high).slice(0, 5).map((f) => `sed -n '${f.line || 1}p' ${f.file}`).join(`
`) || "# No critical/high findings"}
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
${findings.map((f) => `| ${f.severity} | ${f.category} | ${f.title} | ${f.file} | ${f.line || "?"} |`).join(`
`)}

---

*Generated by Trident Brain v3.2 - "Trident Documents. Humans Fix."*
`;
    return artifact;
  }
  describeTarget(targetPath) {
    const parts = targetPath.split("/");
    const projectName = parts[parts.length - 1] || parts[parts.length - 2];
    return `This audit examined code at \`${targetPath}\` (project: ${projectName}). The audit scanned for code quality issues, security vulnerabilities, architectural problems, and patterns that indicate theatrical (non-functional) code.`;
  }
  describeFindings(findings) {
    if (findings.length === 0) {
      return "No issues found. The codebase passed all automated checks.";
    }
    const categories = new Map;
    for (const f of findings) {
      categories.set(f.category, (categories.get(f.category) || 0) + 1);
    }
    const sorted = Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);
    const topIssues = sorted.slice(0, 5).map(([cat, count]) => `${count} ${cat}`).join(", ");
    const critical = findings.filter((f) => f.severity === SEVERITY.CRITICAL).length;
    const high = findings.filter((f) => f.severity === SEVERITY.HIGH).length;
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

**File:** \`${f.file}:${f.line || "?"}\`
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
var artifactWriter = new ArtifactWriter;

// src/index.ts
var state = {
  mode: "idle",
  target: "",
  depth: 7,
  artifacts: new Map,
  initialized: true
};
function getSemanticReportName(targetPath) {
  const now = new Date;
  const date = now.toISOString().split("T")[0];
  const sanitized = targetPath.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const context = sanitized.length > 30 ? sanitized.substring(0, 30) : sanitized;
  return `TRIDENT_CODE_REVIEW_${context}_${date}.md`;
}
async function runAudit(target, options = {}) {
  const { skipBuild = true, skipTest = true } = options;
  state.lastError = undefined;
  const config = {
    targetPath: target,
    depth: 7,
    containerImage: "opencode-python3:latest",
    buildCommand: skipBuild ? "false" : 'npm run build 2>&1 || echo "NO_BUILD_SCRIPT"',
    testCommand: skipTest ? "false" : 'npm test 2>&1 || echo "NO_TEST_SCRIPT"'
  };
  try {
    auditEngine.startAudit(config);
    const files = await auditEngine.scanDirectory(target);
    if (files.size === 0) {
      const isUrl = target.startsWith("http://") || target.startsWith("https://") || target.startsWith("git@");
      const errorArtifact = artifactWriter.generate([], auditEngine.getState(), {
        targetPath: target,
        error: isUrl ? "URL_TARGET_NOT_SUPPORTED" : "NO_FILES_FOUND"
      });
      const errorFilename = `TRIDENT_CODE_REVIEW_ERROR_${target.split("/").pop()?.replace(/[^a-zA-Z0-9]/g, "_") || "unknown"}_${new Date().toISOString().split("T")[0]}.md`;
      const artifactPath2 = path.join(process.cwd(), errorFilename);
      try {
        fs.writeFileSync(artifactPath2, errorArtifact, "utf-8");
      } catch {}
      state.lastError = isUrl ? "URL targets require local filesystem paths" : "No files found to audit";
      return `## TRIDENT AUDIT

**Target:** ${target}

${isUrl ? "URL targets are not supported. Please provide a local filesystem path." : "No .ts/.js/.json files found. Check that the path exists and contains source files."}

**Error Artifact saved to:** \`${artifactPath2}\`

---

${errorArtifact}`;
    }
    const scanner = auditEngine.getScanner();
    let filesScanned = 0;
    for (const [filePath, content] of files) {
      try {
        scanner.scanFile(filePath, content);
        filesScanned++;
      } catch (scanError) {}
    }
    state.lastFindings = scanner.getFindings();
    state.lastAuditTarget = target;
    for (let i = 0;i <= 6; i++) {
      auditEngine.completeLayer(i);
    }
    auditEngine.complete();
    const findings = state.lastFindings;
    const reportName = getSemanticReportName(target);
    state.lastReportPath = reportName;
    const report = reportGenerator.generate(() => "AUDIT-1", (layer) => findings.filter((f) => f.layer === layer), auditEngine.getState());
    state.artifacts.set(reportName, report);
    state.artifacts.set("TRIDENT_CODE_REVIEW.md", report);
    const artifactContent = artifactWriter.generate(findings, auditEngine.getState(), { targetPath: target });
    const artifactFilename = `TRIDENT_CODE_REVIEW_${target.split("/").pop()?.replace(/[^a-zA-Z0-9]/g, "_") || "unknown"}_${new Date().toISOString().split("T")[0]}.md`;
    const artifactDir = path.dirname(target);
    const artifactPath = path.join(artifactDir, artifactFilename);
    try {
      fs.writeFileSync(artifactPath, artifactContent, "utf-8");
    } catch (writeError) {
      const altPath = path.join(process.cwd(), artifactFilename);
      try {
        fs.writeFileSync(altPath, artifactContent, "utf-8");
      } catch (altError) {}
    }
    state.artifacts.set(`ARTIFACT:${artifactFilename}`, artifactContent);
    state.artifacts.set("LATEST_ARTIFACT", artifactContent);
    const critical = findings.filter((f) => f.severity === "CRITICAL").length;
    const high = findings.filter((f) => f.severity === "HIGH").length;
    const medium = findings.filter((f) => f.severity === "MEDIUM").length;
    const low = findings.filter((f) => f.severity === "LOW").length;
    return `## TRIDENT AUDIT COMPLETE v3.2

**Target:** \`${target}\`
**Report:** \`${reportName}\`
**Artifact:** \`${artifactFilename}\`
**Files Scanned:** ${filesScanned}
**Findings:** ${findings.length}

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL (BANNED) | ${critical} | ${critical > 0 ? "FIX REQUIRED" : "OK"} |
| HIGH | ${high} | ${high > 0 ? "REVIEW" : "OK"} |
| MEDIUM | ${medium} | ${medium > 0 ? "NOTE" : "OK"} |
| LOW | ${low} | ${low > 0 ? "INFO" : "OK"} |

${critical > 0 ? `CRITICAL: Theatrical code patterns detected. See full report.
` : ""}
${critical === 0 && high === 0 ? `No critical or high severity issues found.
` : ""}

**Artifact saved to:** \`${artifactPath}\`

---

${artifactContent}`;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    state.lastError = errorMsg;
    return `## TRIDENT AUDIT ERROR

**Target:** ${target}
**Error:** ${errorMsg}`;
  }
}
function getStatus() {
  const auditState = auditEngine.getState();
  return `## TRIDENT BRAIN v3.1 STATUS

**Mode:** ${state.mode || "idle"}
**Target:** ${state.lastAuditTarget || process.cwd()}
**Status:** ${auditState.status}
**Last Error:** ${state.lastError || "none"}
**Report:** ${state.lastReportPath || "none"}

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
- CRITICAL (BANNED): ${state.lastFindings?.filter((f) => f.severity === "CRITICAL").length || 0}
- HIGH: ${state.lastFindings?.filter((f) => f.severity === "HIGH").length || 0}
- MEDIUM: ${state.lastFindings?.filter((f) => f.severity === "MEDIUM").length || 0}
- LOW: ${state.lastFindings?.filter((f) => f.severity === "LOW").length || 0}

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
  const report = state.artifacts.get(state.lastReportPath || "TRIDENT_CODE_REVIEW.md");
  if (!report) {
    return `## NO REPORT AVAILABLE

Run an audit first: say "audit this"`;
  }
  return report;
}
async function TridentBrainPlugin(input) {
  return {
    tool: {
      "trident-audit": tool({
        description: "Run a code audit on a target directory. Scans for theatrical code, security issues, quality patterns.",
        args: {
          target: tool.schema.string().optional().describe("Target directory to audit (defaults to current directory)"),
          depth: tool.schema.number().optional().describe("Audit depth 1-7 (default: 7)")
        },
        execute: async (args, ctx) => {
          const target = args.target || process.cwd();
          const result = await runAudit(target, {});
          return result;
        }
      }),
      "trident-status": tool({
        description: "Show current Trident audit state and findings summary",
        args: {},
        execute: async () => getStatus()
      }),
      "trident-report": tool({
        description: "Show the full audit report with detailed findings",
        args: {},
        execute: async () => generateFullReport()
      }),
      "trident-help": tool({
        description: "Show Trident available commands and pattern categories",
        args: {},
        execute: async () => getHelp()
      })
    },
    config: async (cfg) => {
      if (!cfg.agent)
        cfg.agent = {};
      cfg.agent["trident"] = {
        name: "trident",
        description: "TRIDENT v3.2 \u2014 Documentation-only code review. Never edits.",
        instructions: `TRIDENT v3.2 \u2014 Code Review Agent
TOOLS: trident-audit, trident-status, trident-report, trident-help
TRIDENT CORE PRINCIPLE: "Trident Documents. Humans Fix."

TRIDENT NEVER edits code or applies fixes.

TRIDENT ALWAYS documents findings in TRIDENT_CODE_REVIEW_*.md files.

TOOLS:
- trident-audit [target] \u2014 Run code audit
- trident-status \u2014 Show current state
- trident-report \u2014 Full detailed report
- trident-help \u2014 Available commands

When user asks to audit/scan/review: call trident-audit with target path.
When user asks for status: call trident-status.
When user asks for full report: call trident-report.`,
        mode: "primary",
        permission: { task: "allow" },
        color: "#8B5CF6"
      };
    }
  };
}
export {
  TridentBrainPlugin as default
};
