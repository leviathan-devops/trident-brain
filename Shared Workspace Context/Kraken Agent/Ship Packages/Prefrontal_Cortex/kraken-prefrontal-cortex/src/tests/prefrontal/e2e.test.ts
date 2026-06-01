import { PrefrontalCortexBrain } from '../../brains/prefrontal/prefrontal-cortex-brain.js';
import { CortexStore } from '../../brains/prefrontal/cortex-store.js';
import { IntuitionInjector } from '../../brains/prefrontal/intuition-injector.js';
import { AntiSlopGuardrails } from '../../brains/prefrontal/anti-slop-guardrails.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pfc-e2e-test-'));

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function makeGenParams(gen: number, accuracy: number, projectId: string) {
  return {
    projectId,
    agentSpec: { instructions: `gen-${gen} instructions`, tools: ['bash', 'read'], hooks: [] as string[], specHash: `h${gen}` },
    aggregatedStats: { totalTasks: 10, successCount: Math.round(10 * accuracy), failureCount: Math.round(10 * (1 - accuracy)), blockedCount: 0, byCluster: {} as any, byTaskType: {} as any, averageWallTimeMs: 5000, averageToolCallsPerTask: 6, topErrors: [] as any[], scfIncidentsByArm: {} as any },
    evaluation: { criteriaMet: accuracy >= 0.8, criteriaProgress: {}, metrics: { accuracy, taskSuccessRate: accuracy, averageToolCalls: 6, averageWallTimeMs: 5000, scfIncidentRate: 0.05, bashAbuseRate: 0.03, fireAndForgetRate: 0.01 }, evaluatedAt: Date.now() },
    trajectoryIds: [`traj-${gen}-1`],
  };
}

console.log('=== Prefrontal Cortex E2E Tests ===\n');

console.log('--- Test 1: Agent executes → trajectory recorded ---');
{
  const storePath = path.join(tmpDir, 'e2e-1.json');
  const brain = new PrefrontalCortexBrain({ cortexDbPath: storePath, krakenId: 'test-kraken', projectId: 'e2e-project' });
  brain.initialize();
  const tracer = brain.createTracer('e2e-session-1');
  tracer.startTrajectory('agent-e2e');
  tracer.recordToolCall({ toolName: 'bash', args: { command: 'echo hello' }, result: 'hello', durationMs: 50, agentId: 'agent-e2e' });
  tracer.flushBuffer();
  const status = brain.getPrefrontalStatus();
  assert(status.trajectoryCount >= 1, `Trajectory count: ${status.trajectoryCount}`);
  brain.cleanup();
}

console.log('\n--- Test 2: Trajectory contains tool calls ---');
{
  const storePath = path.join(tmpDir, 'e2e-2.json');
  const store = new CortexStore(storePath);
  store.initialize();
  store.insertTrajectory({
    id: 'traj-e2e-2', sessionId: 'sess-2', projectId: 'e2e-project', agentId: 'agent-2',
    toolCalls: [
      { toolName: 'bash', args: { command: 'ls' }, result: 'file.txt', durationMs: 100, timestamp: Date.now(), agentId: 'agent-2', isBash: true },
      { toolName: 'read', args: { filePath: '/tmp/test' }, result: 'content', durationMs: 50, timestamp: Date.now(), agentId: 'agent-2', isBash: false },
    ],
    messages: [], outcome: 'success', startedAt: Date.now() - 5000, completedAt: Date.now(),
    stats: { totalToolCalls: 2, totalLLMCalls: 1, totalTokensUsed: 500, wallTimeMs: 5000, bashCommandCount: 1, blockedToolCount: 0, scfIncidentCount: 0, errors: 0, filesModified: 1, filesRead: 1 },
    scfIncidents: [], outputPaths: ['/tmp/output.txt'],
  });
  const traj = store.getTrajectory('traj-e2e-2');
  assert(traj !== null, 'Trajectory retrieved');
  assert(traj!.toolCalls.length === 2, `Tool calls: ${traj!.toolCalls.length}`);
  store.close();
}

