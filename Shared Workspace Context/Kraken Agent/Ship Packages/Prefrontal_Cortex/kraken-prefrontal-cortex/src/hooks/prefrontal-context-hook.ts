import { getPrefrontalCortexBrain } from '../brains/prefrontal/prefrontal-cortex-brain.js';

export function prefrontalContextHook(params: {
  input: any;
  output: any;
  ctx?: any;
}): void {
  const { output } = params;
  try {
    const brain = getPrefrontalCortexBrain();
    if (!brain.isInitialized()) return;

    const status = brain.getPrefrontalStatus();
    if (!status.initialized) return;

    const lineage = brain.getEvolutionLineage();
    const pendingCount = status.pendingProposals.length;
    const signalCount = brain.getIntuitionInjector().getSignalCount();

    const contextLines: string[] = [];
    contextLines.push('[PREFRONTAL CORTEX — Pattern recognition active]');
    contextLines.push(`Generation: ${status.currentGeneration} | Trajectories: ${status.trajectoryCount} | Intuition signals: ${signalCount}`);

    if (lineage && lineage.currentGeneration > 0) {
      const bestGen = brain.getLineageTracker().getBestGeneration(lineage);
      if (bestGen) {
        contextLines.push(`Best generation: ${bestGen.generationNumber} (accuracy: ${((bestGen.evaluation?.metrics?.accuracy ?? 0) * 100).toFixed(0)}%)`);
      }
    }

    if (pendingCount > 0) {
      contextLines.push(`${pendingCount} improvement proposals pending. Use check_improvement_proposals to review.`);
    }

    output.system = output.system || [];
    output.system.push(contextLines.join('\n'));
  } catch (err) {
    console.error('[PFC-ContextHook] Failed to inject PFC context:', err instanceof Error ? err.message : String(err));
  }
}

export function prefrontalIntuitionHook(params: {
  input: any;
  output: any;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}): void {
  const { output } = params;
  try {
    const brain = getPrefrontalCortexBrain();
    if (!brain.isInitialized()) return;

    const message = [
      params.toolName || '',
      JSON.stringify(params.toolArgs || {}),
      (params.input as any)?.task || '',
      (params.input as any)?.command || '',
      (params.input as any)?.text || '',
      (params.input as any)?.message || '',
      typeof (params.input as any)?.messages === 'object'
        ? JSON.stringify((params.input as any).messages?.slice?.(-2) || {})
        : '',
    ].join(' ');

    const signals = brain.detectIntuition(message, params.toolName, params.toolArgs);
    if (signals.length === 0) return;

    const intuitionContext = brain.generateIntuitionContext(signals);
    if (!intuitionContext) return;

    output.system = output.system || [];
    output.system.push(intuitionContext);
  } catch (err) {
    console.error('[PFC-IntuitionHook] Failed to inject intuition signal:', err instanceof Error ? err.message : String(err));
  }
}
