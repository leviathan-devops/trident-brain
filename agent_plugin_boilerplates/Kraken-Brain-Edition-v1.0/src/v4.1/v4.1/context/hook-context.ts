/**
 * v4.1 STUB — Minimal HookContext interface.
 * BOILERPLATE — Provides buildable standalone behavior.
 * For production, replace with actual v4.1 from Kraken baseline.
 */

export interface HookContext {
  sessionID: string;
  agentName: string;
  phase: string;
  isMyAgent(): boolean;
  isVanillaAgent(): boolean;
  isOtherPluginAgent(): boolean;
  getSessionState(): Record<string, unknown>;
  log(level: string, message: string, data?: Record<string, unknown>): void;
}
