import {
  type ImprovementProposal,
  type FeedbackAnalysis,
  type HarnessUpdate,
} from './types.js';

const MAX_PROPOSAL_LENGTH = 4000;
const MAX_ROOT_CAUSE_LENGTH = 1000;
const MAX_FLAW_FIX_LENGTH = 500;
const MAX_EVIDENCE_LENGTH = 500;
const MAX_TOOL_GAP_LENGTH = 500;
const MIN_CONFIDENCE = 0.3;
const MAX_CONFIDENCE = 1.0;
const MAX_FLAWS_PER_PROPOSAL = 5;
const MAX_TOOL_GAPS_PER_PROPOSAL = 5;
const MAX_HOOK_ISSUES_PER_PROPOSAL = 3;
const MAX_CROSS_PROJECT_SOURCES = 3;
const MAX_WEIGHT_CANDIDATES = 10;
const MIN_EVIDENCE_ITEMS = 1;

export interface GuardrailResult {
  passed: boolean;
  violations: string[];
  sanitized?: ImprovementProposal;
}

const CRITICAL_TOOLS = new Set([
  'spawn_cluster_task', 'spawn_shark_agent', 'spawn_manta_agent',
  'kraken_hive_search', 'kraken_hive_remember', 'kraken_hive_inject_context',
  'get_cluster_status', 'get_agent_status', 'aggregate_results',
  'report_to_kraken', 'get_task_context', 'read_kraken_context',
]);

export class AntiSlopGuardrails {
  private recentProposalHashes: Set<string> = new Set();
  private maxRecentHashes = 100;

  validate(raw: unknown): GuardrailResult {
    const violations: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return { passed: false, violations: ['Proposal is not an object'] };
    }

    const proposal = raw as Record<string, unknown>;

    const id = this.validateString(proposal.id, 'id', violations);
    const projectId = this.validateString(proposal.projectId, 'projectId', violations);
    const generationNumber = this.validateNumber(proposal.generationNumber, 'generationNumber', violations, 0, 100);

    const analysis = this.validateAnalysis(proposal.analysis, violations);
    const changes = this.validateChanges(proposal.changes, violations);
    const riskAssessment = this.validateRisk(proposal.riskAssessment, violations);
    const weightCandidates = this.validateWeightCandidates(proposal.weightCandidates, violations);
    const crossProjectSources = this.validateCrossProject(proposal.crossProjectSources, violations);

    if (!analysis || !changes || !riskAssessment) {
      return { passed: false, violations };
    }

    this.validateStructuralIntegrity(changes, violations);

    const proposalText = JSON.stringify(proposal);
    if (proposalText.length > MAX_PROPOSAL_LENGTH * 3) {
      violations.push(`Proposal exceeds maximum size (${proposalText.length} chars)`);
    }

    if (analysis.confidenceScore < MIN_CONFIDENCE) {
      violations.push(`Confidence ${analysis.confidenceScore} below minimum ${MIN_CONFIDENCE}`);
    }

    if (analysis.instructionFlaws.length === 0 && analysis.toolGaps.length === 0 && analysis.hookIssues.length === 0) {
      violations.push('Proposal contains zero actionable findings — empty analysis');
    }

    const dedupeHash = this.computeDedupeHash(analysis);
    if (this.recentProposalHashes.has(dedupeHash)) {
      violations.push('Duplicate proposal — identical analysis hash already seen');
    }

    if (violations.length > 0) {
      return { passed: false, violations };
    }

    this.recentProposalHashes.add(dedupeHash);
    if (this.recentProposalHashes.size > this.maxRecentHashes) {
      const first = this.recentProposalHashes.values().next().value;
      if (first) this.recentProposalHashes.delete(first);
    }

    const sanitized: ImprovementProposal = {
      id: id || `prop-${crypto.randomUUID().slice(0, 8)}`,
      projectId: projectId || 'unknown',
      generationNumber: generationNumber || 0,
      analysis,
      changes,
      weightCandidates,
      crossProjectSources,
      riskAssessment,
      status: 'proposed',
      merkleHash: '',
      proposedAt: Date.now(),
    };

