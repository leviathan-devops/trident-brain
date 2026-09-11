import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

export type Memory = { db: Database; root: string; close: () => void };

export function openMemory(root: string): Memory {
  mkdirSync(root, { recursive: true });
  const db = new Database(`${root}/vision.sqlite`);
  db.run("PRAGMA journal_mode=WAL;");
  db.run("CREATE TABLE IF NOT EXISTS analyses (seq INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL, created_at TEXT NOT NULL);");
  return { db, root, close: () => db.close() };
}

export function appendAnalysis(mem: Memory, body: string): number {
  const row = mem.db.query("INSERT INTO analyses (body, created_at) VALUES (?, datetime('now')) RETURNING seq;").get(body) as { seq: number };
  return row.seq;
}

export function loadChain(mem: Memory): string[] {
  const rows = mem.db.query("SELECT body FROM analyses ORDER BY seq ASC;").all() as { body: string }[];
  return rows.map((r) => r.body);
}

export async function syncT2(_mem: Memory, _body: string): Promise<"SYNCED" | "TDB_SYNC_PENDING"> {
  return "TDB_SYNC_PENDING";
}
