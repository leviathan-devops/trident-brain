# COMPACTION SURVIVAL KNOWLEDGE - TRIDENT BRAIN

## Session: 2026-04-12

### Completed Task
Reverse-engineered Problem Solving Mode from GOLD STANDARD docs.

### Key GOLD STANDARD Docs Analyzed
1. `/home/leviathan/OPENCODE_WORKSPACE/GOLD STANDARD ARTIFACTS/AGENT_BUILD_LOGIC_CHAIN.md` - Mattermost integration, systematic debugging with evidence-based iteration
2. `/home/leviathan/OPENCODE_WORKSPACE/GOLD STANDARD ARTIFACTS/SHARK_AGENT_1ST_BUILD_REPORT.md` - Space Invaders build, 6-phase cognitive pipeline
3. `/home/leviathan/OPENCODE_WORKSPACE/GOLD STANDARD ARTIFACTS/SPACE_INVADERS_BUILD_LOG.md` - 13-agent parallel execution

### Core Reverse-Engineered Pattern
**Iterative Evidence-Based Problem Solving:**
```
ASSUMPTION → ACTION → OBSERVATION → COMPARISON → ADJUSTMENT → META-REFLECTION
```
- Every step has evidence backing next decision
- Each failure adds information for next attempt
- "What I Should Have Done" sections for pattern extraction

### Problem Solving Mode REVISED (was 4-layer, now 6-layer)

| Layer | Thinking | Requirement |
|-------|----------|-------------|
| 1 | "What do I assume?" | Explicit assumption + reasoning chain |
| 2 | "What action + expected output?" | Exact command + expected output |
| 3 | "What actually happened?" | Raw evidence, logs checked, expected vs actual |
| 4 | "What does the gap tell me?" | Gap analysis, updated hypothesis |
| 5 | "What should I have done differently?" | Pattern extraction |
| 6 | "How do I confirm fix works?" | Target environment execution |

### Key Files Updated
- `PROBLEM_SOLVING_MODE_DESIGN.md` - Completely overhauled
- `TRIDENT_BRAIN_Knowledge.md` - Updated with new 6-layer design
- `COMPACTION_SURVIVAL.md` - This file

### Synced to Both Agents
- Manta Agent: ✅
- Shark Agent: ✅

### Next Step (if needed)
- Implement actual layer templates
- Create enforcement checklist artifact

---

## Session: 2026-05-07

### Completed Task
Fixed Trident v3.3 identity scoping and edit blocking issues.

### Problem Discovered
The `chat.message` hook received input with `input.agent` set correctly, but `tool.execute.before` and `experimental.chat.system.transform` hooks did NOT receive `input.agent`. They only received `input.sessionID` and other metadata.

### Solution Implemented
1. **Session-based agent tracking**: Created `sessionAgentMap` to track which agent is associated with each sessionID
2. **chat.message registers session**: When `chat.message` fires with agent info, register the session→agent mapping
3. **Other hooks use session lookup**: `tool.execute.before` and `system.transform` hooks use `isTridentFromSession(sessionID)` instead of `isTridentAgentFromInput(input)`

### Key Code Changes
```typescript
const sessionAgentMap = new Map<string, string>();

function isTridentFromSession(sessionID: string | undefined): boolean {
  if (!sessionID) return false;
  const agent = sessionAgentMap.get(sessionID);
  return agent === 'trident' || (agent?.startsWith('trident_') ?? false);
}

// In chat.message hook:
const agent = input?.session?.agentName ?? (input?.agent || '');
registerSessionAgent(input?.sessionID, agent);

// In tool.execute.before and system.transform hooks:
if (!isTridentFromSession(input?.sessionID)) return;
```

### Verified Working
- "who are you" → Returns "Trident BRAIN v3.3 — Algorithmic Code Review Agent"
- Edit/write/bash tools → Blocked with error "Trident is a documentation-only agent"

### Files Updated
- `src/index.ts` - Fixed hook scoping logic
- `COMPACTION_SURVIVAL.md` - This file