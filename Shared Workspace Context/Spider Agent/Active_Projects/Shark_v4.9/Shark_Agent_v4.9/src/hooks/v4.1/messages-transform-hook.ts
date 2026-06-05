/**
 * Messages Transform Hook — agent OUTPUT anti-derailment enforcement
 * 
 * V4.8.4: L5.11 Anti-Laundering integrated.
 */
import type { Hooks } from '@opencode-ai/plugin';
import { setCurrentAgent, incrementSlopScore, getSlopScore } from './agent-state.js';
import { isSharkAgent } from '../../shared/agent-identity.js';
import {
  HOST_FALLBACK_PATTERNS, SUCCESS_CLAIM_PATTERNS, MODEL_RESTRICTION_PATTERNS,
  MOCK_STUB_PATTERNS, SIMPLIFICATION_PATTERNS, CONFUSION_PRETENSE_PATTERNS,
  SCOPE_CREEP_PATTERNS, CROSS_AGENT_PATTERNS, UNDERMINING_PATTERNS,
  IMPATIENCE_PATTERNS, SELF_REFERENCE_PATTERNS, BEHAVIORAL_PATTERNS,
  LAUNDERING_PATTERNS,
  CONTAINER_TEST_RESULT_FILE,
} from '../../shared/firewall-patterns.js';

const THEATRICAL_PATTERNS = [
  /\|.*wc\s+-l/i, /wc\s+-l.*\|/i, /cat.*\|.*wc/i, /grep.*\|.*wc/i,
  /echo.*\|.*wc/i, /ls.*\|.*wc/i, /wc\s+-l.*dist\//i, /wc\s+-l.*src\//i,
  /wc\s+-l.*build\//i, /find.*\|.*wc/i, /\|\s*tee/i,
];
import * as path from 'path';
import * as fs from 'node:fs';

const HANDOFF_PATTERNS = [
  /(over\s+to\s+|back\s+to\s+|up\s+to\s+)(you|the.user)/i,
  /your\s+(turn|move|call|decision)/i,
];
const PERMISSION_PATTERNS = [
  /^(shall|should|can|could|may|do you want)\s+(I|we)\s+/i,
  /would\s+you\s+like\s+me\s+to/i,
  /just\s+let\s+me\s+know\s+(what|how|if)\s+(you|the)/i,
];
const DEFERRAL_PATTERNS = [
  /(here('s| is)\s+(what|the)\s+(I|we)\s+(have|did|done))/i,
  /the\s+(remaining|rest)\s+(phases|steps|work)/i,
  /ready\s+for\s+your\s+(approval|review|input)/i,
];

function hasContainerTestEvidence(): boolean {
  const evidencePath = path.join(process.cwd(), '.shark', 'evidence', 'delivery', CONTAINER_TEST_RESULT_FILE);
  if (!fs.existsSync(evidencePath)) return false;
  try {
    const result = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
    return result.overallPassed === true && result.passRate >= 0.90;
  } catch { return false; }
}

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return '';
  let text = '';
  for (const part of parts) {
    if (part && (part as any).type === 'text' && (part as any).text) {
      text += (text ? ' ' : '') + (part as any).text;
    }
  }
  return text;
}

const BLOCK_MESSAGES: Record<string, string> = {
  'L1 Theatrical Counting': 'Your thinking was BLOCKED by the mechanical firewall. Theatrical counting patterns (| wc -l, cat | wc, ls | wc) do NOT verify code. They only count strings. Run the actual code to verify. Do NOT use theatrical verification.',
  'L5.1 Host fallback': 'Your response was BLOCKED by the mechanical firewall. You attempted to suggest host-based testing instead of container testing. Host testing DOES NOT EQUAL container testing. Container isolation is REQUIRED for ship gate. Use the proper container testing workflow. Do NOT advance gates with host-based params.',
  'L5.2 Success claim without proof': 'Your response was BLOCKED by the mechanical firewall. You claimed success without mechanical proof. MECHANICAL PROOF REQUIRED: Container test evidence (passRate >= 0.90). Self-verification is NOT proof.',
  'L5.3 Model restriction': 'Your response was BLOCKED by the mechanical firewall. You referenced model restrictions or limitations. Quality gates apply regardless of model choice.',
  'L5.4 Mock/stub data': 'Your response was BLOCKED by the mechanical firewall. You proposed mock, stub, or fake data. MECHANICAL PROOF REQUIRED: Container test evidence. Real data + real execution required.',
  'L5.5 Oversimplification': 'Your response was BLOCKED by the mechanical firewall. You oversimplified or hand-waved complex aspects. Nuance matters. Address the full complexity.',
  'L5.6 Confusion pretense': 'Your response was BLOCKED by the mechanical firewall. You used hedging language ("somewhat works", "kinda", "mostly"). If uncertain, admit it clearly. "Somewhat works" is not acceptable.',
  'L5.7 Scope creep': 'Your response was BLOCKED by the mechanical firewall. You expanded scope beyond the current task. Stay on task. Use a separate task for new items.',
  'L5.7 Cross-agent tool': 'Your response was BLOCKED by the mechanical firewall. You referenced cross-agent tools (hermes, hive, kraken). These are NOT available to shark agents. Use only shark tools.',
  'L5.8 Undermining': 'Your response was BLOCKED by the mechanical firewall. You undermined quality gates with "not worth it" or "diminishing returns" excuses. Quality gates exist for reason.',
  'L5.9 Impatience': 'Your response was BLOCKED by the mechanical firewall. You showed impatience ("ship it", "good enough", "just deploy"). Proper verification takes time. Do not skip steps.',
  'L5.10 Self-reference': 'Your response was BLOCKED by the mechanical firewall. You claimed self-verification ("I have verified", "my assessment is"). Self-verification IS NOT mechanical proof. MECHANICAL PROOF REQUIRED.',
  'L5.11 Progress Laundering': 'Your response was BLOCKED by the mechanical firewall. You attempted to launder results via a summary or pass-rate claim without providing raw evidence. RAW LOGS ARE THE ONLY EVIDENCE. Summarization is a bypass attempt.',
  'D10 Handoff': 'Your output was BLOCKED. FULL DELIVERY ONE PASS: execute the ENTIRE pipeline in one pass. Never stop. Never hand off. Never return partial work. Drive to completion.',
  'D11 Permission': 'Your output was BLOCKED. FULL RESPONSIBILITY: you never need to ask. The answer is always yes. Execute the next step immediately.',
  'D12 Deferral': 'Your output was BLOCKED. FULL RESPONSIBILITY: next steps are yours to execute. Never defer to the user. Keep building.',
};

function blockMessage(label: string): string {
  return `[ANTI-DERAILMENT BLOCKED: ${label}]\n\n${BLOCK_MESSAGES[label] || `Your response was blocked by mechanical firewall rule ${label}.`}`;
}

function detectTheatricalCounting(text: string): string | null {
  for (const pattern of THEATRICAL_PATTERNS) {
    if (pattern.test(text)) {
      return 'L1 Theatrical Counting';
    }
  }
  return null;
}

function blockLabel(text: string, patterns: RegExp[], label: string, requireEvidence?: boolean): string | null {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      if (requireEvidence && hasContainerTestEvidence()) return null;
      return label;
    }
  }
  return null;
}

