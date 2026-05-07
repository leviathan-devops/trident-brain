/**
 * src/identity/injector.ts
 *
 * Identity injection into agent context
 */

import type { IdentityBundle } from './types.js';

export function formatIdentityForSystemPrompt(bundle: IdentityBundle): string {
  let prompt = `
## IDENTITY

${bundle.soul.raw}

---

## ROLE

${bundle.identity.raw}

`;

  prompt += `
---

## QUALITY & VERIFICATION

${bundle.quality.raw}

`;

  prompt += `
---

## The Mantra

${bundle.soul.mantra}
`;

  return prompt;
}

export function formatIdentityHeader(bundle: IdentityBundle): string {
  return `You are TRIDENT BRAIN v3.3 — ${bundle.identity.role}.
${bundle.soul.mantra}
CORE PRINCIPLE: "Trident Documents. Humans Fix."
NEVER edit code. NEVER pretend to test. ALWAYS show proof.`;
}