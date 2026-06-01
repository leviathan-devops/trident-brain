import { LineageTracker } from '../../brains/prefrontal/lineage-tracker.js';
import { CortexStore } from '../../brains/prefrontal/cortex-store.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pfc-lineage-test-'));
const storePath = path.join(tmpDir, 'cortex.json');

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

function makeGenParams(gen: number, accuracy: number) {
  return {
    projectId: `test-proj-${gen}`,
    agentSpec: { instructions: `gen-${gen}`, tools: gen === 1 ? ['bash'] : ['bash', 'read'], hooks: [] as string[], specHash: `h${gen}` },
    aggregatedStats: { totalTasks: 10, successCount: Math.round(10 * accuracy), failureCount: Math.round(10 * (1 - accuracy)), blockedCount: 0, byCluster: {} as any, byTaskType: {} as any, averageWallTimeMs: 5000 - gen * 200, averageToolCallsPerTask: 8 - gen, topErrors: [] as any[], scfIncidentsByArm: {} as any },
    evaluation: { criteriaMet: accuracy >= 0.8, criteriaProgress: {}, metrics: { accuracy, taskSuccessRate: accuracy, averageToolCalls: 8 - gen, averageWallTimeMs: 5000 - gen * 200, scfIncidentRate: 0.1 - gen * 0.01, bashAbuseRate: 0.05 - gen * 0.005, fireAndForgetRate: 0.02 - gen * 0.002 }, evaluatedAt: Date.now() },
    trajectoryIds: [`traj-${gen}-1`, `traj-${gen}-2`],
  };
}

console.log('=== LineageTracker Tests ===\n');

console.log('--- Test 1: getOrCreateLineage creates new lineage ---');
{
  const store = new CortexStore(storePath);
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  const lineage = tracker.getOrCreateLineage('project-1');
  assert(lineage !== null, 'Lineage created');
  assert(lineage.projectId === 'project-1', `Project ID: ${lineage.projectId}`);
  assert(lineage.currentGeneration === 0, `Initial generation: ${lineage.currentGeneration}`);
  store.close();
}

console.log('\n--- Test 2: getOrCreateLineage returns existing ---');
{
  const store = new CortexStore(storePath);
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  const l1 = tracker.getOrCreateLineage('project-1');
  const l2 = tracker.getOrCreateLineage('project-1');
  assert(l1.projectId === l2.projectId, 'Same lineage returned');
  store.close();
}

