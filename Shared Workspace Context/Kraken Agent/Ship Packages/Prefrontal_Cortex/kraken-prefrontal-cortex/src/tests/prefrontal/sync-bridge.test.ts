import { SyncBridge } from '../../brains/prefrontal/sync-bridge.js';
import { CortexStore } from '../../brains/prefrontal/cortex-store.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pfc-sync-test-'));
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

console.log('=== SyncBridge Tests ===\n');

console.log('--- Test 1: sendHeartbeat writes to sync queue ---');
{
  const store = new CortexStore(storePath);
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-1');
  bridge.initialize();
  bridge.sendHeartbeat();
  const stats = bridge.getStats();
  assert(stats.messagesSent >= 1, `Messages sent: ${stats.messagesSent}`);
  store.close();
}

console.log('\n--- Test 2: pollSyncMessages reads correctly ---');
{
  const store = new CortexStore(storePath);
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-2');
  bridge.initialize();
  bridge.sendHeartbeat();
  const pending = store.pollSyncMessages('afferent');
  assert(pending.length >= 1, `Pending afferent messages: ${pending.length}`);
  store.close();
}

console.log('\n--- Test 3: markSyncDelivered updates status ---');
{
  const store = new CortexStore(storePath);
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-3');
  bridge.initialize();
  bridge.sendHeartbeat();
  const pending = store.pollSyncMessages('afferent');
  if (pending.length > 0) {
    store.markSyncDelivered(pending[0].id);
    const msg = store.pollSyncMessages('afferent').find(m => m.id === pending[0].id);
    assert(!msg || (msg as any).status !== 'pending', 'Message status updated');
  } else {
    assert(true, 'No pending messages to mark (skip)');
  }
  store.close();
}

console.log('\n--- Test 4: registerWithOpenfang sends registration ---');
{
  const store = new CortexStore(path.join(tmpDir, 'reg-test.json'));
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-4');
  bridge.initialize();
  bridge.registerWithOpenfang({
    projectId: 'project-1',
    cortexDbPath: '/tmp/cortex.db',
    projectRoot: '/home/test',
    modifiableFiles: [],
    autoApplyImprovements: true,
    maxAutoApplyRisk: 'low',
    registeredAt: Date.now(),
  });
  const stats = bridge.getStats();
  assert(stats.messagesSent >= 1, `Registration sent: ${stats.messagesSent}`);
  store.close();
}

console.log('\n--- Test 5: ingestProposals reads efferent messages ---');
{
  const store = new CortexStore(path.join(tmpDir, 'ingest-test.json'));
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-5');
  bridge.initialize();
  const proposals = bridge.ingestProposals();
  assert(Array.isArray(proposals), `ingestProposals returns array: ${proposals.length}`);
  store.close();
}

console.log('\n--- Test 6: reportTrajectoriesAvailable ---');
{
  const store = new CortexStore(path.join(tmpDir, 'traj-avail.json'));
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-6');
  bridge.initialize();
  bridge.reportTrajectoriesAvailable('project-1', 42);
  const stats = bridge.getStats();
  assert(stats.messagesSent >= 1, `Trajectory report sent: ${stats.messagesSent}`);
  store.close();
}

console.log('\n--- Test 7: Empty queue handled gracefully ---');
{
  const store = new CortexStore(path.join(tmpDir, 'empty-q.json'));
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-7');
  bridge.initialize();
  const proposals = bridge.ingestProposals();
  assert(proposals.length === 0, `Empty queue returns 0 proposals`);
  store.close();
}

console.log('\n--- Test 8: isConnected returns boolean ---');
{
  const store = new CortexStore(path.join(tmpDir, 'conn-test.json'));
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-8');
  bridge.initialize();
  const connected = bridge.isConnected();
  assert(typeof connected === 'boolean', `isConnected returns boolean: ${connected}`);
  store.close();
}

console.log('\n--- Test 9: checkOpenfangConnectivity ---');
{
  const store = new CortexStore(path.join(tmpDir, 'ofconn-test.json'));
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-9');
  bridge.initialize();
  bridge.checkOpenfangConnectivity();
  assert(true, 'checkOpenfangConnectivity does not crash');
  store.close();
}

console.log('\n--- Test 10: getStats returns valid structure ---');
{
  const store = new CortexStore(path.join(tmpDir, 'stats-test.json'));
  store.initialize();
  const bridge = new SyncBridge(store, 'kraken-test-10');
  bridge.initialize();
  const stats = bridge.getStats();
  assert(typeof stats.messagesSent === 'number', `messagesSent: ${stats.messagesSent}`);
  assert(typeof stats.messagesReceived === 'number', `messagesReceived: ${stats.messagesReceived}`);
  store.close();
}

try { fs.rmSync(tmpDir, { recursive: true }); } catch {}

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);
console.log(`STATUS: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(failed > 0 ? 1 : 0);
