/**
 * your-brain-brain.ts
 *
 * TEMPLATE — Brain class. Every Kraken brain follows this structure.
 * Replace all {YOUR_BRAIN_NAME}, {YOUR_BRAIN_ID}, {YOUR_DOMAIN_ID} placeholders.
 *
 * INVARIANT (every brain has):
 *   - Constructor with optional stateStore? and messenger? params
 *   - initialize() with idempotency guard, domain registration, messenger subscription
 *   - isInitialized()
 *   - cleanup() — stop timers, flush, close
 *   - handleBrainMessage() — switch on message.type
 *
 * OPTIONAL (per brain):
 *   - Persistent store (YourBrainStore) — for cross-session data
 *   - SyncBridge — for external (OpenFang) communication
 *   - Recording layer (tracer) — for tool/execution recording
 *   - Agent-facing tools
 *   - Context injection hooks
 */

import { BRAIN_ID, DOMAIN_ID, BRAIN_LABEL, HEARTBEAT_INTERVAL_MS, MAX_ERRORS_BEFORE_WARN,
         type YourBrainState, DEFAULT_YOUR_BRAIN_STATE, type ExampleRecord, type ExampleConfig } from './types.js';
import { type YourBrainStore, createYourBrainStore, getYourBrainStore } from './your-brain-store.js';
import { type StateStore, getStateStore } from '../../shared/state-store.js';
import { type BrainMessenger, getBrainMessenger } from '../../shared/brain-messenger.js';
// [EDIT] Import SyncBridge if external communication needed:
// import { SyncBridge } from './sync-bridge.js';

export class YourBrainBrain {
  private initialized = false;
  private state: YourBrainState;
  private stateStore: StateStore;
  private messenger: BrainMessenger;
  private store: YourBrainStore;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  // [EDIT] Add your brain-specific sub-components:

  constructor(params: { stateStore?: StateStore; messenger?: BrainMessenger } = {}) {
    this.stateStore = params.stateStore || getStateStore();
    this.messenger = params.messenger || getBrainMessenger();
    // [EDIT] Initialize your sub-components:
    this.store = createYourBrainStore();
    this.state = { ...DEFAULT_YOUR_BRAIN_STATE };
  }

  // ──────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────

  initialize(): void {
    if (this.initialized) return;

    // 1. Initialize sub-components
    // [EDIT] Initialize your components:
    // this.store.initialize();

    // 2. Subscribe to brain messenger
    // [EDIT] Use a unique subscription ID: "kraken-your-brain"
    this.messenger.subscribe(BRAIN_ID, this.handleBrainMessage.bind(this));

    // 3. Register state in StateStore
    // [EDIT] Use DOMAIN_ID for domain, BRAIN_ID for ownership
    this.stateStore.set(DOMAIN_ID, 'initialized', true, [BRAIN_ID]);
    this.stateStore.set(DOMAIN_ID, 'brain-id', BRAIN_ID, [BRAIN_ID]);

    // 4. Mark initialized
    this.initialized = true;

    // 5. Start heartbeat interval (runs maintenance every HEARTBEAT_INTERVAL_MS)
    this.heartbeatInterval = setInterval(() => {
      try {
        this.heartbeatCycle();
      } catch (err) {
        console.error(`[${BRAIN_LABEL}] Heartbeat failed:`, err instanceof Error ? err.message : String(err));
        this.state.errorCount++;
      }
    }, HEARTBEAT_INTERVAL_MS);

    console.log(`[${BRAIN_LABEL}] Initialized — domain=${DOMAIN_ID}, id=${BRAIN_ID}`);
  }

  isInitialized(): boolean { return this.initialized; }

  // ──────────────────────────────────────────────
  // HEARTBEAT — Periodic maintenance
  // ──────────────────────────────────────────────

  private heartbeatCycle(): void {
    this.state.lastActivityAt = Date.now();
    // [EDIT] Add periodic tasks:
    // this.store.pruneExpired();
    // If using SyncBridge (Edition 2), uncomment:
    // if (this.syncBridge) { this.syncBridge.sendHeartbeat(); this.syncBridge.ingestProposals(); this.syncBridge.checkConnectivity(); }
  }

  // ──────────────────────────────────────────────
  // BRAIN-SPECIFIC METHODS
  // ──────────────────────────────────────────────

  // [EDIT] Add your brain's public API methods here.
  // These are called from tools, hooks, or other brains.

  getState(): YourBrainState {
    return { ...this.state };
  }

  /**
   * notifySessionComplete — Called by the event hook when a session ends.
   * Flushes any buffered data, reports metrics, then cleanup() is called.
   */
  notifySessionComplete(sessionId: string): void {
    // [EDIT] Flush your sub-components before cleanup:
    // this.tracer?.flushAndPersist();
    console.log(`[${BRAIN_LABEL}] Session ${sessionId} complete`);
  }

  // ──────────────────────────────────────────────
  // BRAIN MESSENGER — Handle inter-brain messages
  // ──────────────────────────────────────────────

  private handleBrainMessage(message: { from: string; to: string; type: string; payload: Record<string, unknown> }): void {
    switch (message.type) {
      case 'sync':
        console.log(`[${BRAIN_LABEL}] Sync from ${message.from}: ${JSON.stringify(message.payload).slice(0, 100)}`);
        break;
      case 'context-inject':
        // [EDIT] Handle context injection from other brains
        break;
      case 'checkpoint':
        // [EDIT] Handle checkpoint/session-complete events
        break;
      default:
        // Unknown message types are safely ignored
        break;
    }
  }

  // ──────────────────────────────────────────────
  // CLEANUP — Stop timers, flush, close
  // ──────────────────────────────────────────────

  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    // [EDIT] Close/flush your sub-components:
    // this.store.close();
    console.log(`[${BRAIN_LABEL}] Cleaned up`);
  }
}

// ──────────────────────────────────────────────
// SINGLETON FACTORY — Every brain has one
// ──────────────────────────────────────────────

let brainInstance: YourBrainBrain | null = null;

export function createYourBrainBrain(params?: { stateStore?: StateStore; messenger?: BrainMessenger }): YourBrainBrain {
  if (!brainInstance) { brainInstance = new YourBrainBrain(params); }
  return brainInstance;
}

export function getYourBrainBrain(): YourBrainBrain {
  if (!brainInstance) { brainInstance = new YourBrainBrain(); }
  return brainInstance;
}
