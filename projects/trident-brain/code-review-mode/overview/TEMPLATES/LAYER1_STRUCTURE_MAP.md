# Code Review Mode — Layer 1: Structure Map

**Layer:** 1 of 5  
**Question:** "What is the architecture?"  

---

## Purpose

Layer 1 establishes the **structural baseline** of the codebase being reviewed. It maps files, dependencies, and identifies anomalies in size/bundle that may indicate problems.

## Outputs

| Output | Description |
|--------|-------------|
| `fileTree` | Complete list of files with sizes |
| `dependencyGraph` | Import/require relationships |
| `entryPoints` | Main/entry files identified |
| `versionDiff` | Bundle size vs previous version |
| `anomalies` | Files flagged as god files |

## Detectors (4)

### BundleSizeDetector
Compares current bundle to previous version.

**Thresholds:**
- >50% reduction: WARNING
- >80% reduction: BLOCKER

**Evidence:**
```
Previous: 521 KB
Current: 52 KB
Change: -90% (BLOCKER)
```

### DependencyGraphDetector
Maps all import/require relationships.

**Thresholds:**
- >10 imports: WARNING
- Circular dependencies: BLOCKER

### EntryPointDetector
Identifies main entry files.

**Checks:**
- `package.json` main field
- `index.ts`, `index.js`
- `src/index.*`
- `main.*`

### FileSizeAnomalyDetector
Flags unusually large files.

**Thresholds:**
- >1000 lines: WARNING
- >2000 lines: BLOCKER
- >5000 lines: BLOCKER (severe)

---

## Template

```markdown
## LAYER 1: STRUCTURE MAP

### Files Analyzed
| File | Size | Lines | Type |
|------|------|-------|------|
| {file} | {n}KB | {n} | {ts/js/py} |

### Dependency Summary
- Total files: {n}
- Total imports: {n}
- Average imports/file: {n}
- Circular dependencies: {n}

### Entry Points
| File | Type |
|------|------|
| {file} | main/index/module |

### Version Diff
- Previous bundle: {n} KB
- Current bundle: {n} KB
- Change: {+/-n%} [{WARNING|BLOCKER}]

### Size Anomalies
| File | Lines | Threshold | Severity |
|------|-------|-----------|----------|
| {file} | {n} | >1000 | {WARNING|BLOCKER} |
```

---

## Gate Criteria

To advance to Layer 2, MUST have:
- [ ] File tree complete
- [ ] Dependency graph built
- [ ] Version diff calculated (or marked N/A)
- [ ] All anomalies flagged

## Next Layer

**Layer 2:** Execution Verification — "Does the code actually execute?"
