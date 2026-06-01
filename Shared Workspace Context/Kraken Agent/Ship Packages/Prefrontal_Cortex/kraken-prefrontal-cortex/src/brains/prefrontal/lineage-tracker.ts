import crypto from 'node:crypto';
import {
  type GenerationRecord,
  type EvolutionLineage,
  type GenerationDelta,
  type GenerationMetrics,
  type GenerationEvaluation,
  type AggregatedTrajectoryStats,
  type AgentSpecAtGeneration,
  DEFAULT_MAX_GENERATIONS,
} from './types.js';
import { type CortexStore } from './cortex-store.js';

export class LineageTracker {
  private cortexStore: CortexStore;
  private cache: Map<string, EvolutionLineage> = new Map();

  constructor(cortexStore: CortexStore) {
    this.cortexStore = cortexStore;
  }

  initialize(): void {
    console.log('[LineageTracker] Initialized');
  }

  getOrCreateLineage(projectId: string, acceptanceCriteria: string[] = []): EvolutionLineage {
    const cached = this.cache.get(projectId);
    if (cached) return cached;

    const stored = this.cortexStore.getLineage(projectId);
    if (stored) {
      this.cache.set(projectId, stored);
      return stored;
    }

    const now = Date.now();
    const lineage: EvolutionLineage = {
      projectId,
      generations: [],
      currentGeneration: 0,
      acceptanceCriteria,
      synthesizedLearnings: [],
      merkleChainValid: true,
      status: 'active',
      maxGenerations: DEFAULT_MAX_GENERATIONS,
      createdAt: now,
      updatedAt: now,
    };

    this.cortexStore.upsertLineage(lineage);
    this.cache.set(projectId, lineage);
    console.log(`[LineageTracker] Created new lineage for project ${projectId}`);
    return lineage;
  }

  recordGeneration(params: {
    projectId: string;
    agentSpec: AgentSpecAtGeneration;
    aggregatedStats: AggregatedTrajectoryStats;
    evaluation: GenerationEvaluation;
    trajectoryIds: string[];
  }): GenerationRecord {
    const lineage = this.getOrCreateLineage(params.projectId);
    const generationNumber = lineage.currentGeneration + 1;

    const previousGen = lineage.generations.length > 0
      ? lineage.generations[lineage.generations.length - 1]
      : undefined;

    const delta = previousGen
      ? this.computeDelta(previousGen, params)
      : undefined;

    const previousHash = previousGen?.merkleHash || '0'.repeat(64);
    const merkleHash = this.computeMerkleHash(generationNumber, params, previousHash);

    const record: GenerationRecord = {
      generationNumber,
      projectId: params.projectId,
      agentSpec: params.agentSpec,
      aggregatedStats: params.aggregatedStats,
      evaluation: params.evaluation,
      deltaFromPrevious: delta,
      trajectories: params.trajectoryIds,
      createdAt: Date.now(),
      merkleHash,
      previousHash,
    };

    this.cortexStore.insertGeneration(record);

    lineage.generations.push(record);
    lineage.currentGeneration = generationNumber;
    lineage.updatedAt = Date.now();

    if (generationNumber >= lineage.maxGenerations) {
      lineage.status = 'capped';
    } else if (params.evaluation.criteriaMet) {
      lineage.status = 'converged';
    }

    lineage.synthesizedLearnings = this.synthesizeLearnings(lineage);
    lineage.merkleChainValid = this.validateMerkleChain(lineage);

    this.cortexStore.upsertLineage(lineage);
    this.cache.set(params.projectId, lineage);

    console.log(`[LineageTracker] Recorded generation ${generationNumber} for ${params.projectId} (hash: ${merkleHash.slice(0, 12)}...)`);
    return record;
  }

  computeDelta(prevGen: GenerationRecord, currentParams: {
    agentSpec: AgentSpecAtGeneration;
    aggregatedStats: AggregatedTrajectoryStats;
    evaluation: GenerationEvaluation;
  }): GenerationDelta {
    const prevTools = new Set(prevGen.agentSpec.tools);
    const currTools = new Set(currentParams.agentSpec.tools);

    const toolsAdded = [...currTools].filter(t => !prevTools.has(t));
    const toolsRemoved = [...prevTools].filter(t => !currTools.has(t));

    const instructionChanges = prevGen.agentSpec.instructions !== currentParams.agentSpec.instructions ? 1 : 0;

    const prevMetrics = prevGen.evaluation.metrics;
    const currMetrics = currentParams.evaluation.metrics;

    const metricDeltas: Partial<GenerationMetrics> = {};
    if (currMetrics.accuracy !== prevMetrics.accuracy) metricDeltas.accuracy = currMetrics.accuracy - prevMetrics.accuracy;
    if (currMetrics.taskSuccessRate !== prevMetrics.taskSuccessRate) metricDeltas.taskSuccessRate = currMetrics.taskSuccessRate - prevMetrics.taskSuccessRate;
    if (currMetrics.scfIncidentRate !== prevMetrics.scfIncidentRate) metricDeltas.scfIncidentRate = currMetrics.scfIncidentRate - prevMetrics.scfIncidentRate;
    if (currMetrics.bashAbuseRate !== prevMetrics.bashAbuseRate) metricDeltas.bashAbuseRate = currMetrics.bashAbuseRate - prevMetrics.bashAbuseRate;

    const locDelta = currentParams.agentSpec.instructions.length - prevGen.agentSpec.instructions.length;

    return {
      instructionChanges,
      toolsAdded,
      toolsRemoved,
      toolsModified: [],
      hooksModified: [],
      metricDeltas,
      locDelta,
    };
  }

