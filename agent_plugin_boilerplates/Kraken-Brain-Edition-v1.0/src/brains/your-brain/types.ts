/**
 * types.ts
 *
 * TEMPLATE — Define your brain's state interface, domain types, and operational constants.
 *
 * Replace all {YOUR_BRAIN_NAME}, {YOUR_BRAIN_ID}, {YOUR_DOMAIN_ID} and {YOUR_BRAIN_LABEL}
 * with your actual brain values.
 */

// ──────────────────────────────────────────────
// BRAIN STATE — Every brain has a state interface
// ──────────────────────────────────────────────

// [EDIT] Define YOUR brain's runtime state shape
export interface YourBrainState {
  initialized: boolean;
  connected: boolean;
  lastActivityAt: number;
  errorCount: number;
  // [EDIT] Add your brain-specific state fields
  exampleCount: number;
}

// [EDIT] Define initial/default state
export const DEFAULT_YOUR_BRAIN_STATE: YourBrainState = {
  initialized: false,
  connected: false,
  lastActivityAt: 0,
  errorCount: 0,
  exampleCount: 0,
};

// ──────────────────────────────────────────────
// DOMAIN TYPES — Brain-specific data types
// ──────────────────────────────────────────────

// [EDIT] Define your brain's data types

export interface ExampleRecord {
  id: string;
  value: string;
  createdAt: number;
}

export interface ExampleConfig {
  threshold: number;
  intervalMs: number;
}

// ──────────────────────────────────────────────
// OPERATIONAL CONSTANTS
// ──────────────────────────────────────────────

export const BRAIN_ID = '{YOUR_BRAIN_ID}';               // [EDIT] e.g., "kraken-prefrontal"
export const DOMAIN_ID = '{YOUR_DOMAIN_ID}';              // [EDIT] e.g., "prefrontal-state"
export const BRAIN_LABEL = '{YOUR_BRAIN_LABEL}';          // [EDIT] e.g., "Prefrontal Cortex"
export const HEARTBEAT_INTERVAL_MS = 60000;               // [EDIT] How often to run internal maintenance
export const MAX_ERRORS_BEFORE_WARN = 10;                 // [EDIT] Error threshold for warnings
