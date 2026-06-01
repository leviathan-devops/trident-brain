/**
 * v4.1 STUB — Minimal agent awareness.
 * BOILERPLATE — Provides buildable standalone behavior.
 * For production, replace with actual v4.1 from Kraken baseline.
 */

export function createAgentAwareness(
  agentSet: Set<string>,
  prefix: string,
  orchestrator: string
) {
  return {
    isMyAgent(name: string): boolean { return agentSet.has(name) || name.startsWith(prefix); },
    isOrchestrator(name: string): boolean { return name === orchestrator; },
    isVanillaAgent(name: string): boolean { return !this.isMyAgent(name); },
    getManagedAgents(): string[] { return Array.from(agentSet); },
    getAgentPrefix(): string { return prefix; },
  };
}
