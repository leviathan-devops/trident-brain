# Prefrontal Cortex — Context Library for Builders

**Target**: MiMo 2.5 Pro / GLM 5.1 / Claude Sonnet 4
**Read Before Building**: 00_ARCHITECTURE.md (THE WHAT), 01_BUILD_SPEC.md (THE HOW), then this file (THE INJECTION)
**Baseline**: Kraken Agent v1.3 System Brain Overhaul (NUKE RELOAD/v1.2.9.2-bricked-config-solved)
**Integrates with**: OpenFang v0.6.9 Hand system, SIA v0.1 Feedback Agent pattern

---

## 1. WHAT YOU'RE BUILDING

### The Foundation (DO NOT TOUCH)

| File | Lines | What It Does | Your Role |
|------|-------|-------------|-----------|
| `src/brains/system/system-brain.ts` | 464 | Base SystemBrain: gate evaluation, L0-L7, task tracking, domain validation, Brain Messenger | **READ ONLY** — you extend SystemBrainV2, not this |
| `src/brains/system/system-brain-v2.ts` | 482 | Four-Tier Context Management, dynamic injection, strike tracking, auto-logging | **BASE CLASS** — PrefrontalCortexBrain extends this. Add `onSessionEnd()`, `getGenerationNumber()`, `hasPendingImprovements()`. Change NOTHING else. |
| `src/brains/system/firewall/` | ~2500 | 17 firewall layers: L0-L7, AR, T1-T5, L10, L11 | **READ ONLY** — firewalls are proven, you never touch them |
| `src/hydra/Cortex.ts` | 291 | SQLite shared state, agents/discoveries/handoffs/SCF incidents | **ADD TABLES ONLY** — 6 new CREATE TABLE IF NOT EXISTS at end of `initialize()`. Zero changes to existing tables or methods. |
| `src/hydra/SCF.ts` | 166 | 3-arm reflex arc | **READ ONLY** |
| `src/hydra/HydraCluster.ts` | 528 | v3.0 pipeline: ingestWorkflow, getNextTask, reportComplete, revision cycles | **READ ONLY** |
| `src/hydra/HydraManager.ts` | 264 | Multi-cluster manager, message routing, acceptance criteria | **READ ONLY** |
| `src/shared/state-store.ts` | ~ | Domain-gated key-value store | **READ ONLY** |
| `src/shared/brain-messenger.ts` | ~ | Inter-brain message routing | **READ ONLY** |
| `src/factory/` | ~ | ArchitectureFactory, StateStore, AsyncDelegationEngine, ClusterScheduler | **READ ONLY** |
| `src/clusters/` | ~ | ClusterManager, ClusterInstance | **READ ONLY** |
| `src/v4.1/` | ~ | Safe hooks, agent awareness, session state | **READ ONLY** |
| `src/kraken-hive/` | ~ | Hive engine | **READ ONLY** |

### What You're Creating (N New Files)

| # | File | ~Lines | One-Line Purpose |
|---|------|--------|-----------------|
| C1 | `src/brains/prefrontal/prefrontal-cortex-brain.ts` | 350 | 4th brain: trajectory management, sync bridge, lineage queries, improvement coordination |
| C2 | `src/brains/prefrontal/execution-tracer.ts` | 200 | tool.execute.after + chat.message hooks: record structured JSON to Cortex |
| C3 | `src/brains/prefrontal/sync-bridge.ts` | 200 | Bidirectional OpenFang communication via Cortex sync queue |
| C4 | `src/brains/prefrontal/lineage-tracker.ts` | 150 | Evolution lineage: generation tracking, delta computation, Merkle validation |
| C5 | `src/brains/prefrontal/types.ts` | 250 | All prefrontal types (ExecutionTrajectory, EvolutionLineage, etc.) |
| C6 | `src/brains/prefrontal/index.ts` | 30 | Barrel exports |
| C7 | `src/tools/prefrontal-tools.ts` | 200 | 6 agent tools for trajectory/lineage/improvement queries |
| C8 | `src/hooks/prefrontal-context-hook.ts` | 120 | Injects generation number, pending improvements, cross-project patterns |
| C9 | `plugins/opencode-prefrontal-tracer/src/index.ts` | 180 | Standalone OpenCode plugin: ExecutionTracer hooks + tools |
| C10 | `plugins/opencode-prefrontal-tracer/package.json` | 20 | Plugin manifest |
| C11 | `hands/kraken-prefrontal-cortex/HAND.toml` | 80 | OpenFang Hand manifest |
| C12 | `hands/kraken-prefrontal-cortex/SYSTEM_PROMPT.md` | 400 | SIA Feedback Agent 4-phase operational playbook |
| C13 | `hands/kraken-prefrontal-cortex/SKILL.md` | 300 | Kraken anatomy, firewall ref, Hive schema, SIA pattern reference |
| C14 | `src/tests/prefrontal-execution-tracer.test.ts` | 250 | 12 unit tests for tracer |
| C15 | `src/tests/prefrontal-sync-bridge.test.ts` | 200 | 10 integration tests for sync bridge |
| C16 | `src/tests/prefrontal-lineage.test.ts` | 200 | 11 unit tests for lineage tracker |
| C17 | `src/tests/prefrontal-e2e.test.ts` | 300 | 11 end-to-end tests: full evolutionary loop |

### What You're Enhancing

| File | Current State | What To Add | Lines |
|------|--------------|-------------|-------|
| `src/hydra/types.ts` | 373 lines, v1.0 + v3.0 types | Re-export key prefrontal types. Add workflowId + generationNumber to WorkflowTask | +50 |
| `src/brains/system/system-brain-v2.ts` | 482 lines | Add `onSessionEnd()`, `getGenerationNumber()`, `hasPendingImprovements()` — 3 public methods | +30 |
| `src/index.ts` | 480 lines | Add prefrontal context hook to transform chain. Add prefrontal tools to orchestrator agents. Update Kraken instructions with prefrontal awareness | +50 |
| `src/hydra/Cortex.ts` | 291 lines | Add 6 CREATE TABLE IF NOT EXISTS at end of initialize() | +40 |

