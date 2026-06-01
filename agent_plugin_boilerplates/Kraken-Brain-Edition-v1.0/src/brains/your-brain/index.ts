/**
 * index.ts — Barrel exports for your brain module.
 * TEMPLATE — Update exports to match your brain's files.
 *
 * This is an EMBEDDED-ONLY brain. No external bridge (no SyncBridge, no OpenFang Hand).
 *
 * Find-and-replace: YourBrain → Your actual brain class name (PascalCase)
 */

export { YourBrainBrain } from './your-brain-brain.js';  // [EDIT] Rename file
export { createYourBrainBrain, getYourBrainBrain } from './your-brain-brain.js';
export { YourBrainStore } from './your-brain-store.js';  // Remove if no store
export { createYourBrainStore, getYourBrainStore } from './your-brain-store.js';

// [EDIT] Add/remove exports for your brain's modules:
//   - types.ts              → always include
//   - your-brain-store.ts   → include if persistent storage needed
//   - your-brain-tracer.ts  → include if recording execution
//   (No sync-bridge — this is the embedded-only edition)

export type { YourBrainState } from './types.js';
export { DEFAULT_YOUR_BRAIN_STATE, BRAIN_ID, DOMAIN_ID, BRAIN_LABEL } from './types.js';
