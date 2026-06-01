/**
 * index.ts — Barrel exports for your brain module.
 * TEMPLATE — Update exports to match your brain's files.
 *
 * Find-and-replace: YourBrain → Your actual brain class name (PascalCase)
 */

export { YourBrainBrain } from './your-brain-brain.js';  // [EDIT] Rename file
export { createYourBrainBrain, getYourBrainBrain } from './your-brain-brain.js';
export { YourBrainStore } from './your-brain-store.js';  // Remove if no store
export { createYourBrainStore, getYourBrainStore } from './your-brain-store.js';
export { SyncBridge } from './sync-bridge.js';            // Remove if embedded-only

// [EDIT] Add/remove exports for your brain's modules:
//   - types.ts         → always include
//   - your-brain-store.ts → include if persistent storage needed
//   - your-brain-tracer.ts  → include if recording execution
//   - sync-bridge.ts   → include if external communication needed

export type { YourBrainState } from './types.js';
export { DEFAULT_YOUR_BRAIN_STATE, BRAIN_ID, DOMAIN_ID, BRAIN_LABEL } from './types.js';
