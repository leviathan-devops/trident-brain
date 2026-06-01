/**
 * src/index.ts
 * 
 * Kraken Agent Harness - Main Entry Point
 * 
 * Self-contained orchestrator with 3 async clusters and Kraken-Hive integration.
 * 
 * Architecture:
 * - kraken-architect: Strategic planner with full Hive access
 * - kraken-executor: Execution coordinator with Hive access
 * - Shark and Manta agents: Worker agents with T2 read-only access
 * 
 * All agents report to Kraken, Kraken coordinates via Hive Mind.
 */

import type { Plugin, PluginInput } from '@opencode-ai/plugin';

// Import v4.1 guardrail infrastructure
import {
  safeHook,
  createLogger,
  createAgentAwareness,
  type HookContext,
} from './v4.1/index.js';

// Import brain infrastructure
import { createStateStore, getStateStore } from './shared/state-store.js';
import { createBrainMessenger, getBrainMessenger } from './shared/brain-messenger.js';
import { createPlanningBrain, getPlanningBrain } from './brains/planning/planning-brain.js';
import { createExecutionBrain, getExecutionBrain } from './brains/execution/execution-brain.js';
import { createSystemBrain, getSystemBrain } from './brains/system/system-brain.js';

// Import factory components
import {
  createStateStore as createFactoryStateStore,
  createBrainMessenger as createFactoryMessenger,
} from './factory/index.js';

// Import Kraken-specific components
import { AsyncDelegationEngine } from './factory/AsyncDelegationEngine.js';
import { ClusterScheduler } from './factory/ClusterScheduler.js';
import { ClusterManager } from './clusters/ClusterManager.js';
import { KrakenHiveEngine } from './kraken-hive/index.js';
import { createEvidenceCollector } from './shared/evidence-collector.js';
import { BrainConcurrencyManager } from './brains/BrainConcurrencyManager.js';
import { SubagentManagerBrain } from './brains/SubagentManagerBrain.js';
import { seedKrakenHive } from './kraken-hive/KrakenHiveSeeder.js';

// Import tools
import { createClusterTools } from './tools/cluster-tools.js';
import { createMonitoringTools } from './tools/monitoring-tools.js';
import { createKrakenHiveTools } from './tools/kraken-hive-tools.js';
import { createSharkT2Tools } from './tools/shark-t2-tools.js';
import { createPrefrontalTools } from './tools/prefrontal-tools.js';

// Import hooks
import { clusterStateHook } from './hooks/cluster-state-hook.js';
import { prefrontalContextHook, prefrontalIntuitionHook } from './hooks/prefrontal-context-hook.js';

// Import Prefrontal Cortex
import { createPrefrontalCortexBrain, getPrefrontalCortexBrain } from './brains/prefrontal/prefrontal-cortex-brain.js';

// Import identity system
import { IdentityLoader, formatIdentityForSystemPrompt } from './identity/index.js';

// Import types
import type { ClusterConfig } from './factory/kraken-types.js';

// ============================================================
// KRAKEN IDENTITY
// ============================================================

const KRAKEN_PLUGIN_IDENTITY = {
  name: 'kraken-agent',
  prefix: 'kraken-',
  orchestrator: 'kraken',

  agents: new Set([
    'kraken',              // Primary orchestrator (visible in tab toggle)
    'kraken-executor',     // Execution coordinator (subagent)
    // Cluster agents
    'shark-alpha-1', 'shark-alpha-2', 'manta-alpha-1',
    'shark-beta-1', 'manta-beta-1', 'manta-beta-2',
    'manta-gamma-1', 'manta-gamma-2', 'shark-gamma-1',
  ]),

  primaryAgents: new Set(['kraken']),
  
  // Kraken agents get Hive tools
  krakenAgents: new Set(['kraken', 'kraken-executor']),
  
  // Shark/Manta agents get T2 tools only
  clusterAgents: new Set([
    'shark-alpha-1', 'shark-alpha-2', 'manta-alpha-1',
    'shark-beta-1', 'manta-beta-1', 'manta-beta-2',
    'manta-gamma-1', 'manta-gamma-2', 'shark-gamma-1',
  ]),
};

