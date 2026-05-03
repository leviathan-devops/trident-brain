/**
 * Code Review Detectors - EXECUTION CAPABLE
 * 
 * Detectors that run ACTUAL container tests, not just static analysis.
 * Each detector can execute commands and analyze real output.
 */

import type { Finding, Severity } from './index.js';

export interface DetectorContext {
  targetPath: string;
  filePaths: string[];
  fileContents: Map<string, string>;
  containerImage: string;
  buildCommand: string;
  testCommand: string;
}

export interface DetectorResult {
  findings: Finding[];
  passed: boolean;
  executionOutput?: string;
}

type DetectorFunction = (ctx: DetectorContext) => Promise<DetectorResult>;

const SEVERITY_CRITICAL: Severity = 'CRITICAL';
const SEVERITY_HIGH: Severity = 'HIGH';
const SEVERITY_MEDIUM: Severity = 'MEDIUM';
const SEVERITY_LOW: Severity = 'LOW';
const SEVERITY_INFO: Severity = 'INFO';

let findingIdCounter = 1;

function createFinding(
  severity: Severity,
  layer: number,
  detector: string,
  category: string,
  title: string,
  file: string,
  evidence: string,
  remediation: string,
  evidenceType: 'STATIC' | 'EXECUTION' | 'CONTAINER' = 'STATIC',
  commandExecuted?: string,
  commandOutput?: string,
  line?: number
): Finding {
  return {
    id: `AUDIT-${findingIdCounter++}`,
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

export const DETECTOR_PATTERNS = {
  simulatedExecution: [
    /setTimeout\s*\(\s*\(\s*\)\s*=>\s*resolve\s*\(\s*\{\s*success\s*:\s*true/i,
    /setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{?\s*resolve\s*\(\s*true\s*\)/i,
    /return\s+Promise\.resolve\s*\(\s*\{\s*success\s*:\s*true/i,
    /return\s+await\s+Promise\.resolve\s*\(\s*\{\s*success\s*:\s*true/i,
    /async\s+function.*\{\s*return\s+\{\s*success\s*:\s*true/i,
    /function\s+\w+\s*\(\s*\)\s*\{\s*return\s+\{\s*success\s*:\s*true/i,
    /200\s*,\s*\{\s*data\s*:\s*true\s*\}/,
  ],
  placeholderComments: [
    /\/\/\s*TODO.*full\s*implementation/i,
    /\/\/\s*TODO.*real/i,
    /\/\/\s*in\s*v\d+.*we\s+just\s+return/i,
    /\/\/\s*Full\s+implementation\s+would/i,
    /\/\/\s*mock\s+data/i,
    /\/\/\s*fake\s+/i,
    /\/\*[\s\S]*?fake[\s\S]*?\*\//i,
    /\/\/\s*simulate/i,
    /\/\/\s*theatrical/i,
  ],
  emptyCatch: [
    /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/,
    /catch\s*\(\s*\w*\s*\)\s*\{\s*\/\*\s*\*\/\s*\}/,
    /catch\s*\(.*\)\s*\{\s*\}/,
  ],
  sqlInjection: [
    /`.*\$\{.*\}.*`.*(?:query|select|insert|update|delete|where)/i,
    /string\.format.*(?:query|select|insert|update|delete|where)/i,
    /"\s*\+\s*\w+\s*\+\s*"\s*(?:query|select|insert|update|delete|where)/i,
    /模板字符串.*\$\{.*\}/i,
  ],
  xss: [
    /innerHTML\s*=/,
    /dangerouslySetInnerHTML/,
    /document\.write\s*\(/,
    /\.html\s*\(/,
  ],
  secretExposure: [
    /api[_-]?key\s*=\s*["'][a-zA-Z0-9]{20,}/i,
    /secret\s*=\s*["'][a-zA-Z0-9]{20,}/i,
    /password\s*=\s*["'][a-zA-Z0-9]{20,}/i,
    /token\s*=\s*["'][a-zA-Z0-9]{20,}/i,
    /sk-[a-zA-Z0-9]{32,}/,
    /ghp_[a-zA-Z0-9]{36,}/,
  ],
  hookSpillover: [
    /is\w+Agent\s*\(\s*\)\s*===?\s*false/,
    /if\s*\(\s*!\s*agent\s*\)\s*\{/,
    /agent\s*===\s*undefined/,
    /_currentPhase/,
  ],
  theatricalDelays: [
    /setTimeout.*100\s*\)/,
    /delay.*100.*ms/i,
    /sleep.*100/i,
  ],
};

export const BehavioralDetectors = {
  SimulatedExecutionDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const patterns = DETECTOR_PATTERNS.simulatedExecution;
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_CRITICAL,
            0,
            'SimulatedExecutionDetector',
            'SIMULATED EXECUTION',
            'Potential theatrical/simulated execution detected',
            filePath,
            match[0].substring(0, 150),
            'This code returns success without doing real work. Replace with actual implementation.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  PlaceholderCommentDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const patterns = DETECTOR_PATTERNS.placeholderComments;
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_HIGH,
            0,
            'PlaceholderCommentDetector',
            'VERIFICATION THEATER',
            'Placeholder or TODO comment detected - may indicate incomplete code',
            filePath,
            match[0].substring(0, 150),
            'Replace TODO/placeholder comments with actual implementation or remove.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  TheatricalDelayDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const patterns = DETECTOR_PATTERNS.theatricalDelays;
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_CRITICAL,
            0,
            'TheatricalDelayDetector',
            'SIMULATED EXECUTION',
            'Suspicious 100ms delay detected - may be theatrical',
            filePath,
            match[0].substring(0, 100),
            'This delay pattern is often used in theatrical code. Verify actual work is being done.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  BundleSizeAnomalyDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    let totalSize = 0;
    let smallFiles = 0;
    
    for (const [filePath, content] of ctx.fileContents) {
      totalSize += content.length;
      if (content.length < 50 && (filePath.endsWith('.ts') || filePath.endsWith('.js'))) {
        smallFiles++;
        findings.push(createFinding(
          SEVERITY_MEDIUM,
          0,
          'BundleSizeAnomalyDetector',
          'ARCHITECTURAL DECAY',
          'Suspiciously small file detected',
          filePath,
          `File size: ${content.length} bytes`,
          'Verify this file contains real implementation and not stub/trivial code.'
        ));
      }
    }
    
    console.log(`[Trident Audit] Bundle size: ${totalSize} bytes, Small files: ${smallFiles}`);
    return { findings, passed: smallFiles < 5 };
  },

  EmptyCatchBlockDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const pattern = /catch\s*\([^)]*\)\s*\{\s*\}/;
    
    for (const [filePath, content] of ctx.fileContents) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          findings.push(createFinding(
            SEVERITY_MEDIUM,
            0,
            'EmptyCatchBlockDetector',
            'SILENT ERROR SWALLOWING',
            'Empty catch block - errors silently swallowed',
            filePath,
            lines[i].trim(),
            'Add error logging or handling to catch block. Silent errors cause debugging nightmares.',
            'STATIC',
            undefined,
            undefined,
            i + 1
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  ModuleGlobalStateDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    for (const [filePath, content] of ctx.fileContents) {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) continue;
      
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/^(?:let|const|var)\s+_\w+\s*=/.test(lines[i])) {
          findings.push(createFinding(
            SEVERITY_MEDIUM,
            0,
            'ModuleGlobalStateDetector',
            'STATE MANAGEMENT',
            'Module-level global state detected',
            filePath,
            lines[i].trim(),
            'Move to class property or function-scoped variable. Global state causes hook spillover.',
            'STATIC',
            undefined,
            undefined,
            i + 1
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  }
};

export const ExecutionDetectors = {
  BuildTestDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    console.log(`[Trident Audit] Running build test: ${ctx.buildCommand}`);
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const result = await execAsync(ctx.buildCommand, { 
        cwd: ctx.targetPath,
        timeout: 120000 
      });
      
      if (result.stderr && result.stderr.includes('error')) {
        findings.push(createFinding(
          SEVERITY_HIGH,
          2,
          'BuildTestDetector',
          'EXECUTION VERIFICATION',
          'Build completed but with errors',
          ctx.targetPath,
          result.stderr.substring(0, 200),
          'Build succeeded but had errors. Review stderr output.',
          'EXECUTION',
          ctx.buildCommand,
          result.stdout + '\n' + result.stderr
        ));
      }
      
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      findings.push(createFinding(
        SEVERITY_CRITICAL,
        2,
        'BuildTestDetector',
        'EXECUTION VERIFICATION',
        'Build FAILED - code does not compile',
        ctx.targetPath,
        errorMsg.substring(0, 200),
        'Fix build errors before proceeding. Code must compile successfully.',
        'EXECUTION',
        ctx.buildCommand,
        errorMsg
      ));
    }
    
    return { findings, passed: findings.length === 0 };
  },

  ContainerTestDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    console.log(`[Trident Audit] Running container tests: ${ctx.testCommand}`);
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const result = await execAsync(ctx.testCommand, { 
        cwd: ctx.targetPath,
        timeout: 180000 
      });
      
      const output = result.stdout + result.stderr;
      
      const testMatch = output.match(/(\d+)\s+passing|(\d+)\s+fail/);
      if (testMatch) {
        const passMatch = output.match(/(\d+)\s+passing/);
        const failMatch = output.match(/(\d+)\s+fail/);
        
        const passing = passMatch ? parseInt(passMatch[1]) : 0;
        const failing = failMatch ? parseInt(failMatch[1]) : 0;
        
        console.log(`[Trident Audit] Tests: ${passing} passing, ${failing} failing`);
        
        if (failing > 0) {
          findings.push(createFinding(
            SEVERITY_HIGH,
            2,
            'ContainerTestDetector',
            'EXECUTION VERIFICATION',
            `${failing} test(s) FAILED`,
            ctx.targetPath,
            `Test output: ${output.substring(0, 300)}`,
            'Fix failing tests before deployment.',
            'CONTAINER',
            ctx.testCommand,
            output
          ));
        }
        
        if (passing === 0 && failing === 0) {
          findings.push(createFinding(
            SEVERITY_MEDIUM,
            2,
            'ContainerTestDetector',
            'EXECUTION VERIFICATION',
            'No tests were executed',
            ctx.targetPath,
            'Test command ran but no tests were found or ran',
            'Ensure test suite exists and is properly configured.',
            'CONTAINER',
            ctx.testCommand,
            output
          ));
        }
      } else {
        if (output.includes('error') || output.includes('Error') || output.includes('FAIL')) {
          findings.push(createFinding(
            SEVERITY_HIGH,
            2,
            'ContainerTestDetector',
            'EXECUTION VERIFICATION',
            'Tests failed with errors',
            ctx.targetPath,
            output.substring(0, 200),
            'Review test output and fix errors.',
            'CONTAINER',
            ctx.testCommand,
            output
          ));
        }
      }
      
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      findings.push(createFinding(
        SEVERITY_CRITICAL,
        2,
        'ContainerTestDetector',
        'EXECUTION VERIFICATION',
        'Test execution FAILED',
        ctx.targetPath,
        errorMsg.substring(0, 200),
        'Fix test execution errors. Tests must run successfully.',
        'CONTAINER',
        ctx.testCommand,
        errorMsg
      ));
    }
    
    return { findings, passed: findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length === 0 };
  },

  StubFunctionDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const stubPatterns = [
      /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+null\s*;?\s*\}/,
      /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+undefined\s*;?\s*\}/,
      /:\s*\w+\s*=>\s*null/,
      /:\s*\w+\s*=>\s*undefined/,
      /async\s+function\s+\w+\([^)]*\)\s*\{\s*\}\s*$/,
    ];
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of stubPatterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_HIGH,
            2,
            'StubFunctionDetector',
            'STUB CODE',
            'Stub function detected - returns null/undefined',
            filePath,
            match[0].substring(0, 100),
            'Replace stub with actual implementation that performs real work.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  }
};

export const SecurityDetectors = {
  SQLInjectionDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const patterns = DETECTOR_PATTERNS.sqlInjection;
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_CRITICAL,
            3,
            'SQLInjectionDetector',
            'SQL INJECTION',
            'Potential SQL injection vulnerability - string concatenation in query',
            filePath,
            match[0].substring(0, 150),
            'Use parameterized queries or an ORM. Never concatenate user input into SQL strings.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  XSSDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const patterns = DETECTOR_PATTERNS.xss;
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_HIGH,
            3,
            'XSSDetector',
            'XSS',
            'Potential XSS vulnerability - unsafe DOM manipulation',
            filePath,
            match[0].substring(0, 100),
            'Sanitize user input. Use safe DOM methods or a sanitization library.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  SecretExposureDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const patterns = DETECTOR_PATTERNS.secretExposure;
    
    for (const [filePath, content] of ctx.fileContents) {
      if (filePath.includes('.env')) continue;
      if (filePath.includes('package.json')) continue;
      
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          findings.push(createFinding(
            SEVERITY_CRITICAL,
            3,
            'SecretExposureDetector',
            'SECRET EXPOSURE',
            'Hardcoded secret/API key detected',
            filePath,
            match[0].substring(0, 50) + '...',
            'Move secrets to environment variables. Use a secrets manager in production.',
            'STATIC',
            undefined,
            undefined,
            content.substring(0, match.index).split('\n').length
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  AuthBypassDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const bypassPatterns = [
      /if\s*\(\s*true\s*\)\s*\{\s*return\s+true/,
      /always\s*=\s*true/,
      /bypass\s*=\s*true/,
      /skipAuth\s*=\s*true/,
    ];
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of bypassPatterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_CRITICAL,
            3,
            'AuthBypassDetector',
            'AUTH BYPASS',
            'Potential authentication bypass - hardcoded true condition',
            filePath,
            match[0].substring(0, 100),
            'Remove hardcoded auth bypass. Implement proper authentication checks.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  }
};

export const ArchitectureDetectors = {
  CircularDependencyDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    return { findings, passed: true };
  },

  HookSpilloverDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const patterns = DETECTOR_PATTERNS.hookSpillover;
    
    for (const [filePath, content] of ctx.fileContents) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          findings.push(createFinding(
            SEVERITY_HIGH,
            4,
            'HookSpilloverDetector',
            'HOOK SPILLOVER',
            'Potential hook spillover pattern - agent isolation issue',
            filePath,
            match[0].substring(0, 100),
            'Ensure hooks only fire for intended agents. Check agent identification before hook logic.',
            'STATIC',
            undefined,
            undefined,
            lineNum
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  IsolationViolationDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    for (const [filePath, content] of ctx.fileContents) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('global.') || lines[i].includes('globalThis.')) {
          findings.push(createFinding(
            SEVERITY_MEDIUM,
            4,
            'IsolationViolationDetector',
            'ISOLATION VIOLATION',
            'Global state access detected',
            filePath,
            lines[i].trim(),
            'Avoid global state. Use dependency injection or module-scoped state.',
            'STATIC',
            undefined,
            undefined,
            i + 1
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  }
};

export const QualityDetectors = {
  ComplexityHotspotDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    for (const [filePath, content] of ctx.fileContents) {
      const cyclomaticPatterns = content.match(/if\s*\(|for\s*\(|while\s*\(|switch\s*\(/g) || [];
      const lines = content.split('\n');
      
      if (cyclomaticPatterns.length > 10 && lines.length > 100) {
        findings.push(createFinding(
          SEVERITY_MEDIUM,
          5,
          'ComplexityHotspotDetector',
          'COMPLEXITY',
          `High cyclomatic complexity (${cyclomaticPatterns.length} conditionals)`,
          filePath,
          `${cyclomaticPatterns.length} conditional statements in ${lines.length} lines`,
          'Simplify by extracting functions, using early returns, or breaking into modules.',
          'STATIC'
        ));
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  EmptyCatchDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    const pattern = /catch\s*\([^)]*\)\s*\{\s*\}/;
    
    for (const [filePath, content] of ctx.fileContents) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          findings.push(createFinding(
            SEVERITY_LOW,
            5,
            'EmptyCatchDetector',
            'SILENT ERROR SWALLOWING',
            'Empty catch block - error is silently ignored',
            filePath,
            lines[i].trim(),
            'Add error logging or re-throw. Silent errors cause production issues.',
            'STATIC',
            undefined,
            undefined,
            i + 1
          ));
        }
      }
    }
    
    return { findings, passed: findings.length === 0 };
  },

  MemoryLeakDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    for (const [filePath, content] of ctx.fileContents) {
      const addEventListeners = content.match(/addEventListener\s*\(/g) || [];
      const removeEventListeners = content.match(/removeEventListener\s*\(/g) || [];
      
      if (addEventListeners.length > removeEventListeners.length) {
        findings.push(createFinding(
          SEVERITY_MEDIUM,
          5,
          'MemoryLeakDetector',
          'RESOURCE LEAK',
          `Potential event listener leak: ${addEventListeners.length} adds vs ${removeEventListeners.length} removes`,
          filePath,
          `${addEventListeners.length} addEventListener calls, ${removeEventListeners.length} removeEventListener calls`,
          'Ensure all addEventListener has a corresponding removeEventListener to prevent memory leaks.',
          'STATIC'
        ));
      }
    }
    
    return { findings, passed: findings.length === 0 };
  }
};

export const IntegrationDetectors = {
  MissingDependencyDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    const packageJson = ctx.fileContents.get('package.json');
    if (!packageJson) {
      return { findings, passed: true };
    }
    
    try {
      const pkg = JSON.parse(packageJson);
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      const allDeps = [...deps, ...devDeps];
      
      for (const [filePath, content] of ctx.fileContents) {
        const importMatches = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
        for (const match of importMatches) {
          const depMatch = match.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
          if (depMatch && !depMatch[1].startsWith('.') && !depMatch[1].startsWith('@') && !depMatch[1].startsWith('#')) {
            if (!allDeps.includes(depMatch[1]) && !depMatch[1].includes('/')) {
              findings.push(createFinding(
                SEVERITY_HIGH,
                6,
                'MissingDependencyDetector',
                'MISSING DEPENDENCY',
                `Import from package not in package.json: ${depMatch[1]}`,
                filePath,
                match,
                `Add ${depMatch[1]} to package.json dependencies.`,
                'STATIC'
              ));
            }
          }
        }
      }
    } catch (e) {
      console.log('[Trident Audit] Failed to parse package.json:', e);
    }
    
    return { findings, passed: findings.length === 0 };
  },

  DockerContainerDetector: async (ctx: DetectorContext): Promise<DetectorResult> => {
    const findings: Finding[] = [];
    
    console.log(`[Trident Audit] Testing Docker container: ${ctx.containerImage}`);
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const dockerCheck = await execAsync(`docker ps --filter "ancestor=${ctx.containerImage}" --format "{{.ID}}"`, {
        timeout: 30000
      });
      
      if (dockerCheck.stdout.trim()) {
        findings.push(createFinding(
          SEVERITY_INFO,
          6,
          'DockerContainerDetector',
          'INTEGRATION VERIFICATION',
          'Container from image is running',
          ctx.containerImage,
          `Container ID: ${dockerCheck.stdout.trim()}`,
          'Container is active. Integration tests can proceed.',
          'CONTAINER',
          `docker ps --filter "ancestor=${ctx.containerImage}"`
        ));
      }
      
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('Cannot connect to the Docker daemon')) {
        findings.push(createFinding(
          SEVERITY_HIGH,
          6,
          'DockerContainerDetector',
          'INTEGRATION VERIFICATION',
          'Docker daemon not accessible',
          ctx.containerImage,
          errorMsg.substring(0, 100),
          'Ensure Docker is running and accessible. Container tests require Docker.',
          'CONTAINER',
          'docker ps',
          errorMsg
        ));
      }
    }
    
    return { findings, passed: true };
  }
};

export const ALL_DETECTORS = {
  0: Object.values(BehavioralDetectors),
  1: [], // Structure analysis done separately
  2: Object.values(ExecutionDetectors),
  3: Object.values(SecurityDetectors),
  4: Object.values(ArchitectureDetectors),
  5: Object.values(QualityDetectors),
  6: Object.values(IntegrationDetectors),
};

export async function runDetectorsForLayer(
  layer: number, 
  ctx: DetectorContext
): Promise<Finding[]> {
  const detectors = ALL_DETECTORS[layer as keyof typeof ALL_DETECTORS] || [];
  const findings: Finding[] = [];
  
  for (const detector of detectors) {
    try {
      const result = await detector(ctx);
      findings.push(...result.findings);
      if (result.executionOutput) {
        console.log(`[Trident Audit] Detector ${detector.name} output: ${result.executionOutput.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error(`[Trident Audit] Detector error in layer ${layer}:`, error);
    }
  }
  
  return findings;
}

export function resetFindingIdCounter(startFrom: number = 1): void {
  findingIdCounter = startFrom;
}
