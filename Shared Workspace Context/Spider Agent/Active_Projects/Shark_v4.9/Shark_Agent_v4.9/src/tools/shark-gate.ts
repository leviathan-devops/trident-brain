/**
 * Shark Gate Tool
 * 
 * Manual gate evaluation and status check.
 */

import { tool } from '@opencode-ai/plugin';
import { z } from 'zod';
import type { GateManager } from '../shared/gates.js';
import type { Guardian } from '../shared/guardian.js';

export function createSharkGateTool(
  gateManager: GateManager,
  guardian: Guardian
) {
  return tool({
    description: 'Evaluate a gate or get gate criteria',
    args: {
      action: z.enum(['evaluate', 'status', 'criteria', 'advance', 'reset']).describe('Action: evaluate a gate, get status, get criteria, advance to next gate, or reset to a previous gate'),
      gate: z.enum(['plan', 'build', 'test', 'verify', 'audit', 'delivery']).optional().describe('Gate to evaluate or advance'),
      target: z.enum(['plan', 'build']).optional().describe('Target gate for reset action'),
      passed: z.boolean().optional().describe('Pass/fail result (for evaluate action)'),
      notes: z.string().optional().describe('Notes about the evaluation'),
    },
    execute: async (args, ctx) => {
      const { action, gate, passed, notes } = args;

      if (action === 'status') {
        const statuses = gateManager.getGateStatuses();
        const current = gateManager.getCurrentGate();
        return JSON.stringify({ statuses, currentGate: current }, null, 2);
      }

      if (action === 'criteria') {
        const targetGate = gate || gateManager.getCurrentGate();
        const criteria = gateManager.getCriteria(targetGate);
        return JSON.stringify(criteria, null, 2);
      }

      if (action === 'advance') {
        const targetGate = gate || gateManager.getCurrentGate();
        const advanced = gateManager.transitionTo(targetGate);
        return JSON.stringify({ advanced, currentGate: gateManager.getCurrentGate() }, null, 2);
      }

      if (action === 'evaluate') {
        if (!gate) {
          return JSON.stringify({ error: 'Gate required for evaluate action' });
        }

        const evidence = gateManager.getEvidenceCollector();
        const gateEvidence = evidence.getLatestEvidence(gate);
        
        if (passed !== undefined) {
          evidence.collectEvidence({
            gate,
            timestamp: Date.now(),
            passed: passed!,
            files: [],
            metadata: { notes },
          });

          if (passed) {
            gateManager.passCurrentGate();
          } else {
            gateManager.failCurrentGate();
          }
        }

        const result = {
          gate,
          evaluated: true,
          passed: passed ?? gateEvidence?.passed ?? false,
          iteration: gateManager.getCurrentIteration(),
        };

        return JSON.stringify(result, null, 2);
      }

      if (action === 'reset') {
        const targetGate = args.target;
        if (!targetGate) {
          return JSON.stringify({ error: 'Target required for reset action. Use target=plan or target=build.' });
        }
        if (targetGate === 'plan') {
          const result = gateManager.resetToPlan();
          return JSON.stringify({ 
            success: result.success, 
            action: 'reset-to-plan', 
            iteration: result.iteration,
            currentGate: gateManager.getCurrentGate(),
            message: `Reset to PLAN gate. Iteration bumped to ${result.iteration}. All gate statuses cleared.`
          }, null, 2);
        } else if (targetGate === 'build') {
          const result = gateManager.resetToBuild();
          return JSON.stringify({ 
            success: result.success, 
            action: 'reset-to-build',
            currentGate: gateManager.getCurrentGate(),
            message: result.success 
              ? 'Reset to BUILD gate. Verification, test, audit, delivery gates cleared.' 
              : 'Cannot reset to BUILD from PLAN gate. Advance to BUILD first.'
          }, null, 2);
        }
      }

      return JSON.stringify({ error: 'Unknown action' });
    },
  });
}