---

## 2. CORE PATTERNS — How Everything Connects

### Pattern 1: ExecutionTracer Recording (SIA: agent_execution.json)

```
Agent makes tool call
        │
        ▼
    tool.execute.before (L0-L7 FIREWALL)
        │
        ├── BLOCKED? → tool.execute.after fires with blocked result
        │                     │
        └── ALLOWED? → tool executes                     │
                │                                         │
                ▼                                         ▼
        tool.execute.after (EXECUTION TRACER)
                │
                ▼
        ExecutionTracer.recordToolCall(toolName, args, result, durationMs, error?)
                │
                ├── If isBash: flags L5 derailment signal
                ├── If blockedBy: records firewall layer
                │
                ▼
        In-memory buffer: append ToolCallEntry
                │
                ├── Buffer size >= 10? → flush to Cortex SQLite
                ├── Task completed? → finalizeTrajectory → compute stats → write full trajectory
                │
                ▼
        Cortex SQLite: execution_trajectories table
                │
                ▼
        OpenFang Hand reads next cycle

Agent sends/receives LLM message
        │
        ▼
    chat.message hook (EXECUTION TRACER)
        │
        ▼
    ExecutionTracer.recordLLMMessage(input, output)
        │
        ├── Extracts tool_calls requested by LLM
        ├── Extracts token usage (if available)
        ├── Scans for derailment flags (bash mentions, etc.)
        │
        ▼
    In-memory buffer: append LLMMessageEntry
```

### Pattern 2: The SIA Feedback Loop in Kraken

```
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATION N                                   │
│                                                                   │
│  PLANNING BRAIN: draws from PFC for deeper knowledge             │
│  → creates WorkflowPlan with evidence-based decomposition        │
│       │                                                           │
│       ▼                                                           │
│  CLUSTER AGENTS: pull tasks, execute, report complete             │
│       │                                                           │
│       │ ExecutionTracer records every tool call + LLM message     │
│       │ to execution_trajectories table (sensory data upward)     │
│       │                                                           │
│       ▼                                                           │
│  PREFONTAL CORTEX (OpenFang) — THE DEEPER KNOWLEDGE:              │
│       │                                                           │
│       ├── QUERY HIVE (subconscious): any past patterns?          │
│       ├── QUERY SYSTEM BRAIN (nervous system): trajectories      │
│       ├── QUERY PLANNING BRAIN: what was the decomposition?      │
│       ├── QUERY EXECUTION BRAIN: what was the supervision?       │
│       │                                                           │
│       ├── PHASE 2: Synthesize (SIA Feedback Agent LLM)           │
│       │   • Root cause: why did failures happen?                 │
│       │   • Structural flaws: which instructions caused this?    │
│       │   • Cross-project: did other Krakens solve this?         │
│       │   • Firewall patterns: what regex would prevent this?    │
│       │                                                           │
│       ├── PHASE 3: Persist                                      │
│       │   • Hive: consolidated patterns + lineage update         │
│       │   • Merkle hash-chain for all changes                    │
│       │                                                           │
│       └── PHASE 4: Feed back to ALL systems                     │
│           ├──► SYSTEM BRAIN: new L5 regex patterns injected     │
│           ├──► PLANNING BRAIN: decomposition guidance available │
│           ├──► HIVE MIND: patterns, failures, decisions stored   │
│           ├──► EXECUTION BRAIN: verification rules updated       │
│           └──► AGENT HARNESS: instructions, tools, hooks updated │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATION N+1                                 │
│                                                                   │
│  PLANNING BRAIN: queries PFC → "how should I decompose this?"    │
│  → PFC: "3-5 subtasks succeed 78%. Mantas 3x better for this."   │
│  → Creates WorkflowPlan with PFC-guided decomposition            │
│                                                                   │
│  SYSTEM BRAIN: L5 firewall has NEW patterns from PFC             │
│  → Catches derailments at tool.execute.before speed              │
│                                                                   │
│  CLUSTER AGENTS: execute with IMPROVED INSTRUCTIONS              │
│       │                                                           │
│       ▼                                                           │
│  PREFONTAL CORTEX: compares Gen N+1 vs Gen N metrics              │
│       │                                                           │
│       ├── IMPROVED? → consolidate as successful pattern          │
│       ├── SAME? → flag as stagnation (SCF arm 1)                │
│       └── WORSE? → rollback, flag as failed approach             │
│                                                                   │
│  Loop continues until acceptance criteria met or max gens reached │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern 3: Bidirectional Sync (Kraken ↔ OpenFang)

```
KRAKEN PLUGIN (TypeScript)                  OPENFANG HAND (Rust)
─────────────────────────                   ─────────────────────
                                             
