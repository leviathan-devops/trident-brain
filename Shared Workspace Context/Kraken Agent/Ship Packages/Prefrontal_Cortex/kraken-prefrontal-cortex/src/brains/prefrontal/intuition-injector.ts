import crypto from 'node:crypto';
import {
  type PFCIntuitionSignal,
  type IntuitionTrigger,
  type ImprovementProposal,
} from './types.js';
import { type CortexStore } from './cortex-store.js';

const MAX_ACTIVE_SIGNALS = 50;
const SIGNAL_EXPIRY_MS = 7200000;

export class IntuitionInjector {
  private cortexStore: CortexStore;
  private activeSignals: Map<string, PFCIntuitionSignal> = new Map();
  private triggers: IntuitionTrigger[] = [];

  constructor(cortexStore: CortexStore) {
    this.cortexStore = cortexStore;
  }

  initialize(): void {
    this.loadPersistedSignals();
    this.loadTriggers();
    console.log(`[IntuitionInjector] Loaded ${this.activeSignals.size} signals, ${this.triggers.length} triggers`);
  }

  private loadPersistedSignals(): void {
    const patterns = this.cortexStore.getActiveFirewallPatterns();
    for (const p of patterns) {
      const signal: PFCIntuitionSignal = {
        id: `sig-${p.pattern}-${p.patternType}`.replace(/[^a-zA-Z0-9-]/g, ''),
        pattern: p.pattern,
        description: p.description,
        evidence: p.evidence,
        confidence: p.confidence,
        source: p.source,
        triggerContexts: [p.patternType],
        createdAt: p.injectedAt || Date.now(),
        expiresAt: (p.injectedAt || Date.now()) + SIGNAL_EXPIRY_MS,
        activationCount: 0,
        lastActivatedAt: 0,
        provenance: 'feedback-brain',
        trajectoryIds: [],
      };
      this.activeSignals.set(signal.id, signal);
    }
  }

  private loadTriggers(): void {
    this.triggers = [
      {
        pattern: /spawn|delegate|assign|cluster/i,
        signalType: 'delegation',
        description: 'Delegation decision point',
      },
      {
        pattern: /docker|container|build|run|exec/i,
        signalType: 'infrastructure',
        description: 'Infrastructure command detected',
      },
      {
        pattern: /write|edit|create|file|path/i,
        signalType: 'file-operation',
        description: 'File modification detected',
      },
      {
        pattern: /test|verify|check|assert|validate/i,
        signalType: 'verification',
        description: 'Verification activity detected',
      },
      {
        pattern: /bash|command|shell|exec|sh\s/i,
        signalType: 'bash-usage',
        description: 'Bash command detected',
      },
      {
        pattern: /done|complete|finish|success|pass/i,
        signalType: 'completion-claim',
        description: 'Completion claim detected',
      },
    ];
  }

  addSignal(params: Omit<PFCIntuitionSignal, 'id' | 'createdAt' | 'expiresAt' | 'activationCount' | 'lastActivatedAt'>): { success: boolean; id: string } {
    const id = `sig-${crypto.randomUUID().slice(0, 8)}`;

    if (this.activeSignals.size >= MAX_ACTIVE_SIGNALS) {
      this.evictOldest();
    }

    const signal: PFCIntuitionSignal = {
      ...params,
      id,
      createdAt: Date.now(),
      expiresAt: Date.now() + SIGNAL_EXPIRY_MS,
      activationCount: 0,
      lastActivatedAt: 0,
    };

    this.activeSignals.set(id, signal);
    this.persistSignal(signal);

    console.log(`[IntuitionInjector] Added signal: ${signal.description.slice(0, 60)} (confidence: ${signal.confidence})`);
    return { success: true, id };
  }

  addSignalFromProposal(proposal: ImprovementProposal): void {
    for (const flaw of proposal.analysis.instructionFlaws) {
      this.addSignal({
        pattern: flaw.flaw,
        description: flaw.fix,
        evidence: flaw.evidence,
        confidence: Math.min(proposal.analysis.confidenceScore, 0.95),
        source: `gen-${proposal.generationNumber}-feedback`,
        triggerContexts: ['instruction-flaw'],
        provenance: 'feedback-brain',
        trajectoryIds: proposal.changes.hiveUpdates?.map(u => u.key) || [],
      });
    }

    for (const gap of proposal.analysis.toolGaps) {
      this.addSignal({
        pattern: gap.gap,
        description: `Tool gap: ${gap.suggestedTool}`,
        evidence: gap.evidence,
        confidence: Math.min(proposal.analysis.confidenceScore * 0.9, 0.9),
        source: `gen-${proposal.generationNumber}-feedback`,
        triggerContexts: ['tool-gap'],
        provenance: 'feedback-brain',
        trajectoryIds: [],
      });
    }
  }