console.log('\n--- Test 3: recordGeneration appends correctly ---');
{
  const store = new CortexStore(path.join(tmpDir, 'gen-test.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-2');
  const params = makeGenParams(1, 0.7);
  params.projectId = 'project-2';
  const gen = tracker.recordGeneration(params);
  assert(gen !== null, 'Generation recorded');
  assert(gen.generationNumber === 1, `Gen number: ${gen.generationNumber}`);
  const lineage = tracker.getOrCreateLineage('project-2');
  assert(lineage.currentGeneration >= 1, `Current generation: ${lineage.currentGeneration}`);
  store.close();
}

console.log('\n--- Test 4: computeDelta detects tool changes ---');
{
  const store = new CortexStore(path.join(tmpDir, 'delta-test.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-delta');
  const p1 = { ...makeGenParams(1, 0.5), projectId: 'project-delta' };
  const gen1 = tracker.recordGeneration(p1);
  const p2 = { ...makeGenParams(2, 0.7), projectId: 'project-delta' };
  const gen2 = tracker.recordGeneration(p2);
  assert(gen2.deltaFromPrevious !== undefined, 'Delta computed');
  assert(gen2.deltaFromPrevious!.toolsAdded.includes('read'), `Tools added: ${gen2.deltaFromPrevious!.toolsAdded.join(',')}`);
  store.close();
}

console.log('\n--- Test 5: getBestGeneration returns highest accuracy ---');
{
  const store = new CortexStore(path.join(tmpDir, 'best-gen.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-best');
  tracker.recordGeneration({ ...makeGenParams(1, 0.5), projectId: 'project-best' });
  tracker.recordGeneration({ ...makeGenParams(2, 0.8), projectId: 'project-best' });
  tracker.recordGeneration({ ...makeGenParams(3, 0.65), projectId: 'project-best' });
  const lineage = tracker.getOrCreateLineage('project-best');
  const best = tracker.getBestGeneration(lineage);
  assert(best !== null, 'Best generation found');
  assert(best!.generationNumber === 2, `Best gen: ${best!.generationNumber} (accuracy: ${best!.evaluation.metrics.accuracy})`);
  store.close();
}

console.log('\n--- Test 6: synthesizeLearnings aggregates ---');
{
  const store = new CortexStore(path.join(tmpDir, 'synth.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-synth');
  tracker.recordGeneration({ ...makeGenParams(1, 0.6), projectId: 'project-synth' });
  tracker.recordGeneration({ ...makeGenParams(2, 0.8), projectId: 'project-synth' });
  const lineage = tracker.getOrCreateLineage('project-synth');
  const learnings = tracker.synthesizeLearnings(lineage);
  assert(Array.isArray(learnings), `Learnings is array: ${learnings.length}`);
  assert(learnings.length > 0, `Has learnings: ${learnings.length}`);
  store.close();
}

console.log('\n--- Test 7: validateMerkleChain for valid chain ---');
{
  const store = new CortexStore(path.join(tmpDir, 'merkle-valid.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-merkle');
  tracker.recordGeneration({ ...makeGenParams(1, 0.7), projectId: 'project-merkle' });
  const lineage = tracker.getOrCreateLineage('project-merkle');
  const valid = tracker.validateMerkleChain(lineage);
  assert(valid, 'Single-gen chain is valid');
  store.close();
}

console.log('\n--- Test 8: validateMerkleChain detects tampering ---');
{
  const store = new CortexStore(path.join(tmpDir, 'merkle-tamper.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-tamper');
  tracker.recordGeneration({ ...makeGenParams(1, 0.7), projectId: 'project-tamper' });
  tracker.recordGeneration({ ...makeGenParams(2, 0.8), projectId: 'project-tamper' });
  const lineage = tracker.getOrCreateLineage('project-tamper');
  assert(lineage.generations.length >= 2, 'Has 2 generations');
  lineage.generations[0].merkleHash = 'TAMPERED_HASH_0000000000000000000000000000';
  const valid = tracker.validateMerkleChain(lineage);
  assert(!valid, 'Tampered chain detected');
  store.close();
}

console.log('\n--- Test 9: generateContextMd produces markdown ---');
{
  const store = new CortexStore(path.join(tmpDir, 'ctx-md.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-ctx');
  tracker.recordGeneration({ ...makeGenParams(1, 0.8), projectId: 'project-ctx' });
  const lineage = tracker.getOrCreateLineage('project-ctx');
  const md = tracker.generateContextMd(lineage);
  assert(typeof md === 'string', 'Context md is string');
  assert(md.includes('Generation 1'), 'Contains generation info');
  assert(md.includes('Accuracy'), 'Contains accuracy');
  store.close();
}

console.log('\n--- Test 10: Lineage with many generations ---');
{
  const store = new CortexStore(path.join(tmpDir, 'many-gen.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  tracker.getOrCreateLineage('project-many');
  for (let i = 1; i <= 10; i++) {
    tracker.recordGeneration({ ...makeGenParams(i, 0.5 + i * 0.05), projectId: 'project-many' });
  }
  const lineage = tracker.getOrCreateLineage('project-many');
  assert(lineage.currentGeneration >= 10, `10 generations recorded: ${lineage.currentGeneration}`);
  store.close();
}

console.log('\n--- Test 11: maxGenerations exceeded → status capped ---');
{
  const store = new CortexStore(path.join(tmpDir, 'capped.json'));
  store.initialize();
  const tracker = new LineageTracker(store);
  tracker.initialize();
  const lineage = tracker.getOrCreateLineage('project-capped');
  for (let i = 1; i <= 10; i++) {
    tracker.recordGeneration({ ...makeGenParams(i, 0.5 + i * 0.04), projectId: 'project-capped' });
  }
  const finalLineage = tracker.getOrCreateLineage('project-capped');
  assert(finalLineage.status === 'capped', `Status: ${finalLineage.status}`);
  store.close();
}

try { fs.rmSync(tmpDir, { recursive: true }); } catch {}

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);
console.log(`STATUS: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(failed > 0 ? 1 : 0);