PrefrontalCortexBrain                       Prefrontal Cortex Hand
  │                                           │
  │ registerProject()                         │
  ├── write prefrontal_registrations          │
  ├── send sync message: register_project ────┼──► pollForMessages()
  │                                           │      │
  │                                           │      ├── read prefrontal_registrations
  │                                           │      ├── validate cortex path accessible
  │                                           │      └── send sync message: registration_ack
  │                                           │
  │ (agent executes task)                     │
  ├── ExecutionTracer records trajectory      │
  │                                           │
  │ notifySessionComplete()                   │
  ├── finalizeTrajectory()                    │
  ├── send sync message: trajectories_ready ──┼──► pollForMessages()
  │   { projectId, newTrajectories: 5 }       │      │
  │                                           │      ├── read execution_trajectories
  │                                           │      ├── read generation_records
  │                                           │      ├── PHASE 2: ANALYZE (LLM call)
  │                                           │      ├── PHASE 3: PERSIST
  │                                           │      │
  │                                           │      ├── write improvement.md → filesystem
  │                                           │      ├── write hive_updates → Hive Mind
  │                                           │      │
  │                                           │      └── send sync: improvement_proposal ─►
  │                                           │
  ├── pollForMessages() ◄─────────────────────┘
  ├── ingestImprovementProposal(proposal)
  ├── validate merkle hash
  ├── check risk assessment
  ├── auto-apply? (low risk) or queue for review?
  │
  │ applyImprovement(proposalId)
  ├── update agent instructions via config()
  ├── add/remove tools
  ├── modify hooks
  ├── store Hive updates
  ├── record to evolution lineage
  │
  │ (next generation executes with improved agents)
  │
  └── loop...

SHARED MEDIUM: Cortex SQLite (sync_bridge_queue table) + filesystem
```

### Pattern 4: PFC → System Brain Firewall Injection (Nervous System Tuning)

```
PFC DISCOVERS PATTERN (offline analysis)
  │
  │ "Agents derail on Docker commands missing --name flag.
  │  87% of Docker failures in last 10 sessions show this pattern.
  │  Regex: docker\s+(run|exec).*--rm(?!.*--name)"
  │
  ├──► Generates FirewallPatternInjection:
  │    {
  │      layer: 'L5',
  │      patternType: 'regex',
  │      pattern: 'docker\\s+(run|exec).*--rm(?!.*--name)',
  │      description: 'Docker command missing --name flag',
  │      evidence: { trajectoryIds: [...], successRate: 0.87 },
  │      confidence: 94,
  │      source: 'pfc-cross-project-synthesis'
  │    }
  │
  ├──► SyncBridge → PrefrontalCortexBrain.ingestFirewallPattern()
  │
  │    ┌──────────────────────────────────────────────┐
  │    │ FirewallInjector.addDynamicPattern(pattern)   │
  │    │                                              │
  │    │ 1. Validate pattern compiles as valid regex  │
  │    │ 2. Check for collision with existing patterns │
  │    │ 3. Add to runtime pattern registry            │
  │    │ 4. Pattern active on NEXT tool.execute.before │
  │    │ 5. Log to Hive: firewall-pattern-injected     │
  │    └──────────────────────────────────────────────┘
  │
  ▼
NEXT SESSION:
  Agent types: docker run --rm alpine
  → tool.execute.before (L5 FIREWALL)
  → Regex matches: docker\s+(run|exec).*--rm(?!.*--name)
  → BLOCKED: "Missing --name flag on Docker command. Retry with --name."
  → Agent retries: docker run --rm --name task-7 alpine
  → PASSES

The nervous system learned a new reflex. PFC discovered the pattern offline.
System Brain enforces it in real-time. Zero PFC latency in the execution path.
```

### Pattern 5: Gradual Rollout (Start Small)

```
DON'T WIRE EVERYTHING AT ONCE.

PHASE 1: L5 Firewall Patterns (simplest mechanism, highest impact)
  → PFC discovers derailment → injects regex into L5
  → System Brain blocks pattern at tool.execute.before speed
  → Target: reduce bash abuse derailments by 80% within 3 generations
  → Verification: firewall trigger count for PFC-discovered patterns

PHASE 2: Decision Point Triggers (medium complexity)
  → PFC discovers failures cluster around specific decision types
  → Injects new triggers into identifyDecisionPoint()
  → SystemBrainV2 injects context BEFORE agent makes bad decision
  → Target: reduce wrong-cluster assignments by 50%
  → Verification: decision point match rate + failure rate at decision points

PHASE 3: SCF Threshold Recalibration (requires statistical confidence)
  → PFC discovers FALSE_COMPLETION fires too late (agents wasted 5 turns)
  → Lowers threshold from 3 to 2 for specific tool types
  → SCF isolates failing agents faster
  → Target: reduce fire-and-forget waste by 60%
  → Verification: mean turns-to-isolation for FALSE_COMPLETION

Each phase must be STABLE before moving to the next.
Phase 1 is the MVP — ship this first, prove the loop works, then add Phase 2.
```

### Pattern 6: Evolution Lineage Tracking (SIA: context.md)

```
LineageTracker.getOrCreateLineage(projectId, acceptanceCriteria)
  │
  ├── NEW lineage:
  │   { lineageId: "lin_...", projectName, generations: [],
  │     currentGeneration: 0, maxGenerations: 10,
  │     acceptanceCriteria: [...], bestGeneration: null }
  │
  ▼
LineageTracker.recordGeneration(generation: GenerationRecord)
  │
  ├── Compute delta from previous:
  │   {
  │     instructionChanges: "Added: path awareness check...",
  │     toolsAdded: ["get_project_paths"],
  │     toolsRemoved: [],
  │     hooksModified: ["prefrontal-context-hook"],
  │     metricDeltas: { accuracy: +5.2, latency: -120 },
  │     locDelta: +45
  │   }
  │
  ├── Check if best so far:
  │   generation.accuracy > previous best? → lineage.bestGeneration = this
  │
  ├── Append to lineage.generations[]
  │
  ├── Compute Merkle hash:
  │   sha256(prevGeneration.merkleHash + thisGeneration.data)
  │
  ├── Synthesize learnings (every 3 generations):
  │   {
  │     effectivePatterns: ["path awareness in system prompt"],
  │     failedApproaches: ["removing bash from orchestrator tools"],
  │     recurringFailureModes: ["L5 derailment: bash abuse"],
  │     crossProjectInsights: ["Kraken B's fix for Docker networking"]
  │   }
  │
  └── Write to Cortex: evolution_lineages + generation_records tables
