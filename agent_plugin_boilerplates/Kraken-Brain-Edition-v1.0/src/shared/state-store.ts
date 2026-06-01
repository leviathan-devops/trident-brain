/**
 * src/shared/state-store.ts
 *
 * Session-scoped state store with domain ownership.
 * BOILERPLATE — Zero modifications needed. Copy as-is.
 */

import { canWrite, type DomainId, type BrainId } from './domain-ownership.js';

interface StateEntry<T = unknown> {
  value: T;
  version: number;
  lastModified: number;
  ownedBy: BrainId[];
}

export class StateStore {
  private data: Map<string, StateEntry> = new Map();
  private versions: Map<string, number> = new Map();
  private watchers: Map<string, Set<(key: string, value: unknown) => void>> = new Map();

  get(domain: DomainId, key: string): unknown | undefined {
    const entry = this.data.get(`${domain}:${key}`);
    return entry?.value;
  }

  set(domain: DomainId, key: string, value: unknown, ownedBy: BrainId[] = []): void {
    const fullKey = `${domain}:${key}`;
    const existing = this.data.get(fullKey);
    this.data.set(fullKey, { value, version: existing ? existing.version + 1 : 1, lastModified: Date.now(), ownedBy });
    this.versions.set(fullKey, existing ? existing.version + 1 : 1);
    this.notifyWatchers(domain, key, value);
  }

  canModify(domain: DomainId, brain: BrainId): boolean {
    return canWrite(domain, brain);
  }

  delete(domain: DomainId, key: string): boolean {
    return this.data.delete(`${domain}:${key}`);
  }

  clearDomain(domain: DomainId): void {
    const prefix = `${domain}:`;
    for (const key of this.data.keys()) {
      if (key.startsWith(prefix)) this.data.delete(key);
    }
  }

  cleanup(): void {
    this.data.clear();
    this.versions.clear();
    this.watchers.clear();
  }

  watch(domain: DomainId, key: string, callback: (key: string, value: unknown) => void): () => void {
    const fullKey = `${domain}:${key}`;
    if (!this.watchers.has(fullKey)) this.watchers.set(fullKey, new Set());
    this.watchers.get(fullKey)!.add(callback);
    return () => { this.watchers.get(fullKey)?.delete(callback); };
  }

  private notifyWatchers(domain: DomainId, key: string, value: unknown): void {
    const watchers = this.watchers.get(`${domain}:${key}`);
    if (watchers) for (const cb of watchers) { try { cb(key, value); } catch (e) { console.error('[StateStore] Watcher error:', e); } }
  }

  getVersion(domain: DomainId, key: string): number {
    return this.versions.get(`${domain}:${key}`) ?? 0;
  }

  getAllKeys(domain: DomainId): string[] {
    const prefix = `${domain}:`;
    return Array.from(this.data.keys()).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
  }

  snapshot(domain: DomainId): Record<string, unknown> {
    const prefix = `${domain}:`;
    const out: Record<string, unknown> = {};
    for (const [key, entry] of this.data) {
      if (key.startsWith(prefix)) out[key.slice(prefix.length)] = entry.value;
    }
    return out;
  }
}

let globalStateStore: StateStore | null = null;

export function createStateStore(): StateStore {
  if (!globalStateStore) globalStateStore = new StateStore();
  return globalStateStore;
}

export function getStateStore(): StateStore {
  if (!globalStateStore) globalStateStore = new StateStore();
  return globalStateStore;
}
