export const ENCODER = { fps: 0.5, longSide: 448, scene: 0.35, baseCrf: 23, ladderStart: 28, maxCrf: 51, ladderBytes: 32 * 1024 * 1024 } as const;

export function sniffMedia(head: Buffer): string | null {
  if (head.length >= 8 && head.subarray(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "video/webm";
  if (head.subarray(0, 4).toString("ascii") === "RIFF") return "video/avi";
  if (head[0] === 0x89 && head[1] === 0x50) return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8) return "image/jpeg";
  return null;
}

export function buildFfmpegContractArgs(input: string, output: string): string[] {
  return ["-y", "-i", input, "-vf", `fps=${ENCODER.fps},scale=${ENCODER.longSide}:-2`, "-c:v", "libx264", "-crf", String(ENCODER.baseCrf), "-preset", "veryfast", output];
}

export function pickCrf(sizeBytes: number): number {
  if (sizeBytes <= ENCODER.ladderBytes) return ENCODER.baseCrf;
  return ENCODER.ladderStart;
}

export type FilePart = { type: "file"; path: string; mediaType: string };

export function toFilePart(path: string, mediaType: string): FilePart {
  return { type: "file", path, mediaType };
}