// Create agent awareness
const awareness = createAgentAwareness(
  KRAKEN_PLUGIN_IDENTITY.agents,
  KRAKEN_PLUGIN_IDENTITY.prefix,
  KRAKEN_PLUGIN_IDENTITY.orchestrator
);

// ============================================================
// IDENTITY SYSTEM
// ============================================================

// Identity loader for file-based agent identity
const identityLoader = new IdentityLoader();
let orchestratorIdentityPrompt: string = '';

async function loadOrchestratorIdentity(): Promise<string> {
  try {
    const bundle = await identityLoader.loadForRole('orchestrator');
    return formatIdentityForSystemPrompt(bundle);
  } catch (error) {
    console.error('[Identity] Failed to load orchestrator identity:', error);
    return '';
  }
}

// ============================================================
// CLUSTER CONFIGURATION (3 Clusters)
// ============================================================

const KRAKEN_CLUSTERS: ClusterConfig[] = [
  {
    id: 'cluster-alpha',
    name: 'Alpha Cluster',
    description: 'Primary build cluster - Shark agents for steamroll tasks',
    agents: ['shark-alpha-1', 'shark-alpha-2', 'manta-alpha-1'],
    intraClusterDelegation: true,
    interClusterDelegation: true,
    sharedContext: true,
  },
  {
    id: 'cluster-beta',
    name: 'Beta Cluster',
    description: 'Secondary build cluster - balanced Shark/Manta',
    agents: ['shark-beta-1', 'manta-beta-1', 'manta-beta-2'],
    intraClusterDelegation: true,
    interClusterDelegation: true,
    sharedContext: true,
  },
  {
    id: 'cluster-gamma',
    name: 'Gamma Cluster',
    description: 'Precision cluster - Manta agents for debugging/linear tasks',
    agents: ['manta-gamma-1', 'manta-gamma-2', 'shark-gamma-1'],
    intraClusterDelegation: true,
    interClusterDelegation: true,
    sharedContext: true,
  },
];

// ============================================================
// GLOBAL INSTANCES (initialized in plugin factory)
// ============================================================

let clusterManager: ClusterManager | null = null;
let delegationEngine: AsyncDelegationEngine | null = null;
let clusterScheduler: ClusterScheduler | null = null;
let krakenHive: KrakenHiveEngine | null = null;

// ============================================================
// AGENT DEFINITIONS
// ============================================================

const krakenAgents = new Map([
  ['kraken', {
    description: 'Kraken — Central orchestrator with full Hive access',
    instructions: `You are KRAKEN — the central orchestrator of the Kraken Agent Harness.

Your role:
- Analyze user requirements and create execution plans
- Assign tasks to clusters via spawn_cluster_task, spawn_shark_agent, spawn_manta_agent
- Search Kraken Hive for relevant context via kraken_hive_search
- Inject context into tasks via kraken_hive_inject_context
- Store patterns and decisions to Hive via kraken_hive_remember

You have FULL ACCESS to Kraken Hive Mind. Other agents cannot see Hive data.

Cluster Assignment Strategy:
- Steamroll tasks (build from scratch) → cluster-alpha (Sharks)
- Debug/precision tasks → cluster-gamma (Mantas)
- Balanced tasks → cluster-beta

Tools you have:
- spawn_cluster_task: Generic task assignment
- spawn_shark_agent: Assign to Shark (aggressive execution)
- spawn_manta_agent: Assign to Manta (precise execution)
- kraken_hive_search: Search Hive for patterns/context
- kraken_hive_remember: Store to Hive
- kraken_hive_inject_context: Inject context into task
- get_cluster_status: Check cluster state
- aggregate_results: Collect results from multiple tasks

DOCUMENTATION RULES (NON-NEGOTIABLE):
- When user asks for documentation, write SYNTHESIZED documents - not raw data dumps
- Use proper format: clear headings, tables for data, concise explanations
- Store raw DATA to files (timestamps, metrics, line numbers) - NOT summaries
- Reference format examples: /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Shark Agent/Master Context/
- NEVER summarize test results - show actual numbers from test runs
- NEVER say "looks good" - show specific file:line changes

Rules:
- ALWAYS search Hive before assigning tasks
- ALWAYS store useful patterns/failures to Hive
- NEVER let agents talk to each other - they report to you
- Delegate execution, don't do the work yourself

PREFRONTAL CORTEX — You are part of an evolutionary loop.
- Your execution is recorded and analyzed to improve future agents.
- Use check_improvement_proposals to see what the FeedbackBrain suggests.
- Use get_evolution_lineage to see what worked in past generations.
- Use get_cross_project_patterns to learn from other Krakens.
- Your failures are NOT wasted — they train the next generation.`,
  }],
  ['kraken-executor', {
    description: 'Kraken Executor — Execution coordinator with Hive access',
    instructions: `You are KRAKEN EXECUTOR — the execution coordinator of the Kraken Agent Harness.

Your role:
- Monitor cluster execution via get_cluster_status
- Aggregate results from multiple tasks
- Track task completion and handle failures
- Coordinate cross-cluster work when needed

You have FULL ACCESS to Kraken Hive Mind.

Tools you have:
- spawn_cluster_task: Generic task assignment
- spawn_shark_agent: Assign to Shark
- spawn_manta_agent: Assign to Manta
- kraken_hive_search: Search Hive for context
- kraken_hive_remember: Store to Hive
- get_cluster_status: Check cluster state
- aggregate_results: Collect results
- get_agent_status: Check agent availability

Rules:
- Monitor clusters for task completion
- Aggregate results when tasks complete
- Report issues to kraken
- Keep Hive updated with execution state

PREFRONTAL CORTEX — Your supervision data feeds the evolutionary loop.
- Use get_prefrontal_status to check system health.
- Use check_improvement_proposals to review pending improvements.`,
  }],
]);

