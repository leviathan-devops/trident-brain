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
export declare const SEVERITY: {
    readonly CRITICAL: "CRITICAL";
    readonly HIGH: "HIGH";
    readonly MEDIUM: "MEDIUM";
    readonly LOW: "LOW";
    readonly INFO: "INFO";
};
export type Severity = typeof SEVERITY[keyof typeof SEVERITY];
export interface Finding {
    id?: string;
    severity: Severity;
    layer: number;
    detector: string;
    category: string;
    title: string;
    file: string;
    line?: number;
    evidence: string;
    remediation: string;
    evidenceType: 'STATIC' | 'EXECUTION' | 'CONTAINER' | 'PROOF';
    commandExecuted?: string;
    commandOutput?: string;
    proofVerified?: boolean;
}
export declare const PATTERNS: {
    HOST_FALLBACK: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    MOCK_STUB_SUGGESTION: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    MODEL_USAGE: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    SCOPE_CREEP: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    EVIDENCE_COMPLETENESS: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    BUNDLE_SIZE_ANOMALY: {
        regex: RegExp;
        severity: "MEDIUM";
    }[];
    FILE_SIZE_ANOMALY: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    ENTRY_POINT_MISSING: {
        regex: RegExp;
        severity: "MEDIUM";
    }[];
    SIMULATED_EXECUTION: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    THEATRICAL_CODE: ({
        regex: RegExp;
        severity: "CRITICAL";
    } | {
        regex: RegExp;
        severity: "HIGH";
    })[];
    STUB_CODE: ({
        regex: RegExp;
        severity: "CRITICAL";
    } | {
        regex: RegExp;
        severity: "HIGH";
    })[];
    DEAD_CODE: {
        regex: RegExp;
        severity: "LOW";
    }[];
    SQL_INJECTION: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    SECRET_EXPOSURE: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    AUTH_BYPASS: ({
        regex: RegExp;
        severity: "CRITICAL";
    } | {
        regex: RegExp;
        severity: "HIGH";
    })[];
    XSS: ({
        regex: RegExp;
        severity: "HIGH";
    } | {
        regex: RegExp;
        severity: "MEDIUM";
    })[];
    COMMAND_INJECTION: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    PATH_TRAVERSAL: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    IMPORT_CYCLE: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    HOOK_SPILLOVER: ({
        regex: RegExp;
        severity: "HIGH";
    } | {
        regex: RegExp;
        severity: "MEDIUM";
    })[];
    AGENT_FIELD_MISSING: ({
        regex: RegExp;
        severity: "CRITICAL";
    } | {
        regex: RegExp;
        severity: "HIGH";
    })[];
    GLOBAL_STATE_POLLUTION: ({
        regex: RegExp;
        severity: "MEDIUM";
    } | {
        regex: RegExp;
        severity: "LOW";
    })[];
    CONSOLE_SPILLOVER: {
        regex: RegExp;
        severity: "MEDIUM";
    }[];
    CONTEXT_LEAK: {
        regex: RegExp;
        severity: "MEDIUM";
    }[];
    PREFIX_SUPPORT_MISSING: {
        regex: RegExp;
        severity: "MEDIUM";
    }[];
    EMPTY_CATCH: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    SILENT_FAILURE: ({
        regex: RegExp;
        severity: "HIGH";
    } | {
        regex: RegExp;
        severity: "MEDIUM";
    })[];
    MEMORY_LEAK: {
        regex: RegExp;
        severity: "MEDIUM";
    }[];
    TOKEN_BLOAT: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    COMPACTION_CONTENT_INJECTION: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    CONTEXT_DURING_COMPACTION: {
        regex: RegExp;
        severity: "MEDIUM";
    }[];
    COMPLEXITY: {
        regex: RegExp;
        threshold: number;
        severity: "MEDIUM";
    }[];
    PLUGIN_LOAD_FAILURE: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    DEPENDENCY_MISSING: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    CLUSTER_NOT_FOUND: {
        regex: RegExp;
        severity: "CRITICAL";
    }[];
    SHIM_IMPLEMENTATION: {
        regex: RegExp;
        severity: "HIGH";
    }[];
    WRONG_DIRECTORY: ({
        regex: RegExp;
        severity: "HIGH";
    } | {
        regex: RegExp;
        severity: "MEDIUM";
    })[];
};
export interface ProofClaim {
    type: 'file_exists' | 'test_results' | 'build_artifact' | 'custom';
    claim: string;
    verified: boolean;
    proof?: string;
    error?: string;
}
export interface VerificationResult {
    passed: boolean;
    claims: ProofClaim[];
    theaterDetected: boolean;
    findings: Finding[];
}
export declare class ProofVerifier {
    verifyClaim(claim: string, cwd: string): Promise<ProofClaim>;
    private verifyFileExistence;
    private verifyTestResults;
    private verifyBuildArtifact;
    verifyMultiple(claims: string[], cwd: string): Promise<VerificationResult>;
}
export interface FirewallConfig {
    throwOnBanned: boolean;
    throwOnSecurity: boolean;
    throwOnHookSpillover: boolean;
}
export declare class RealTimeFirewall {
    private config;
    setConfig(config: Partial<FirewallConfig>): void;
    /**
     * REAL-TIME SCAN: Throws and HALTS on banned patterns
     * Use this in tool.execute.before hook to BLOCK theatrical code
     */
    scanRealtime(code: string, filePath: string): void;
    /**
     * SOFT SCAN: Returns findings without throwing
     * Use for non-blocking analysis
     */
    scanSoft(code: string, filePath: string): Finding[];
    private getRemediation;
}
export interface HookInfo {
    name: string;
    file: string;
    line: number;
    hasAgentCheck: boolean;
    agentCheckPattern?: string;
    wouldFireInWrongContext: boolean;
    wrongContextImpact?: string;
}
export interface HookIsolationReport {
    plugin: string;
    hooks: HookInfo[];
    spilloverRisks: Finding[];
    summary: {
        totalHooks: number;
        unsafeHooks: number;
        safeHooks: number;
    };
}
export declare class HookIsolationAnalyzer {
    private agentCheckPatterns;
    analyzePlugin(pluginSource: string, pluginName: string): HookIsolationReport;
    private estimateCrossPluginImpact;
    analyzeHookSource(hookSource: string, hookName: string, pluginName: string): HookInfo;
}
export interface ResourceCost {
    memoryEstimate: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    tokenEstimate: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    cleanupScore: number;
    issues: string[];
    instantiations: {
        Map: number;
        Set: number;
        Array: number;
        contextPush: number;
        contextSplice: number;
    };
}
export declare class ResourceFootprintEstimator {
    estimate(code: string): ResourceCost;
}
export interface CrossReference {
    type: 'import' | 'cluster_id' | 'tool_name' | 'hook' | 'env_var';
    reference: string;
    file: string;
    line?: number;
    verified: boolean;
    resolution?: string;
    error?: string;
}
export interface CrossReferenceReport {
    projectRoot: string;
    references: CrossReference[];
    unverified: CrossReference[];
    findings: Finding[];
    summary: {
        total: number;
        verified: number;
        unverified: number;
    };
}
export declare class CrossReferenceVerifier {
    verify(projectRoot: string, opencodeTools?: string[]): Promise<CrossReferenceReport>;
    private findSourceFiles;
    private resolveImport;
}
export declare class AlgorithmicScanner {
    private findingId;
    private findings;
    reset(): void;
    scanFile(filePath: string, content: string): Finding[];
    private scanPatterns;
    private scanComplexity;
    private scanResourceLeaks;
    private createFinding;
    private getDetectorName;
    private generateTitle;
    private generateRemediation;
    getFindings(): Finding[];
    addFinding(finding: Finding): void;
    addFindings(findings: Finding[]): void;
}
export interface AuditConfig {
    targetPath: string;
    depth: number;
    containerImage?: string;
    buildCommand?: string;
    testCommand?: string;
}
export interface AuditState {
    config: AuditConfig;
    currentLayer: number;
    completedLayers: number[];
    startedAt: Date;
    status: 'IDLE' | 'SCANNING' | 'EXECUTING' | 'COMPLETE';
}
export declare class AuditEngine {
    private state;
    private scanner;
    constructor();
    private createInitialState;
    getState(): AuditState;
    getScanner(): AlgorithmicScanner;
    startAudit(config: AuditConfig): void;
    scanDirectory(targetPath: string): Promise<Map<string, string>>;
    private isValidUtf8;
    runBuildTest(targetPath: string): Promise<{
        success: boolean;
        output: string;
    }>;
    runTestSuite(targetPath: string): Promise<{
        success: boolean;
        output: string;
        passing?: number;
        failing?: number;
    }>;
    completeLayer(layer: number): void;
    complete(): void;
}
export declare class ReportGenerator {
    generate(findingId: (layer: number) => string, getFindingsByLayer: (layer: number) => Finding[], state: AuditState): string;
}
export declare const auditEngine: AuditEngine;
export declare const reportGenerator: ReportGenerator;
export declare const proofVerifier: ProofVerifier;
export declare const realTimeFirewall: RealTimeFirewall;
export declare const hookAnalyzer: HookIsolationAnalyzer;
export declare const resourceEstimator: ResourceFootprintEstimator;
export declare const crossRefVerifier: CrossReferenceVerifier;