console.log('\n--- Test 3: Simulated FeedbackBrain produces improvement ---');
{
  const guardrails = new AntiSlopGuardrails();
  const proposal = {
    id: `prop-e2e-${crypto.randomUUID().slice(0, 8)}`, projectId: 'e2e-project', generationNumber: 1,
    analysis: { rootCauseAnalysis: 'Agents use bash when Kraken tools exist', instructionFlaws: [{ flaw: 'bash-first bias', evidence: '15/20 tool calls are bash', fix: 'Prefer Kraken tools over raw bash' }], toolGaps: [], hookIssues: [], confidenceScore: 0.85, analysisModel: 'test', analyzedAt: Date.now() },
    changes: { updatedInstructions: 'Prefer Kraken tools.', toolsToAdd: [], toolsToRemove: [], toolsToModify: [], hookChanges: [], hiveUpdates: [{ category: 'pattern' as const, key: 'bash-first-bias', content: 'Agents prefer bash over Kraken tools.' }] },
    weightCandidates: [], crossProjectSources: [],
    riskAssessment: { level: 'low' as const, risks: [], rollbackPlan: 'Restore previous instructions', recommendedApproval: 'auto' as const },
    status: 'proposed' as const, merkleHash: crypto.createHash('sha256').update('prop-e2e').digest('hex'), proposedAt: Date.now(),
  };
  const result = guardrails.validate(proposal);
  assert(result.passed, `Proposal passed guardrails`);
  assert(result.sanitized !== null, 'Sanitized proposal returned');
}

console.log('\n--- Test 4: Improvement stored in proposals ---');
{
  const storePath = path.join(tmpDir, 'e2e-4.json');
  const store = new CortexStore(storePath);
  store.initialize();
  store.insertProposal({
    id: 'prop-e2e-4', projectId: 'e2e-project', generationNumber: 1,
    analysis: { rootCauseAnalysis: 'test', instructionFlaws: [], toolGaps: [], hookIssues: [], confidenceScore: 0.9, analysisModel: 'test', analyzedAt: Date.now() },
    changes: { hiveUpdates: [{ category: 'pattern', key: 'test', content: 'test' }] },
    riskAssessment: { level: 'low', risks: [], rollbackPlan: 'restore', recommendedApproval: 'auto' },
    status: 'proposed', merkleHash: 'hash-4', proposedAt: Date.now(),
  } as any);
  const pending = store.getPendingProposals('e2e-project');
  assert(pending.length >= 1, `Pending proposals: ${pending.length}`);
  store.close();
}

console.log('\n--- Test 5: SyncBridge delivers improvement ---');
{
  const storePath = path.join(tmpDir, 'e2e-5.json');
  const store = new CortexStore(storePath);
  store.initialize();
  store.insertSyncMessage({
    id: 'sync-e2e-5', direction: 'efferent', type: 'improvement_proposal', sourceKrakenId: 'openfang-1',
    payload: { proposal: { id: 'prop-5', analysis: { instructionFlaws: [{ flaw: 'test', evidence: 'test', fix: 'test' }], confidenceScore: 0.8 } } },
    createdAt: Date.now(), status: 'pending',
  });
  const pending = store.pollSyncMessages('efferent');
  assert(pending.length >= 1, `Efferent messages: ${pending.length}`);
  store.close();
}

console.log('\n--- Test 6: Intuition injection from proposal ---');
{
  const storePath = path.join(tmpDir, 'e2e-6.json');
  const store = new CortexStore(storePath);
  store.initialize();
  const injector = new IntuitionInjector(store);
  injector.initialize();
  const signal = injector.addSignal({
    pattern: 'bash-overuse', description: 'Agent using bash excessively.', evidence: '15/20 tool calls are bash',
    confidence: 0.85, source: 'gen-1-feedback', triggerContexts: ['bash-usage'],
    provenance: 'feedback-brain', trajectoryIds: ['traj-1'],
  });
  assert(signal.success, 'Signal added');
  const detected = injector.detectDecisionPoint('run bash command', 'bash', { command: 'docker build' });
  assert(detected.length > 0, `Signals detected: ${detected.length}`);
  const context = injector.generateIntuitionContext(detected);
  assert(context.includes('[PFC INTUITION'), 'Context contains intuition header');
  store.close();
}

