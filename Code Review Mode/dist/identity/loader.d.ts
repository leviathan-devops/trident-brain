/**
 * src/identity/loader.ts
 *
 * Identity file loader for Trident Brain
 */
import type { IdentityBundle } from './types.js';
export declare class IdentityLoader {
    private cache;
    loadForRole(role: string): Promise<IdentityBundle>;
    private extractDirectives;
    private extractMantra;
    private extractTitle;
    private extractRole;
    private extractList;
    private extractNeverDo;
    private extractTheatricalPatterns;
    clearCache(): void;
}
//# sourceMappingURL=loader.d.ts.map