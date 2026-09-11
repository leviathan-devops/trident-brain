import { test, expect, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openMemory, appendAnalysis, loadChain, syncT2 } from "../../.mimocode/tools/omni-vision/memory";

let roots: string[] = [];
const freshRoot = () => { const r = mkdtempSync(join(tmpdir(), "vc-mem-")); roots.push(r); return r; };
afterEach(() => { for (const r of roots) rmSync(r, { recursive: true, force: true }); roots = []; });

test("append then load returns the chain in order", () => {
  const mem = openMemory(freshRoot());
  try {
    const before = loadChain(mem).length;
    appendAnalysis(mem, "first analysis body");
    appendAnalysis(mem, "second analysis body");
    const chain = loadChain(mem);
    expect(chain.length).toBe(before + 2);
    expect(chain[chain.length - 2]).toMatch(/first analysis body/);
  } finally { mem.close(); }
});

test("T2 sync is fail-open when core is down", async () => {
  const mem = openMemory(freshRoot());
  try {
    const r = await syncT2(mem, "hello");
    expect(["SYNCED", "TDB_SYNC_PENDING"]).toContain(r);
  } finally { mem.close(); }
});
