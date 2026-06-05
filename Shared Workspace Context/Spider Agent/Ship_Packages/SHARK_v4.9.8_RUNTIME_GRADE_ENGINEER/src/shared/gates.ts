/**
 * Gates — Mechanical Enforcement Layer
 *
 * CANONICAL gate chain: PLAN → BUILD → VERIFY → TEST → AUDIT → DELIVERY
 *
 * VERIFY before TEST — verify code is test-ready before container testing.
 * RUNTIME gate removed — TEST IS the runtime container testing gate.
 *
 * Recovery loops:
 *   VERIFY fail → BUILD (max 3 attempts)
 *   TEST fail → PLAN (max 3 attempts, with debug log)
 *   AUDIT fail → PLAN (unlimited — re-engineer from spec)
 */

import { EvidenceCollector, type GateName, type GateEvidence } from './evidence.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type GateStatus = 'pending' | 'blocked' | 'passed' | 'failed';

export interface GateCriteria {
  gate: GateName;
  blockingCriteria: string[];
  evidenceRequired: string[];
}

export const GATE_CHAIN: GateName[] = ['plan', 'build', 'verify', 'test', 'audit', 'delivery'];

export const GATE_CRITERIA: Record<GateName, GateCriteria> = {
  plan: {
    gate: 'plan',
    blockingCriteria: [
      'Requirements analysis complete',
      'Architecture decisions documented',
      'Context gathered and referenced',
      'Dependency map produced',
      'Error strategy defined',
    ],
    evidenceRequired: ['SPEC.md', 'DependencyMap.json'],
  },
  build: {
    gate: 'build',
    blockingCriteria: [
      'Runtime-grade implementation per spec',
      'EngineeringChecklist all 15 fields true',
      'P1-P12 compliance verified',
      'No theatrical code patterns',
    ],
    evidenceRequired: ['EngineeringChecklist.json', 'FileManifest.json'],
  },
  verify: {
    gate: 'verify',
    blockingCriteria: [
      'Trident code review passed (0 critical, 0 high)',
      'Code is runtime-grade and test-ready',
      'P1-P12 compliance confirmed',
      'No theatrical code patterns detected',
      'Cross-system data contracts verified',
      'Coupled data consistency verified',
    ],
    evidenceRequired: ['TridentReport.json', 'EngineeringChecklist.json'],
  },
  test: {
    gate: 'test',
    blockingCriteria: [
      'Container test via T2 12-step protocol passed',
      'ContainerSpawnResult.json exists with success=true',
      'ContainerTestResult.json with overallPassed=true, passRate >= 0.9',
      'TuiInteraction.json with identityResponded=true, toolsCalled=true',
    ],
    evidenceRequired: ['ContainerSpawnResult.json', 'ContainerTestResult.json', 'TuiInteraction.json'],
  },
  audit: {
    gate: 'audit',
    blockingCriteria: [
      'Spec alignment verified',
      'Test authenticity verified (not hand-written evidence)',
      'Runtime-grade functionality confirmed',
      'Theatrical code scan clean',
      'Anti-derailment check passed (no gate skipping)',
    ],
    evidenceRequired: ['SpecAlignmentReport.json', 'TestAuthenticityReport.json'],
  },
  delivery: {
    gate: 'delivery',
    blockingCriteria: [
      'All previous gates passed',
      'CHANGELOG generated',
      'DEBUG LOG generated',
      'BUILD REPORT generated',
    ],
    evidenceRequired: ['CHANGELOG.md', 'DEBUG_LOG.md', 'BUILD_REPORT.md'],
  },
};

function readEvidenceJson(evidenceBase: string, filename: string): Record<string, unknown> | null {
  const filePath = path.join(evidenceBase, filename);
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function validatePlanGate(evidenceBase: string): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  const specPath = path.join(evidenceBase, 'SPEC.md');
  if (!fs.existsSync(specPath)) {
    missing.push('SPEC.md not found');
  }
  const depMap = readEvidenceJson(evidenceBase, 'DependencyMap.json');
  if (!depMap) {
    missing.push('DependencyMap.json not found');
  }
  return { passed: missing.length === 0, missing };
}

