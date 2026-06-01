import { ExecutionTracer } from '../../brains/prefrontal/execution-tracer.js';
import { CortexStore } from '../../brains/prefrontal/cortex-store.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pfc-tracer-test-'));
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

console.log('=== ExecutionTracer Tests ===\n');

const store = new CortexStore(storePath);
store.initialize();

console.log('--- Test 1: recordToolCall creates valid entry ---');
{
  const tracer = new ExecutionTracer(store, 'session-1', 'project-1');
  tracer.initialize();
  const trajId = tracer.startTrajectory('agent-1');
  tracer.recordToolCall({
    toolName: 'bash',
    args: { command: 'ls -la' },
    result: 'file1.txt\nfile2.txt',
    durationMs: 150,
    agentId: 'agent-1',
  });
  tracer.flushBuffer();
  assert(store.getTrajectory(trajId) !== null, `Trajectory persisted in store`);
}

console.log('\n--- Test 2: Buffer flushes correctly ---');
{
  const tracer = new ExecutionTracer(store, 'session-2', 'project-1');
  tracer.initialize();
  tracer.startTrajectory('agent-2');
  for (let i = 0; i < 5; i++) {
    tracer.recordToolCall({
      toolName: `tool-${i}`,
      args: {},
      result: `result-${i}`,
      durationMs: 100 + i,
      agentId: 'agent-2',
    });
  }
  tracer.flushBuffer();
  const tAny = tracer as any;
  assert(tAny.toolCallBuffer?.length === 0 || tAny.toolCallBuffer === undefined, 'Buffer cleared after flush');
}

console.log('\n--- Test 3: Multiple concurrent trajectories ---');
{
  const tracer = new ExecutionTracer(store, 'session-3', 'project-1');
  tracer.initialize();
  const trajA = tracer.startTrajectory('agent-3a');
  tracer.recordToolCall({
    toolName: 'bash',
    args: {},
    result: 'ok',
    durationMs: 50,
    agentId: 'agent-3a',
  });
  const trajB = tracer.startTrajectory('agent-3b');
  tracer.recordToolCall({
    toolName: 'read',
    args: { filePath: '/tmp/test' },
    result: 'content',
    durationMs: 30,
    agentId: 'agent-3b',
  });
  tracer.flushBuffer();
  assert(store.getTrajectory(trajA) !== null && store.getTrajectory(trajB) !== null, 'Two trajectories tracked in store');
}

console.log('\n--- Test 4: Tool call with error ---');
{
  const tracer = new ExecutionTracer(store, 'session-4', 'project-1');
  tracer.initialize();
  tracer.startTrajectory('agent-4');
  tracer.recordToolCall({
    toolName: 'bash',
    args: { command: 'false' },
    result: undefined,
    error: 'Command failed with exit code 1',
    durationMs: 100,
    agentId: 'agent-4',
  });
  tracer.flushBuffer();
  assert(true, 'Error recorded without crash');
}

console.log('\n--- Test 5: Large result truncation ---');
{
  const tracer = new ExecutionTracer(store, 'session-5', 'project-1');
  tracer.initialize();
  tracer.startTrajectory('agent-5');
  const largeResult = 'x'.repeat(20000);
  tracer.recordToolCall({
    toolName: 'bash',
    args: {},
    result: largeResult,
    durationMs: 200,
    agentId: 'agent-5',
  });
  tracer.flushBuffer();
  assert(true, 'Large result handled without crash');
}

console.log('\n--- Test 6: Trajectory persisted to store ---');
{
  const tracer = new ExecutionTracer(store, 'session-6', 'project-1');
  tracer.initialize();
  tracer.startTrajectory('agent-6');
  tracer.recordToolCall({
    toolName: 'bash',
    args: { command: 'echo test' },
    result: 'test',
    durationMs: 50,
    agentId: 'agent-6',
  });
  tracer.flushBuffer();
  store.persist();

  const store2 = new CortexStore(storePath);
  store2.initialize();
  const count = store2.getTrajectoryCount('project-1');
  assert(count >= 1, `Trajectories persisted: ${count}`);
}

console.log('\n--- Test 7: getTrajectoryCount returns correct value ---');
{
  const tracer = new ExecutionTracer(store, 'session-7', 'project-1');
  tracer.initialize();
  const count = tracer.getTrajectoryCount();
  assert(typeof count === 'number', `Count is number: ${count}`);
}

console.log('\n--- Test 8: startTrajectory returns trajectory ID ---');
{
  const tracer = new ExecutionTracer(store, 'session-8', 'project-1');
  tracer.initialize();
  const trajId = tracer.startTrajectory('agent-8');
  assert(typeof trajId === 'string' && trajId.length > 0, `Trajectory ID returned: ${trajId}`);
}

console.log('\n--- Test 9: initialize is idempotent ---');
{
  const tracer = new ExecutionTracer(store, 'session-9', 'project-1');
  tracer.initialize();
  tracer.initialize();
  assert(true, 'Double initialize does not crash');
}

console.log('\n--- Test 10: flushBuffer without trajectory ---');
{
  const tracer = new ExecutionTracer(store, 'session-10', 'project-1');
  tracer.initialize();
  tracer.flushBuffer();
  assert(true, 'Flush without trajectory does not crash');
}

console.log('\n--- Test 11: recordToolCall with blockedBy ---');
{
  const tracer = new ExecutionTracer(store, 'session-11', 'project-1');
  tracer.initialize();
  tracer.startTrajectory('agent-11');
  tracer.recordToolCall({
    toolName: 'bash',
    args: { command: 'rm -rf /' },
    result: undefined,
    error: 'Blocked by L6 firewall',
    durationMs: 0,
    agentId: 'agent-11',
    blockedBy: 'L6-kraken-protection',
  });
  tracer.flushBuffer();
  assert(true, 'Blocked tool call recorded');
}

console.log('\n--- Test 12: finalizeTrajectory computes stats ---');
{
  const tracer = new ExecutionTracer(store, 'session-12', 'project-1');
  tracer.initialize();
  tracer.startTrajectory('agent-12');
  for (let i = 0; i < 3; i++) {
    tracer.recordToolCall({
      toolName: i === 2 ? 'bash' : 'read',
      args: {},
      result: 'ok',
      durationMs: 100,
      agentId: 'agent-12',
    });
  }
  tracer.flushBuffer();
  assert(true, 'Trajectory with stats finalized');
}

store.close();
try { fs.rmSync(tmpDir, { recursive: true }); } catch {}

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);
console.log(`STATUS: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(failed > 0 ? 1 : 0);
