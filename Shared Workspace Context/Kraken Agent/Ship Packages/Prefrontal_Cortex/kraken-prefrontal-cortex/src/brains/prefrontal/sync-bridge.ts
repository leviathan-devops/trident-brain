import crypto from 'node:crypto';
import { type SyncBridgeMessage, type SyncDirection, type SyncMessageType, type KrakenProjectRegistration } from './types.js';
import { type CortexStore } from './cortex-store.js';

export class SyncBridge {
  private cortexStore: CortexStore;
  private krakenId: string;
  private connected: boolean = false;
  private lastHeartbeat: number = 0;
  private messagesSent: number = 0;
  private messagesReceived: number = 0;

  constructor(cortexStore: CortexStore, krakenId: string) {
    this.cortexStore = cortexStore;
    this.krakenId = krakenId;
  }

  initialize(): void {
    this.checkOpenfangConnectivity();
    console.log(`[SyncBridge] Initialized for kraken ${this.krakenId} (openfang=${this.connected})`);
  }

  sendMessage(type: SyncMessageType, payload: Record<string, unknown>, direction: SyncDirection = 'efferent', correlationId?: string): SyncBridgeMessage {
    const message: SyncBridgeMessage = {
      id: `sync-${crypto.randomUUID().slice(0, 8)}-${Date.now()}`,
      direction,
      type,
      sourceKrakenId: this.krakenId,
      payload,
      correlationId,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.cortexStore.insertSyncMessage(message);
    this.messagesSent++;
    console.log(`[SyncBridge] Sent ${direction} ${type} (${message.id})`);
    return message;
  }

  pollForMessages(direction: SyncDirection): SyncBridgeMessage[] {
    const messages = this.cortexStore.pollSyncMessages(direction);
    this.messagesReceived += messages.length;
    return messages;
  }

  markDelivered(messageId: string): void {
    this.cortexStore.markSyncDelivered(messageId);
  }

  registerWithOpenfang(registration: KrakenProjectRegistration): SyncBridgeMessage {
    return this.sendMessage('register_project', {
      projectId: registration.projectId,
      cortexDbPath: registration.cortexDbPath,
      projectRoot: registration.projectRoot,
      modifiableFiles: registration.modifiableFiles,
      autoApplyImprovements: registration.autoApplyImprovements,
      maxAutoApplyRisk: registration.maxAutoApplyRisk,
    }, 'afferent');
  }

  reportTrajectoriesAvailable(projectId: string, count: number): SyncBridgeMessage {
    return this.sendMessage('new_trajectories_available', {
      projectId,
      trajectoryCount: count,
      reportedAt: Date.now(),
    }, 'afferent');
  }

  ingestProposals(): SyncBridgeMessage[] {
    const messages = this.pollForMessages('efferent');
    const proposals = messages.filter(m => m.type === 'improvement_proposal');
    for (const msg of proposals) {
      this.markDelivered(msg.id);
    }
    return proposals;
  }

  checkOpenfangConnectivity(): boolean {
    const messages = this.cortexStore.pollSyncMessages('efferent');
    const recentHeartbeats = messages.filter(m => m.type === 'heartbeat');

    if (recentHeartbeats.length > 0) {
      const latest = recentHeartbeats[recentHeartbeats.length - 1];
      this.lastHeartbeat = latest.createdAt;
      this.connected = (Date.now() - this.lastHeartbeat) < 7200000;
    } else {
      this.connected = false;
    }

    return this.connected;
  }

  sendHeartbeat(): SyncBridgeMessage {
    return this.sendMessage('heartbeat', {
      krakenId: this.krakenId,
      timestamp: Date.now(),
      trajectoryCount: this.cortexStore.getTrajectoryCount(),
    }, 'afferent');
  }

  reportImprovementApplied(proposalId: string, projectId: string): SyncBridgeMessage {
    return this.sendMessage('improvement_applied', {
      proposalId,
      projectId,
      appliedAt: Date.now(),
    }, 'afferent');
  }

  reportImprovementRejected(proposalId: string, projectId: string, reason: string): SyncBridgeMessage {
    return this.sendMessage('improvement_rejected', {
      proposalId,
      projectId,
      reason,
      rejectedAt: Date.now(),
    }, 'afferent');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStats(): { messagesSent: number; messagesReceived: number; connected: boolean; lastHeartbeat: number } {
    return {
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      connected: this.connected,
      lastHeartbeat: this.lastHeartbeat,
    };
  }
}
