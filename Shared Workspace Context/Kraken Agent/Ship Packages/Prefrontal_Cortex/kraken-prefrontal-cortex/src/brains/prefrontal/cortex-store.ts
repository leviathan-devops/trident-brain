import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  type ExecutionTrajectory,
  type GenerationRecord,
  type EvolutionLineage,
  type ImprovementProposal,
  type SyncBridgeMessage,
  type KrakenProjectRegistration,
  type FirewallPatternInjection,
} from './types.js';

const CORTEX_SCHEMA_VERSION = 2;

interface CortexData {
  schemaVersion: number;
  trajectories: Map<string, ExecutionTrajectory>;
  trajectoriesBySession: Map<string, string[]>;
  trajectoriesByProject: Map<string, string[]>;
  generationRecords: Map<string, GenerationRecord>;
  lineages: Map<string, EvolutionLineage>;
  proposals: Map<string, ImprovementProposal>;
  syncQueue: Map<string, SyncBridgeMessage>;
  registrations: Map<string, KrakenProjectRegistration>;
  firewallPatterns: FirewallPatternInjection[];
  nextFwId: number;
  lastPersisted: number;
}

export class CortexStore {
  private storePath: string;
  private data: CortexData;
  private dirty = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(storePath?: string) {
    this.storePath = storePath || path.join(
      os.homedir(),
      '.local/share/opencode/kraken-hive/cortex.json'
    );

    this.data = {
      schemaVersion: CORTEX_SCHEMA_VERSION,
      trajectories: new Map(),
      trajectoriesBySession: new Map(),
      trajectoriesByProject: new Map(),
      generationRecords: new Map(),
      lineages: new Map(),
      proposals: new Map(),
      syncQueue: new Map(),
      registrations: new Map(),
      firewallPatterns: [],
      nextFwId: 1,
      lastPersisted: 0,
    };
  }

