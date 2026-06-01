/**
 * src/index.ts
 *
 * INTEGRATION TEMPLATE — Wire your brain into the Kraken orchestrator.
 * This mirrors the exact pattern from src/index.ts in the PFC ship package.
 *
 * Find-and-replace:
 *   YourBrainBrain     → Your brain class name (PascalCase)
 *   createYourBrainBrain → factory function name
 *   getYourBrainBrain  → singleton accessor
 *   your-brain         → your brain directory name
 *   YOUR_DOMAIN_ID     → your domain ID from domain-ownership.ts
 *   YOUR_BRAIN_ID      → your brain ID from domain-ownership.ts
 */

import type { Plugin, PluginInput } from '@opencode-ai/plugin';

import { safeHook, createLogger, createAgentAwareness, type HookContext } from './v4.1/index.js';
import { createStateStore, getStateStore } from './shared/state-store.js';
import { createBrainMessenger, getBrainMessenger } from './shared/brain-messenger.js';
import { createYourBrainBrain, getYourBrainBrain } from './brains/your-brain/your-brain-brain.js';

// [EDIT] Import your tools and hooks:
import { createYourBrainTools } from './tools/your-brain-tools.js';
import { yourBrainHook } from './hooks/your-brain-hook.js';

// ──────────────────────────────────────────────
// PLUGIN IDENTITY
// ──────────────────────────────────────────────

const PLUGIN_IDENTITY = {
  name: 'your-brain-plugin',            // [EDIT] e.g., "kraken-agent"
  prefix: 'your-brain-',                // [EDIT] e.g., "kraken-"
  orchestrator: 'your-brain',           // [EDIT] e.g., "kraken"
  agents: new Set(['your-brain']),       // [EDIT] Agents that use this brain
};

// ──────────────────────────────────────────────
// PLUGIN ENTRY POINT
// ──────────────────────────────────────────────

export default async function YourBrainPlugin(input: PluginInput) {
  const logger = createLogger(PLUGIN_IDENTITY.name);

  // Initialize core infrastructure
  const stateStore = createStateStore();
  const messenger = createBrainMessenger();

  // [EDIT] Initialize your brain
  // Wrapped in try/catch: brain failure MUST NOT crash the plugin
  let yourBrain;
  try {
    yourBrain = createYourBrainBrain({ stateStore, messenger });
    yourBrain.initialize();
    logger.info('[Brain] Initialized successfully');
  } catch (err) {
    console.error('[Brain] CRITICAL: Init failed — continuing without brain:', err instanceof Error ? err.message : String(err));
    yourBrain = null;
  }

  // ──────────────────────────────────────────────
  // TOOLS
  // ──────────────────────────────────────────────

  const allTools = {
    ...createYourBrainTools(),  // [EDIT] Your brain's agent-facing tools
  };

  // ──────────────────────────────────────────────
  // RETURN PLUGIN HOOKS
  // ──────────────────────────────────────────────

  return {
    name: PLUGIN_IDENTITY.name,

    tool: allTools,

    config: async (opencodeConfig: Record<string, any>) => {
      // [EDIT] Register your agents
      // Use 'primary' mode for the main orchestrator agent, 'subagent' for worker agents
      opencodeConfig.agent = opencodeConfig.agent || {};
      opencodeConfig.agent['your-brain'] = {
        name: 'your-brain',
        description: 'Your brain description',
        instructions: 'Your brain system instructions.',
        mode: 'primary',         // [EDIT] 'primary' for main agent, 'subagent' for workers
        permission: { task: 'allow' },
        tools: allTools,
      };
      logger.info('Agents registered');
    },

    // ──────────────────────────────────────────────
    // HOOKS
    // ──────────────────────────────────────────────

    'experimental.chat.system.transform': safeHook(
      async (input, output: any, ctx: HookContext) => {
        try {
          yourBrainHook({ input, output });
        } catch (err) {
          console.error('[Brain] Context injection failed:', err instanceof Error ? err.message : String(err));
        }
      },
      { agentFilter: null, pluginName: PLUGIN_IDENTITY.name, managedAgents: PLUGIN_IDENTITY.agents, agentPrefix: PLUGIN_IDENTITY.prefix, orchestratorName: PLUGIN_IDENTITY.orchestrator }
    ),

    // [EDIT] Add tool.execute.before hook if your brain needs pre-execution intuition:
    // 'tool.execute.before': async (input: any, output: any) => { ... },

    // [EDIT] Add tool.execute.after hook if your brain needs execution recording:
    // 'tool.execute.after': async (input: any, output: any) => { ... },

    // [EDIT] Add chat.message hook if your brain needs to intercept user messages:
    // 'chat.message': safeHook(async (input, output, ctx) => {
    //   try { /* identity detection, task decomposition, routing */ }
    //   catch (err) { console.error('[Brain] chat.message error:', err); }
    // }, { agentFilter: null, pluginName: PLUGIN_IDENTITY.name, managedAgents: PLUGIN_IDENTITY.agents, agentPrefix: PLUGIN_IDENTITY.prefix, orchestratorName: PLUGIN_IDENTITY.orchestrator }),

    // ──────────────────────────────────────────────
    // SESSION LIFECYCLE
    // ──────────────────────────────────────────────

    'experimental.session.compacting': safeHook(
      async (input, output: any, ctx: HookContext) => {
        try {
          output.context = output.context || [];
          output.context.push(`[BRAIN COMPACTION SURVIVAL]
Brain: ${PLUGIN_IDENTITY.name}
Initialized: ${yourBrain?.isInitialized() ?? false}`);
          console.log('[Compaction] Brain state preserved');
        } catch (err) {
          console.error('[Compaction] Failed to preserve state:', err);
        }
      },
      { agentFilter: null, pluginName: PLUGIN_IDENTITY.name, managedAgents: PLUGIN_IDENTITY.agents, agentPrefix: PLUGIN_IDENTITY.prefix, orchestratorName: PLUGIN_IDENTITY.orchestrator }
    ),

    event: async (input: any) => {
      const eventType = input?.event?.type || input?.type || '';
      if (eventType === 'session.deleted' || eventType === 'session.ended') {
        const sessionId = input?.session?.sessionId || 'unknown';
        if (yourBrain) {
          try { yourBrain.notifySessionComplete(sessionId); } catch (err) { console.error('[Brain] Session notification failed:', err); }
          try { yourBrain.cleanup(); } catch (err) { console.error('[Brain] Cleanup failed:', err); }
        }
        console.log('[Brain] Session ended');
      }
    },
  };
}
