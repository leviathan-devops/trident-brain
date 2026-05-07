/**
 * src/identity/types.ts
 *
 * Identity type definitions for Trident Brain
 */

export interface SoulContent {
  raw: string;
  directives: string[];
  mantra: string;
}

export interface IdentityContent {
  raw: string;
  title: string;
  role: string;
  expertise: string[];
  workingStyle: string[];
  trackRecord: string[];
}

export interface ExecutionContent {
  raw: string;
  neverDo: string[];
  scanningPatterns: string[];
}

export interface QualityContent {
  raw: string;
  theatricalPatterns: string[];
  antiHallucinationRules: string[];
}

export type IdentityFileType = 'TRIDENT.md' | 'IDENTITY.md' | 'EXECUTION.md' | 'QUALITY.md';

export interface IdentityBundle {
  role: string;
  soul: SoulContent;
  identity: IdentityContent;
  execution: ExecutionContent;
  quality: QualityContent;
  metadata: {
    loadedAt: string;
    version: string;
    sourceDir: string;
  };
}