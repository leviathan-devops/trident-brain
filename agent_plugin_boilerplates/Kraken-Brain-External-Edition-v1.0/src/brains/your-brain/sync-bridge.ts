/**
 * sync-bridge.ts
 *
 * TEMPLATE — External communication bridge (optional).
 * Queue-based messaging between an in-process brain and an out-of-process counterpart
 * (e.g., OpenFang Hand, Dragon Server Agent).
 *
 * SIDE: Sends messages via store persistence, polls for responses.
 * Both sides are implemented — just replace the store calls and message types.
 *
 * Only include if your brain has an out-of-process external counterpart.
 * Remove for embedded-only brains (see Kraken-Brain-Edition-v1.0).
 */

import type { YourBrainStore } from './your-brain-store.js';
import { BRAIN_LABEL } from './types.js';

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
  direction: 'afferent' | 'efferent';
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

const HEARTBEAT_TIMEOUT_MS = 7200000;

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

  /**
   * SEND — Persist outgoing message to store queue.
   * The external hand polls the store for pending efferent messages.
   */
  sendMessage(type: BridgeMessageType, payload: Record<string, unknown>): BridgeMessage {
    const message: BridgeMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      direction: 'efferent',
      payload,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.store.insertSyncMessage(message);
    this.stats.messagesSent++;
    return message;
  }

  /**
   * RECEIVE — Poll store for incoming messages from the external hand.
   * The hand writes afferent messages to the store; this brain polls and processes them.
   */
  pollForMessages(): Array<{ id: string; type: string; payload: Record<string, unknown> }> {
    return this.store.pollOutgoingMessages();
  }

  /**
   * RECEIVE — Acknowledge delivery of a processed inbound message.
   */
  markDelivered(id: string): void {
    this.store.markSyncDelivered(id);
    this.stats.messagesReceived++;
  }

  /**
   * RECEIVE — Check for and process inbound proposals.
   * Override this method with your brain's specific processing logic.
   */
  ingestProposals(): void {
    const messages = this.pollForMessages();
    for (const msg of messages) {
      try {
        this.stats.messagesReceived++;
        this.markDelivered(msg.id);
      } catch (err) {
        console.error(`[${BRAIN_LABEL} SyncBridge] Failed to process inbound message ${msg.id}:`, err);
        this.stats.errors++;
      }
    }
  }

  sendHeartbeat(): void {
    this.sendMessage('heartbeat', { brainId: this.brainId, timestamp: Date.now() });
    this.stats.lastHeartbeatAt = Date.now();
  }

  checkConnectivity(): void {
    this.connected = (Date.now() - this.stats.lastHeartbeatAt) < HEARTBEAT_TIMEOUT_MS;
  }

  isConnected(): boolean { return this.connected; }

  getStats(): BridgeStats { return { ...this.stats }; }
}