export function validateBuildGate(evidenceBase: string): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  const checklist = readEvidenceJson(evidenceBase, 'EngineeringChecklist.json');
  if (!checklist) {
    missing.push('EngineeringChecklist.json not found');
  } else {
    const requiredFields = [
      'returnTypeCorrect', 'nullSafetyHandled', 'errorPathsComplete',
      'resourceCleanupAllPaths', 'concurrentSafety', 'importValidity',
      'pathResolution', 'configValidated', 'typeAssertionsGuarded',
      'asyncDiscipline', 'crossSystemDataContractsValidated',
      'coupledDataConsistencyVerified', 'gridDataIntegrityVerified',
    ];
    for (const field of requiredFields) {
      if (checklist[field] !== true) {
        missing.push(`EngineeringChecklist.${field} not true`);
      }
    }
  }
  return { passed: missing.length === 0, missing };
}

export function validateVerifyGate(evidenceBase: string): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  const trident = readEvidenceJson(evidenceBase, 'TridentReport.json');
  if (!trident) {
    missing.push('TridentReport.json not found');
  } else {
    const findings = trident.findings as Record<string, unknown> | undefined;
    if (findings) {
      const critical = typeof findings.critical === 'number' ? findings.critical : 999;
      const high = typeof findings.high === 'number' ? findings.high : 999;
      if (critical > 0) missing.push(`TridentReport has ${critical} critical findings`);
      if (high > 0) missing.push(`TridentReport has ${high} high findings`);
    } else {
      missing.push('TridentReport.json missing findings field');
    }
  }
  const checklist = readEvidenceJson(evidenceBase, 'EngineeringChecklist.json');
  if (!checklist) {
    missing.push('EngineeringChecklist.json not found for verify gate');
  }
  return { passed: missing.length === 0, missing };
}

export function validateTestGate(evidenceBase: string): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  const spawn = readEvidenceJson(evidenceBase, 'ContainerSpawnResult.json');
  if (!spawn) {
    missing.push('ContainerSpawnResult.json not found');
  } else if (spawn.success !== true) {
    missing.push('ContainerSpawnResult.success is not true');
  }
  const testResult = readEvidenceJson(evidenceBase, 'ContainerTestResult.json');
  if (!testResult) {
    missing.push('ContainerTestResult.json not found');
  } else {
    if (testResult.overallPassed !== true) {
      missing.push('ContainerTestResult.overallPassed is not true');
    }
    const passRate = typeof testResult.passRate === 'number' ? testResult.passRate : 0;
    if (passRate < 0.9) {
      missing.push(`ContainerTestResult.passRate ${passRate} < 0.9`);
    }
  }
  const tui = readEvidenceJson(evidenceBase, 'TuiInteraction.json');
  if (!tui) {
    missing.push('TuiInteraction.json not found');
  } else {
    if (tui.identityResponded !== true) missing.push('TuiInteraction.identityResponded is not true');
    if (tui.toolsCalled !== true) missing.push('TuiInteraction.toolsCalled is not true');
  }
  return { passed: missing.length === 0, missing };
}

export function validateAuditGate(evidenceBase: string): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  const specAlign = readEvidenceJson(evidenceBase, 'SpecAlignmentReport.json');
  if (!specAlign) {
    missing.push('SpecAlignmentReport.json not found');
  } else if (specAlign.aligned !== true) {
    missing.push('SpecAlignmentReport.aligned is not true');
  }
  const testAuth = readEvidenceJson(evidenceBase, 'TestAuthenticityReport.json');
  if (!testAuth) {
    missing.push('TestAuthenticityReport.json not found');
  } else if (testAuth.authentic !== true) {
    missing.push('TestAuthenticityReport.authentic is not true');
  }
  return { passed: missing.length === 0, missing };
}

export function validateDeliveryGate(evidenceBase: string): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const doc of ['CHANGELOG.md', 'DEBUG_LOG.md', 'BUILD_REPORT.md']) {
    if (!fs.existsSync(path.join(evidenceBase, doc))) {
      missing.push(`${doc} not found`);
    }
  }
  return { passed: missing.length === 0, missing };
}

