import { test, expect } from "bun:test";
import { existsSync } from "node:fs";

const MAX_FIXTURE_BYTES = 20 * 1024 * 1024;

// Recorder, not gate: records availability, never fails on missing tools.
test("toolchain: bun runs, ffmpeg/ffprobe/sqlite availability recorded", async () => {
  const which = async (bin: string) => {
    const p = Bun.spawnSync(["which", bin]);
    return p.exitCode === 0;
  };
  // Real sqlite probe: an actual in-memory query must succeed. Bun.SQLite is
  // absent on some builds, so fall through to the bun:sqlite module (the
  // canonical Bun backend), then to the sqlite3 CLI as a last resort.
  const probeSqlite = async (): Promise<boolean> => {
    try {
      const Ctor = (Bun as unknown as { SQLite?: new (path: string) => { query: (sql: string) => { get: () => unknown } } }).SQLite;
      if (Ctor) {
        new Ctor(":memory:").query("select 1").get();
        return true;
      }
    } catch {
      return false;
    }
    try {
      const mod = (await import("bun:sqlite")) as unknown as { Database: new (path: string) => { query: (sql: string) => { get: () => unknown } } };
      new mod.Database(":memory:").query("select 1").get();
      return true;
    } catch {
      return await which("sqlite3");
    }
  };
  // Loud corrupt-JSON failure: a missing verdict file fails open ({}), but a
  // present-but-unparseable file is backed up and THROWN — never silently
  // overwritten, or a recorded verdict could be destroyed without a trace.
  const toolchainUrl = new URL("./toolchain.json", import.meta.url);
  let prior: Record<string, unknown> = {};
  if (existsSync(toolchainUrl)) {
    try {
      prior = await Bun.file(toolchainUrl).json();
    } catch {
      const backupUrl = new URL(`./toolchain.json.corrupt-${Date.now()}`, import.meta.url);
      await Bun.write(backupUrl, await Bun.file(toolchainUrl).text());
      throw new Error(
        `CORRUPT VERDICT FILE: ${toolchainUrl.pathname} is not valid JSON — raw bytes backed up, refusing to overwrite.`
      );
    }
  }
  const report = {
    ...prior,
    bun: true,
    ffmpeg: await which("ffmpeg"),
    ffprobe: await which("ffprobe"),
    sqlite: await probeSqlite(),
  };
  await Bun.write(toolchainUrl, JSON.stringify(report, null, 2));
  expect(report.sqlite).toBe(true);
});

test("native media contract: committed fixture under 20 MiB", async () => {
  const p = new URL("./fixture.png", import.meta.url);
  expect(existsSync(p)).toBe(true);
  const f = Bun.file(p);
  expect(f.size).toBeGreaterThan(0);
  expect(f.size).toBeLessThan(MAX_FIXTURE_BYTES);
  const head = [...new Uint8Array(await f.arrayBuffer()).subarray(0, 8)];
  expect(head).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});