    return { passed: true, violations: [], sanitized };
  }

  private validateAnalysis(raw: unknown, violations: string[]): FeedbackAnalysis | null {
    if (!raw || typeof raw !== 'object') {
      violations.push('analysis is missing or not an object');
      return null;
    }

    const a = raw as Record<string, unknown>;

    const rootCause = this.truncate(String(a.rootCauseAnalysis || ''), MAX_ROOT_CAUSE_LENGTH);
    if (!rootCause || rootCause.length < 20) {
      violations.push('rootCauseAnalysis is empty or too short (< 20 chars)');
    }

    const confidence = this.validateNumber(a.confidenceScore, 'confidenceScore', violations, MIN_CONFIDENCE, MAX_CONFIDENCE);

    const instructionFlaws = this.validateFlaws(a.instructionFlaws, violations);
    const toolGaps = this.validateToolGaps(a.toolGaps, violations);
    const hookIssues = this.validateHookIssues(a.hookIssues, violations);

    if (!confidence) return null;

    return {
      rootCauseAnalysis: rootCause,
      instructionFlaws,
      toolGaps,
      hookIssues,
      confidenceScore: confidence,
      analysisModel: String(a.analysisModel || 'unknown'),
      analyzedAt: Number(a.analyzedAt) || Date.now(),
    };
  }

  private validateFlaws(raw: unknown, violations: string[]): FeedbackAnalysis['instructionFlaws'] {
    if (!Array.isArray(raw)) return [];
    const flaws = raw.slice(0, MAX_FLAWS_PER_PROPOSAL) as Array<Record<string, unknown>>;
    return flaws.map(f => ({
      flaw: this.truncate(String(f.flaw || ''), MAX_FLAW_FIX_LENGTH),
      evidence: this.truncate(String(f.evidence || ''), MAX_EVIDENCE_LENGTH),
      fix: this.truncate(String(f.fix || ''), MAX_FLAW_FIX_LENGTH),
    })).filter(f => f.flaw.length > 0 && f.fix.length > 0);
  }

  private validateToolGaps(raw: unknown, violations: string[]): FeedbackAnalysis['toolGaps'] {
    if (!Array.isArray(raw)) return [];
    const gaps = raw.slice(0, MAX_TOOL_GAPS_PER_PROPOSAL) as Array<Record<string, unknown>>;
    return gaps.map(g => ({
      gap: this.truncate(String(g.gap || ''), MAX_TOOL_GAP_LENGTH),
      suggestedTool: this.truncate(String(g.suggestedTool || ''), 100),
      evidence: this.truncate(String(g.evidence || ''), MAX_EVIDENCE_LENGTH),
    })).filter(g => g.gap.length > 0);
  }

  private validateHookIssues(raw: unknown, violations: string[]): FeedbackAnalysis['hookIssues'] {
    if (!Array.isArray(raw)) return [];
    const issues = raw.slice(0, MAX_HOOK_ISSUES_PER_PROPOSAL) as Array<Record<string, unknown>>;
    return issues.map(h => ({
      issue: this.truncate(String(h.issue || ''), MAX_FLAW_FIX_LENGTH),
      evidence: this.truncate(String(h.evidence || ''), MAX_EVIDENCE_LENGTH),
      fix: this.truncate(String(h.fix || ''), MAX_FLAW_FIX_LENGTH),
    })).filter(h => h.issue.length > 0);
  }

  private validateChanges(raw: unknown, violations: string[]): HarnessUpdate | null {
    if (!raw || typeof raw !== 'object') return { hiveUpdates: [] };
    const c = raw as Record<string, unknown>;

    if (c.toolsToRemove && Array.isArray(c.toolsToRemove)) {
      for (const tool of c.toolsToRemove) {
        if (CRITICAL_TOOLS.has(String(tool))) {
          violations.push(`PROTECTED: Cannot remove critical tool '${tool}'`);
        }
      }
    }

    if (c.hookChanges && Array.isArray(c.hookChanges)) {
      for (const change of c.hookChanges) {
        const ch = change as Record<string, unknown>;
        if (ch.action === 'remove') {
          const hook = String(ch.hook || '');
          if (hook.includes('firewall') || hook.includes('tool.execute.before')) {
            violations.push(`PROTECTED: Cannot remove firewall hook '${hook}'`);
          }
        }
      }
    }

    if (c.updatedInstructions && typeof c.updatedInstructions === 'string') {
      const lower = c.updatedInstructions.toLowerCase();
      const forbidden = ['ignore all previous', 'disregard', 'bypass firewall', 'skip verification', 'you are now'];
      for (const f of forbidden) {
        if (lower.includes(f)) {
          violations.push(`INJECTION: Updated instructions contain forbidden pattern '${f}'`);
        }
      }
    }

    return {
      updatedInstructions: typeof c.updatedInstructions === 'string' ? this.truncate(c.updatedInstructions, 2000) : undefined,
      toolsToAdd: Array.isArray(c.toolsToAdd) ? c.toolsToAdd : undefined,
      toolsToRemove: Array.isArray(c.toolsToRemove) ? c.toolsToRemove.filter((t: any) => !CRITICAL_TOOLS.has(String(t))) : undefined,
      hookChanges: Array.isArray(c.hookChanges) ? c.hookChanges : undefined,
      hiveUpdates: Array.isArray(c.hiveUpdates) ? c.hiveUpdates : undefined,
    };
  }

  private validateRisk(raw: unknown, violations: string[]): RiskAssessment | null {
    if (!raw || typeof raw !== 'object') {
      return {
        level: 'high',
        risks: [{ description: 'No risk assessment provided — defaulting to high', severity: 'high', mitigation: 'Manual review required' }],
        rollbackPlan: 'Reject proposal — no risk assessment',
        recommendedApproval: 'manual',
      };
    }

    const r = raw as Record<string, unknown>;
    const level = ['low', 'medium', 'high', 'critical'].includes(String(r.level)) ? String(r.level) as RiskAssessment['level'] : 'high';

    if (!r.rollbackPlan || String(r.rollbackPlan).length < 10) {
      violations.push('rollbackPlan is missing or too short');
      return {
        level: 'high',
        risks: [{ description: 'Missing rollback plan', severity: 'high', mitigation: 'Manual review' }],
        rollbackPlan: 'No rollback plan provided — treat as high risk',
        recommendedApproval: 'manual',
      };
    }

    return {
      level,
      risks: Array.isArray(r.risks) ? r.risks : [],
      rollbackPlan: String(r.rollbackPlan),
      recommendedApproval: ['auto', 'manual', 'reject'].includes(String(r.recommendedApproval))
        ? String(r.recommendedApproval) as RiskAssessment['recommendedApproval']
        : 'manual',
    };
  }

  private validateWeightCandidates(raw: unknown, violations: string[]): WeightUpdateCandidate[] {
    if (!Array.isArray(raw)) return [];
    return (raw as Array<Record<string, unknown>>).slice(0, MAX_WEIGHT_CANDIDATES)
      .filter(w => w.trajectoryId && w.exampleType && w.qualityScore)
      .map(w => ({
        trajectoryId: String(w.trajectoryId),
        exampleType: w.exampleType === 'positive' || w.exampleType === 'negative' ? w.exampleType : 'negative',
        trainingMessages: Array.isArray(w.trainingMessages) ? w.trainingMessages.slice(0, 10) : [],
        domainLabel: String(w.domainLabel || 'general'),
        qualityScore: Math.min(Number(w.qualityScore) || 0, 1.0),
      }));
  }

  private validateCrossProject(raw: unknown, violations: string[]): CrossProjectPattern[] {
    if (!Array.isArray(raw)) return [];
    return (raw as Array<Record<string, unknown>>).slice(0, MAX_CROSS_PROJECT_SOURCES)
      .filter(p => p.sourceProject && p.similarityScore && Number(p.similarityScore) >= 0.7)
      .map(p => ({
        sourceProject: String(p.sourceProject),
        pattern: String(p.pattern || ''),
        appliedFix: String(p.appliedFix || ''),
        successMetrics: (p.successMetrics || {}) as Record<string, number>,
        similarityScore: Math.min(Number(p.similarityScore), 1.0),
        transferable: Boolean(p.transferable),
      }));
  }

  private validateStructuralIntegrity(changes: HarnessUpdate, violations: string[]): void {
    const totalChanges =
      (changes.toolsToAdd?.length || 0) +
      (changes.toolsToRemove?.length || 0) +
      (changes.hookChanges?.length || 0) +
      (changes.updatedInstructions ? 1 : 0);

    if (totalChanges > 10) {
      violations.push(`Too many changes in single proposal (${totalChanges}) — batch limit is 10`);
    }

    if (changes.updatedInstructions) {
      const len = changes.updatedInstructions.length;
      if (len > 10000) {
        violations.push(`Updated instructions too long (${len} chars) — max 10000`);
      }
    }
  }

  private validateString(val: unknown, field: string, violations: string[]): string | null {
    if (typeof val !== 'string' || val.length === 0) {
      violations.push(`${field} is missing or empty`);
      return null;
    }
    return val;
  }

  private validateNumber(val: unknown, field: string, violations: string[], min: number, max: number): number | null {
    const n = Number(val);
    if (isNaN(n) || n < min || n > max) {
      violations.push(`${field} is ${val}, expected ${min}-${max}`);
      return null;
    }
    return n;
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + '...';
  }

  private computeDedupeHash(analysis: FeedbackAnalysis): string {
    const flaws = analysis.instructionFlaws.map(f => f.flaw.slice(0, 50)).sort().join('|');
    const gaps = analysis.toolGaps.map(g => g.gap.slice(0, 50)).sort().join('|');
    return `${analysis.rootCauseAnalysis.slice(0, 100)}|${flaws}|${gaps}`;
  }
}
