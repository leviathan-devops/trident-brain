import { homedir } from "node:os";

const home = () => process.env.HOME ?? homedir();

const cleanSegment = (s: string): string => {
  if (/(^|\/)\.\.(\/|$)/.test(s) || s.includes("\0")) throw new Error(`[wave] unsafe path segment: ${JSON.stringify(s)}`);
  return s.replace(/\//g, "_");
};

export function waveMemoryRoot(project: string, waveId: string, agentName: string): string {
  return `${home()}/.vc-memory/${cleanSegment(project)}/waves/${cleanSegment(waveId)}/${cleanSegment(agentName)}`;
}

export function sharedRoot(project: string, waveId: string): string {
  return `vc-${project}-${waveId}`;
}

export function buildWaveBrief(focus: string, root: string): string {
  return `WAVE FOCUS (HISTORY — VERIFY, DO NOT CONFORM): ${focus}\nSHARED ROOT: ${root}`;
}
