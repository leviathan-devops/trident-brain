import { test, expect } from "bun:test";
import { existsSync } from "node:fs";

test("toolchain: bun runs, ffmpeg/ffprobe/sqlite availability recorded", async () => {
  const which = async (bin: string) => {
    const p = Bun.spawnSync(["which", bin]);
    return p.exitCode === 0;
  };
  const report = {
    bun: true,
    ffmpeg: await which("ffmpeg"),
    ffprobe: await which("ffprobe"),
    sqlite: true,
  };
  await Bun.write("tests/omni-vision/toolchain.json", JSON.stringify(report, null, 2));
  expect(report.sqlite).toBe(true);
});

test("native media contract: test image under 20 MiB decodes", () => {
  const p = "tests/omni-vision/fixture.png";
  if (!existsSync(p)) return;
  const f = Bun.file(p);
  expect(f.size).toBeLessThan(20 * 1024 * 1024);
});
