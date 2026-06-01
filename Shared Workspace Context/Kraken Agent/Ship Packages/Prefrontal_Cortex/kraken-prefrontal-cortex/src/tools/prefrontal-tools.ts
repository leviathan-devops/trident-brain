import { tool } from '@opencode-ai/plugin';
import { z } from 'zod';
import { getPrefrontalCortexBrain } from '../brains/prefrontal/prefrontal-cortex-brain.js';
import { getCortexStore } from '../brains/prefrontal/cortex-store.js';

export interface PrefrontalToolsContext {
  isKrakenAgent: (agentName: string) => boolean;
}

export function createPrefrontalTools(_ctx: PrefrontalToolsContext) {
  return {
    get_execution_trajectory: tool({
      description: 'Retrieve an execution trajectory by ID. Shows what an agent did during a task.',
      args: {
        trajectoryId: z.string().describe('The trajectory ID to retrieve'),
      },
      execute: async ({ trajectoryId }) => {
        const cortex = getCortexStore();
        const trajectory = cortex.getTrajectory(trajectoryId);
        if (!trajectory) {
          return `Trajectory ${trajectoryId} not found.`;
        }
        return `## Execution Trajectory: ${trajectory.id}

Agent: ${trajectory.agentId} | Outcome: ${trajectory.outcome} | Duration: ${trajectory.stats.wallTimeMs}ms
Tool Calls: ${trajectory.stats.totalToolCalls} | LLM Calls: ${trajectory.stats.totalLLMCalls} | Tokens: ${trajectory.stats.totalTokensUsed}
Bash Commands: ${trajectory.stats.bashCommandCount} | Blocked: ${trajectory.stats.blockedToolCount} | Errors: ${trajectory.stats.errors}
Files Modified: ${trajectory.stats.filesModified} | Files Read: ${trajectory.stats.filesRead}
SCF Incidents: ${trajectory.stats.scfIncidentCount}

### Tool Calls
${trajectory.toolCalls.map((tc, i) => `${i + 1}. ${tc.toolName} (${tc.durationMs}ms)${tc.error ? ' ERROR: ' + tc.error : ''}${tc.blockedBy ? ' BLOCKED BY: ' + tc.blockedBy : ''}`).join('\n')}`;
      },
    }),

    get_evolution_lineage: tool({
      description: 'Get evolution lineage for the project. Shows generational improvement history.',
      args: {
        projectId: z.string().optional().describe('Project ID (defaults to current project)'),
      },
      execute: async ({ projectId }) => {
        const brain = getPrefrontalCortexBrain();
        const lineage = brain.getEvolutionLineage(projectId);
        if (!lineage) {
          return 'No evolution lineage found for this project.';
        }
        return `## Evolution Lineage: ${lineage.projectId}

Status: ${lineage.status} | Generations: ${lineage.currentGeneration}/${lineage.maxGenerations} | Merkle Valid: ${lineage.merkleChainValid}

${lineage.generations.map(g => {
  const delta = g.deltaFromPrevious;
  return `### Generation ${g.generationNumber}
Accuracy: ${(g.evaluation.metrics.accuracy * 100).toFixed(0)}% | Success Rate: ${(g.evaluation.metrics.taskSuccessRate * 100).toFixed(0)}% | Hash: ${g.merkleHash.slice(0, 16)}...
${delta ? `Changes: +${delta.toolsAdded.length} tools, -${delta.toolsRemoved.length} tools, ${delta.instructionChanges} instruction edits` : '(first generation)'}`;
}).join('\n\n')}

${lineage.synthesizedLearnings.length > 0 ? `### Synthesized Learnings\n${lineage.synthesizedLearnings.map(l => '- ' + l).join('\n')}` : ''}`;
      },
    }),

    check_improvement_proposals: tool({
      description: 'Check pending improvement proposals from the Prefrontal Cortex FeedbackBrain.',
      args: {},
      execute: async () => {
        const brain = getPrefrontalCortexBrain();
        const proposals = brain.getPendingProposals();
        if (proposals.length === 0) {
          return 'No pending improvement proposals.';
        }
        return `## Pending Improvement Proposals (${proposals.length})

${proposals.map(p => `### ${p.id} (Gen ${p.generationNumber})
Risk: ${p.riskAssessment.level} | Confidence: ${(p.analysis.confidenceScore * 100).toFixed(0)}%
Root Cause: ${p.analysis.rootCauseAnalysis.slice(0, 200)}
Instruction Flaws: ${p.analysis.instructionFlaws.length} | Tool Gaps: ${p.analysis.toolGaps.length} | Cross-Project Sources: ${p.crossProjectSources.length}
Proposed: ${new Date(p.proposedAt).toISOString()}`).join('\n\n')}`;
      },
    }),

    apply_improvement: tool({
      description: 'Apply an approved improvement proposal. Low-risk auto-applies, high-risk requires manual approval.',
      args: {
        proposalId: z.string().describe('The improvement proposal ID to apply'),
      },
      execute: async ({ proposalId }) => {
        const brain = getPrefrontalCortexBrain();
        const result = brain.applyImprovement(proposalId);
        if (result.success) {
          return `Improvement ${proposalId} applied successfully.`;
        }
        return `Failed to apply improvement: ${result.reason}`;
      },
    }),

    get_cross_project_patterns: tool({
      description: 'Search for cross-project patterns from other Krakens.',
      args: {
        query: z.string().describe('Query to search for cross-project patterns'),
        limit: z.number().optional().default(5).describe('Maximum results'),
      },
      execute: async ({ query }) => {
        const brain = getPrefrontalCortexBrain();
        const lineage = brain.getEvolutionLineage();
        if (!lineage) {
          return 'No lineage found for cross-project synthesis.';
        }
        const bestAcc = lineage.generations.length > 0
          ? Math.max(...lineage.generations.map(g => g.evaluation.metrics.accuracy))
          : 0;
        return `## Cross-Project Patterns

Query: ${query}
Current Project: ${brain.getProjectId()} | Generations: ${lineage.currentGeneration} | Best Accuracy: ${(bestAcc * 100).toFixed(0)}%

${lineage.synthesizedLearnings.length > 0 ? `### Synthesized Learnings\n${lineage.synthesizedLearnings.map(l => '- ' + l).join('\n')}` : 'No synthesized learnings yet.'}`;
      },
    }),

    report_execution_insight: tool({
      description: 'Report an execution insight discovered during task execution. Stored in Hive for future generations.',
      args: {
        insight: z.string().describe('The execution insight discovered'),
        category: z.enum(['pattern', 'failure', 'breakthrough']).describe('Category of the insight'),
        evidence: z.string().optional().describe('Supporting evidence'),
      },
      execute: async ({ insight, category, evidence }) => {
        const brain = getPrefrontalCortexBrain();
        return `Execution insight recorded.

Category: ${category} | Project: ${brain.getProjectId()}
Insight: ${insight}
${evidence ? `Evidence: ${evidence}` : ''}
Timestamp: ${new Date().toISOString()}`;
      },
    }),

    get_prefrontal_status: tool({
      description: 'Get the current status of the Prefrontal Cortex system.',
      args: {},
      execute: async () => {
        const brain = getPrefrontalCortexBrain();
        const status = brain.getPrefrontalStatus();
        return `## Prefrontal Cortex Status

Initialized: ${status.initialized} | OpenFang Connected: ${status.openfangConnected}
Generation: ${status.currentGeneration} | Trajectories: ${status.trajectoryCount}
Injected Firewall Patterns: ${status.injectedFirewallPatterns.length} | Pending Proposals: ${status.pendingProposals.length}
Registered Projects: ${status.registeredProjects.length}
Last Analysis: ${status.lastAnalysisAt > 0 ? new Date(status.lastAnalysisAt).toISOString() : 'never'}
Sync: sent=${status.syncStatus.messagesSent} received=${status.syncStatus.messagesReceived} errors=${status.syncStatus.errors}`;
      },
    }),
  };
}
