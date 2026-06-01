/**
 * src/hooks/cluster-state-hook.ts
 * 
 * Cluster State Hook
 * 
 * Tracks agent activity for ALL agents (Shark/Manta/Kraken).
 * Extracts meaningful activity for Kraken to process.
 * This hook does NOT give agents Hive access - it just tracks activity.
 */

import { safeHook } from '../v4.1/hooks/safe-hook.js';
import type { HookContext } from '../v4.1/context/hook-context.js';
import fs from 'node:fs';
import path from 'node:path';

interface ClusterActivity {
  type: 'task_queued' | 'task_started' | 'task_completed' | 'task_failed' | 'file_written' | 'error';
  taskId?: string;
  clusterId: string;
  file?: string;
  error?: string;
  timestamp: number;
  agentId?: string;
}

const KRAKEN_HOOK_IDENTITY = {
  name: 'kraken-agent',
  prefix: 'kraken-',
  orchestrator: 'kraken',
  agents: new Set(['kraken', 'kraken-executor', 'shark-alpha-1', 'shark-alpha-2', 'shark-beta-1', 'manta-alpha-1', 'manta-beta-1', 'manta-beta-2', 'manta-gamma-1', 'manta-gamma-2', 'shark-gamma-1']),
};

const ACTIVITY_LOG_DIR = path.join(
  process.env.HOME || '/root',
  '.local/share/opencode/kraken-hive/activity'
);

interface ClusterActivityState {
  tasks: ClusterActivity[];
  files: string[];
  errors: string[];
  completions: string[];
}

export const clusterStateHook = safeHook(
  async (input, output, ctx: HookContext) => {
    // Track activity for all kraken agents (Sharks, Mantas, Kraken)
    const sessionState = ctx.getSessionState() as Record<string, unknown>;
    
    // Initialize cluster state tracking
    if (!sessionState.clusterActivity) {
      sessionState.clusterActivity = new Map<string, ClusterActivityState>();
    }

    const clusterActivityMap = sessionState.clusterActivity as Map<string, ClusterActivityState>;

    // Extract relevant activity from tool calls
    const activity = extractActivity(input, output, ctx);
    
    if (activity) {
      // Determine cluster from agent name or context
      const clusterId = activity.clusterId || detectClusterFromAgent(ctx.agentName || '');
      
      // Store in session state
      const clusterActivity = clusterActivityMap.get(clusterId) || {
        tasks: [],
        files: [],
        errors: [],
        completions: [],
      };
      
      clusterActivity.tasks.push(activity);
      
      if (activity.type === 'file_written' && activity.file) {
        clusterActivity.files.push(activity.file);
      }
      if (activity.type === 'error') {
        clusterActivity.errors.push(activity.error || 'Unknown error');
      }
      if (activity.type === 'task_completed') {
        clusterActivity.completions.push(activity.taskId || 'unknown');
      }
      
      clusterActivityMap.set(clusterId, clusterActivity);
      
      // Also persist to file for cross-session visibility
      await persistActivity(clusterId, activity);
    }
  },
  {
    agentFilter: Array.from(KRAKEN_HOOK_IDENTITY.agents),
    pluginName: KRAKEN_HOOK_IDENTITY.name,
    managedAgents: KRAKEN_HOOK_IDENTITY.agents,
    agentPrefix: KRAKEN_HOOK_IDENTITY.prefix,
    orchestratorName: KRAKEN_HOOK_IDENTITY.orchestrator,
  }
);

function extractActivity(input: any, output: any, ctx: HookContext): ClusterActivity | null {
  const tool = input?.tool;
  const args = input?.args;
  const agentName = ctx.agentName || '';

  if (tool === 'spawn_cluster_task' || tool === 'spawn_shark_agent' || tool === 'spawn_manta_agent') {
    return {
      type: 'task_queued',
      taskId: args?.taskId || `task_${Date.now()}`,
      clusterId: args?.clusterId || detectClusterFromAgent(agentName),
      timestamp: Date.now(),
      agentId: agentName,
    };
  }

  if (output?.success && (tool === 'write_file' || tool === 'mcp_write_file')) {
    return {
      type: 'file_written',
      file: args?.path || 'unknown',
      clusterId: detectClusterFromAgent(agentName),
      timestamp: Date.now(),
      agentId: agentName,
    };
  }

  if (output?.error) {
    return {
      type: 'error',
      error: output.error,
      clusterId: detectClusterFromAgent(agentName),
      timestamp: Date.now(),
      agentId: agentName,
    };
  }

  return null;
}

function detectClusterFromAgent(agentName: string): string {
  if (agentName.includes('alpha')) return 'cluster-alpha';
  if (agentName.includes('beta')) return 'cluster-beta';
  if (agentName.includes('gamma')) return 'cluster-gamma';
  if (agentName.startsWith('kraken-')) return 'orchestrator';
  return 'unknown';
}

async function persistActivity(clusterId: string, activity: ClusterActivity): Promise<void> {
  try {
    const activityDir = path.join(ACTIVITY_LOG_DIR, clusterId);
    if (!fs.existsSync(activityDir)) {
      fs.mkdirSync(activityDir, { recursive: true });
    }

    const timestamp = Date.now();
    const activityFile = path.join(activityDir, `activity_${timestamp}.json`);
    fs.writeFileSync(activityFile, JSON.stringify(activity, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ClusterStateHook] Failed to persist activity:', err instanceof Error ? err.message : String(err));
  }
}
