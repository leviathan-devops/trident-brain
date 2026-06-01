/**
 * your-brain-store.ts
 *
 * TEMPLATE — Persistent JSON file store (optional).
 * Only needed if your brain requires cross-session persistence.
 * If you only need in-memory session state, use StateStore instead.
 *
 * Copy the pattern from cortex-store.ts (PFC's store) and adapt.
 * Key patterns:
 *   - JSON file persistence with atomic writes (.tmp → rename)
 *   - Map-based in-memory caches for O(1) access
 *   - Dirty-bit tracking with auto-persist timer
 *   - Schema versioning for migration
 *   - Singleton factory
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ExampleRecord, ExampleConfig } from './types.js';  // [EDIT] Import your types

const SCHEMA_VERSION = 1;

interface StoreData {
  schemaVersion: number;
  // [EDIT] Define your store's data shape
  records: Record<string, ExampleRecord>;
  config: ExampleConfig | null;
  lastPersisted: number;
}

export class YourBrainStore {
  private storePath: string;
  private data: StoreData;
  private dirty = false;
  private persistTimer: ReturnType<typeof setInterval> | null = null;

  constructor(storePath?: string) {
    this.storePath = storePath || path.join(os.homedir(), '.local/share/opencode/kraken-hive/your-brain.json');
    this.data = {
      schemaVersion: SCHEMA_VERSION,
      records: {},
      config: null,
      lastPersisted: 0,
    };
  }

  initialize(): void {
    this.loadFromDisk();
    this.startAutoPersist();
    console.log('[YourBrainStore] Initialized — JSON file store');
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.storePath)) {
        const dir = path.dirname(this.storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return;
      }
      const raw = fs.readFileSync(this.storePath, 'utf-8');
      const parsed = JSON.parse(raw);
      // [EDIT] Load your data keys
      if (parsed.records) this.data.records = parsed.records;
      if (parsed.config) this.data.config = parsed.config;
    } catch (err: any) {
      console.error('[YourBrainStore] Load error:', err.message);
    }
  }

  persist(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpPath = this.storePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify({ schemaVersion: SCHEMA_VERSION, records: this.data.records, config: this.data.config, lastPersisted: Date.now() }));
      fs.renameSync(tmpPath, this.storePath);
      this.dirty = false;
    } catch (err: any) {
      console.error('[YourBrainStore] Persist error:', err.message);
    }
  }

  private startAutoPersist(): void {
    this.persistTimer = setInterval(() => { if (this.dirty) this.persist(); }, 30000);
  }

  // [EDIT] Add your CRUD methods:

  insertRecord(record: ExampleRecord): void {
    this.data.records[record.id] = record;
    this.dirty = true;
  }

  getRecord(id: string): ExampleRecord | null {
    return this.data.records[id] || null;
  }

  getAllRecords(): ExampleRecord[] {
    return Object.values(this.data.records);
  }

  setConfig(config: ExampleConfig): void {
    this.data.config = config;
    this.dirty = true;
  }

  getConfig(): ExampleConfig | null {
    return this.data.config;
  }

  // [EDIT] Sync-queue methods — only needed if brain uses SyncBridge (Edition 2)

  insertSyncMessage(message: { id: string; type: string; direction: string; payload: Record<string, unknown>; status: string; createdAt: number }): void {
    this.data.records[message.id] = { id: message.id, value: JSON.stringify(message), createdAt: message.createdAt };
    this.dirty = true;
  }

  pollOutgoingMessages(): Array<{ id: string; type: string; payload: Record<string, unknown>; createdAt: number }> {
    return Object.values(this.data.records)
      .filter(r => {
        try { const m = JSON.parse(r.value); return m.direction === 'efferent' && m.status === 'pending'; }
        catch { return false; }
      })
      .map(r => { const m = JSON.parse(r.value); return { id: m.id, type: m.type, payload: m.payload, createdAt: m.createdAt }; });
  }

  markSyncDelivered(id: string): void {
    const msg = this.data.records[id];
    if (msg) {
      try {
        const parsed = JSON.parse(msg.value);
        parsed.status = 'delivered';
        msg.value = JSON.stringify(parsed);
        this.dirty = true;
      } catch { /* skip corrupted */ }
    }
  }

  close(): void {
    if (this.persistTimer) { clearInterval(this.persistTimer); this.persistTimer = null; }
    if (this.dirty) this.persist();
  }
}

let storeInstance: YourBrainStore | null = null;

export function createYourBrainStore(storePath?: string): YourBrainStore {
  if (!storeInstance) storeInstance = new YourBrainStore(storePath);
  return storeInstance;
}

export function getYourBrainStore(): YourBrainStore {
  if (!storeInstance) storeInstance = new YourBrainStore();
  return storeInstance;
}