  initialize(): void {
    this.loadFromDisk();
    this.startAutoPersist();
    console.log('[CortexStore] Initialized — JSON file store', {
      trajectories: this.data.trajectories.size,
      proposals: this.data.proposals.size,
      signals: this.data.firewallPatterns.length,
    });
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.storePath)) {
        const dir = path.dirname(this.storePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        return;
      }

      const raw = fs.readFileSync(this.storePath, 'utf-8');
      const parsed = JSON.parse(raw);

      if (parsed.schemaVersion !== CORTEX_SCHEMA_VERSION) {
        console.log('[CortexStore] Schema migration from', parsed.schemaVersion, 'to', CORTEX_SCHEMA_VERSION);
      }

      if (parsed.trajectories) {
        for (const [k, v] of Object.entries(parsed.trajectories)) {
          this.data.trajectories.set(k, v as ExecutionTrajectory);
        }
      }
      if (parsed.trajectoriesBySession) {
        for (const [k, v] of Object.entries(parsed.trajectoriesBySession)) {
          this.data.trajectoriesBySession.set(k, v as string[]);
        }
      }
      if (parsed.trajectoriesByProject) {
        for (const [k, v] of Object.entries(parsed.trajectoriesByProject)) {
          this.data.trajectoriesByProject.set(k, v as string[]);
        }
      }
      if (parsed.generationRecords) {
        for (const [k, v] of Object.entries(parsed.generationRecords)) {
          this.data.generationRecords.set(k, v as GenerationRecord);
        }
      }
      if (parsed.lineages) {
        for (const [k, v] of Object.entries(parsed.lineages)) {
          this.data.lineages.set(k, v as EvolutionLineage);
        }
      }
      if (parsed.proposals) {
        for (const [k, v] of Object.entries(parsed.proposals)) {
          this.data.proposals.set(k, v as ImprovementProposal);
        }
      }
      if (parsed.syncQueue) {
        for (const [k, v] of Object.entries(parsed.syncQueue)) {
          this.data.syncQueue.set(k, v as SyncBridgeMessage);
        }
      }
      if (parsed.registrations) {
        for (const [k, v] of Object.entries(parsed.registrations)) {
          this.data.registrations.set(k, v as KrakenProjectRegistration);
        }
      }
      this.data.firewallPatterns = parsed.firewallPatterns || [];
      this.data.nextFwId = parsed.nextFwId || 1;
    } catch (err: any) {
      console.error('[CortexStore] Load error:', err.message);
    }
  }

  private serialize(): object {
    return {
      schemaVersion: CORTEX_SCHEMA_VERSION,
      trajectories: Object.fromEntries(this.data.trajectories),
      trajectoriesBySession: Object.fromEntries(this.data.trajectoriesBySession),
      trajectoriesByProject: Object.fromEntries(this.data.trajectoriesByProject),
      generationRecords: Object.fromEntries(this.data.generationRecords),
      lineages: Object.fromEntries(this.data.lineages),
      proposals: Object.fromEntries(this.data.proposals),
      syncQueue: Object.fromEntries(this.data.syncQueue),
      registrations: Object.fromEntries(this.data.registrations),
      firewallPatterns: this.data.firewallPatterns,
      nextFwId: this.data.nextFwId,
      lastPersisted: Date.now(),
    };
  }

  persist(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = this.storePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(this.serialize()));
      fs.renameSync(tmpPath, this.storePath);
      this.dirty = false;
      this.data.lastPersisted = Date.now();
    } catch (err: any) {
      console.error('[CortexStore] Persist error:', err.message);
    }
  }

  private startAutoPersist(): void {
    this.persistTimer = setInterval(() => {
      if (this.dirty) {
        this.persist();
      }
    }, 30000);
  }

  private markDirty(): void {
    this.dirty = true;
  }

  insertTrajectory(trajectory: ExecutionTrajectory): void {
    this.data.trajectories.set(trajectory.id, trajectory);

    const sessionList = this.data.trajectoriesBySession.get(trajectory.sessionId) || [];
    if (!sessionList.includes(trajectory.id)) {
      sessionList.push(trajectory.id);
      this.data.trajectoriesBySession.set(trajectory.sessionId, sessionList);
    }

    const projectList = this.data.trajectoriesByProject.get(trajectory.projectId) || [];
    if (!projectList.includes(trajectory.id)) {
      projectList.push(trajectory.id);
      this.data.trajectoriesByProject.set(trajectory.projectId, projectList);
    }

    this.markDirty();
  }

  getTrajectory(id: string): ExecutionTrajectory | null {
    return this.data.trajectories.get(id) || null;
  }

  getSessionTrajectories(sessionId: string): ExecutionTrajectory[] {
    const ids = this.data.trajectoriesBySession.get(sessionId) || [];
    return ids.map(id => this.data.trajectories.get(id)).filter(Boolean) as ExecutionTrajectory[];
  }

  getProjectTrajectories(projectId: string, sinceTimestamp?: number): ExecutionTrajectory[] {
    const ids = this.data.trajectoriesByProject.get(projectId) || [];
    const all = ids.map(id => this.data.trajectories.get(id)).filter(Boolean) as ExecutionTrajectory[];
    if (sinceTimestamp) {
      return all.filter(t => t.completedAt > sinceTimestamp);
    }
    return all;
  }

  getTrajectoryCount(projectId?: string): number {
    if (projectId) {
      const ids = this.data.trajectoriesByProject.get(projectId) || [];
      return ids.length;
    }
    return this.data.trajectories.size;
  }

  private genKey(projectId: string, gen: number): string {
    return `${projectId}:${gen}`;
  }

  insertGeneration(record: GenerationRecord): void {
    this.data.generationRecords.set(this.genKey(record.projectId, record.generationNumber), record);
    this.markDirty();
  }

  getGeneration(projectId: string, generationNumber: number): GenerationRecord | null {
    return this.data.generationRecords.get(this.genKey(projectId, generationNumber)) || null;
  }

  getLatestGeneration(projectId: string): GenerationRecord | null {
    let latest: GenerationRecord | null = null;
    for (const [, record] of this.data.generationRecords) {
      if (record.projectId === projectId) {
        if (!latest || record.generationNumber > latest.generationNumber) {
          latest = record;
        }
      }
    }
    return latest;
  }

  getGenerationCount(projectId: string): number {
    let count = 0;
    for (const [, record] of this.data.generationRecords) {
      if (record.projectId === projectId) count++;
    }
    return count;
  }

  upsertLineage(lineage: EvolutionLineage): void {
    this.data.lineages.set(lineage.projectId, lineage);
    this.markDirty();
  }

  getLineage(projectId: string): EvolutionLineage | null {
    return this.data.lineages.get(projectId) || null;
  }

  insertProposal(proposal: ImprovementProposal): void {
    this.data.proposals.set(proposal.id, proposal);
    this.markDirty();
  }

  updateProposalStatus(id: string, status: string, appliedAt?: number): void {
    const proposal = this.data.proposals.get(id);
    if (proposal) {
      proposal.status = status as any;
      if (appliedAt) (proposal as any).appliedAt = appliedAt;
      this.markDirty();
    }
  }

  getPendingProposals(projectId?: string): ImprovementProposal[] {
    const result: ImprovementProposal[] = [];
    for (const [, p] of this.data.proposals) {
      if (p.status === 'proposed') {
        if (!projectId || p.projectId === projectId) {
          result.push(p);
        }
      }
    }
    return result;
  }

  getProposal(id: string): ImprovementProposal | null {
    return this.data.proposals.get(id) || null;
  }

  insertSyncMessage(message: SyncBridgeMessage): void {
    this.data.syncQueue.set(message.id, message);
    this.markDirty();
  }

  pollSyncMessages(direction: string, status: string = 'pending'): SyncBridgeMessage[] {
    const result: SyncBridgeMessage[] = [];
    for (const [, msg] of this.data.syncQueue) {
      if (msg.direction === direction && msg.status === status) {
        result.push(msg);
      }
    }
    return result;
  }

  markSyncDelivered(id: string): void {
    const msg = this.data.syncQueue.get(id);
    if (msg) {
      msg.status = 'delivered' as any;
      msg.deliveredAt = Date.now();
      this.markDirty();
    }
  }

  insertRegistration(reg: KrakenProjectRegistration): void {
    this.data.registrations.set(reg.projectId, reg);
    this.markDirty();
  }

  getRegistrations(): KrakenProjectRegistration[] {
    return Array.from(this.data.registrations.values());
  }

  insertFirewallPattern(pattern: FirewallPatternInjection): void {
    const existing = this.data.firewallPatterns.findIndex(
      p => p.pattern === pattern.pattern && p.patternType === pattern.patternType
    );
    if (existing >= 0) {
      this.data.firewallPatterns[existing] = pattern;
    } else {
      this.data.firewallPatterns.push(pattern);
    }
    this.markDirty();
  }

  getActiveFirewallPatterns(): FirewallPatternInjection[] {
    return this.data.firewallPatterns.filter(p => p.active);
  }

  deactivateFirewallPattern(id: number): void {
    if (id >= 0 && id < this.data.firewallPatterns.length) {
      this.data.firewallPatterns[id].active = false;
      this.markDirty();
    }
  }

  close(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.dirty) {
      this.persist();
    }
  }
}

let cortexStoreInstance: CortexStore | null = null;

export function createCortexStore(storePath?: string): CortexStore {
  if (!cortexStoreInstance) {
    cortexStoreInstance = new CortexStore(storePath);
  }
  return cortexStoreInstance;
}

export function getCortexStore(): CortexStore {
  if (!cortexStoreInstance) {
    cortexStoreInstance = new CortexStore();
  }
  return cortexStoreInstance;
}