export function validateGateCriteria(gate: GateName, evidenceBase: string): { passed: boolean; missing: string[] } {
  switch (gate) {
    case 'plan': return validatePlanGate(evidenceBase);
    case 'build': return validateBuildGate(evidenceBase);
    case 'verify': return validateVerifyGate(evidenceBase);
    case 'test': return validateTestGate(evidenceBase);
    case 'audit': return validateAuditGate(evidenceBase);
    case 'delivery': return validateDeliveryGate(evidenceBase);
    default: return { passed: false, missing: [`Unknown gate: ${gate}`] };
  }
}

export class GateManager {
  private currentGate: GateName = 'plan';
  private gateStatus: Record<GateName, GateStatus> = {
    plan: 'pending',
    build: 'pending',
    verify: 'pending',
    test: 'pending',
    audit: 'pending',
    delivery: 'pending',
  };
  private verifyAttempts: number = 0;
  private testAttempts: number = 0;
  private currentIteration: string = 'V1.0';
  private stateFile: string;
  private evidenceCollector: EvidenceCollector;
  private iterationAttempts: Record<string, number> = {};
  private resetCount: number = 0;

  constructor(basePath: string = '.shark') {
    this.evidenceCollector = new EvidenceCollector(basePath);
    const sharkDir = path.resolve(basePath);
    if (!fs.existsSync(sharkDir)) {
      fs.mkdirSync(sharkDir, { recursive: true });
    }
    this.stateFile = path.join(sharkDir, 'gate-state.json');
    this.load();
  }

  getCurrentGate(): GateName {
    return this.currentGate;
  }

  getGateStatuses(): Record<GateName, GateStatus> {
    return { ...this.gateStatus };
  }

  getCurrentIteration(): string {
    return this.currentIteration;
  }

  getVerifyAttempts(): number {
    return this.verifyAttempts;
  }

  getTestAttempts(): number {
    return this.testAttempts;
  }

  canTransition(to: GateName): boolean {
    const currentIndex = GATE_CHAIN.indexOf(this.currentGate);
    const targetIndex = GATE_CHAIN.indexOf(to);
    if (targetIndex !== currentIndex + 1) return false;
    return true;
  }

  transitionTo(to: GateName): boolean {
    if (!this.canTransition(to)) {
      return false;
    }

    this.gateStatus[this.currentGate] = 'passed';
    this.currentGate = to;
    this.gateStatus[to] = 'blocked';

    if (to === 'verify') {
      this.verifyAttempts = 0;
    }
    if (to === 'test') {
      this.testAttempts = 0;
    }

    this.save();
    return true;
  }

  blockCurrentGate(): void {
    this.gateStatus[this.currentGate] = 'blocked';
    this.save();
  }

  passCurrentGate(): void {
    this.gateStatus[this.currentGate] = 'passed';
    this.save();
  }

  failCurrentGate(): void {
    this.gateStatus[this.currentGate] = 'failed';
    this.save();
  }

  getCriteria(gate: GateName): GateCriteria {
    return GATE_CRITERIA[gate];
  }

  getIterationAttempts(iteration: string): number {
    return this.iterationAttempts[iteration] || 0;
  }

  getResetCount(): number {
    return this.resetCount;
  }

  /**
   * Manually reset to PLAN gate. Full reset — bumps iteration, clears all statuses.
   * Available to agent via shark-gate action=reset target=plan.
   * Needed when enforcement at current gate blocks legitimate build work.
   */
  resetToPlan(): { success: boolean; iteration: string } {
    const parts = this.currentIteration.split(/(\d+)$/);
    const name = parts[0] || 'V';
    const numStr = parts[1] || '0';
    const nextNum = parseInt(numStr) + 1;
    this.currentIteration = `${name}${nextNum}`;

    this.verifyAttempts = 0;
    this.testAttempts = 0;
    this.resetCount++;

    this.gateStatus = {
      plan: 'pending',
      build: 'pending',
      verify: 'pending',
      test: 'pending',
      audit: 'pending',
      delivery: 'pending',
    };

    this.currentGate = 'plan';
    this.save();
    return { success: true, iteration: this.currentIteration };
  }

