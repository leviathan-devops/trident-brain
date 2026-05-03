# TRIDENT BRAIN v3.2 - RELOAD ANCHOR
## Self-Contained Recovery Package

**Version:** 3.2.0
**Status:** SHIP READY ✅
**Date:** 2026-04-16

---

## WHAT IS THIS?

This is the **Reload Anchor** for Trident Brain v3.2. It contains everything needed to restore a broken Trident installation or deploy a fresh copy.

---

## FOLDER STRUCTURE

```
Reload Anchor v3.2/
├── src/                    # TypeScript source (3 files)
│   ├── index.ts
│   ├── algorithmic-core.ts
│   └── artifact-writer.ts
├── dist/                   # Built plugin (6 files - READY TO DEPLOY)
│   ├── index.js
│   ├── algorithmic-core.js
│   ├── artifact-writer.js
│   └── *.d.ts + *.map
├── docs/                   # Documentation (4 files)
│   ├── BUILD_REPORT.md
│   ├── DEBUG_LOG.md
│   ├── RECOVERY.md
│   └── SHIP_READY.md
├── scripts/                # Utility scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── test.sh
├── package.json            # v3.2.0
├── tsconfig.json
└── INDEX.md               # This file
```

---

## QUICK RESTORE

**Single command restore:**
```bash
cp -r "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.2/dist/"* \
  ~/.config/opencode/plugins/trident-brain/
```

**Full restore from source:**
```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.2"
./scripts/deploy.sh
```

---

## v3.2 SUMMARY

| Item | Value |
|------|-------|
| Version | 3.2.0 |
| Build Date | 2026-04-16 |
| Source Files | 3 |
| Source Lines | ~3,000 |
| Distribution Files | 6 |
| Distribution Size | ~118KB |

---

## WHAT'S NEW IN v3.2

### Automatic Artifact Generation
When you run `audit this`, Trident now outputs:
1. Summary response (preserved v3.1 behavior)
2. Full artifact with 3-layer WHY/HOW structure

### 3-Layer Deep Planning Structure
- **Layer 1**: What is this / What went wrong
- **Layer 2**: WHY is it a problem / HOW to fix each finding
- **Layer 3**: Critical path + verification + prevention

### Commands Added
- `show artifact` - Display latest generated artifact

---

## CORE PRINCIPLE

> **"Trident Documents. Humans Fix."**

Trident NEVER edits code. It only documents findings with:
- WHY (mechanistic explanation)
- HOW (step-by-step fix)
- Proof (verification command)

---

## DOCUMENTATION

| File | Purpose |
|------|---------|
| BUILD_REPORT.md | Build details, test results, changes |
| DEBUG_LOG.md | Debug session notes, issues resolved |
| RECOVERY.md | Emergency restoration procedures |
| SHIP_READY.md | Ship checklist, deployment instructions |

---

## TESTING

Run mechanical tests:
```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.2"
npm test
```

Expected output: `=== ALL TESTS PASSED ===`

---

## CONTAINER TESTING

For container TUI tests, use the Gemma model via Google API:

```bash
export GOOGLE_API_KEY=AIzaSyCdzysjAXh0vmzn4vOKuMSWx1dGIjP44Z4

# Run audit in container
docker run --rm -e GOOGLE_API_KEY=AIzaSyCdzysjAXh0vmzn4vOKuMSWx1dGIjP44Z4 \
  leviathan/opencode:python3-enabled-1.4.3 \
  opencode run "audit /path/to/code"
```

---

## GIT TAG

```bash
git tag -a v3.2.0 -m "Trident v3.2 - Automatic artifact generation"
git push origin v3.2.0
```

---

## IF SOMETHING BREAKS

1. **Check RECOVERY.md** for restore procedures
2. **Check DEBUG_LOG.md** for known issues
3. **Verify OpenCode version**: `opencode --version`
4. **Try rebuilding**: `./scripts/build.sh`

---

## KNOWLEDGE FILES

For container testing best practices, see:
```
/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Shark Agent/Master Context/CONTAINER_TESTING_KNOWLEDGE.md
```