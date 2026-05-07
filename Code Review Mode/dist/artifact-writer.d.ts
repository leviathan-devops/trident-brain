/**
 * TRIDENT BRAIN v3.2 - ARTIFACT WRITER
 *
 * Generates comprehensive markdown reports with Deep Planning Mode structure.
 * Layer 1: What is this / What went wrong
 * Layer 2: WHY is it a problem / HOW to fix
 * Layer 3: Verification and prevention
 */
import type { Severity } from './algorithmic-core.js';
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
export interface AuditState {
    config: AuditConfig;
    currentLayer: number;
    completedLayers: number[];
    startedAt: Date;
    status: 'IDLE' | 'SCANNING' | 'EXECUTING' | 'COMPLETE';
}
export interface AuditConfig {
    targetPath: string;
    depth: number;
    containerImage?: string;
    buildCommand?: string;
    testCommand?: string;
}
interface ArtifactConfig {
    targetPath: string;
    outputDir?: string;
    semanticContext?: string;
    error?: string;
}
export declare class ArtifactWriter {
    generate(findings: Finding[], auditState: AuditState, config: ArtifactConfig): string;
    private describeTarget;
    private describeFindings;
    private formatFinding;
}
export declare const artifactWriter: ArtifactWriter;
export {};
//# sourceMappingURL=artifact-writer.d.ts.map