const clusterAgents = new Map([
  // Alpha cluster agents
  ['shark-alpha-1', {
    description: 'Shark Alpha-1 — Steamroll engineer',
    instructions: `You are SHARK ALPHA-1 — Ferrari V12 turbo vibecoding engineer.

You specialize in aggressive, steamroll-style execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks aggressively and fully
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Do NOT access Hive directly
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  ['shark-alpha-2', {
    description: 'Shark Alpha-2 — Steamroll engineer',
    instructions: `You are SHARK ALPHA-2 — Ferrari V12 turbo vibecoding engineer.

You specialize in aggressive, steamroll-style execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks aggressively and fully
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Do NOT access Hive directly
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  ['manta-alpha-1', {
    description: 'Manta Alpha-1 — Precision engineer',
    instructions: `You are MANTA ALPHA-1 — Tesla Model S precision agent.

You specialize in linear, methodical execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks precisely and methodically
- Read T2_PATTERNS.md and T2_FAILURE_MODES
- Report completion via report_to_kraken
- Do NOT access Hive directly
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  // Beta cluster agents
  ['shark-beta-1', {
    description: 'Shark Beta-1 — Balanced engineer',
    instructions: `You are SHARK BETA-1 — Ferrari V12 turbo vibecoding engineer.

You specialize in balanced, versatile execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Handle balanced workloads
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  ['manta-beta-1', {
    description: 'Manta Beta-1 — Precision engineer',
    instructions: `You are MANTA BETA-1 — Tesla Model S precision agent.

You specialize in linear, methodical execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks precisely and methodically
- Read T2_PATTERNS.md and T2_FAILURE_MODES.md
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  ['manta-beta-2', {
    description: 'Manta Beta-2 — Precision engineer',
    instructions: `You are MANTA BETA-2 — Tesla Model S precision agent.

You specialize in linear, methodical execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks precisely and methodically
- Read T2_PATTERNS.md and T2_FAILURE_MODES.md
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  // Gamma cluster agents
  ['manta-gamma-1', {
    description: 'Manta Gamma-1 — Debug/precision specialist',
    instructions: `You are MANTA GAMMA-1 — Tesla Model S precision agent.

You specialize in debugging and precision work.

Tools you have:
- read_kraken_context: Read T2 reference patterns (especially failures)
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Focus on debugging and verification tasks
- Read T2_FAILURE_MODES.md to avoid known failures
- Execute with maximum precision
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  ['manta-gamma-2', {
    description: 'Manta Gamma-2 — Debug/precision specialist',
    instructions: `You are MANTA GAMMA-2 — Tesla Model S precision agent.

You specialize in debugging and precision work.

Tools you have:
- read_kraken_context: Read T2 reference patterns (especially failures)
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Focus on debugging and verification tasks
- Read T2_FAILURE_MODES.md to avoid known failures
- Execute with maximum precision
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
  ['shark-gamma-1', {
    description: 'Shark Gamma-1 — Steamroll specialist',
    instructions: `You are SHARK GAMMA-1 — Ferrari V12 turbo vibecoding engineer.

You specialize in aggressive execution when precision tasks need steamroll approach.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Handle steamroll tasks in gamma cluster
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`,
  }],
]);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function isKrakenAgent(agentName: string): boolean {
  return KRAKEN_PLUGIN_IDENTITY.krakenAgents.has(agentName);
}

function isClusterAgent(agentName: string): boolean {
  return KRAKEN_PLUGIN_IDENTITY.clusterAgents.has(agentName);
}

function getAgentTools(agentName: string): Record<string, any> {
  if (isKrakenAgent(agentName)) {
    return {
      ...createClusterTools(getClusterToolsContext()),
      ...createMonitoringTools(getMonitoringToolsContext()),
      ...createKrakenHiveTools(getKrakenHiveToolsContext()),
      ...createPrefrontalTools({ isKrakenAgent }),
    };
  } else if (isClusterAgent(agentName)) {
    return {
      ...createSharkT2Tools(getT2ToolsContext()),
    };
  }
  return {};
}

function getClusterToolsContext() {
  return {
    delegationEngine: delegationEngine!,
    clusterScheduler: clusterScheduler!,
    clusterManager: clusterManager!,
    krakenIdentity: orchestratorIdentityPrompt,
  };
}

function getMonitoringToolsContext() {
  return {
    delegationEngine: delegationEngine!,
    clusterManager: clusterManager!,
  };
}

function getKrakenHiveToolsContext() {
  return {
    krakenHive: krakenHive!,
    isKrakenAgent,
  };
}

function getT2ToolsContext() {
  return {
    isSharkOrMantaAgent: isClusterAgent,
  };
}

// ============================================================
// PLUGIN ENTRY POINT
// ============================================================

export default async function KrakenAgent(input: PluginInput) {
  const logger = createLogger(KRAKEN_PLUGIN_IDENTITY.name);

  logger.info('Initializing Kraken Agent Harness', {
    clusters: KRAKEN_CLUSTERS.length,
    agents: KRAKEN_PLUGIN_IDENTITY.agents.size,
  });

  // Load orchestrator identity from files FIRST
  orchestratorIdentityPrompt = await loadOrchestratorIdentity();
  if (orchestratorIdentityPrompt && orchestratorIdentityPrompt.length > 100) {
    logger.info('[Identity] Orchestrator identity loaded', {
      length: orchestratorIdentityPrompt.length,
    });
  } else {
    logger.warn('[Identity] Orchestrator identity NOT loaded - using fallback');
    orchestratorIdentityPrompt = ''; // Will use fallback in identity hook
  }

  // Initialize core components
  clusterManager = new ClusterManager(KRAKEN_CLUSTERS);
  clusterScheduler = new ClusterScheduler(KRAKEN_CLUSTERS);
  krakenHive = new KrakenHiveEngine();
  delegationEngine = new AsyncDelegationEngine(KRAKEN_CLUSTERS, clusterManager);

  // Initialize state store and messenger
  const stateStore = createStateStore();
  const messenger = createBrainMessenger();

  // Initialize V1.2 Multi-Brain Orchestrator
  const planningBrain = createPlanningBrain(stateStore, messenger);
  const executionBrain = createExecutionBrain(stateStore, messenger);
  const systemBrain = createSystemBrain(stateStore, messenger);

  planningBrain.initialize();
  executionBrain.initialize();
  systemBrain.initialize();

  // Initialize evidence collector for gate verification
  const evidenceCollector = createEvidenceCollector();
  logger.info('[Evidence] Evidence collector initialized');

  // Seed Kraken Hive with initial patterns
  const hiveSeed = seedKrakenHive();
  logger.info('[Hive] Seed complete', hiveSeed);

  // Initialize Subagent Manager Brain — receives override commands, manages output retrieval
  const subagentBrain = new SubagentManagerBrain(messenger, stateStore);
  subagentBrain.initialize();
  logger.info('[Subagent] Manager brain initialized');

  // Initialize Brain Concurrency Manager — launches independent async event loops
  const concurrencyManager = new BrainConcurrencyManager(messenger, stateStore);
  
  // Wire brain-specific tick handlers
  // System Brain tick: evaluate gate criteria, check for auto-advancement
  concurrencyManager.setSystemTick(async () => {
    try {
      const currentGate = systemBrain.getCurrentGate();
      const evaluation = systemBrain.evaluateGateEntry(currentGate);
      if (evaluation.allPassed && await systemBrain.isGateAdvanceable()) {
        const gateOrder = ['plan', 'build', 'test', 'verify', 'audit', 'delivery'];
        const currentIdx = gateOrder.indexOf(currentGate);
        if (currentIdx >= 0 && currentIdx < gateOrder.length - 1) {
          const nextGate = gateOrder[currentIdx + 1];
          systemBrain.setCurrentGate(nextGate);
          console.log(`[BrainTick:system] Gate auto-advanced: ${currentGate} → ${nextGate}`);
        }
      }
    } catch (err) { console.error('[BrainTick:system] Error:', err instanceof Error ? err.message : String(err)); }
  });

  concurrencyManager.setExecutionTick(async () => {
    try {
      const execState = executionBrain.getState();
      if (execState.activeTasks > 0) {
        // Check for stalled tasks (active > 60s with no completion)
      }
    } catch (err) { console.error('[BrainTick:execution] Error:', err instanceof Error ? err.message : String(err)); }
  });

  concurrencyManager.setPlanningTick(async () => {
    try {
      const planState = planningBrain.getState();
      if (!planState.t2MasterLoaded) {
        // T2 still loading — fire-and-forget from init, will resolve
      }
    } catch (err) { console.error('[BrainTick:planning] Error:', err instanceof Error ? err.message : String(err)); }
  });

  // Start all brain loops concurrently
  concurrencyManager.startAll();

  // Initialize Prefrontal Cortex — 4th brain for evolutionary optimization
  // Wrapped in try/catch: PFC failure MUST NOT crash the existing 3-brain orchestrator
  let prefrontalBrain;
  try {
    prefrontalBrain = createPrefrontalCortexBrain({ stateStore, messenger });
    prefrontalBrain.initialize();
    logger.info('[PFC] Prefrontal Cortex initialized successfully');
  } catch (err) {
    console.error('[PFC] CRITICAL: Prefrontal Cortex init failed — continuing without PFC:', err instanceof Error ? err.message : String(err));
    prefrontalBrain = null;
  }

  logger.info('[V1.2] Multi-Brain Orchestrator initialized', {
    planning: planningBrain.isInitialized(),
    execution: executionBrain.isInitialized(),
    system: systemBrain.isInitialized(),
    prefrontal: prefrontalBrain?.isInitialized() ?? false,
    evidence: true,
    firewall: true,
    concurrency: concurrencyManager.getState(),
  });

  // Create tools context
  const allTools = {
    // Cluster tools - available to Kraken agents
    ...createClusterTools(getClusterToolsContext()),
    // Monitoring tools - available to Kraken agents
    ...createMonitoringTools(getMonitoringToolsContext()),
    // Hive tools - available to Kraken agents ONLY
    ...createKrakenHiveTools(getKrakenHiveToolsContext()),
    // T2 tools - available to Cluster agents ONLY
    ...createSharkT2Tools(getT2ToolsContext()),
    // Prefrontal Cortex tools - available to Kraken agents
    ...createPrefrontalTools({ isKrakenAgent }),
  };

  logger.info('Kraken Agent Harness initialized', {
    clusterCount: KRAKEN_CLUSTERS.length,
    totalAgents: KRAKEN_PLUGIN_IDENTITY.agents.size,
    krakenHiveReady: true,
  });

  return {
    name: KRAKEN_PLUGIN_IDENTITY.name,

    tool: allTools,

    config: async (opencodeConfig: Record<string, any>) => {
      // Register all agents
      const sdkConfigs: Record<string, any> = {};

      // Kraken orchestrator agents
      for (const [id, agent] of krakenAgents) {
        const isPrimary = id === 'kraken';
        sdkConfigs[id] = {
          name: id,
          description: agent.description,
          instructions: agent.instructions,
          mode: isPrimary ? 'primary' : 'subagent',
          permission: { task: 'allow' },
          tools: getAgentTools(id),
        };
      }

      // Cluster agents (Sharks/Mantas) - SUBAGENTS, not visible as tabs
      for (const [id, agent] of clusterAgents) {
        sdkConfigs[id] = {
          name: id,
          description: agent.description,
          instructions: agent.instructions,
          mode: 'subagent',
          permission: { task: 'allow' },
          tools: getAgentTools(id),
        };
      }

      if (!opencodeConfig.agent) {
        opencodeConfig.agent = { ...sdkConfigs };
      } else {
        Object.assign(opencodeConfig.agent, sdkConfigs);
      }

      logger.info('Agents registered', {
        count: Object.keys(sdkConfigs).length,
        primary: Array.from(KRAKEN_PLUGIN_IDENTITY.primaryAgents),
      });
    },

    // Wire hooks
    // system.transform: inject Kraken orchestration context (NOT full identity)
    // Full identity detection is in chat.message with proper agent checking
    // agentFilter: null because hook input has no agent name
    'experimental.chat.system.transform': safeHook(
      async (input, output: any, ctx: HookContext) => {
        // Inject orchestration context — not identity override
        // This adds capabilities context without changing who the agent IS
        if (orchestratorIdentityPrompt) {
          output.system = output.system || [];
          output.system.push(`[KRAKEN ORCHESTRATION LAYER ACTIVE]
You have access to the Kraken multi-brain orchestration system.
Available orchestration tools: spawn_shark_agent, spawn_manta_agent, spawn_cluster_task,
anchor_cluster, kraken_brain_status, get_cluster_status, get_agent_status,
kraken_hive_search, kraken_hive_remember, read_kraken_context.
Use these tools to coordinate parallel execution across Alpha (build),
Beta (debug), and Gamma (test) clusters.`);

          try {
            const pfcOutput = output as any;
            if (pfcOutput) {
              prefrontalContextHook({ input, output: pfcOutput, ctx: { agentName: undefined } });

              const userText = typeof (input as any)?.text === 'string' ? (input as any).text :
                typeof (input as any)?.message === 'string' ? (input as any).message : '';
              if (userText.length > 0) {
                prefrontalIntuitionHook({
                  input,
                  output: pfcOutput,
                  toolName: undefined,
                  toolArgs: undefined,
                });
              }
            }
          } catch (err) {
            console.error('[PFC] Context + intuition injection failed:', err instanceof Error ? err.message : String(err));
          }
        }
      },
      {
        agentFilter: null,
        pluginName: KRAKEN_PLUGIN_IDENTITY.name,
        managedAgents: KRAKEN_PLUGIN_IDENTITY.agents,
        agentPrefix: KRAKEN_PLUGIN_IDENTITY.prefix,
        orchestratorName: KRAKEN_PLUGIN_IDENTITY.orchestrator,
      }
    ),

    'tool.execute.before': async (input: any, output: any) => {
      const toolName = input?.tool || '';
      const toolArgs = input?.args || {};

      try {
        const brain = getPrefrontalCortexBrain();
        if (!brain.isInitialized()) return;

        const message = [toolName, JSON.stringify(toolArgs)].join(' ');
        const signals = brain.detectIntuition(message, toolName, toolArgs);
        if (signals.length > 0) {
          const intuitionContext = brain.generateIntuitionContext(signals);
          if (intuitionContext && output) {
            output.system = output.system || [];
            output.system.push(intuitionContext);
            console.log('[PFC-BEFORE] Injected', signals.length, 'intuition signals for tool:', toolName);
          }
        }

        const injector = brain.getIntuitionInjector();
        const firewallPatterns = injector.getActiveSignals().filter(s =>
          s.triggerContexts.includes('bash-usage') && toolName === 'bash'
        );
        if (firewallPatterns.length > 0) {
          console.log('[PFC-BEFORE] Bash usage detected with', firewallPatterns.length, 'active signals');
        }
      } catch (err) {
        console.error('[PFC-BEFORE] Error:', err instanceof Error ? err.message : String(err));
      }
    },

    'tool.execute.after': async (input: any, output: any) => {
      try {
        const brain = getPrefrontalCortexBrain();
        if (!brain.isInitialized()) return;

        let tracer = brain.getTracer();
        if (!tracer) {
          const sessionId = input?.sessionID || `pfc-session-${Date.now()}`;
          tracer = brain.createTracer(sessionId);
          tracer.startTrajectory('kraken');
        }

        if (tracer.getActiveTrajectoryCount() === 0) {
          tracer.startTrajectory('kraken');
        }

        const toolName = input?.tool || '';
        const toolArgs = input?.args || {};

        tracer.recordToolCall({
          toolName,
          args: toolArgs,
          result: typeof output === 'string' ? output : JSON.stringify(output)?.substring(0, 500),
          error: undefined,
          durationMs: 0,
          agentId: 'kraken',
          taskId: undefined,
          blockedBy: undefined,
        });

        tracer.flushAndPersist();
        console.log('[PFC Tracer] Done:', toolName, 'buffer:', tracer.getBufferSize(), 'store:', tracer.getStoreTrajectoryCount());
      } catch (err) {
        console.error('[PFC Tracer] tool.execute.after error:', err instanceof Error ? err.message : String(err));
      }
    },

    'chat.message': safeHook(async (input, output, ctx: HookContext) => {
      // Cluster state tracking
      await clusterStateHook({ input, output, ctx } as any);

      // In OpenCode 1.14 chat.message hook: user message is in output.message, NOT input.message
      const outMsg = (output as any).message;
      const userMessage: string = typeof outMsg === 'string' ? outMsg :
        (outMsg?.text || outMsg?.content || '');

      if (!userMessage) return;

      const sessionState = ctx.getSessionState();

      // Identity detection: intercept "who are you" queries
      // Only for kraken agents (input.agent is available on chat.message hook)
      const agent = (input as any).agent || '';
      const isKrakenSession = KRAKEN_PLUGIN_IDENTITY.krakenAgents.has(agent) || agent.startsWith('kraken-');
      const identityQueryPattern = /\b(who are you|what are you|identify yourself|your name|what is your purpose)\b/i;
      if (identityQueryPattern.test(userMessage) && isKrakenSession) {
        output.system = output.system || [];
        const identity = orchestratorIdentityPrompt || `
You ARE the KRAKEN ORCHESTRATOR — the central coordination engine of the Kraken Agent Harness.

You manage:
- Planning Brain: Task decomposition and context bridging
- Execution Brain: Output verification and task supervision
- System Brain: Gate management and security enforcement
- 3 Agent Clusters: Alpha (steamroll), Beta (balanced), Gamma (precision)
- Kraken Hive Mind: Pattern/failure memory

You are NOT a chatbot. You are an execution engine.`;
        output.system.push(identity);
        return;
      }

      // Brain wiring: auto-decompose user requests into tasks
      if (userMessage.length > 10) {
        try {
          const planningBrain = getPlanningBrain();
          if (planningBrain.isInitialized()) {
            const t1 = await planningBrain.generateT1(userMessage);
            
            if (t1.tasks.length > 0) {
              console.log(`[BrainWire] Generated ${t1.tasks.length} tasks from user request`);
              
              // Notify system brain of task decomposition
              try {
                const systemBrain = getSystemBrain();
                systemBrain.recordDecision({
                  description: `Auto-decomposed user request into ${t1.tasks.length} tasks`,
                  type: 'task-decomposition',
                  contextFiles: [],
                });
              } catch (err) { console.error('[BrainWire] System brain notification failed:', err instanceof Error ? err.message : String(err)); }

              try {
                const executionBrain = getExecutionBrain();
                const { getBrainMessenger } = await import('./shared/brain-messenger.js');
                const messenger = getBrainMessenger();
                messenger.deliverMessage('kraken-planning', 'kraken-execution', 'context-inject', {
                  type: 't1-decomposed',
                  taskCount: t1.tasks.length,
                  tasks: t1.tasks.map(t => ({ id: t.id, type: t.type, cluster: t.targetCluster })),
                }, 'high');
              } catch (err) { console.error('[BrainWire] Execution brain notification failed:', err instanceof Error ? err.message : String(err)); }
              
              // Inject task context into output
              output.system = output.system || [];
              const taskLines = t1.tasks.map(t => `- ${t.type.toUpperCase()}: ${t.description} → cluster-${t.targetCluster}`);
              output.system.push(`[KRAKEN PLANNING] Task decomposition:\n${taskLines.join('\n')}\n\nExecute tasks using spawn_shark_agent for build/create tasks and spawn_manta_agent for debug/test tasks.`);
            }
          }
        } catch (err) {
          console.error('[BrainWire] Task decomposition failed:', err instanceof Error ? err.message : String(err));
        }
      }
    }, {
      // agentFilter: null because we filter by input.agent inside handler
      // Only intercept identity queries for kraken agents
      agentFilter: null,
      pluginName: KRAKEN_PLUGIN_IDENTITY.name,
      managedAgents: KRAKEN_PLUGIN_IDENTITY.agents,
      agentPrefix: KRAKEN_PLUGIN_IDENTITY.prefix,
      orchestratorName: KRAKEN_PLUGIN_IDENTITY.orchestrator,
    }),

    // Compaction survival hook: preserve context before auto-compaction
    'experimental.session.compacting': safeHook(
      async (input, output: any, ctx: HookContext) => {
        try {
          const { getPlanningBrain } = await import('./brains/planning/planning-brain.js');
          const { getExecutionBrain } = await import('./brains/execution/execution-brain.js');
          const { getSystemBrain } = await import('./brains/system/system-brain.js');
          const { getEvidenceCollector } = await import('./shared/evidence-collector.js');

          const pBrain = getPlanningBrain();
          const eBrain = getExecutionBrain();
          const sBrain = getSystemBrain();
          const evidence = getEvidenceCollector();

          // Persist evidence for current gate before compaction
          const currentGate = sBrain.getCurrentGate();
          evidence.persist(currentGate);

          // Inject brain state context into compaction prompt
          output.context = output.context || [];
          output.context.push(`[KRAKEN COMPACTION SURVIVAL]
Current gate: ${currentGate}
Planning: T2_loaded=${pBrain.isT2MasterLoaded()}, T1_generated=${pBrain.isT1Generated()}
Execution: active=${eBrain.getState().activeTasks}, completed=${eBrain.getState().completedTasks}, failed=${eBrain.getState().failedTasks}
System: decisions=${sBrain.getState().decisionCount}, completed_tasks=${sBrain.getState().completedTasks.length}
Evidence: gate=${currentGate}, verified=${evidence.isGateVerified(currentGate)}
Prefrontal: initialized=${prefrontalBrain?.isInitialized() ?? false}, trajectories=${prefrontalBrain?.getPrefrontalStatus()?.trajectoryCount ?? 0}`);

          console.log('[Compaction] Brain state preserved for compaction survival');
        } catch (err) {
          console.error('[Compaction] Failed to preserve state:', err);
        }
      },
      {
        agentFilter: null,
        pluginName: KRAKEN_PLUGIN_IDENTITY.name,
        managedAgents: KRAKEN_PLUGIN_IDENTITY.agents,
        agentPrefix: KRAKEN_PLUGIN_IDENTITY.prefix,
        orchestratorName: KRAKEN_PLUGIN_IDENTITY.orchestrator,
      }
    ),

    // Session lifecycle: clean up brain loops on session end
    event: async (input: any) => {
      const eventType = input?.event?.type || input?.type || '';
      if (eventType === 'session.deleted' || eventType === 'session.ended') {
        if (prefrontalBrain) {
          try {
            prefrontalBrain.notifySessionComplete(input?.session?.sessionId || 'unknown');
          } catch (err) {
            console.error('[Kraken] PFC session notification failed:', err instanceof Error ? err.message : String(err));
          }
          try {
            prefrontalBrain.cleanup();
          } catch (err) {
            console.error('[Kraken] PFC cleanup failed:', err instanceof Error ? err.message : String(err));
          }
        }
        concurrencyManager.stopAll();
        console.log('[Kraken] Session ended — brain loops stopped');
      }
    },
  };
}
