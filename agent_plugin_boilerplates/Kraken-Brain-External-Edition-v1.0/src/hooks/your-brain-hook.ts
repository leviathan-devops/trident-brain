/**
 * your-brain-hook.ts
 *
 * TEMPLATE — Context injection hooks for your brain.
 * These inject brain state into the agent's system prompt at each LLM call.
 *
 * Pattern:
 *   1. Get brain singleton via getYourBrainBrain()
 *   2. Check brain.isInitialized() — skip if not
 *   3. Read brain state
 *   4. Inject context via output.system.push()
 *   5. Wrap EVERYTHING in try/catch (hooks must NEVER throw)
 */

import { getYourBrainBrain } from '../brains/your-brain/your-brain-brain.js';
import { BRAIN_LABEL, DOMAIN_ID } from '../brains/your-brain/types.js';

export function yourBrainHook(params: { input: any; output: any; ctx?: any }): void {
  const { output } = params;
  try {
    const brain = getYourBrainBrain();
    if (!brain.isInitialized()) return;

    const state = brain.getState();

    // [EDIT] Customize what context to inject
    const contextLines: string[] = [];
    contextLines.push(`[${BRAIN_LABEL} — Active]`);
    contextLines.push(`State: initialized=${state.initialized}, errors=${state.errorCount}`);

    output.system = output.system || [];
    output.system.push(contextLines.join('\n'));
  } catch (err) {
    console.error(`[${BRAIN_LABEL}Hook] Failed to inject context:`, err instanceof Error ? err.message : String(err));
  }
}
