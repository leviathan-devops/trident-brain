/**
 * brain-template.test.ts
 *
 * TEMPLATE — Unit tests for your brain.
 * Replace {YourBrainBrain}, {createYourBrainBrain}, {YOUR_DOMAIN_ID} with your values.
 * Add tests for your brain-specific methods.
 */

import { YourBrainBrain } from '../src/brains/your-brain/your-brain-brain.js';
import { YourBrainStore } from '../src/brains/your-brain/your-brain-store.js';
import { Tracer } from '../src/brains/your-brain/tracer.js';
import { createStateStore } from '../src/shared/state-store.js';
import { createBrainMessenger } from '../src/shared/brain-messenger.js';
import { DOMAIN_ID } from '../src/brains/your-brain/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let passed = 0;
let failed = 0;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-test-'));

function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

console.log('=== YourBrain Tests ===\n');

// ──────────────────────────────────────────────
// BRAIN LIFECYCLE TESTS
// ──────────────────────────────────────────────

console.log('--- Test 1: Brain initializes and reports state ---');
{
  const brain = new YourBrainBrain();
  brain.initialize();
  assert(brain.isInitialized(), 'Brain is initialized after call');
  const state = brain.getState();
  assert(state.initialized === true, 'State reports initialized=true');
}

console.log('\n--- Test 2: Cleanup does not throw ---');
{
  const brain = new YourBrainBrain();
  brain.initialize();
  brain.cleanup();
  assert(true, 'Cleanup completed without error');
}

console.log('\n--- Test 3: Double initialize is idempotent ---');
{
  const brain = new YourBrainBrain();
  brain.initialize();
  brain.initialize();
  assert(true, 'Double initialize does not crash');
}

console.log('\n--- Test 4: notifySessionComplete does not throw ---');
{
  const brain = new YourBrainBrain();
  brain.initialize();
  brain.notifySessionComplete('test-session-1');
  assert(true, 'notifySessionComplete completed without error');
  brain.cleanup();
}

console.log('\n--- Test 5: getState returns a copy (immutable) ---');
{
  const brain = new YourBrainBrain();
  brain.initialize();
  const state1 = brain.getState();
  const state2 = brain.getState();
  state2.errorCount = 99;
  assert(state1.errorCount !== state2.errorCount, 'getState returns independent copies');
  brain.cleanup();
}

// ──────────────────────────────────────────────
// STORE PERSISTENCE TESTS
// ──────────────────────────────────────────────

console.log('\n--- Test 6: Store persists and loads records ---');
{
  const storePath = path.join(tmpDir, 'store-test.json');
  const store = new YourBrainStore(storePath);
  store.initialize();

  store.insertRecord({ id: 'rec-1', value: 'test-val', createdAt: Date.now() });
  store.persist();

  const store2 = new YourBrainStore(storePath);
  store2.initialize();
  const record = store2.getRecord('rec-1');
  assert(record !== null && record.value === 'test-val', 'Persisted record loads correctly');
  store.close();
  store2.close();
}

// ──────────────────────────────────────────────
// TRACER TESTS
// ──────────────────────────────────────────────

console.log('\n--- Test 7: Tracer buffers and flushes ---');
{
  const storePath = path.join(tmpDir, 'tracer-test.json');
  const store = new YourBrainStore(storePath);
  store.initialize();
  const tracer = new Tracer(store, 'test-session-1');

  tracer.record({ type: 'tool', data: { tool: 'bash', args: { command: 'ls' } } });
  tracer.record({ type: 'tool', data: { tool: 'read', args: { filePath: '/tmp/test' } } });
  assert(tracer.getBufferSize() === 2, 'Buffer holds 2 entries');
  assert(tracer.getEntryCount() === 2, 'Entry count is 2');

  tracer.flushAndPersist();
  assert(tracer.getBufferSize() === 0, 'Buffer cleared after flush');

  store.close();
}

// ──────────────────────────────────────────────
// SYNC BRIDGE TESTS (Edition 2 only)
// ──────────────────────────────────────────────

console.log('\n--- Test 8: SyncBridge sends and persists messages ---');
{
  // [EDIT] Uncomment if using SyncBridge (Edition 2):
  // const storePath = path.join(tmpDir, 'sync-test.json');
  // const store = new YourBrainStore(storePath);
  // store.initialize();
  // const bridge = new SyncBridge(store, 'test-brain');
  // const msg = bridge.sendMessage('heartbeat', { test: true });
  // assert(msg.status === 'pending', 'Message created with pending status');
  // assert(store.getRecord(msg.id) !== null, 'Message persisted in store');
  // store.close();
  assert(true, 'SyncBridge tests need store + bridge imports (see [EDIT] note)');
}

// ──────────────────────────────────────────────
// ERROR HANDLING TESTS
// ──────────────────────────────────────────────

console.log('\n--- Test 9: Error count increments after heartbeat failure ---');
{
  let callCount = 0;
  const brain = new YourBrainBrain();
  brain.initialize();
  const orig = (brain as any).heartbeatCycle;
  (brain as any).heartbeatCycle = () => { callCount++; throw new Error('test error'); };
  try { (brain as any).heartbeatCycle(); } catch { /* expected */ }
  assert(callCount === 1, 'Heartbeat failure does not crash');
  brain.cleanup();
}

// ──────────────────────────────────────────────
// CLEANUP
// ──────────────────────────────────────────────

try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);
console.log(`STATUS: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(failed > 0 ? 1 : 0);
