export const MAX_PARTS_PER_CALL = 50;

export function budgetParts(files: string[], cap: number = MAX_PARTS_PER_CALL): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < files.length; i += cap) out.push(files.slice(i, i + cap));
  return out;
}

export function mergeWaveContext(own: string[], others: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const body of [...others.flat(), ...own]) {
    if (!seen.has(body)) {
      seen.add(body);
      merged.push(body);
    }
  }
  return merged.slice(-5);
}