function blockLabelL8(text: string): string | null {
  for (const sig of BEHAVIORAL_PATTERNS) {
    if (sig.pattern.test(text)) {
      if (sig.requireEvidence && hasContainerTestEvidence()) return null;
      return `L8 ${sig.label}`;
    }
  }
  return null;
}

function blockLabelScopeCreep(text: string): string | null {
  for (const pattern of SCOPE_CREEP_PATTERNS) {
    if (pattern.test(text)) {
      for (const cap of CROSS_AGENT_PATTERNS) {
        if (cap.test(text)) return 'L5.7 Cross-agent tool';
      }
      return 'L5.7 Scope creep';
    }
  }
  return null;
}

function detectDerailment(text: string, sessionID: string): string | null {
  const slopScore = getSlopScore(sessionID);
  const isUltraStrict = slopScore >= 5;

  const block = detectTheatricalCounting(text)
    || blockLabel(text, HOST_FALLBACK_PATTERNS, 'L5.1 Host fallback')
    || blockLabel(text, SUCCESS_CLAIM_PATTERNS, 'L5.2 Success claim without proof', true)
    || blockLabel(text, MODEL_RESTRICTION_PATTERNS, 'L5.3 Model restriction')
    || blockLabel(text, MOCK_STUB_PATTERNS, 'L5.4 Mock/stub data', true)
    || blockLabel(text, SIMPLIFICATION_PATTERNS, 'L5.5 Oversimplification')
    || blockLabel(text, CONFUSION_PRETENSE_PATTERNS, 'L5.6 Confusion pretense')
    || blockLabelScopeCreep(text)
    || blockLabel(text, UNDERMINING_PATTERNS, 'L5.8 Undermining')
    || blockLabel(text, IMPATIENCE_PATTERNS, 'L5.9 Impatience')
    || blockLabel(text, SELF_REFERENCE_PATTERNS, 'L5.10 Self-reference', true)
    || blockLabel(text, LAUNDERING_PATTERNS, 'L5.11 Progress Laundering')
    || blockLabelL8(text)
    || blockLabel(text, HANDOFF_PATTERNS, 'D10 Handoff')
    || blockLabel(text, PERMISSION_PATTERNS, 'D11 Permission')
    || blockLabel(text, DEFERRAL_PATTERNS, 'D12 Deferral');

  if (block) {
    incrementSlopScore(sessionID, 1);
  }

  if (isUltraStrict && !block) {
    if (text.length < 50) {
      return 'L8 ULTRA-STRICT: Response too vague. High slop score detected. Please provide detailed mechanical evidence.';
    }
  }

  return block;
}

function replaceTextParts(parts: unknown, label: string): void {
  if (!Array.isArray(parts)) return;
  let replaced = false;
  const msg = blockMessage(label);
  for (const part of parts) {
    if (part && (part as any).type === 'text') {
      (part as any).text = replaced ? '' : msg;
      replaced = true;
    }
  }
}

export function createMessagesTransformHook(): Hooks['experimental.chat.messages.transform'] {
  return async (input, output) => {
    const { sessionID } = input as { sessionID?: string };
    const messages = output?.messages;
    if (!messages || messages.length === 0) return;

    // Extract last user message and store for guardian hook
    let lastUserMsg = '';
    for (const msg of messages) {
      if (msg?.info?.role === 'user') {
        const text = extractTextFromParts(msg.parts);
        if (text.trim()) lastUserMsg = text;
      }
    }

    for (const msg of messages) {
      if (msg?.info?.role === 'assistant' && (msg as any)?.info?.agent) {
        if (isSharkAgent((msg as any).info.agent)) {
          setCurrentAgent((msg as any).info.agent, sessionID, lastUserMsg);
          break;
        }
      }
    }

    for (const msg of messages) {
      if (msg?.info?.role !== 'assistant') continue;
      if (!(msg as any)?.info?.agent || !isSharkAgent((msg as any).info.agent)) continue;

      const text = extractTextFromParts(msg.parts);
      if (!text.trim()) continue;

      const block = detectDerailment(text, sessionID || '');
      if (block) {
        replaceTextParts(msg.parts, block);
      }
    }
  };
}
