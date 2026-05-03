# TRIDENT BRAIN v3.2 - RECOVERY GUIDE
## Emergency Restoration Procedures

---

## QUICK RESTORE (Single Command)

```bash
cp -r "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.2/dist/"* \
  ~/.config/opencode/plugins/trident-brain/
```

---

## FULL RESTORATION

### Step 1: Verify Source Files Exist

```bash
ls -la "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.2/src/"
```

Expected output:
```
index.ts
algorithmic-core.ts
artifact-writer.ts
```

### Step 2: Build from Source

```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.2"
npm install
npm run build
```

### Step 3: Deploy

```bash
cp -r dist/* ~/.config/opencode/plugins/trident-brain/
```

### Step 4: Verify

```bash
ls -la ~/.config/opencode/plugins/trident-brain/
```

Expected:
```
index.js
algorithmic-core.js
artifact-writer.js
index.d.ts
algorithmic-core.d.ts
artifact-writer.d.ts
```

---

## IF BUILD FAILS

### Check TypeScript Version

```bash
npm list typescript
# Should show: typescript@^5.9.3
```

### Reinstall Dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### Manual Type Check

```bash
npx tsc --noEmit
```

---

## IF PLUGIN DOESN'T LOAD

### Check opencode.json Configuration

```bash
cat ~/.config/opencode/opencode.json | grep trident
```

Should show:
```json
"file:///home/leviathan/.config/opencode/plugins/trident-brain/index.js"
```

### If Missing, Add It

Edit `~/.config/opencode/opencode.json` and add to plugins array:
```json
{
  "plugin": [
    "file:///home/leviathan/.config/opencode/plugins/trident-brain/index.js",
    ...
  ]
}
```

---

## RESTORE FROM GIT (If Available)

If you've tagged this version in git:

```bash
cd /path/to/trident-brain
git checkout v3.2.0
npm install
npm run build
cp dist/* ~/.config/opencode/plugins/trident-brain/
```

---

## CONTACT / ESCALATION

If this recovery guide doesn't work:

1. Check DEBUG_LOG.md in this folder
2. Check BUILD_REPORT.md in this folder
3. Verify OpenCode version: `opencode --version`
4. Try clearing plugin cache: `rm -rf ~/.config/opencode/plugins/trident-brain/ && cp -r dist/* ~/.config/opencode/plugins/trident-brain/`

---

## VERSION INFORMATION

| Item | Value |
|------|-------|
| Version | 3.2.0 |
| Build Date | 2026-04-16 |
| Source Location | /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident Brain/Code Review Mode/Reload Anchor v3.2/ |
| Deployed Location | ~/.config/opencode/plugins/trident-brain/ |