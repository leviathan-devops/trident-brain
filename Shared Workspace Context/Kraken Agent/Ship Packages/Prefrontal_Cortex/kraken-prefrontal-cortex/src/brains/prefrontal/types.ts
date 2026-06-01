export interface ToolCallEntry {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  durationMs: number;
  timestamp: number;
  agentId: string;
  taskId?: string;
  isBash: boolean;
  blockedBy?: string;
}

export interface LLMMessageEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  tokensUsed?: number;
  timestamp: number;
  derailmentFlags?: string[];
}

export interface SCFIncident {
  arm: 'STAGNATION' | 'CONTEXT_DECAY' | 'FALSE_COMPLETION';
  agentId: string;
  taskId?: string;
  timestamp: number;
  details: string;
  action: 'warning' | 'escalation' | 'isolation';
}

export interface ExecutionTrajectory {
  id: string;
  sessionId: string;
  projectId: string;
  agentId: string;
  taskId?: string;
  clusterId?: string;
  messages: LLMMessageEntry[];
  toolCalls: ToolCallEntry[];
  scfIncidents: SCFIncident[];
  stats: TrajectoryStats;
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  outputPaths: string[];
  startedAt: number;
  completedAt: number;
  generation?: number;
}

export interface TrajectoryStats {
  totalToolCalls: number;
  totalLLMCalls: number;
  totalTokensUsed: number;
  wallTimeMs: number;
  bashCommandCount: number;
  blockedToolCount: number;
  scfIncidentCount: number;
  errors: number;
  filesModified: number;
  filesRead: number;
}

export interface AgentSpecAtGeneration {
  instructions: string;
  tools: string[];
  hooks: string[];
  specHash: string;
}

export interface AggregatedTrajectoryStats {
  totalTasks: number;
  successCount: number;
  failureCount: number;
  blockedCount: number;
  byCluster: Record<string, { total: number; success: number; failure: number }>;
  byTaskType: Record<string, { total: number; success: number; failure: number }>;
  averageWallTimeMs: number;
  averageToolCallsPerTask: number;
  topErrors: Array<{ error: string; count: number }>;
  scfIncidentsByArm: Record<string, number>;
}

export interface GenerationEvaluation {
  criteriaMet: boolean;
  criteriaProgress: Record<string, number>;
  metrics: GenerationMetrics;
  evaluatedAt: number;
}

export interface GenerationMetrics {
  accuracy: number;
  taskSuccessRate: number;
  averageToolCalls: number;
  averageWallTimeMs: number;
  scfIncidentRate: number;
  bashAbuseRate: number;
  fireAndForgetRate: number;
}

export interface GenerationDelta {
  instructionChanges: number;
  toolsAdded: string[];
  toolsRemoved: string[];
  toolsModified: string[];
  hooksModified: string[];
  metricDeltas: Partial<GenerationMetrics>;
  locDelta: number;
}

export interface GenerationRecord {
  generationNumber: number;
  projectId: string;
  agentSpec: AgentSpecAtGeneration;
  aggregatedStats: AggregatedTrajectoryStats;
  evaluation: GenerationEvaluation;
  deltaFromPrevious?: GenerationDelta;
  trajectories: string[];
  createdAt: number;
  merkleHash: string;
  previousHash: string;
}

export interface EvolutionLineage {
  projectId: string;
  generations: GenerationRecord[];
  currentGeneration: number;
  acceptanceCriteria: string[];
  synthesizedLearnings: string[];
  merkleChainValid: boolean;
  status: 'active' | 'capped' | 'converged' | 'paused';
  maxGenerations: number;
  createdAt: number;
  updatedAt: number;
}

export interface FeedbackAnalysis {
  rootCauseAnalysis: string;
  instructionFlaws: Array<{ flaw: string; evidence: string; fix: string }>;
  toolGaps: Array<{ gap: string; suggestedTool: string; evidence: string }>;
  hookIssues: Array<{ issue: string; evidence: string; fix: string }>;
  confidenceScore: number;
  analysisModel: string;
  analyzedAt: number;
}

export interface HarnessUpdate {
  updatedInstructions?: string;
  toolsToAdd?: Array<{ name: string; schema: Record<string, unknown>; handler: string }>;
  toolsToRemove?: string[];
  toolsToModify?: Array<{ name: string; changes: Record<string, unknown> }>;
  hookChanges?: Array<{ hook: string; action: 'add' | 'modify' | 'remove'; config: Record<string, unknown> }>;
  hiveUpdates?: HiveUpdate[];
}

