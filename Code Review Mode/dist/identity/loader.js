/**
 * src/identity/loader.ts
 *
 * Identity file loader for Trident Brain
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const IDENTITY_DIR = process.env.TRIDENT_IDENTITY_DIR || path.join(PLUGIN_ROOT, 'identity');
const TRIDENT_PLUGIN_NAME = process.env.TRIDENT_PLUGIN_NAME || 'trident';
const KNOWN_LOCATIONS = [
    path.join(PLUGIN_ROOT, 'identity'),
    '/root/.config/opencode/plugins/trident/identity',
    '/opt/opencode/identity/trident',
    'identity',
    '../identity',
];
async function findIdentityDir() {
    if (path.isAbsolute(IDENTITY_DIR)) {
        try {
            await fs.access(IDENTITY_DIR);
            return IDENTITY_DIR;
        }
        catch {
            // continue searching
        }
    }
    const HOME = process.env.HOME || '/root';
    const searchDirs = [process.cwd(), HOME];
    for (const baseDir of searchDirs) {
        for (const loc of KNOWN_LOCATIONS) {
            const tryPath = path.resolve(baseDir, loc);
            try {
                await fs.access(tryPath);
                return tryPath;
            }
            catch {
                // continue
            }
        }
    }
    return path.join(process.cwd(), 'identity');
}
let cachedIdentityPath = null;
async function resolveIdentityPath() {
    if (cachedIdentityPath)
        return cachedIdentityPath;
    cachedIdentityPath = await findIdentityDir();
    return cachedIdentityPath;
}
export class IdentityLoader {
    cache = new Map();
    async loadForRole(role) {
        const cached = this.cache.get(role);
        if (cached)
            return cached;
        const resolvedPath = await resolveIdentityPath();
        const roleDir = path.join(resolvedPath, role);
        const files = {
            'TRIDENT.md': null,
            'IDENTITY.md': null,
            'EXECUTION.md': null,
            'QUALITY.md': null,
        };
        for (const file of Object.keys(files)) {
            const filePath = path.join(roleDir, file);
            try {
                files[file] = await fs.readFile(filePath, 'utf-8');
            }
            catch {
                // file doesn't exist
            }
        }
        const soulRaw = files['TRIDENT.md'] || '';
        const identityRaw = files['IDENTITY.md'] || '';
        const executionRaw = files['EXECUTION.md'] || '';
        const qualityRaw = files['QUALITY.md'] || '';
        const filesFound = [soulRaw, identityRaw, executionRaw, qualityRaw].filter(f => f.length > 0).length;
        const bundle = {
            role,
            filesFound,
            soul: {
                raw: soulRaw,
                directives: this.extractDirectives(soulRaw),
                mantra: this.extractMantra(soulRaw),
            },
            identity: {
                raw: identityRaw,
                title: this.extractTitle(identityRaw),
                role: this.extractRole(identityRaw),
                expertise: this.extractList(identityRaw, 'Expertise'),
                workingStyle: this.extractList(identityRaw, 'Working Style'),
                trackRecord: this.extractList(identityRaw, 'Track Record'),
            },
            execution: {
                raw: executionRaw,
                neverDo: this.extractNeverDo(executionRaw),
                scanningPatterns: [],
            },
            quality: {
                raw: qualityRaw,
                theatricalPatterns: this.extractTheatricalPatterns(qualityRaw),
                antiHallucinationRules: [],
            },
            metadata: {
                loadedAt: new Date().toISOString(),
                version: '3.3.3-FIXED',
                sourceDir: roleDir,
            },
        };
        this.cache.set(role, bundle);
        return bundle;
    }
    extractDirectives(content) {
        const match = content.match(/## Core Directives\n([\s\S]*?)(?=\n##|$)/);
        if (!match)
            return [];
        return match[1].split('\n').filter(l => l.trim() && l.match(/^\d+\./));
    }
    extractMantra(content) {
        const match = content.match(/## The Mantra\n([\s\S]*?)$/);
        return match ? match[1].trim() : 'Document findings. Never edit.';
    }
    extractTitle(content) {
        const match = content.match(/## Title\n([^\n]+)/);
        return match ? match[1].trim() : 'Trident Brain';
    }
    extractRole(content) {
        const match = content.match(/## Role\n([^\n]+)/);
        return match ? match[1].trim() : 'Algorithmic Code Review Agent';
    }
    extractList(content, section) {
        const regex = new RegExp(`## ${section}[\\s\\S]*?- (.*?)(?=\\n##|$)`, 'g');
        const matches = [...content.matchAll(regex)];
        return matches.map(m => m[1].trim());
    }
    extractNeverDo(content) {
        const match = content.match(/## NEVER Do\n([\s\S]*?)(?=\n##|## )/);
        if (!match)
            return [];
        return match[1].split('\n').filter(l => l.trim() && l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim());
    }
    extractTheatricalPatterns(content) {
        const match = content.match(/## Theatrical Code Detection\n([\s\S]*?)(?=\n##)/);
        if (!match)
            return [];
        return match[1].split('\n').filter(l => l.includes('→'));
    }
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=loader.js.map