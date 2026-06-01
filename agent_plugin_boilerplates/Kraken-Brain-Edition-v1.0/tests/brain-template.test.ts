/**
 * brain-template.test.ts
 *
 * TEMPLATE — Unit tests for your brain.
 * Replace {YourBrainBrain}, {createYourBrainBrain}, {YOUR_DOMAIN_ID} with your values.
 */

import { YourBrainBrain } from '../src/brains/your-brain/your-brain-brain.js';
import { createStateStore } from '../src/shared/state-store.js';
import { createBrainMessenger } from '../src/shared/brain-messenger.js';
import { DOMAIN_ID } from '../src/brains/your-brain/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

console.log('=== YourBrain Tests ===\n');

// [EDIT] Add your brain's tests

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

// [EDIT] Add more tests

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);
console.log(`STATUS: ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(failed > 0 ? 1 : 0);
