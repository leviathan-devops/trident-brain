/**
 * your-brain-tools.ts
 *
 * TEMPLATE — Agent-facing tool definitions.
 * Each tool wraps a call to your brain's public API methods.
 *
 * Replace {YOUR_BRAIN_NAME} with your brain's name.
 */

import { tool } from '@opencode-ai/plugin';
import { z } from 'zod';  // [EDIT] Add zod to dependencies if needed
import { getYourBrainBrain } from '../brains/your-brain/your-brain-brain.js';

// ──────────────────────────────────────────────
// FACTORY PATTERN — create*Tools() is called from src/index.ts
// ──────────────────────────────────────────────

export function createYourBrainTools() {
  const brain = getYourBrainBrain();

  return {
    // [EDIT] Define your agent-facing tools

    example_tool: tool({
      name: 'example_tool',
      description: 'Example tool — demonstrates the tool pattern',
      args: z.object({
        input: z.string().describe('Input value to process'),
      }),
      execute: async (args) => {
        if (!brain.isInitialized()) return 'Brain not initialized';
        try {
          const result = `Processed: ${args.input}`;
          return result;
        } catch (err) {
          return `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    }),
  };
}