  synthesizeLearnings(lineage: EvolutionLineage): string[] {
    const learnings: string[] = [];
    const gens = lineage.generations;
    if (gens.length === 0) return learnings;

    const bestGen = this.getBestGeneration(lineage);
    if (bestGen) {
      learnings.push(`Best generation: ${bestGen.generationNumber} (accuracy: ${bestGen.evaluation.metrics.accuracy.toFixed(2)})`);
    }

    const successfulGens = gens.filter(g => g.evaluation.metrics.taskSuccessRate > 0.7);
    if (successfulGens.length > 0) {
      learnings.push(`${successfulGens.length}/${gens.length} generations achieved >70% task success rate`);
    }

    const deltas = gens.filter(g => g.deltaFromPrevious);
    const improving = deltas.filter(g => {
      const delta = g.deltaFromPrevious!;
      return (delta.metricDeltas.accuracy ?? 0) > 0 || (delta.metricDeltas.taskSuccessRate ?? 0) > 0;
    });
    if (improving.length > 0) {
      learnings.push(`${improving.length} generations showed metric improvement over previous`);
    }

    return learnings;
  }

  getBestGeneration(lineage: EvolutionLineage): GenerationRecord | null {
    if (lineage.generations.length === 0) return null;
    return lineage.generations.reduce((best, gen) =>
      gen.evaluation.metrics.accuracy > best.evaluation.metrics.accuracy ? gen : best
    );
  }

  validateMerkleChain(lineage: EvolutionLineage): boolean {
    const gens = lineage.generations;
    if (gens.length === 0) return true;

    for (let i = 1; i < gens.length; i++) {
      if (gens[i].previousHash !== gens[i - 1].merkleHash) {
        console.error(`[LineageTracker] Merkle chain break at generation ${gens[i].generationNumber}`);
        return false;
      }
    }
    return true;
  }

  generateContextMd(lineage: EvolutionLineage): string {
    const lines: string[] = [
      `# Evolution Lineage: ${lineage.projectId}`,
      `Status: ${lineage.status}`,
      `Generations: ${lineage.currentGeneration}/${lineage.maxGenerations}`,
      '',
    ];

    for (const gen of lineage.generations) {
      lines.push(`## Generation ${gen.generationNumber}`);
      lines.push(`- Accuracy: ${gen.evaluation.metrics.accuracy.toFixed(2)}`);
      lines.push(`- Task Success: ${(gen.evaluation.metrics.taskSuccessRate * 100).toFixed(0)}%`);
      lines.push(`- Hash: ${gen.merkleHash.slice(0, 16)}...`);
      if (gen.deltaFromPrevious) {
        const delta = gen.deltaFromPrevious;
        if (delta.toolsAdded.length > 0) lines.push(`- Tools Added: ${delta.toolsAdded.join(', ')}`);
        if (delta.toolsRemoved.length > 0) lines.push(`- Tools Removed: ${delta.toolsRemoved.join(', ')}`);
        if (delta.instructionChanges > 0) lines.push(`- Instructions modified`);
      }
      lines.push('');
    }

    if (lineage.synthesizedLearnings.length > 0) {
      lines.push('## Synthesized Learnings');
      for (const learning of lineage.synthesizedLearnings) {
        lines.push(`- ${learning}`);
      }
    }

    return lines.join('\n');
  }

  private computeMerkleHash(
    generationNumber: number,
    params: {
      agentSpec: AgentSpecAtGeneration;
      aggregatedStats: AggregatedTrajectoryStats;
      evaluation: GenerationEvaluation;
      trajectoryIds: string[];
    },
    previousHash: string
  ): string {
    const data = JSON.stringify({
      gen: generationNumber,
      specHash: params.agentSpec.specHash,
      metrics: params.evaluation.metrics,
      trajectoryCount: params.trajectoryIds.length,
      prev: previousHash,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