export interface HiveUpdate {
  category: 'pattern' | 'failure' | 'decision' | 'breakthrough';
  key: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface WeightUpdateCandidate {
  trajectoryId: string;
  exampleType: 'positive' | 'negative';
  trainingMessages: Array<{ role: string; content: string }>;
  domainLabel: string;
  qualityScore: number;
}

export interface CrossProjectPattern {
  sourceProject: string;
  pattern: string;
  appliedFix: string;
  successMetrics: Record<string, number>;
  similarityScore: number;
  transferable: boolean;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  risks: Array<{ description: string; severity: string; mitigation: string }>;
  rollbackPlan: string;
  recommendedApproval: 'auto' | 'manual' | 'reject';
}

export interface ImprovementProposal {
  id: string;
  projectId: string;
  generationNumber: number;
  analysis: FeedbackAnalysis;
  changes: HarnessUpdate;
  weightCandidates: WeightUpdateCandidate[];
  crossProjectSources: CrossProjectPattern[];
  riskAssessment: RiskAssessment;
  status: 'proposed' | 'approved' | 'applied' | 'rejected' | 'rolled_back';
  merkleHash: string;
  proposedAt: number;
  appliedAt?: number;
  appliedBy?: string;
  rejectionReason?: string;
}

export type SyncDirection = 'afferent' | 'efferent';
export type SyncMessageType =
  | 'register_project'
  | 'unregister_project'
  | 'new_trajectories_available'
  | 'improvement_proposal'
  | 'improvement_applied'
  | 'improvement_rejected'
  | 'lineage_update'
  | 'heartbeat'
  | 'error';

export interface SyncBridgeMessage {
  id: string;
  direction: SyncDirection;
  type: SyncMessageType;
  sourceKrakenId: string;
  targetOpenfangId?: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  createdAt: number;
  deliveredAt?: number;
  status: 'pending' | 'delivered' | 'error';
}

export interface KrakenProjectRegistration {
  projectId: string;
  cortexDbPath: string;
  projectRoot: string;
  modifiableFiles: string[];
  autoApplyImprovements: boolean;
  maxAutoApplyRisk: 'low' | 'medium';
  registeredAt: number;
}

export interface PFCIntuitionSignal {
  id: string;
  pattern: string;
  description: string;
  evidence: string;
  confidence: number;
  source: string;
  triggerContexts: string[];
  createdAt: number;
  expiresAt: number;
  activationCount: number;
  lastActivatedAt: number;
  provenance: 'feedback-brain' | 'cross-project' | 'manual' | 'trajectory-analysis';
  trajectoryIds: string[];
}

export interface IntuitionTrigger {
  pattern: RegExp;
  signalType: string;
  description: string;
}

export interface FirewallPatternInjection {
  layer: 'L5';
  patternType: 'focus_collision' | 'planner_executor_desync' | 'context_stale' | 'premature_completion' | 'bash_abuse' | 'intuition' | 'instruction-flaw' | 'tool-gap' | 'custom';
  pattern: string;
  description: string;
  evidence: string;
  confidence: number;
  source: string;
  injectedAt?: number;
  active: boolean;
}

export interface PrefrontalCortexState {
  initialized: boolean;
  openfangConnected: boolean;
  registeredProjects: KrakenProjectRegistration[];
  pendingProposals: ImprovementProposal[];
  lineages: Map<string, EvolutionLineage>;
  syncStatus: {
    lastSyncAt: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
  };
  injectedFirewallPatterns: FirewallPatternInjection[];
  currentGeneration: number;
  lastAnalysisAt: number;
  trajectoryCount: number;
}

export const DEFAULT_PREFRONTAL_STATE: PrefrontalCortexState = {
  initialized: false,
  openfangConnected: false,
  registeredProjects: [],
  pendingProposals: [],
  lineages: new Map(),
  syncStatus: {
    lastSyncAt: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  },
  injectedFirewallPatterns: [],
  currentGeneration: 0,
  lastAnalysisAt: 0,
  trajectoryCount: 0,
};

export const MAX_BUFFER_SIZE = 50;
export const FLUSH_THRESHOLD = 10;
export const MAX_TOOL_RESULT_SIZE = 8192;
export const MAX_MESSAGE_CONTENT_SIZE = 4096;
export const DEFAULT_ANALYSIS_INTERVAL_S = 1800;
export const DEFAULT_MAX_GENERATIONS = 10;
