import { test, expect } from "bun:test";
import { sniffMedia, buildFfmpegContractArgs, pickCrf, toFilePart, ENCODER } from "../../.mimocode/tools/omni-vision/encoder";

test("sniffs mp4 magic (ftyp) from header bytes", () => {
  const head = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
  expect(sniffMedia(head)).toBe("video/mp4");
});

test("sniffs every magic branch", () => {
  expect(sniffMedia(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))).toBe("video/webm");
  expect(sniffMedia(Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]))).toBe("video/avi");
  expect(sniffMedia(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
  expect(sniffMedia(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  expect(sniffMedia(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
});

test("ffmpeg contract args pin fps=0.5 and 448px cap", () => {
  const args = buildFfmpegContractArgs("/tmp/in.mp4", "/tmp/out.mp4");
  expect(args.join(" ")).toMatch(/fps=0\.5/);
  expect(args.join(" ")).toMatch(/448/);
});

test("CRF ladder engages above 32MB", () => {
  expect(pickCrf(10 * 1024 * 1024)).toBe(ENCODER.baseCrf);
  expect(pickCrf(40 * 1024 * 1024)).toBe(ENCODER.ladderStart);
  expect(pickCrf(32 * 1024 * 1024)).toBe(ENCODER.baseCrf);
  expect(pickCrf(32 * 1024 * 1024 + 1)).toBe(ENCODER.ladderStart);
});

test("FilePart is an object, never a string", () => {
  const part = toFilePart("/tmp/out.mp4", "video/mp4");
  expect(part).toStrictEqual({ type: "file", path: "/tmp/out.mp4", mediaType: "video/mp4" });
});
