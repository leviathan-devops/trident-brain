/**
 * v4.1 STUB — Minimal logger.
 * BOILERPLATE — Provides buildable standalone behavior.
 * For production, replace with actual v4.1 from Kraken baseline.
 */

export function createLogger(name: string) {
  return {
    info: (msg: string, data?: any) => console.log(`[${name}] ${msg}`, data ?? ''),
    warn: (msg: string, data?: any) => console.warn(`[${name}] ${msg}`, data ?? ''),
    error: (msg: string, data?: any) => console.error(`[${name}] ${msg}`, data ?? ''),
  };
}
