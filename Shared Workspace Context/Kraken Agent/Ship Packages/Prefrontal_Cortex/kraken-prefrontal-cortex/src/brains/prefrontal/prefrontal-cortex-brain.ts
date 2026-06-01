import crypto from 'node:crypto';
import {
  type PrefrontalCortexState,
  type ImprovementProposal,
  type FirewallPatternInjection,
  type KrakenProjectRegistration,
  type PFCIntuitionSignal,
} from './types.js';
import { CortexStore, createCortexStore } from './cortex-store.js';
import { ExecutionTracer } from './execution-tracer.js';
import { IntuitionInjector, createIntuitionInjector } from './intuition-injector.js';
import { AntiSlopGuardrails } from './anti-slop-guardrails.js';
import { LineageTracker } from './lineage-tracker.js';
import { SyncBridge } from './sync-bridge.js';
import { getStateStore, type StateStore } from '../../shared/state-store.js';
import { getBrainMessenger, type BrainMessenger } from '../../shared/brain-messenger.js';

export class PrefrontalCortexBrain {
  private initialized = false;
  private state: PrefrontalCortexState;
  private cortexStore: CortexStore;
  private tracer: ExecutionTracer | null = null;
  private intuitionInjector: IntuitionInjector;
  private guardrails: AntiSlopGuardrails;
  private lineageTracker: LineageTracker;
  private syncBridge: SyncBridge;
  private stateStore: StateStore;
  private messenger: BrainMessenger;
  private krakenId: string;
  private projectId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(params: {
    stateStore?: StateStore;
    messenger?: BrainMessenger;
    cortexDbPath?: string;
    krakenId?: string;
    projectId?: string;
  } = {}) {
    this.stateStore = params.stateStore || getStateStore();
    this.messenger = params.messenger || getBrainMessenger();
    this.krakenId = params.krakenId || `kraken-${crypto.randomUUID().slice(0, 8)}`;
    this.projectId = params.projectId || process.cwd().split('/').pop() || 'default';
    this.cortexStore = createCortexStore(params.cortexDbPath);
    this.intuitionInjector = createIntuitionInjector(this.cortexStore);
    this.guardrails = new AntiSlopGuardrails();
    this.lineageTracker = new LineageTracker(this.cortexStore);
    this.syncBridge = new SyncBridge(this.cortexStore, this.krakenId);

    this.state = {
      initialized: false,
      openfangConnected: false,
      registeredProjects: [],
      pendingProposals: [],
      lineages: new Map(),
      syncStatus: { lastSyncAt: 0, messagesSent: 0, messagesReceived: 0, errors: 0 },
      injectedFirewallPatterns: [],
      currentGeneration: 0,
      lastAnalysisAt: 0,
      trajectoryCount: 0,
    };
  }

  initialize(): void {
    if (this.initialized) return;

    this.cortexStore.initialize();
    this.intuitionInjector.initialize();
    this.lineageTracker.initialize();
    this.syncBridge.initialize();

    this.messenger.subscribe('kraken-prefrontal', this.handleBrainMessage.bind(this));

    this.stateStore.set('prefrontal-state', 'initialized', true, ['kraken-prefrontal']);
    this.stateStore.set('prefrontal-state', 'brain-id', 'kraken-prefrontal', ['kraken-prefrontal']);
    this.stateStore.set('prefrontal-state', 'kraken-id', this.krakenId, ['kraken-prefrontal']);
    this.stateStore.set('prefrontal-state', 'project-id', this.projectId, ['kraken-prefrontal']);

    this.state.initialized = true;

    this.heartbeatInterval = setInterval(() => {
      try {
        this.syncBridge.sendHeartbeat();
        this.syncBridge.checkOpenfangConnectivity();
        this.state.openfangConnected = this.syncBridge.isConnected();
        this.ingestProposalsFromOpenfang();
        this.intuitionInjector.prune();
      } catch (err) {
        console.error('[PrefrontalCortex] Heartbeat cycle failed:', err instanceof Error ? err.message : String(err));
        this.state.syncStatus.errors++;
      }
    }, 60000);

    console.log(`[PrefrontalCortex] Initialized — kraken=${this.krakenId}, project=${this.projectId}, signals=${this.intuitionInjector.getSignalCount()}`);
  }

