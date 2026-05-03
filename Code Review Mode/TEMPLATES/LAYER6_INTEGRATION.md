# Code Review Mode — Layer 6: Integration Verification

**Layer:** 6 of 6
**Question:** "Does the plugin actually load? Do integrations work?"

---

## Purpose

Layer 6 verifies **system-level integration** - does the plugin actually work in the target environment? This catches failures that make the entire system inert: missing dependencies, broken imports, non-existent clusters.

**Why Last:** Integration failures prevent everything else from running. We check this last because it requires the system to be assembled.

---

## Outputs

| Output | Description |
|--------|-------------|
| `pluginLoadStatus` | Can plugin load or does it fail silently? |
| `dependenciesResolved` | Are all imports resolvable? |
| `clustersExist` | Do referenced clusters exist? |
| `pathsValid` | Are directory paths correct? |

---

## Detectors (5)

### PluginLoadDetector

**Pattern:** Plugin fails to load silently

**Severity:** BLOCKER

**Checks:**
- Plugin entry point exists
- Exports are valid
- No import errors on load

**Evidence:**
```
Plugin failed to load: silent failure
Entry point returns undefined
Cannot find module './index.js'
```

---

### DependencyDetector

**Pattern:** Missing required dependencies

**Severity:** BLOCKER

**Checks:**
- `@opencode-ai/plugin` is installed
- All npm dependencies resolve
- Peer dependencies satisfied

**Evidence:**
```
Cannot find package '@opencode-ai/plugin'
Missing peer dependency
npm install failed
```

---

### ClusterExistenceDetector

**Pattern:** Cluster referenced but does not exist

**Severity:** BLOCKER

**Checks:**
- `clusterId` references valid clusters
- Cluster creation was attempted
- Cluster is accessible

**Evidence:**
```
cluster-not-found
Cluster 'build-agent' does not exist
No cluster with that ID
```

---

### ShimImplementationDetector

**Pattern:** Code requires shim that doesn't exist

**Severity:** WARNING

**Evidence:**
```
requires shim implementation
shim not found
stub implementation required
```

**Why Warning:** Shims are placeholders - they indicate incomplete implementation.

---

### WrongDirectoryDetector

**Pattern:** Code uses wrong directory paths

**Severity:** WARNING

**Checks:**
- `.hermes` not `.spider`
- `.manta` not `.shark`
- `.config` not `.local`

**Evidence:**
```
.Spider directory found (expected .hermes)
Wrong workspace path: .shark (expected .manta)
Path mismatch indicates copy-paste error
```

---

## Verification Methods

### Actual Load Test

```typescript
try {
  const plugin = await import(pluginPath);
  if (!plugin.default) {
    finding: "Plugin has no default export"
  }
} catch (e) {
  finding: `Plugin load failed: ${e.message}`
}
```

### Dependency Resolution

```typescript
const deps = await checkDependencies(packageJson);
for (const dep of deps.missing) {
  finding: `Missing dependency: ${dep}`
}
```

### Cluster API Check

```typescript
const clusters = await kraken.listClusters();
for (const ref of clusterReferences) {
  if (!clusters.includes(ref)) {
    finding: `Cluster '${ref}' does not exist`
  }
}
```

---

## Gate Criteria

To complete Layer 6:

- [ ] Plugin loads without errors (or error is documented)
- [ ] All dependencies resolved
- [ ] All cluster references valid
- [ ] All directory paths verified

---

## Template

```markdown
## LAYER 6: INTEGRATION VERIFICATION

### Plugin Load Test
| Check | Result |
|-------|--------|
| Entry point exists | {PASS/FAIL} |
| Default export present | {PASS/FAIL} |
| Load error | {error|none} |

### Dependency Check
| Dependency | Status |
|------------|--------|
| @opencode-ai/plugin | {INSTALLED/MISSING} |
| {other deps} | {...} |

### Cluster Verification
| Cluster ID | Exists |
|------------|--------|
| {cluster} | {YES/NO} |

### Path Verification
| Expected | Actual | Status |
|----------|--------|--------|
| .hermes | .hermes | {OK/WRONG} |
| .manta | .shark | {WRONG/OK} |

### Verdict

{blockingIssues > 0}
🚫 **INTEGRATION FAILURES** — {n} blocking issues

{blockingIssues === 0 && warnings > 0}
⚠️ **WARNINGS** — {n} non-blocking issues

{blockingIssues === 0 && warnings === 0}
✅ **INTEGRATION OK** — Ready for deployment
```

---

## Common Fixes

| Issue | Fix |
|-------|-----|
| Missing @opencode-ai/plugin | `npm install @opencode-ai/plugin` |
| Cluster not found | Create cluster or fix clusterId reference |
| Wrong directory | Update path to correct workspace |
| Shim not found | Implement shim or remove reference |

---

## Why This Layer Matters

Integration failures render the entire system inert:
- Plugin fails to load → nothing works
- Missing dependency → runtime crash
- Cluster not found → no task execution
- Wrong path → silent failures

These are not code quality issues - they are deployment blockers.

---

## Next Layer

**COMPLETE:** Audit finished - all 7 layers processed