/**
 * src/shared/domain-ownership.ts
 *
 * Multi-Brain Domain Ownership Rules.
 * TEMPLATE — Add your brain's ID and domain to the unions and ownership map.
 *
 * Find-and-replace:
 *   {YOUR_BRAIN_ID}         → YourBrainId (e.g., "your-brain-id")
 *   {YOUR_DOMAIN_ID}        → YourDomainId (e.g., "your-brain-state")
 *     Then add {YOUR_BRAIN_ID} to the BrainId type union below
 *     Then add '{YOUR_DOMAIN_ID}' to the DomainId type union
 *     Then add '{YOUR_DOMAIN_ID}': ['{YOUR_BRAIN_ID}', 'kraken-system'] to DOMAIN_OWNERSHIP
 */

// [EDIT] Add your brain's ID to this union
export type BrainId =
  | 'kraken-planning' | 'kraken-execution' | 'kraken-system' | 'kraken-reasoning' | 'kraken-subagent'
  | 'alpha-execution' | 'alpha-system'
  | 'beta-reasoning' | 'beta-system'
  | 'gamma-system' | 'gamma-execution'
  | '{YOUR_BRAIN_ID}';

// [EDIT] Add your brain's domain ID to this union
export type DomainId =
  | 'planning-state' | 'execution-state' | 'thinking-state' | 'context-bridge'
  | 'workflow-state' | 'security-state' | 'quality-state'
  | 'container-state' | 'execution-queue'
  | 'alpha-state' | 'beta-state' | 'gamma-state'
  | 'compaction-state' | 'context-registry' | 'token-budget'
  | '{YOUR_DOMAIN_ID}';

export const DOMAIN_OWNERSHIP: Record<DomainId, BrainId[]> = {
  'planning-state':   ['kraken-planning', 'kraken-system'],
  'execution-state':  ['kraken-execution', 'kraken-system'],
  'thinking-state':   ['kraken-reasoning', 'kraken-system'],
  'context-bridge':   ['kraken-planning'],
  'workflow-state':   ['kraken-system', 'kraken-execution'],
  'security-state':   ['kraken-system'],
  'quality-state':    ['kraken-execution', 'kraken-system'],
  'container-state':  ['kraken-subagent'],
  'execution-queue':  ['kraken-subagent', 'kraken-execution'],
  'alpha-state':      ['alpha-execution', 'alpha-system'],
  'beta-state':       ['beta-reasoning', 'beta-system'],
  'gamma-state':      ['gamma-system', 'gamma-execution'],
  'compaction-state': ['kraken-system'],
  'context-registry': ['kraken-system'],
  'token-budget':     ['kraken-system'],
  // [EDIT] Add your domain ownership:
  '{YOUR_DOMAIN_ID}': ['{YOUR_BRAIN_ID}', 'kraken-system'],
};

export function canWrite(domain: DomainId, brain: BrainId): boolean {
  return DOMAIN_OWNERSHIP[domain]?.includes(brain) ?? false;
}

export function getOwners(domain: DomainId): readonly BrainId[] {
  return DOMAIN_OWNERSHIP[domain] ?? [];
}

export function getReadableDomains(brain: BrainId): DomainId[] {
  return (Object.keys(DOMAIN_OWNERSHIP) as DomainId[]).filter(d => DOMAIN_OWNERSHIP[d].includes(brain));
}
