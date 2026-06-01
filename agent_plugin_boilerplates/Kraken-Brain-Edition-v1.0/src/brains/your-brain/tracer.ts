/**
 * tracer.ts
 *
 * TEMPLATE — Execution recording layer (optional).
 * Records tool calls, LLM messages, or other execution data to the persistent store.
 * Only include if your brain needs to record execution history.
 *
 * Key patterns from PFC's ExecutionTracer:
 *   - Buffer-and-flush: accumulate in memory, batch-write to store
 *   - Session-scoped: tied to a session ID
 *   - Pass-through: never blocks, never modifies execution
 */

import crypto from 'node:crypto';
import type { YourBrainStore } from './your-brain-store.js';  // [EDIT] Import your store

const FLUSH_THRESHOLD = 10;

export interface TracerEntry {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export class Tracer {
  private store: YourBrainStore;
  private sessionId: string;
  private buffer: TracerEntry[] = [];
  private entryCount = 0;

  constructor(store: YourBrainStore, sessionId: string) {
    this.store = store;
    this.sessionId = sessionId;
  }

  initialize(): void {
    console.log(`[Tracer] Initialized for session=${this.sessionId}`);
  }

  record(entry: Omit<TracerEntry, 'id' | 'timestamp'>): TracerEntry {
    const full: TracerEntry = {
      ...entry,
      id: `entry-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
    };
    this.buffer.push(full);
    this.entryCount++;
    if (this.buffer.length >= FLUSH_THRESHOLD) this.flush();
    return full;
  }

  flush(): void {
    for (const entry of this.buffer) {
      this.store.insertRecord({
        id: entry.id,
        value: JSON.stringify(entry.data),
        createdAt: entry.timestamp,
      });
    }
    this.buffer = [];
  }

  flushAndPersist(): void {
    this.flush();
    this.store.persist();
  }

  getEntryCount(): number { return this.entryCount; }
  getBufferSize(): number { return this.buffer.length; }
}
