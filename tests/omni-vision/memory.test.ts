import { test, expect } from "bun:test";
import { openMemory, appendAnalysis, loadChain, syncT2 } from "../../.mimocode/tools/omni-vision/memory";

test("append then load returns the chain in order", () => {
  const mem = openMemory("/tmp/vc-mem-test-1");
  appendAnalysis(mem, "first analysis body");
  appendAnalysis(mem, "second analysis body");
  const chain = loadChain(mem);
  expect(chain.length).toBe(2);
  expect(chain[0]).toMatch(/first analysis body/);
  mem.close();
});

test("T2 sync is fail-open when core is down", async () => {
  const mem = openMemory("/tmp/vc-mem-test-2");
  const r = await syncT2(mem, "hello");
  expect(["SYNCED", "TDB_SYNC_PENDING"]).toContain(r);
  mem.close();
});