  isInitialized(): boolean { return this.initialized; }

  createTracer(sessionId: string): ExecutionTracer {
    this.tracer = new ExecutionTracer(this.cortexStore, sessionId, this.projectId);
    this.tracer.initialize();
    return this.tracer;
  }

  getTracer(): ExecutionTracer | null { return this.tracer; }

  getIntuitionInjector(): IntuitionInjector { return this.intuitionInjector; }

  getLineageTracker(): LineageTracker { return this.lineageTracker; }

  registerProject(registration: KrakenProjectRegistration): void {
    this.cortexStore.insertRegistration(registration);
    this.state.registeredProjects.push(registration);
    this.syncBridge.registerWithOpenfang(registration);
    console.log(`[PrefrontalCortex] Registered project ${registration.projectId}`);
  }

  notifySessionComplete(sessionId: string): void {
    if (this.tracer) this.tracer.flushBuffer();
    const trajectoryCount = this.cortexStore.getTrajectoryCount(this.projectId);
    this.state.trajectoryCount = trajectoryCount;
    this.syncBridge.reportTrajectoriesAvailable(this.projectId, trajectoryCount);
    this.messenger.deliverMessage('kraken-prefrontal', 'kraken-system', 'sync', {
      type: 'session-complete', sessionId, projectId: this.projectId, trajectoryCount,
    }, 'normal');
    console.log(`[PrefrontalCortex] Session ${sessionId} complete — ${trajectoryCount} trajectories`);
  }

  ingestProposalsFromOpenfang(): void {
    const proposals = this.syncBridge.ingestProposals();
    for (const msg of proposals) {
      try {
        const proposalData = msg.payload as any;
        if (!proposalData.proposal) continue;

        const result = this.guardrails.validate(proposalData.proposal);
        if (!result.passed) {
          console.warn(`[PrefrontalCortex] REJECTED proposal — guardrail violations: ${result.violations.join('; ')}`);
          this.state.syncStatus.errors++;
          continue;
        }

        const proposal = result.sanitized!;
        this.cortexStore.insertProposal(proposal);
        this.state.pendingProposals.push(proposal);

        this.intuitionInjector.addSignalFromProposal(proposal);

        console.log(`[PrefrontalCortex] Ingested proposal ${proposal.id} (risk: ${proposal.riskAssessment.level}, confidence: ${proposal.analysis.confidenceScore.toFixed(2)}) — intuition signals created`);
      } catch (err) {
        console.error('[PrefrontalCortex] Failed to ingest proposal:', err);
        this.state.syncStatus.errors++;
      }
    }
  }

  getPendingProposals(): ImprovementProposal[] {
    return this.cortexStore.getPendingProposals(this.projectId);
  }

  detectIntuition(message: string, toolName?: string, toolArgs?: Record<string, unknown>): PFCIntuitionSignal[] {
    return this.intuitionInjector.detectDecisionPoint(message, toolName, toolArgs);
  }

  generateIntuitionContext(signals: PFCIntuitionSignal[]): string {
    return this.intuitionInjector.generateIntuitionContext(signals);
  }

  applyImprovement(proposalId: string, appliedBy?: string): { success: boolean; reason?: string } {
    const proposal = this.cortexStore.getProposal(proposalId);
    if (!proposal) return { success: false, reason: `Proposal ${proposalId} not found` };
    if (proposal.status !== 'proposed' && proposal.status !== 'approved') {
      return { success: false, reason: `Proposal status is ${proposal.status}` };
    }
    if (proposal.riskAssessment.level === 'high' || proposal.riskAssessment.level === 'critical') {
      return { success: false, reason: `High/critical risk requires manual approval` };
    }
    return this.doApplyImprovement(proposal, appliedBy);
  }

  approveAndApplyImprovement(proposalId: string, approvedBy: string): { success: boolean; reason?: string } {
    const proposal = this.cortexStore.getProposal(proposalId);
    if (!proposal) return { success: false, reason: `Proposal ${proposalId} not found` };
    this.cortexStore.updateProposalStatus(proposalId, 'approved');
    return this.doApplyImprovement(proposal, approvedBy);
  }