```

### Pattern 5: Improvement Proposal Pipeline

```
FeedbackBrain (OpenFang) produces ImprovementProposal
  │
  ├── analysis: {
  │     rootCauseAnalysis: "Agents consistently failed on path handling
  │       because the system prompt assumed agents knew the project root.
  │       Evidence: 3/5 trajectories show 'ENOENT: no such file' errors."
  │     matchedFailurePatterns: ["hive://failures/path-resolution-v1"],
  │     instructionFlaws: ["No path awareness in agent instructions"],
  │     toolGaps: ["No tool to query project root path"],
  │     crossProjectFixes: [{
  │       sourceProject: "trident-brain",
  │       fixDescription: "Added get_project_paths tool + path context injection",
  │       successRate: 85,
  │       applicableHere: true
  │     }],
  │     confidenceScore: 92
  │   }
  │
  ├── changes: {
  │     updatedInstructions: { "shark-alpha-1": "You are SHARK ALPHA-1...
  │       [PATH AWARENESS] The project root is available via
  │       get_project_paths. Always verify file paths relative to this." },
  │     toolsToAdd: ["get_project_paths"],
  │     toolsToRemove: [],
  │     toolsToModify: {},
  │     hookChanges: [{
  │       hookName: "experimental.chat.system.transform",
  │       changeType: "modify",
  │       newConfig: { injectProjectPath: true }
  │     }],
  │     hiveUpdates: {
  │       patterns: [{ key: "path-awareness-in-instructions",
  │         content: "Adding project path awareness to agent instructions...",
  │         category: "pattern" }],
  │       failures: [],
  │       decisions: [{ key: "auto-apply-path-fix-v1",
  │         content: "Automatic application: low risk (instruction addition),
  │           high confidence (92%). Cross-project validated.",
  │         category: "decision" }]
  │     }
  │   }
  │
  ├── riskAssessment: {
  │     level: "low",
  │     risks: [{ description: "New tool may confuse agents unfamiliar with it",
  │       severity: "low", likelihood: "low",
  │       mitigation: "Tool has clear description. Agents adapt via LLM comprehension." }],
  │     rollbackPlan: "Remove get_project_paths tool. Revert instruction changes.
  │       Previous spec preserved at generation_record.agentSpec.",
  │     recommendedApproval: "auto"
  │   }
  │
  └── Sync Bridge → PrefrontalCortexBrain.ingestImprovementProposal()
        │
        ├── riskAssessment.level === "low" AND autoApplyEnabled?
        │   ├── YES → auto-apply
        │   └── NO → queue as pending, notify via check_improvement_proposals
        │
        └── applyImprovement()
            ├── Update agent instructions in config()
            ├── Register new tools
            ├── Modify hooks
            ├── Store Hive updates
            ├── Record to evolution lineage
            └── Increment generation number
```

---

## 3. DATA FLOW — Full Lifecycle

### Scenario 1: Agent Executes Task → Trajectory Recorded

```
1. PLANNING BRAIN spawns task via spawn_shark_agent
2. Shark agent pulls task via get_next_cluster_task
3. Shark agent sends LLM message: "I will now build the rendering engine"
   → chat.message hook fires
   → ExecutionTracer.recordLLMMessage({ role: 'assistant', content: '...' })

4. Shark agent calls bash tool: touch src/engine/renderer.ts
   → tool.execute.before: L0-L7 firewall checks, passes
   → tool executes, file created
   → tool.execute.after hook fires
   → ExecutionTracer.recordToolCall({
        toolName: 'bash',
        args: { command: 'touch src/engine/renderer.ts', description: '...' },
        result: '...',
        durationMs: 45,
        isBash: true
     })

5. Shark agent writes code via write tool
   → tool.execute.after fires
   → ExecutionTracer.recordToolCall(...)

6. Shark agent reports task complete via report_task_complete
   → tool.execute.after fires
   → ExecutionTracer.finalizeTrajectory('task-001', 'success', ['src/engine/renderer.ts'])
   → Computes stats: { totalMessages: 12, totalToolCalls: 8, bashToolCalls: 2,
        firewallBlocks: 0, totalDurationMs: 45000, tokensUsed: { input: 3200, output: 1800 },
        errors: 0, retries: 0 }
   → Writes complete trajectory to cortex: execution_trajectories table
   → Clears in-memory buffer

7. PrefrontalCortexBrain receives task-complete brain message
   → Checks if all tasks in generation complete
   → If yes: notifySessionComplete()
   → Sends sync message: { type: 'trajectories_ready', newTrajectories: 1 }
```

### Scenario 2: OpenFang Hand Analyzes Trajectory → Improvement Proposed

```
1. OpenFang Prefrontal Cortex Hand fires (schedule: 30min or triggered)
   
2. PHASE 1: COLLECT
   → For each registered project in prefrontal_registrations:
     → sqlite3 <cortex_db> "SELECT * FROM execution_trajectories WHERE analyzed_at IS NULL"
     → Reads 15 new trajectories across 3 Krakens
     → Reads generation_records for current generations
     → Reads Hive Mind failures/patterns/decisions
     → Groups: Project A has 5 new trajectories (all failed)
               Project B has 7 new trajectories (4 success, 3 failed)
               Project C has 3 new trajectories (all success)
     → Focuses on Project A (all failed — high priority)

3. PHASE 2: ANALYZE (LLM call)
   → Prepares context:
     - 5 failed trajectories from Project A
     - Current agent instructions for Project A
     - Hive failure database (pattern matching)
     - Previous generation context (was this better or worse?)
   → LLM (Sonnet) analyzes:
     - "3 of 5 failures are ENOENT errors — agents can't find files"
     - "Agent instructions never mention project root path"
     - "Cross-reference: Project B had same issue, fixed by adding path injection"
     - "The fix: add project path to system transform hook context"
     - "Confidence: 92% (cross-project validated)"
     - "Risk: low (adding context, not removing anything)"
   → Outputs: improvement.md, agent_spec_update.md, hive_updates.json

4. PHASE 3: PERSIST
   → Computes Merkle hash: sha256(prev_hash + current_output)
   → Writes improvement.md to Project A/Context Management/
   → Writes hive_updates to Hive Mind
   → Updates generation_record with new delta
   → Marks trajectories as analyzed_at = now

5. PHASE 4: DELIVER
   → Writes SyncBridgeMessage to Cortex sync_bridge_queue:
     { direction: 'openfang_to_kraken', type: 'improvement_proposal',
       payload: { proposal: { ... complete ImprovementProposal } } }
   → If Telegram configured: sends "3 improvement proposals for Project A"
```

### Scenario 3: Kraken Applies Improvement → Next Generation

```
1. PrefrontalCortexBrain.pollForMessages() fires (every 60s)
   → Finds new improvement_proposal message from OpenFang
   → Parses ImprovementProposal from payload
   → Validates Merkle hash against lineage chain
   → hash valid ✓

2. PrefrontalCortexBrain.ingestImprovementProposal(proposal)
   → Stores in cortex: improvement_proposals table
   → Checks riskAssessment.recommendedApproval:
     → "auto" AND autoApplyEnabled? YES
   → Calls applyImprovement(proposalId)

3. PrefrontalCortexBrain.applyImprovement(proposalId)
   → Reads proposal.harnessChanges:
   → updatedInstructions['shark-alpha-1'] → calls config() hook to update
   → toolsToAdd: ['get_project_paths'] → registers new tool
   → hookChanges: modify system.transform → updates hook config
   → hiveUpdates: writes 3 patterns, 1 decision to Hive Mind
   → Records to evolution lineage: GenerationRecord with delta
   → Marks proposal status = 'applied'

4. Next agent execution:
   → Agent receives updated instructions with path awareness
   → Agent has get_project_paths tool available
   → System transform hook injects project root path
   → Agent no longer makes ENOENT errors
   → Metrics improve: success rate 0% → 92%

5. Prefrontal Cortex (next cycle):
   → Reads Gen N+1 trajectories: 9/10 success (was 0/5)
   → Computes delta: success_rate +92%, bash_incidents -60%
   → Records as successful pattern: "path-awareness-in-instructions"
   → lineage.bestGeneration = Gen N+1
```

### Scenario 4: Cross-Project Pattern Synthesis

```
1. OpenFang Hand analyzes across 3 Krakens simultaneously:

   Project A (pokemon-red):  5 path errors in 7 trajectories
   Project B (trident-brain): 0 path errors in 12 trajectories
   Project C (hydra-v3):      4 path errors in 9 trajectories

2. FeedbackBrain notices:
   → Project B's agents use get_project_paths and have path injection
   → Project A and C's agents do NOT have this
   → Pattern: path-awareness fixes path errors (validated: Project B 92% success)

3. FeedbackBrain synthesizes cross-project improvement:
   → For Project A: applies Project B's get_project_paths tool + instructions
   → For Project C: applies same fix
   → Records as CrossProjectPattern:
     { sourceProjectId: "trident-brain",
       appliedFix: "Added path-awareness tool + context injection",
       successMetrics: { accuracy_gain: +92 },
       similarityScore: 95,
       applicableToCurrent: true }

4. Next analysis cycle for Projects A and C:
   → Detects that path errors dropped from 5/7 to 0/10 (Project A)
   → Detects that path errors dropped from 4/9 to 1/10 (Project C)
   → Records as validated cross-project pattern
   → Hive Mind now has: "path-awareness-in-instructions — validated across 3 projects"
   → ANY future Kraken project will automatically get this pattern injected
```

---

## 4. DON'T DO THESE

| Anti-Pattern | Why Wrong | Correct |
|---|---|---|
| **Modify system-brain.ts or system-brain-v2.ts** | Proven code. v1.3 forensic log: in-place edit broke bun parser with "Unexpected :" error. Root cause never identified. | PrefrontalCortexBrain **extends** SystemBrainV2. All new methods go in the extension class. SystemBrainV2 gets minimal additions (3 public methods). |
| **Add logic to tool.execute.before** | tool.execute.before is the **firewall**. Adding trajectory recording there blocks tool execution if tracer fails. | **tool.execute.after only** for recording. Pass-through — never blocks, never modifies. |
| **Verify by grep on bundle** | v1.3 session: grep found "SystemBrain 39" in bundle, declared "all systems working." Zero runtime verification. | **Container TUI test** for every hook and tool. `docker exec` + `tmux capture-pane` to verify hooks actually fired. |
| **Test in Plan mode** | Plan mode prevents ALL tool execution. Hooks don't fire. Models recite config without exercising it. | **Build mode container** for all verification. `opencode run` for plugin loading check ONLY, never for hook verification. |
| **Skip Merkle hash chain** | Without cryptographic audit, improvement lineage is forgeable. Someone could hand-edit improvement.md and claim it was the FeedbackBrain. | Every generation and every improvement proposal gets hash-linked to predecessor. `validateMerkleChain()` on every read. |
| **Auto-apply high-risk proposals** | FeedbackBrain is an LLM. LLMs hallucinate. Removing critical tools (spawn_*, hive_*) would break Kraken. | `riskAssessment.recommendedApproval` enforced. 'auto' only for low-risk (instruction additions, tool additions). 'manual_review' for medium+ risk (tool removals, hook removals). |
| **Record trajectories without truncation** | Full LLM messages can be 16KB+. Tool results can be 100KB+. 6 Krakens × 10 trajectories × 100KB = ~60MB per cycle. | Messages truncated to 4KB. Tool results truncated to 8KB. Stats aggregated. Full content available by querying the original logs. |
| **Hardcode Cortex paths in OpenFang Hand** | Cortex DB paths differ per Kraken project. Hardcoding means Hand only works for one project. | `prefrontal_registrations` table stores paths per project. Hand reads all registrations and discovers paths dynamically. |
| **Run FeedbackBrain on every tool call** | SIA's Feedback Agent analyzes COMPLETED generations, not individual tool calls. Real-time analysis is SystemBrainV2's job (dynamic injection). | Hand runs on schedule (30min) or on session completion. Batch analysis of accumulated trajectories. |
| **Forget to flush buffers on compaction** | OpenCode auto-compaction can happen mid-task. Unflushed trajectory data is lost. | `experimental.session.compacting` hook calls `ExecutionTracer.flushBuffer()`. Partial trajectories get outcome='unknown' so they're not completely lost. |

---

## 5. CRITICAL INTERFACES

### ExecutionTracer ↔ Cortex

```typescript
// ExecutionTracer writes to Cortex
class ExecutionTracer {
  constructor(cortex: Cortex, sessionId: string);
  initialize(): void;  // ensures tables exist
  recordToolCall(
    toolName: string,
    args: Record<string, unknown>,
    result: string | null,
    durationMs: number,
    error?: string,
    isBash?: boolean,
    blockedBy?: string
  ): void;
  recordLLMMessage(
    input: { messages: any[] },
    output: { messages?: any[] } | null
  ): void;
  recordSCFIncident(incident: SCFIncident): void;
  finalizeTrajectory(
    taskId: string,
    outcome: 'success' | 'failure' | 'blocked' | 'timeout' | 'unknown',
    outputPaths: string[]
  ): ExecutionTrajectory;
  getTrajectory(trajectoryId: string): ExecutionTrajectory | null;
  getSessionTrajectories(sessionId: string): ExecutionTrajectory[];
  flushBuffer(): void;
}
```

### PrefrontalCortexBrain ↔ SyncBridge

```typescript
class PrefrontalCortexBrain extends SystemBrainV2 {
  constructor(
    stateStore: StateStore,
    messenger: BrainMessenger,
    cortex: Cortex,
    hydraManager: HydraManager
  );
  
  // Project registration
  registerProject(registration: KrakenProjectRegistration): void;
  getRegisteredProjects(): KrakenProjectRegistration[];
  
  // Session lifecycle
  notifySessionComplete(sessionId: string, projectId: string): void;
  
  // Improvement pipeline
  ingestImprovementProposal(proposal: ImprovementProposal): void;
  applyImprovement(proposalId: string): boolean;
  getPendingProposals(): ImprovementProposal[];
  getAppliedProposals(): ImprovementProposal[];
  
  // Evolution lineage
  getEvolutionLineage(projectId: string): EvolutionLineage | null;
  getCurrentGeneration(projectId: string): number;
  
  // Status
  getPrefrontalStatus(): PrefrontalCortexState;
  
  // SystemBrainV2 overrides
  override getRelevantContextForDecision(
    decision: any,
    hiveContext?: any[]
  ): ContextDataPoint[];
}
```

### SyncBridge ↔ Cortex (sync_bridge_queue)

```typescript
class SyncBridge {
  constructor(cortex: Cortex, krakenId: string);
  
  // Outgoing (Kraken → OpenFang)
  sendMessage(message: Omit<SyncBridgeMessage, 'messageId' | 'timestamp'>): string;
  sendRegistration(project: KrakenProjectRegistration): void;
  reportTrajectoriesAvailable(projectId: string, count: number): void;
  
  // Incoming (OpenFang → Kraken)
  pollForMessages(direction?: 'openfang_to_kraken'): SyncBridgeMessage[];
  markDelivered(messageId: string): void;
  markResponded(messageId: string): void;
  
  // Health
  checkOpenfangConnectivity(): { connected: boolean; lastActiveAt?: number };
  
  // Proposal ingestion
  ingestProposals(): ImprovementProposal[];
}
```

### LineageTracker ↔ Cortex

```typescript
class LineageTracker {
  constructor(cortex: Cortex, hiveEngine: KrakenHiveEngine);
  
  // Lineage management
  getOrCreateLineage(
    projectId: string,
    projectName: string,
    acceptanceCriteria: string[]
  ): EvolutionLineage;
  
  recordGeneration(
    lineageId: string,
    generation: GenerationRecord
  ): EvolutionLineage;
  
  // Analysis
  computeDelta(
    prevGen: GenerationRecord,
    currGen: GenerationRecord
  ): GenerationDelta;
  
  getBestGeneration(lineage: EvolutionLineage): GenerationRecord | null;
  
  synthesizeLearnings(lineage: EvolutionLineage): EvolutionLineage['synthesizedLearnings'];
  
  // Merkle chain
  validateMerkleChain(lineage: EvolutionLineage): boolean;
  computeMerkleHash(data: string, previousHash: string): string;
  
  // Output
  generateContextMd(lineage: EvolutionLineage): string;
  
  // Cross-project
  findCrossProjectPatterns(
    sourceProjectId: string,
    targetProjectIds: string[]
  ): CrossProjectPattern[];
}
```

### Agent Tools (prefrontal-tools.ts)

```typescript
// Tools registered to Kraken orchestrator agents
const prefrontalTools = {
  get_execution_trajectory: tool({
    description: "Get the full execution trajectory for a task. Shows every tool call, LLM message, SCF incident, and outcome.",
    args: { trajectoryId: z.string().describe("Trajectory ID from execution_trajectories table") },
    execute: async (args, ctx) => { /* query cortex */ }
  }),
  
  get_evolution_lineage: tool({
    description: "Get the complete evolution lineage for this project. Shows all generations, what changed, and what improved.",
    args: {},
    execute: async (args, ctx) => { /* query lineage tracker */ }
  }),
  
  check_improvement_proposals: tool({
    description: "Check for pending improvement proposals from the Prefrontal Cortex FeedbackBrain.",
    args: {},
    execute: async (args, ctx) => { /* return pending proposals */ }
  }),
  
  apply_improvement: tool({
    description: "Apply an approved improvement proposal to the agent harness. Updates instructions, tools, and hooks.",
    args: { proposalId: z.string().describe("Proposal ID to apply") },
    execute: async (args, ctx) => { /* apply + confirm */ }
  }),
  
  get_cross_project_patterns: tool({
    description: "Search Hive Mind for patterns from other Kraken projects that match your current task context.",
    args: { context?: z.string().describe("Optional: describe your current task for better matching") },
    execute: async (args, ctx) => { /* query hive + lineage tracker */ }
  }),
  
  report_execution_insight: tool({
    description: "Report an insight you discovered during execution for storage in Hive Mind and Prefrontal Cortex analysis.",
    args: {
      insightType: z.enum(['pattern', 'failure', 'gotcha', 'approach_failed', 'insight']),
      content: z.string().describe("The insight to store"),
      tags: z.array(z.string()).describe("Tags for categorization")
    },
    execute: async (args, ctx) => { /* store to hive + cortex */ }
  }),
};
```

### OpenFang Hand ↔ Cortex (via sqlite3 CLI)

```
# OpenFang Hand reads Cortex via shell_exec
SQLITE_CMD="sqlite3 -json /path/to/cortex.db"

# Phase 1: Collect new trajectories
$SQLITE_CMD "SELECT * FROM execution_trajectories WHERE analyzed_at IS NULL"

# Phase 1: Read project registration
$SQLITE_CMD "SELECT * FROM prefrontal_registrations"

# Phase 1: Read current generation
$SQLITE_CMD "SELECT * FROM generation_records WHERE lineage_id = '...' ORDER BY generation_number DESC LIMIT 1"

# Phase 3: Write improvement proposal to sync queue
$SQLITE_CMD "INSERT INTO sync_bridge_queue (message_id, direction, type, source_kraken_id, payload, timestamp)
  VALUES ('msg_...', 'openfang_to_kraken', 'improvement_proposal', 'kraken-prefrontal', '...json...', datetime('now'))"

# The Hand NEVER directly modifies agent specs — it writes proposals to sync queue.
# Kraken applies proposals via applyImprovement().
```

---

## 6. QUICK REFERENCE

### Files You're Creating (Full Path Tree)

```
Prefrontal_Cortex/
├── src/
│   ├── brains/
│   │   └── prefrontal/
│   │       ├── prefrontal-cortex-brain.ts    (C1, ~350 lines)
│   │       ├── execution-tracer.ts           (C2, ~200 lines)
│   │       ├── sync-bridge.ts                (C3, ~200 lines)
│   │       ├── lineage-tracker.ts            (C4, ~150 lines)
│   │       ├── types.ts                      (C5, ~250 lines)
│   │       └── index.ts                      (C6, ~30 lines)
│   ├── tools/
│   │   └── prefrontal-tools.ts               (C7, ~200 lines)
│   ├── hooks/
│   │   └── prefrontal-context-hook.ts        (C8, ~120 lines)
│   └── tests/
│       ├── prefrontal-execution-tracer.test.ts  (C14, ~250 lines)
│       ├── prefrontal-sync-bridge.test.ts       (C15, ~200 lines)
│       ├── prefrontal-lineage.test.ts           (C16, ~200 lines)
│       └── prefrontal-e2e.test.ts               (C17, ~300 lines)
├── plugins/
│   └── opencode-prefrontal-tracer/
│       ├── src/
│       │   └── index.ts                      (C9, ~180 lines)
│       └── package.json                      (C10, ~20 lines)
└── hands/
    └── kraken-prefrontal-cortex/
        ├── HAND.toml                          (C11, ~80 lines)
        ├── SYSTEM_PROMPT.md                   (C12, ~400 lines)
        └── SKILL.md                           (C13, ~300 lines)
```

### Files You're Enhancing (Additions Only)

```
src/hydra/types.ts                          +50 lines (re-exports, workflow fields)
src/brains/system/system-brain-v2.ts        +30 lines (3 new public methods)
src/hydra/Cortex.ts                         +40 lines (6 new CREATE TABLE)
src/index.ts                                +50 lines (tools, hooks, instructions)
```

### Build Order

```
P1 (Types) → P2 (ExecutionTracer) → P3 (PrefrontalCortexBrain) → P4 (Tools + Context) → P5 (OpenFang Hand) → P6 (Tests) → P7 (Ship)
```

### Key Constants

| Name | Value | Where Used |
|------|-------|-----------|
| `DEFAULT_MICRO_CONFIG.analysisIntervalMs` | 1800000 (30 min) | OpenFang Hand schedule |
| `DEFAULT_MICRO_CONFIG.maxGenerations` | 10 | `EvolutionLineage.maxGenerations` |
| `DEFAULT_MICRO_CONFIG.spawnThreshold` | 0.7 | Load threshold for agent spawning |
| `EXECUTION_TRACER_BUFFER_SIZE` | 10 | Max entries before Cortex flush |
| `EXECUTION_TRACER_MESSAGE_TRUNCATE` | 4096 | Max chars per LLM message |
| `EXECUTION_TRACER_RESULT_TRUNCATE` | 8192 | Max chars per tool result |
| `MERKLE_HASH_ALGORITHM` | sha256 | Cryptographic hash for lineage chain |
| `SYNC_POLL_INTERVAL_MS` | 60000 | How often Kraken polls for OpenFang messages |
| `BRAIN_ID_PREFRONTAL` | `kraken-prefrontal` | Brain Messenger identity |

### Agent Roles (Prefrontal Cortex tools access)

| Agent | Cluster | Access to Prefrontal Tools |
|-------|---------|---------------------------|
| `kraken` | orchestrator | ALL 6 tools |
| `kraken-executor` | orchestrator | ALL 6 tools |
| `shark-alpha-1`, `shark-alpha-2`, `manta-alpha-1` | alpha | `report_execution_insight` only |
| `shark-beta-1`, `manta-beta-1`, `manta-beta-2` | beta | `report_execution_insight` only |
| `manta-gamma-1`, `manta-gamma-2`, `shark-gamma-1` | gamma | `report_execution_insight` only |

### Cortex Tables Added (in initialize(), after existing tables)

```sql
-- Order of creation (add at end of Cortex.initialize()):
1. execution_trajectories     -- SIA's agent_execution.json
2. evolution_lineages         -- SIA's context.md master record
3. generation_records         -- one per generation per project
4. improvement_proposals      -- FeedbackBrain output
5. sync_bridge_queue          -- Kraken ↔ OpenFang messages
6. prefrontal_registrations   -- registered Kraken projects
```

---

## 7. VERIFICATION CHECKLIST

### P1: Foundation Types
- [ ] `bun tsc --noEmit` passes with zero errors
- [ ] All types in `prefrontal/types.ts` compile and are importable
- [ ] `src/hydra/types.ts` has prefrontal re-exports without breaking existing types
- [ ] `bun test src/tests/hydra-pressure.test.ts` — 16/16 still pass (no regression from type additions)

### P2: ExecutionTracer Plugin
- [ ] `cd plugins/opencode-prefrontal-tracer && bun run build` succeeds
- [ ] Plugin loads in opencode 1.14.34 container (verify with `opencode run --print-logs`)
- [ ] `tool.execute.after` hook fires (container TUI: call a tool, check Cortex for trajectory)
- [ ] `chat.message` hook fires (container TUI: send message, check Cortex)
- [ ] `bun test src/tests/prefrontal-execution-tracer.test.ts` — 12/12 pass
- [ ] Buffer flushes at 10 entries (test 4)
- [ ] Trajectory finalization computes correct stats (test 5)
- [ ] Large results truncated to 8KB (test 12)
- [ ] `bun test src/tests/hydra-pressure.test.ts` — 16/16 still pass

### P3: PrefrontalCortexBrain
- [ ] `bun tsc --noEmit` passes with zero errors (all 4 new files)
- [ ] PrefrontalCortexBrain extends SystemBrainV2 correctly (inherited methods work)
- [ ] `registerProject()` stores in Cortex `prefrontal_registrations`
- [ ] `notifySessionComplete()` sends sync message
- [ ] `ingestImprovementProposal()` validates Merkle hash
- [ ] `applyImprovement()` updates agent instructions, tools, hooks
- [ ] `getPrefrontalStatus()` returns correct state
- [ ] Brain Messenger integration: receives task-complete messages
- [ ] `bun test src/tests/hydra-pressure.test.ts` — 16/16 still pass

### P4: Agent Tools + Context
- [ ] `get_execution_trajectory` returns valid trajectory from Cortex
- [ ] `get_evolution_lineage` returns correct lineage with generations
- [ ] `check_improvement_proposals` returns pending proposals
- [ ] `apply_improvement` updates agent harness correctly
- [ ] `get_cross_project_patterns` returns patterns from Hive
- [ ] `report_execution_insight` stores to Hive + Cortex
- [ ] Context hook injects generation number in agent system prompt
- [ ] Context hook injects pending improvements
- [ ] Agent instructions include Prefrontal Cortex awareness
- [ ] Tools registered to correct agents (orchestrator = all, cluster = report only)

### P5: OpenFang Hand
- [ ] `openfang hand validate kraken-prefrontal-cortex` passes
- [ ] HAND.toml parses without errors
- [ ] SYSTEM_PROMPT.md contains all 4 phases with correct SIA pattern
- [ ] SKILL.md contains all 7 domain sections
- [ ] Hand can read Cortex SQLite via sqlite3 CLI (test locally)
- [ ] Hand can write to sync_bridge_queue
- [ ] WASM configuration correct (fuel=150M, epoch=90s)

### P6: Integration + Tests
- [x] `bun test src/tests/prefrontal/execution-tracer.test.ts` — 12/12 pass
- [x] `bun test src/tests/prefrontal/sync-bridge.test.ts` — 11/11 pass
- [x] `bun test src/tests/prefrontal/lineage.test.ts` — 21/21 pass
- [x] `bun test src/tests/prefrontal/e2e.test.ts` — 20/20 pass
- [x] `bun test` runs ALL tests — 34 (pressure) + 12 (tracer) + 11 (sync) + 21 (lineage) + 20 (e2e) = 98/98 pass
- [x] `bun tsc --noEmit` — type checks pass on all PFC files

### P7: Ship + Preserve
- [ ] All source synced to `agent_plugin_boilerplates/Prefrontal-Cortex-Edition-v1.0/`
- [x] Snapshot created at `Ship Packages/Prefrontal_Cortex/`
- [x] `SHIP_MANIFEST.md` enumerates all files with line counts
- [x] `BUILD_REPORT.md` documents build state, test results, audit
- [x] Container TUI test report: hooks firing, trajectories persisting
- [x] `COMPACTION_SURVIVAL.md` updated with full session history
- [ ] `opencode.json` documentation updated with plugin entry
- [x] Hive Mind record: `pfc-v13-runtime-verified-container-1`, `pfc-v13-two-container-runtime-complete`

---

*END 02_CONTEXT_LIBRARY.md — Builder Injection Context Complete*
