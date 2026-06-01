/**
 * src/shared/domain-ownership.ts
 * 
 * V1.2 Multi-Brain Domain Ownership Rules
 * 
 * Defines which brains can write to which state domains.
 * Mechanical enforcement - no text matching.
 */

// Define all valid brain IDs
export type BrainId = 
  | 'kraken-planning' | 'kraken-execution' | 'kraken-system' | 'kraken-reasoning' | 'kraken-subagent' | 'kraken-prefrontal'
  | 'alpha-execution' | 'alpha-system' 
  | 'beta-reasoning' | 'beta-system'
  | 'gamma-system' | 'gamma-execution';

// Define all valid domain IDs
export type DomainId = 
  | 'planning-state' | 'execution-state' | 'thinking-state' | 'context-bridge'
  | 'workflow-state' | 'security-state' | 'quality-state'
  | 'container-state' | 'execution-queue'
  | 'alpha-state' | 'beta-state' | 'gamma-state'
  | 'compaction-state' | 'context-registry' | 'token-budget'
  | 'prefrontal-state';

export const DOMAIN_OWNERSHIP: Record<DomainId, BrainId[]> = {
  // Kraken orchestrator domains
  'planning-state':   ['kraken-planning', 'kraken-system'],
  'execution-state':  ['kraken-execution', 'kraken-system'],
  'thinking-state':   ['kraken-reasoning', 'kraken-system'],
  'context-bridge':  ['kraken-planning'],
  'workflow-state':   ['kraken-system', 'kraken-execution'],
  'security-state':  ['kraken-system'],
  'quality-state':   ['kraken-execution', 'kraken-system'],
  
  // Subagent domains
  'container-state': ['kraken-subagent'],
  'execution-queue': ['kraken-subagent', 'kraken-execution'],
  
  // Cluster domains
  'alpha-state':     ['alpha-execution', 'alpha-system'],
  'beta-state':      ['beta-reasoning', 'beta-system'],
  'gamma-state':     ['gamma-system', 'gamma-execution'],
  
  // Compaction domains
  'compaction-state': ['kraken-system'],
  'context-registry': ['kraken-system'],
  'token-budget': ['kraken-system'],
  'prefrontal-state': ['kraken-prefrontal', 'kraken-system'],
};

export function canWrite(domain: DomainId, brain: BrainId): boolean {
  const owners = DOMAIN_OWNERSHIP[domain];
  return owners ? owners.includes(brain) : false;
}

export function getOwners(domain: DomainId): readonly BrainId[] {
  return DOMAIN_OWNERSHIP[domain] ?? [];
}

export function getReadableDomains(brain: BrainId): DomainId[] {
  const domains = Object.keys(DOMAIN_OWNERSHIP) as DomainId[];
  return domains.filter(domain => 
    DOMAIN_OWNERSHIP[domain].includes(brain)
  );
}