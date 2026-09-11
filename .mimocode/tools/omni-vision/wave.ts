export function waveMemoryRoot(project: string, waveId: string, agentName: string): string {
  return `${process.env.HOME}/.vc-memory/${project}/waves/${waveId}/${agentName}`;
}

export function sharedRoot(project: string, waveId: string): string {
  return `vc-${project}-${waveId}`;
}

export function buildWaveBrief(focus: string, root: string): string {
  return `WAVE FOCUS (HISTORY — VERIFY, DO NOT CONFORM): ${focus}\nSHARED ROOT: ${root}`;
}