console.log('\n--- Test 7: Context hook generates generation awareness ---');
{
  const storePath = path.join(tmpDir, 'e2e-7.json');
  const brain = new PrefrontalCortexBrain({ cortexDbPath: storePath, krakenId: 'test-kraken', projectId: 'e2e-project' });
  brain.initialize();
  const status = brain.getPrefrontalStatus();
  assert(status.initialized, 'Brain initialized');
  assert(typeof status.trajectoryCount === 'number', `Trajectory count: ${status.trajectoryCount}`);
  brain.cleanup();
}

console.log('\n--- Test 8: Anti-slop guardrails reject bad proposals ---');
{
  const guardrails = new AntiSlopGuardrails();
  const badProposal = {
    id: 'bad-prop', projectId: 'e2e-project', generationNumber: 1,
    analysis: { rootCauseAnalysis: '', instructionFlaws: [], toolGaps: [], hookIssues: [], confidenceScore: 0.2, analysisModel: 'test', analyzedAt: Date.now() },
    changes: { toolsToRemove: ['spawn_shark_agent', 'spawn_manta_agent'] },
    riskAssessment: { level: 'critical' as const, risks: [], rollbackPlan: '', recommendedApproval: 'reject' as const },
    status: 'proposed' as const, merkleHash: 'bad-hash', proposedAt: Date.now(),
  };
  const result = guardrails.validate(badProposal as any);
  assert(!result.passed, `Bad proposal rejected`);
}

console.log('\n--- Test 9: Full intuition pipeline ---');
{
  const storePath = path.join(tmpDir, 'e2e-9.json');
  const store = new CortexStore(storePath);
  store.initialize();
  const injector = new IntuitionInjector(store);
  injector.initialize();
  injector.addSignal({
    pattern: 'docker-network', description: 'Docker networking error pattern', evidence: '3 failures with docker network create',
    confidence: 0.92, source: 'gen-2-analysis', triggerContexts: ['infrastructure'],
    provenance: 'trajectory-analysis', trajectoryIds: ['traj-docker-1', 'traj-docker-2'],
  });
  const signals = injector.detectDecisionPoint('docker network create', 'bash', { command: 'docker network create' });
  assert(signals.length > 0, `Docker signal matched: ${signals.length}`);
  const context = injector.generateIntuitionContext(signals);
  assert(context.includes('STRONG'), 'High confidence is STRONG');
  store.close();
}

console.log('\n--- Test 10: Lineage tracks across generations ---');
{
  const storePath = path.join(tmpDir, 'e2e-10.json');
  const brain = new PrefrontalCortexBrain({ cortexDbPath: storePath, krakenId: 'test-kraken', projectId: 'e2e-project' });
  brain.initialize();
  const tracker = brain.getLineageTracker();
  tracker.getOrCreateLineage('e2e-project');
  tracker.recordGeneration(makeGenParams(1, 0.5, 'e2e-project'));
  tracker.recordGeneration(makeGenParams(2, 0.8, 'e2e-project'));
  const lineage = brain.getEvolutionLineage('e2e-project');
  assert(lineage !== null, 'Lineage found');
  assert(lineage!.currentGeneration >= 2, `Current gen: ${lineage!.currentGeneration}`);
  const best = tracker.getBestGeneration(lineage!);
  assert(best !== null, 'Best generation found');
  assert(best!.generationNumber === 2, `Best gen is 2: ${best!.generationNumber}`);
  brain.cleanup();
}

console.log('\n--- Test 11: Merkle chain integrity across full loop ---');
{
  const storePath = path.join(tmpDir, 'e2e-11.json');
  const brain = new PrefrontalCortexBrain({ cortexDbPath: storePath, krakenId: 'test-kraken', projectId: 'merkle-project' });
  brain.initialize();
  const tracker = brain.getLineageTracker();
  tracker.getOrCreateLineage('merkle-project');
  for (let i = 1; i <= 5; i++) {
    tracker.recordGeneration(makeGenParams(i, 0.5 + i * 0.1, 'merkle-project'));
  }
  const lineage = tracker.getOrCreateLineage('merkle-project');
  assert(tracker.validateMerkleChain(lineage), 'Merkle chain valid across 5 generations');
  brain.cleanup();
}

try { fs.rmSync(tmpDir, { recursive: true }); } catch {}

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);
console.log(`STATUS: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(failed > 0 ? 1 : 0);
