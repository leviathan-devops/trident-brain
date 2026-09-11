import { test, expect } from "bun:test";
import { sniffMedia, buildFfmpegContractArgs, pickCrf, toFilePart } from "../../.mimocode/tools/omni-vision/encoder";

test("sniffs mp4 magic (ftyp) from header bytes", () => {
  const head = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
  expect(sniffMedia(head)).toBe("video/mp4");
});

test("ffmpeg contract args pin fps=0.5 and 448px cap", () => {
  const args = buildFfmpegContractArgs("/tmp/in.mp4", "/tmp/out.mp4");
  expect(args.join(" ")).toMatch(/fps=0\.5/);
  expect(args.join(" ")).toMatch(/448/);
});

test("CRF ladder engages above 32MB", () => {
  expect(pickCrf(10 * 1024 * 1024)).toBe(23);
  expect(pickCrf(40 * 1024 * 1024)).toBe(28);
});

test("FilePart is an object, never a string", () => {
  const part = toFilePart("/tmp/out.mp4", "video/mp4");
  expect(typeof part).toBe("object");
  expect(typeof part).not.toBe("string");
});
