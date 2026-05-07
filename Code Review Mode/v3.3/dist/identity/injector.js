/**
 * src/identity/injector.ts
 *
 * Identity injection into agent context
 */
export function formatIdentityForSystemPrompt(bundle) {
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
export function formatIdentityHeader(bundle) {
    return `You are TRIDENT BRAIN v3.3 — ${bundle.identity.role}.
${bundle.soul.mantra}
CORE PRINCIPLE: "Trident Documents. Humans Fix."
NEVER edit code. NEVER pretend to test. ALWAYS show proof.`;
}
//# sourceMappingURL=injector.js.map