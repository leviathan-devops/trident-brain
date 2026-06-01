import crypto from 'node:crypto';
import { type FirewallPatternInjection } from './types.js';
import { type CortexStore } from './cortex-store.js';

export interface DynamicPattern {
  type: string;
  patterns: RegExp[];
  reason: string;
  source: 'static' | 'pfc-injected';
  injectedAt?: number;
  confidence?: number;
  evidence?: string;
}

export class FirewallInjector {
  private cortexStore: CortexStore;
  private injectedPatterns: DynamicPattern[] = [];
  private onPatternInjected?: (pattern: DynamicPattern) => void;

  constructor(cortexStore: CortexStore) {
    this.cortexStore = cortexStore;
  }

  initialize(): void {
    const persisted = this.cortexStore.getActiveFirewallPatterns();
    for (const p of persisted) {
      try {
        const regex = new RegExp(p.pattern, 'i');
        this.injectedPatterns.push({
          type: p.patternType,
          patterns: [regex],
          reason: `[PFC-INJECTED] ${p.description}`,
          source: 'pfc-injected',
          injectedAt: p.injectedAt,
          confidence: p.confidence,
          evidence: p.evidence,
        });
      } catch (err) {
        console.error(`[FirewallInjector] Invalid persisted regex: ${p.pattern}`, err);
      }
    }
    console.log(`[FirewallInjector] Loaded ${this.injectedPatterns.length} injected L5 patterns`);
  }

  setOnPatternInjected(callback: (pattern: DynamicPattern) => void): void {
    this.onPatternInjected = callback;
  }

  addDynamicPattern(injection: Omit<FirewallPatternInjection, 'injectedAt'>): { success: boolean; reason?: string } {
    const regexTest = this.validateRegex(injection.pattern);
    if (!regexTest.valid) {
      return { success: false, reason: `Invalid regex: ${regexTest.error}` };
    }

    const collision = this.checkCollision(injection.pattern);
    if (collision) {
      return { success: false, reason: `Collision with existing pattern: ${collision}` };
    }

    const regex = new RegExp(injection.pattern, 'i');
    const dynamicPattern: DynamicPattern = {
      type: injection.patternType,
      patterns: [regex],
      reason: `[PFC-INJECTED] ${injection.description}`,
      source: 'pfc-injected',
      injectedAt: Date.now(),
      confidence: injection.confidence,
      evidence: injection.evidence,
    };

    this.injectedPatterns.push(dynamicPattern);

    const fullInjection: FirewallPatternInjection = {
      ...injection,
      injectedAt: Date.now(),
    };
    this.cortexStore.insertFirewallPattern(fullInjection);

    console.log(`[FirewallInjector] Injected L5 pattern: ${injection.patternType} → /${injection.pattern}/ (confidence: ${injection.confidence})`);

    if (this.onPatternInjected) {
      this.onPatternInjected(dynamicPattern);
    }

    return { success: true };
  }

  checkInjectedPatterns(message: string): { passed: boolean; matchedPattern?: DynamicPattern; reason?: string } {
    for (const pattern of this.injectedPatterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(message)) {
          return {
            passed: false,
            matchedPattern: pattern,
            reason: pattern.reason,
          };
        }
      }
    }
    return { passed: true };
  }

  getInjectedPatterns(): DynamicPattern[] {
    return [...this.injectedPatterns];
  }

  getInjectedPatternCount(): number {
    return this.injectedPatterns.length;
  }

  removePattern(patternString: string): boolean {
    const idx = this.injectedPatterns.findIndex(p =>
      p.patterns.some(regex => regex.source === patternString)
    );
    if (idx >= 0) {
      this.injectedPatterns.splice(idx, 1);
      return true;
    }
    return false;
  }

  private validateRegex(pattern: string): { valid: boolean; error?: string } {
    try {
      new RegExp(pattern, 'i');
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  private checkCollision(newPattern: string): string | null {
    for (const existing of this.injectedPatterns) {
      for (const regex of existing.patterns) {
        if (regex.source === new RegExp(newPattern, 'i').source) {
          return existing.reason;
        }
      }
    }
    return null;
  }
}

let firewallInjectorInstance: FirewallInjector | null = null;

export function createFirewallInjector(cortexStore: CortexStore): FirewallInjector {
  if (!firewallInjectorInstance) {
    firewallInjectorInstance = new FirewallInjector(cortexStore);
  }
  return firewallInjectorInstance;
}

export function getFirewallInjector(): FirewallInjector | null {
  return firewallInjectorInstance;
}
