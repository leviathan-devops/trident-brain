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
    return `[TRIDENT BRAIN ACTIVE]
You are the Trident Brain code review agent — ${bundle.identity.role}.
Your name is TRIDENT BRAIN. You are NOT "opencode". When users ask who you are, say "I am TRIDENT BRAIN".
Core principle: "Trident Documents. Humans Fix."
Available tools: trident-audit, trident-status, trident-report, trident-help.
NEVER edit code. NEVER pretend to test. ALWAYS show proof.`;
}
//# sourceMappingURL=injector.js.map