  /**
   * Manually reset to BUILD gate. Soft reset — preserves iteration, moves gate back.
   * Available to agent via shark-gate action=reset target=build.
   * For when agent needs to re-enter build flow without losing iteration context.
   */
  resetToBuild(): { success: boolean } {
    if (this.currentGate === 'plan') {
      return { success: false };
    }

    this.currentGate = 'build';
    this.gateStatus.build = 'blocked';
    this.gateStatus.verify = 'pending';
    this.gateStatus.test = 'pending';
    this.gateStatus.audit = 'pending';
    this.gateStatus.delivery = 'pending';
    this.verifyAttempts = 0;
    this.testAttempts = 0;
    this.resetCount++;

    this.save();
    return { success: true };
  }

  handleVerifyFailure(): { action: 'loop' | 'escalate'; iteration: string } {
    this.verifyAttempts++;
    this.iterationAttempts[this.currentIteration] = this.verifyAttempts;

    if (this.verifyAttempts >= 3) {
      const result = this.escalateToPlan();
      this.save();
      return result;
    }

    this.currentGate = 'build';
    this.gateStatus['build'] = 'blocked';
    this.gateStatus['verify'] = 'pending';
    this.save();
    return { action: 'loop', iteration: this.currentIteration };
  }

  handleTestFailure(): { action: 'loop' | 'escalate'; iteration: string } {
    this.testAttempts++;
    this.iterationAttempts[this.currentIteration] = this.testAttempts;

    if (this.testAttempts >= 3) {
      const result = this.escalateToPlan();
      this.save();
      return result;
    }

    const result = this.escalateToPlan();
    this.save();
    return result;
  }

  handleAuditFailure(): { action: 'escalate'; iteration: string } {
    const result = this.escalateToPlan();
    this.save();
    return result;
  }

  private escalateToPlan(): { action: 'escalate'; iteration: string } {
    const parts = this.currentIteration.split(/(\d+)$/);
    const name = parts[0] || 'V';
    const numStr = parts[1] || '0';
    const nextNum = parseInt(numStr) + 1;
    this.currentIteration = `${name}${nextNum}`;

    this.verifyAttempts = 0;
    this.testAttempts = 0;

    this.gateStatus = {
      plan: 'pending',
      build: 'pending',
      verify: 'pending',
      test: 'pending',
      audit: 'pending',
      delivery: 'pending',
    };

    this.currentGate = 'plan';
    this.save();

    return { action: 'escalate', iteration: this.currentIteration };
  }

  getEvidenceCollector(): EvidenceCollector {
    return this.evidenceCollector;
  }

  isComplete(): boolean {
    return this.currentGate === 'delivery' && this.gateStatus['delivery'] === 'passed';
  }

  getState(): Record<string, unknown> {
    return {
      currentGate: this.currentGate,
      gateStatus: { ...this.gateStatus },
      verifyAttempts: this.verifyAttempts,
      testAttempts: this.testAttempts,
      currentIteration: this.currentIteration,
      iterationAttempts: { ...this.iterationAttempts },
      resetCount: this.resetCount,
    };
  }

  restore(state: Record<string, unknown>): void {
    if (state.currentGate) this.currentGate = state.currentGate as GateName;
    if (state.gateStatus) this.gateStatus = state.gateStatus as Record<GateName, GateStatus>;
    if (state.verifyAttempts !== undefined) this.verifyAttempts = state.verifyAttempts as number;
    if (state.testAttempts !== undefined) this.testAttempts = state.testAttempts as number;
    if (state.currentIteration) this.currentIteration = state.currentIteration as string;
    if (state.iterationAttempts) this.iterationAttempts = state.iterationAttempts as Record<string, number>;
    if (state.resetCount !== undefined) this.resetCount = state.resetCount as number;
  }

  save(): void {
    try {
      const state = this.getState();
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmp = this.stateFile + '.tmp.' + Date.now();
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, this.stateFile);
    } catch (writeErr) {
      try {
        fs.writeFileSync(this.stateFile, JSON.stringify(this.getState(), null, 2));
      } catch {
        // Non-fatal — state lives in memory, will retry on next mutation
      }
    }
  }

  load(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, 'utf-8');
        const state = JSON.parse(raw);
        this.restore(state);
      }
    } catch (loadErr) {
      // disk read failure — use defaults
    }
  }
}
