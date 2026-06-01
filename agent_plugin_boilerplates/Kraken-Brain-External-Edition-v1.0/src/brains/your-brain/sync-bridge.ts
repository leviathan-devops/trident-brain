/**
 * sync-bridge.ts
 *
 * TEMPLATE — External communication bridge (optional).
 * Queue-based messaging between an in-process brain and an out-of-process counterpart
 * (e.g., OpenFang Hand, Dragon Server Agent).
 *
 * Pattern: write to JSON queue files → external process polls → external writes responses
 *          → brain polls for responses → process responses
 *
 * Only include if your brain has an out-of-process external counterpart.
 * Remove for embedded-only brains (see Kraken-Brain-Edition-v1.0).
 */

import type { YourBrainStore } from './your-brain-store.js';  // [EDIT] Import your store type
import { BRAIN_LABEL } from './types.js';                     // [EDIT] Update path to your types

// ──────────────────────────────────────────────
// MESSAGE TYPES — Define your external protocol
// ──────────────────────────────────────────────

// [EDIT] Define your bridge message types
export type BridgeMessageType =
  | 'heartbeat'
  | 'register'
  | 'data_available'
  | 'proposal'
  | 'response';

export interface BridgeMessage {
  id: string;
  type: BridgeMessageType;
  direction: 'afferent' | 'efferent';  // afferent = incoming, efferent = outgoing
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed';
  createdAt: number;
  deliveredAt?: number;
}

export interface BridgeStats {
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  lastHeartbeatAt: number;
}

const HEARTBEAT_TIMEOUT_MS = 7200000;  // 2 hours — consider disconnected after this

export class SyncBridge {
  private store: YourBrainStore;
  private brainId: string;
  private connected = false;
  private stats: BridgeStats = { messagesSent: 0, messagesReceived: 0, errors: 0, lastHeartbeatAt: 0 };

  constructor(store: YourBrainStore, brainId: string) {
    this.store = store;
    this.brainId = brainId;
  }

  initialize(): void {
    console.log(`[${BRAIN_LABEL} SyncBridge] Initialized — id=${this.brainId}`);
  }

  // ──────────────────────────────────────────────
  // SEND — Write outgoing messages to queue
  // ──────────────────────────────────────────────

  sendMessage(type: BridgeMessageType, payload: Record<string, unknown>): BridgeMessage {
    const message: BridgeMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      direction: 'efferent',
      payload,
      status: 'pending',
      createdAt: Date.now(),
    };
    // [EDIT] Persist to your store
    this.stats.messagesSent++;
    return message;
  }

  // ──────────────────────────────────────────────
  // HEARTBEAT — Check external connectivity
  // ──────────────────────────────────────────────

  sendHeartbeat(): void {
    this.sendMessage('heartbeat', { brainId: this.brainId, timestamp: Date.now() });
    this.stats.lastHeartbeatAt = Date.now();
  }

  checkConnectivity(): void {
    const elapsed = Date.now() - this.stats.lastHeartbeatAt;
    this.connected = elapsed < HEARTBEAT_TIMEOUT_MS;
  }

  isConnected(): boolean { return this.connected; }

  // ──────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────

  getStats(): BridgeStats { return { ...this.stats }; }
}