  detectDecisionPoint(message: string, toolName?: string, toolArgs?: Record<string, unknown>): PFCIntuitionSignal[] {
    const matchedSignals: PFCIntuitionSignal[] = [];
    const now = Date.now();

    const textToMatch = [message, toolName || '', JSON.stringify(toolArgs || {})].join(' ').toLowerCase();

    for (const [, signal] of this.activeSignals) {
      if (signal.expiresAt < now) continue;

      const isRelevant = signal.triggerContexts.some(ctx => {
        const ctxLower = ctx.toLowerCase();
        if (ctxLower.length < 3) return false;
        if (['bash', 'tool', 'run', 'exec', 'write'].includes(ctxLower)) return false;
        return textToMatch.includes(ctxLower) || textToMatch.includes(signal.pattern.toLowerCase());
      });

      if (isRelevant) {
        signal.activationCount++;
        signal.lastActivatedAt = now;
        matchedSignals.push(signal);
      }
    }

    for (const trigger of this.triggers) {
      if (trigger.pattern.test(textToMatch)) {
        for (const [, signal] of this.activeSignals) {
          if (signal.triggerContexts.includes(trigger.signalType) && !matchedSignals.find(s => s.id === signal.id)) {
            signal.activationCount++;
            signal.lastActivatedAt = now;
            matchedSignals.push(signal);
          }
        }
      }
    }

    return matchedSignals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  generateIntuitionContext(signals: PFCIntuitionSignal[]): string {
    if (signals.length === 0) return '';

    const lines: string[] = ['[PFC INTUITION — Pattern recognition from prefrontal cortex analysis]'];

    for (const signal of signals) {
      const confidence = signal.confidence >= 0.8 ? 'STRONG' : signal.confidence >= 0.5 ? 'MODERATE' : 'WEAK';
      lines.push(`(${confidence} signal) ${signal.description}`);
      if (signal.evidence) {
        lines.push(`  Evidence: ${signal.evidence.slice(0, 200)}`);
      }
      if (signal.source) {
        lines.push(`  Source: ${signal.source}`);
      }
    }

    lines.push('This is intuition, not enforcement. Heed it or ignore it — but the pattern is real.');
    return lines.join('\n');
  }

  getActiveSignals(): PFCIntuitionSignal[] {
    const now = Date.now();
    return [...this.activeSignals.values()].filter(s => s.expiresAt > now);
  }

  getSignalCount(): number {
    return this.activeSignals.size;
  }

  removeSignal(id: string): boolean {
    return this.activeSignals.delete(id);
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [id, signal] of this.activeSignals) {
      if (signal.expiresAt < now) {
        this.activeSignals.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  private persistSignal(signal: PFCIntuitionSignal): void {
    this.cortexStore.insertFirewallPattern({
      layer: 'L5',
      patternType: 'intuition',
      pattern: signal.pattern,
      description: signal.description,
      evidence: signal.evidence,
      confidence: signal.confidence,
      source: signal.source,
      injectedAt: signal.createdAt,
      active: true,
    });
  }

  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [id, signal] of this.activeSignals) {
      if (signal.createdAt < oldestTime) {
        oldestTime = signal.createdAt;
        oldestId = id;
      }
    }
    if (oldestId) {
      this.activeSignals.delete(oldestId);
    }
  }
}

let intuitionInjectorInstance: IntuitionInjector | null = null;

export function createIntuitionInjector(cortexStore: CortexStore): IntuitionInjector {
  if (!intuitionInjectorInstance) {
    intuitionInjectorInstance = new IntuitionInjector(cortexStore);
  }
  return intuitionInjectorInstance;
}

export function getIntuitionInjector(): IntuitionInjector | null {
  return intuitionInjectorInstance;
}