  rejectImprovement(proposalId: string, reason: string): void {
    this.cortexStore.updateProposalStatus(proposalId, 'rejected');
    this.syncBridge.reportImprovementRejected(proposalId, this.projectId, reason);
    console.log(`[PrefrontalCortex] Rejected proposal ${proposalId}: ${reason}`);
  }

  private doApplyImprovement(proposal: ImprovementProposal, appliedBy?: string): { success: boolean; reason?: string } {
    const changes = proposal.changes;

    if (changes.hiveUpdates) {
      for (const update of changes.hiveUpdates) {
        this.messenger.deliverMessage('kraken-prefrontal', 'kraken-system', 'context-inject', {
          type: 'hive-update', category: update.category, key: update.key, content: update.content,
        }, 'normal');
      }
    }

    this.intuitionInjector.addSignalFromProposal(proposal);

    this.cortexStore.updateProposalStatus(proposal.id, 'applied', Date.now());
    this.syncBridge.reportImprovementApplied(proposal.id, this.projectId);
    this.state.pendingProposals = this.state.pendingProposals.filter(p => p.id !== proposal.id);

    console.log(`[PrefrontalCortex] Applied improvement ${proposal.id} (gen ${proposal.generationNumber}) — intuition signals updated`);
    return { success: true };
  }

  injectIntuitionSignal(params: {
    pattern: string;
    description: string;
    evidence: string;
    confidence: number;
    source: string;
    triggerContexts: string[];
  }): { success: boolean; id: string } {
    return this.intuitionInjector.addSignal({
      ...params,
      provenance: 'manual',
      trajectoryIds: [],
    });
  }

  getEvolutionLineage(projectId?: string) {
    return this.lineageTracker.getOrCreateLineage(projectId || this.projectId);
  }

  getPrefrontalStatus(): PrefrontalCortexState {
    this.state.openfangConnected = this.syncBridge.isConnected();
    this.state.trajectoryCount = this.cortexStore.getTrajectoryCount(this.projectId);
    const syncStats = this.syncBridge.getStats();
    this.state.syncStatus = {
      lastSyncAt: Date.now(),
      messagesSent: syncStats.messagesSent,
      messagesReceived: syncStats.messagesReceived,
      errors: 0,
    };
    return { ...this.state, lineages: new Map(this.state.lineages) };
  }

  getKrakenId(): string { return this.krakenId; }
  getProjectId(): string { return this.projectId; }

  private handleBrainMessage(message: { from: string; to: string; type: string; payload: Record<string, unknown> }): void {
    switch (message.type) {
      case 'sync':
        console.log(`[PrefrontalCortex] Sync from ${message.from}: ${JSON.stringify(message.payload).slice(0, 100)}`);
        break;
      case 'context-inject':
        if (message.payload.type === 'trajectory-record') {
          console.log(`[PrefrontalCortex] Trajectory recorded from ${message.from}`);
        }
        break;
      case 'checkpoint':
        if (message.payload.type === 'session-complete-verified') {
          this.notifySessionComplete(message.payload.sessionId as string || 'unknown');
        }
        break;
    }
  }

  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.tracer) this.tracer.flushBuffer();
    this.cortexStore.close();
    console.log('[PrefrontalCortex] Cleaned up');
  }
}

let prefrontalBrainInstance: PrefrontalCortexBrain | null = null;

export function createPrefrontalCortexBrain(params?: {
  stateStore?: StateStore;
  messenger?: BrainMessenger;
  cortexDbPath?: string;
  krakenId?: string;
  projectId?: string;
}): PrefrontalCortexBrain {
  if (!prefrontalBrainInstance) {
    prefrontalBrainInstance = new PrefrontalCortexBrain(params);
  }
  return prefrontalBrainInstance;
}

export function getPrefrontalCortexBrain(): PrefrontalCortexBrain {
  if (!prefrontalBrainInstance) {
    prefrontalBrainInstance = new PrefrontalCortexBrain();
  }
  return prefrontalBrainInstance;
}
