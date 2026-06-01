# Prefrontal Cortex — Trident Deep Planning Build Spec

## Layer 1: Surface — What Are We Building?

### One-Sentence Summary
**Kraken's Prefrontal Cortex is the central intelligence layer — an evolutionary optimization engine modeled on the human prefrontal cortex wired into an octopus-like distributed nervous system. It analyzes every agent execution across all Krakens, synthesizes deeper knowledge no single agent could discover, and feeds that knowledge back to the nervous system (System Brain firewall), subconscious (Hive Mind), strategy layer (Planning Brain), and supervision layer (Execution Brain) — creating genuinely self-improving intelligence across the entire swarm.**

### The Problem
Kraken coordinates 9 LLM agents across 3 clusters but has **zero learning from execution**. The System Brain evaluates gates (pass/fail) and enforces firewalls, but never analyzes WHY an agent failed or WHAT structural change would prevent recurrence. The Hive Mind stores patterns and failures but has no evolutionary lineage — no tracking of which improvements worked across generations. L5 derailments (bash abuse, fire-and-forget, orchestration theater) recur across sessions because the system never studies its own behavior and restructures to prevent them.

Evidence from `FORENSIC_FAILURE_LOG.md` (v1.3 session): "Session spanning system brain overhaul. 1 verified runtime behavior. Everything else was grep-on-bundle, Plan-mode-constrained, or compile-but-never-called." The system can't even detect that code exists but is never exercised — because it has no execution trajectory analysis.

Evidence from `ses_18bf.md` (L5 derailment analysis): "Kraken doing 40+ sequential bash commands without ever calling a single Kraken orchestration tool." The agent used `docker`, `tmux`, `opencode run` via bash — zero calls to `spawn_shark_agent` or any Kraken tool. This derailment was detected by post-hoc human analysis, not by the system itself learning from the pattern.

**Current state**: Kraken is a brilliant coordinator with zero self-awareness. It can't answer "what went wrong in the last session?" or "which agent instructions caused the most failures?" or "did the fix we applied last week actually improve metrics?"

### The Solution

A cephalopod-human hybrid architecture:

**The Octopus Body (in-process Kraken)** — distributed execution:
1. **ExecutionTracer**: `tool.execute.after` + `chat.message` hooks recording structured trajectories to Cortex SQLite. Sensory neurons sending data upward. Pass-through, <1ms overhead.
2. **PrefrontalCortexBrain** (in-process): Manages trajectory storage, sync bridge, and receives improvement proposals from the PFC.

**The Human PFC (out-of-process OpenFang Hand)** — central intelligence:
3. **FeedbackBrain**: SIA-style Feedback Agent running on schedule (30min). Reads trajectories from ALL Krakens, performs deep analysis with high-capability LLM. Synthesizes patterns across time and projects.
4. **PFC output channels** — the deeper knowledge feeds back to everything:
   - → **System Brain (nervous system)**: New L5 derailment patterns, decision triggers, SCF threshold recalibration
   - → **Planning Brain (strategy)**: Evidence-based decomposition guidance, cluster preference data
   - → **Hive Mind (subconscious)**: Consolidated patterns, failure catalog, evolution lineage
   - → **Execution Brain (supervision)**: Output verification rules, delegation tuning
   - → **Agent Harness**: Updated instructions, tools, hooks

The loop: **EXECUTE → LOG → ANALYZE → SYNTHESIZE → FEED BACK TO ALL SYSTEMS → EXECUTE SMARTER**

### Scope
- Create 5 new source files (`prefrontal-cortex-brain.ts`, `execution-tracer.ts`, `sync-bridge.ts`, `lineage-tracker.ts`, `firewall-injector.ts`) + types + barrel
- Create ExecutionTracer standalone OpenCode plugin (new plugin, 3rd in load order)
- Create 3 new agent tools (`prefrontal-tools.ts`) + 1 new context hook
- Create OpenFang Hand: `HAND.toml` + `SYSTEM_PROMPT.md` + `SKILL.md`
- Add 6 new SQLite tables to Cortex
- Enhance 5 existing files (types.ts, system-brain-v2.ts, context hook, agent instructions, firewall template)
- Write 4 test files + firewall injection integration test
- Gradual rollout: P2 (tracer) → P3 (brain + sync) → P3.5 (firewall injection — L5 first) → P4 (tools) → P5 (Hand) → P6 (tests)

### What Stays Unchanged
- `src/brains/system/system-brain.ts` (464 lines) — proven, 0 direct changes (receives injected patterns via PrefrontalCortexBrain)
- `src/brains/system/system-brain-v2.ts` (482 lines) — receives 3 new public methods for PFC integration, 0 internal changes
- `src/brains/system/firewall/l5-macro-derailment.ts` — receives INJECTED patterns at runtime via firewall-injector, source file unchanged
- `src/hydra/Cortex.ts` (291 lines) — additions only (new tables at end of initialize())
- `src/hydra/SCF.ts` (166 lines) — proven, 0 changes (thresholds recalibrated at runtime via state store)
- `src/hydra/HydraCluster.ts`, `src/hydra/HydraManager.ts` — proven, 0 changes
- All factory/, clusters/, v4.1/, kraken-hive/, existing tools/ — proven, 0 changes
- OpenFang v0.6.9 binary — 0 changes, used as-is

---

## Layer 2: Assumptions — What Must Be True

### Assumption 1: Cortex SQLite is the Single Source of Truth
- **Action**: All trajectories, lineage records, and improvement proposals persist in new SQLite tables added to the existing Cortex database. PrefrontalCortexBrain reads/writes via Cortex. OpenFang reads via `sqlite3` CLI.
- **Expected Output**: On process restart, all trajectory data and evolution lineage is fully reconstructable from Cortex.
- **Risk**: If Cortex DB path changes between process restarts, state is lost. If schema version mismatches between Kraken and OpenFang, queries fail.
- **Mitigation**: `HYDRA_DATA_DIR` env var pins the Path. Schema version stored in `prefrontal_registrations` table. OpenFang checks version before querying. Schema migrations handled by Cortex.initialize() with `CREATE TABLE IF NOT EXISTS`.

### Assumption 2: OpenFang Is Installed and Running
- **Action**: User installs OpenFang (`curl -fsSL https://openfang.sh/install | sh`), activates the Prefrontal Cortex Hand (`openfang hand activate kraken-prefrontal-cortex`). Hand runs on schedule.
- **Expected Output**: Hand fires every `analysis_interval_seconds`, reads Cortex DBs, produces analysis, writes improvements.
- **Risk**: If OpenFang is not installed or the Hand is not active, trajectories accumulate but are never analyzed. No improvement loop.
- **Mitigation**: PrefrontalCortexBrain detects that no improvements have been received in `2 * analysis_interval_seconds`. Logs warning. Surface monitoring tool (`get_prefrontal_status`) shows sync health. Kraken operates normally without the Hand — the loop degrades gracefully to "log only."

### Assumption 3: Execution Trajectories Are Complete and Valid
- **Action**: ExecutionTracer records every `tool.execute.after` and `chat.message` event. Trajectories stored as valid JSON in Cortex.
- **Expected Output**: Every agent task has a complete trajectory: ordered LLM messages + tool calls + SCF incidents + stats.
- **Risk**: If a tool call fails before `tool.execute.after` fires (e.g., process crash), the trajectory is incomplete. If an agent spawns a subagent that makes calls outside the tracer's scope, those calls are lost.
- **Mitigation**: Trajectories have `outcome: 'unknown'` for incomplete runs. `experimental.session.compacting` hook flushes any buffered trajectory data before compaction. Subagent calls within the same OpenCode process ARE captured (they go through the same hook chain). External subagent calls (separate Docker containers) are captured if the subagent also has the tracer plugin loaded.

### Assumption 4: FeedbackBrain LLM Has Sufficient Context Window
- **Action**: FeedbackBrain reads full execution trajectories (potentially 50KB+ each) and multiple generations of history. Must fit within LLM context window.
- **Expected Output**: FeedbackBrain receives complete analysis context: current trajectories + previous improvement history + Hive failure patterns.
- **Risk**: If trajectories across 6 Krakens × 3 clusters × multiple generations exceed context window, analysis is truncated and quality degrades.
- **Mitigation**: Trajectory content is truncated in Cortex: messages truncated to 4KB, tool results truncated to 8KB. FeedbackBrain processes one project per analysis cycle (not all 6 at once). Stats are aggregated; full trajectories only loaded when a deep-dive is triggered. Sonnet/Opus have 200K context windows — sufficient for 3-5 full trajectories + lineage history.

### Assumption 5: Improvement Proposals Are Safe to Apply
- **Action**: FeedbackBrain proposes changes to agent instructions, tools, and hooks. Sync Bridge applies them (auto for low-risk, manual review for high-risk).
- **Expected Output**: Applied improvements make agents more effective, not less. No breaking changes to existing API.
- **Risk**: If FeedbackBrain hallucinates harmful changes (removes critical tools, rewrites instructions to be confusing, introduces contradictions), agent performance degrades. Automatic application of bad changes could compound across generations.
- **Mitigation**: Every proposal includes a `RiskAssessment`. Low-risk proposals (instruction clarifications, adding tools) auto-apply. High-risk proposals (removing tools, fundamentally rewriting instructions) require manual review. All changes are reversible — the previous agent spec is preserved in `GenerationRecord.agentSpec`. Rollback plan documented in `RiskAssessment.rollbackPlan`. Merkle chain detects tampering.

### Assumption 6: The Evolutionary Loop Eventually Converges
- **Action**: Each generation's improvements produce strictly better agent performance. System converges on optimal harness within `maxGenerations` (default 10).
- **Expected Output**: Pipeline completes within maxGenerations with acceptance criteria met.
- **Risk**: FeedbackBrain makes the same ineffective changes repeatedly. Agents don't improve. Loop runs indefinitely.
- **Mitigation**: SCF STAGNATION arm detects repeated patterns — if 3+ generations propose identical changes with no metric improvement, escalates. `maxGenerations` hard cap (default 10, overridable to 20). `GenerationDelta` tracks what changed — if delta is empty (no actual changes), loop terminates with "unable to improve" status.

### Assumption 7: Cross-Project Patterns Are Transferable
- **Action**: FeedbackBrain identifies a pattern in Kraken A, determines it's applicable to Kraken B, and injects the fix.
- **Expected Output**: The fix from Kraken A resolves or prevents the same issue in Kraken B.
- **Risk**: False positive — pattern appears similar but has a different root cause. Applying an irrelevant fix wastes time or breaks things.
- **Mitigation**: `CrossProjectPattern.similarityScore` (0-100) computed from project context similarity (tech stack, agent types, task domain, cluster topology). Minimum threshold: 70 for proposal, 90 for auto-apply. Proposals with 70-89 similarity are "suggested" but not auto-applied. Human (or Kraken orchestrator) reviews before application.

---

## Layer 3: Actions — What We Must Build

### Phase 1: Foundation Types (P1)

**Files**: `src/brains/prefrontal/types.ts` (C5), `src/hydra/types.ts` (additions)

**Actions**:
1. Create `src/brains/prefrontal/types.ts` (~250 lines):
   - Add `ToolCallEntry` interface — toolName, args, result, error, durationMs, timestamps, isBash, blockedBy
   - Add `LLMMessageEntry` interface — role, content, toolCalls[], tokensUsed, derailmentFlags
   - Add `ExecutionTrajectory` interface — full agent execution record: messages, toolCalls, scfIncidents, stats, outcome, outputPaths
   - Add `GenerationRecord` interface — agentSpec, aggregatedTrajectories, evaluation, deltaFromPrevious
   - Add `AgentSpecAtGeneration` interface — instructions, tools, hooks, specHash
   - Add `AggregatedTrajectoryStats` interface — totalTasks, success/fail/blocked, byCluster breakdown
   - Add `GenerationEvaluation` interface — criteriaMet, criteriaProgress, metrics
   - Add `GenerationDelta` interface — instructionChanges, toolsAdded/Removed, hooksModified, metricDeltas, locDelta
   - Add `EvolutionLineage` interface — generations[], currentGeneration, acceptanceCriteria, synthesizedLearnings, merkleChainValid
   - Add `ImprovementProposal` interface — analysis, changes, weightCandidates, crossProjectSources, riskAssessment, status
   - Add `FeedbackAnalysis` interface — rootCauseAnalysis, instructionFlaws, toolGaps, hookIssues, confidenceScore
   - Add `HarnessUpdate` interface — updatedInstructions, toolsToAdd/Remove/Modify, hookChanges, hiveUpdates
   - Add `WeightUpdateCandidate` interface — trajectoryId, exampleType, trainingMessages, domainLabel, qualityScore
   - Add `CrossProjectPattern` interface — sourceProject, appliedFix, successMetrics, similarityScore
   - Add `RiskAssessment` interface — level, risks[], rollbackPlan, recommendedApproval
   - Add `SyncBridgeMessage` interface — direction, type, sourceKrakenId, payload, correlationId
   - Add `KrakenProjectRegistration` interface — projectId, cortexDbPath, modifiableFiles, autoApplyImprovements
   - Add `PrefrontalCortexState` interface — openfangInstances, registeredProjects, pendingProposals, lineages, syncStatus

2. Enhance `src/hydra/types.ts` (additions only, ~50 lines):
   - Re-export key Prefrontal Cortex types that Hydra components need: `ExecutionTrajectory`, `GenerationRecord`, `EvolutionLineage`, `ImprovementProposal`
   - Add `workflowId` and `generationNumber` to existing `WorkflowTask` if not present
   - **ZERO deletions**

**Gate**: `bun tsc --noEmit` passes with zero errors. All new types compile. Existing pressure tests (16/16) still pass.

### Phase 2: ExecutionTracer Plugin (P2)

**Files**: `src/brains/prefrontal/execution-tracer.ts` (C2), `plugins/opencode-prefrontal-tracer/src/index.ts` (C9), `plugins/opencode-prefrontal-tracer/package.json` (C10)

**Actions**:

1. Create `plugins/opencode-prefrontal-tracer/package.json`:
   - Dependencies: `@opencode-ai/plugin`, `zod`
   - Build: `bun build src/index.ts --outdir dist --target bun --format esm`
   - TypeScript config: strict mode, ES2022 target

2. Create `plugins/opencode-prefrontal-tracer/src/index.ts` (~180 lines):
   - Import: `tool`, `type Plugin`, `type Hooks` from `@opencode-ai/plugin`
   - Import: `z` from `zod`
   - Import: ExecutionTracer logic from kraken-agent's `execution-tracer.ts`
   - Register `tool.execute.after` hook: records tool call entry to Cortex
   - Register `chat.message` hook: records LLM message entry to Cortex
   - Register `experimental.session.compacting` hook: flushes buffer, writes partial trajectories
   - Tool: `get_execution_trajectory` — query trajectory by taskId/agentId
   - Tool: `get_session_trajectories` — query all trajectories for a session
   - Zero analysis in this plugin — recording only
   - Plugin name: `opencode-prefrontal-tracer`

3. Create `src/brains/prefrontal/execution-tracer.ts` (~200 lines):
   - Class: `ExecutionTracer`
   - Constructor: takes Cortex instance, sessionId
   - `initialize()`: ensure `execution_trajectories` table exists in Cortex
   - `recordToolCall(args, result, durationMs, error?)`: creates `ToolCallEntry`, appends to in-memory buffer, writes to Cortex when buffer size > 10 or on task completion
   - `recordLLMMessage(input, output)`: creates `LLMMessageEntry`, appends to buffer
   - `recordSCFIncident(incident)`: appends to trajectory's SCF incidents
   - `finalizeTrajectory(taskId, outcome, outputPaths)`: computes stats, writes complete trajectory to Cortex, clears buffer
   - `getTrajectory(trajectoryId)`: reads from Cortex
   - `getSessionTrajectories(sessionId)`: queries all trajectories for session
   - `flushBuffer()`: writes any buffered entries to partial trajectories (called on compaction)
   - Buffer management: max 50 entries in memory before forced flush

4. Wire ExecutionTracer into Kraken agent plugin's `src/index.ts`:
   - Import `ExecutionTracer` from `src/brains/prefrontal/execution-tracer.ts`
   - Initialize after HydraManager
   - Register as `tool.execute.after` hook (separate from existing firewall hook)
   - Register as `chat.message` hook
   - Configure as **pass-through** — never modifies input/output, never blocks

5. Add plugin to `opencode.json`:
   - 3rd entry in `"plugin"` array (after subagent-manager, kraken-agent)
   - Path: `file:///home/leviathan/OPENCODE_WORKSPACE/plugins/opencode-prefrontal-tracer/dist/index.js`

**Gate**: Plugin loads without errors. `bun run build` succeeds. Container test: plugin registered in tool list. `bun test src/tests/prefrontal-execution-tracer.test.ts` passes all unit tests.

### Phase 3: PrefrontalCortexBrain (P3)

**Files**: `src/brains/prefrontal/prefrontal-cortex-brain.ts` (C1), `src/brains/prefrontal/sync-bridge.ts` (C3), `src/brains/prefrontal/lineage-tracker.ts` (C4), `src/brains/prefrontal/index.ts` (C6)

**Actions**:

1. Create `src/brains/prefrontal/prefrontal-cortex-brain.ts` (~350 lines):
   - Class: `PrefrontalCortexBrain extends SystemBrainV2`
   - Private state: `syncBridge: SyncBridge`, `lineageTracker: LineageTracker`, `prefrontalState: PrefrontalCortexState`
   - Constructor: takes `StateStore`, `BrainMessenger`, `Cortex`, `HydraManager`
   - `initialize()`: calls `super.initialize()`, initializes SyncBridge, LineageTracker, registers self with Brain Messenger as `kraken-prefrontal`
   - `registerProject(registration)`: registers a Kraken project with the Prefrontal Cortex, stores in Cortex `prefrontal_registrations`, sends `register_project` sync message
   - `notifySessionComplete(sessionId, projectId)`: called when a session ends — triggers trajectory finalization, sends `new_trajectories_available` sync message
   - `ingestImprovementProposal(proposal)`: receives proposal from Sync Bridge, validates (checks merkle hash, risk assessment), stores in Cortex, adds to pending proposals
   - `applyImprovement(proposalId)`: applies an approved improvement — updates agent instructions via `config()` hook, adds/removes tools, modifies hooks, stores Hive updates
   - `getPendingProposals()`: returns all proposals with status 'proposed'
   - `getPrefrontalStatus()`: returns `PrefrontalCortexState`
   - `getEvolutionLineage(projectId)`: delegates to LineageTracker
   - `handleBrainMessage(message)`: processes sync-related brain messages, forwards to Sync Bridge
   - Extends SystemBrainV2: injects generation-aware context at decision points (overriding `getRelevantContextForDecision`)
   - Brain messenger subscription: listens for `task-complete`, `session-end`, `sync` messages

2. Create `src/brains/prefrontal/sync-bridge.ts` (~200 lines):
   - Class: `SyncBridge`
   - Manages bidirectional communication with OpenFang via Cortex `sync_bridge_queue` table
   - `sendMessage(message: SyncBridgeMessage)`: writes to Cortex sync queue
   - `pollForMessages(direction)`: reads from Cortex sync queue, returns unprocessed messages
   - `markDelivered(messageId)`: marks message as delivered in Cortex
   - `checkOpenfangConnectivity()`: verifies Hand is active by checking for recent messages
   - `registerWithOpenfang(projectRegistration)`: sends registration message
   - `ingestProposals()`: polls for incoming improvement proposals from OpenFang
   - `reportTrajectoriesAvailable(projectId, count)`: notifies OpenFang that new trajectories are ready
   - Protocol: JSON messages in `sync_bridge_queue` table. Kraken writes → OpenFang polls → OpenFang writes → Kraken polls. No network dependency.

3. Create `src/brains/prefrontal/lineage-tracker.ts` (~150 lines):
   - Class: `LineageTracker`
   - `getOrCreateLineage(projectId, acceptanceCriteria)`: creates new lineage if none exists, returns existing
   - `recordGeneration(generation)`: appends new generation to lineage, computes delta from previous, checks if best so far, updates lineage in Cortex
   - `computeDelta(prevGen, currentGen)`: generates `GenerationDelta` comparing two generations
   - `synthesizeLearnings(lineage)`: aggregates effective patterns, failed approaches, recurring failure modes across all generations
   - `getBestGeneration(lineage)`: returns the generation with highest evaluation metrics
   - `validateMerkleChain(lineage)`: verifies all merkle hashes chain correctly
   - `generateContextMd(lineage)`: generates SIA-style context.md with full evolution history for injection into FeedbackBrain prompts
   - `findCrossProjectPatterns(sourceProject, targetProjects[])`: queries Hive Mind for patterns from other projects that may apply

4. Create `src/brains/prefrontal/index.ts` (~30 lines):
   - Barrel exports: `PrefrontalCortexBrain`, `SyncBridge`, `LineageTracker`, all types

5. Enhance `src/brains/system/system-brain-v2.ts` (minimal additions, ~30 lines):
   - Add `onSessionEnd(sessionId)` method: triggers PrefrontalCortexBrain lifecycle
   - Add `getGenerationNumber()`: returns current generation for context injection
   - Add `hasPendingImprovements()`: checks if improvements are waiting
   - **ZERO deletions**, no modification of existing method signatures

**Gate**: `bun tsc --noEmit` passes with zero errors. All 4 new modules compile. PrefrontalCortexBrain singleton accessible via `createPrefrontalCortexBrain()`. Existing firewalls and SystemBrainV2 methods unaffected.

### Phase 4: Agent Tools + Context Hook (P4)

**Files**: `src/tools/prefrontal-tools.ts` (C7), `src/hooks/prefrontal-context-hook.ts` (C8), `src/index.ts` (enhancements)

**Actions**:

1. Create `src/tools/prefrontal-tools.ts` (~200 lines):
   - Tool: `get_execution_trajectory` — agent calls with `{ trajectoryId: string }` → returns full `ExecutionTrajectory`. Kraken orchestrator use: "show me what agent X did on task Y."
   - Tool: `get_evolution_lineage` — returns `EvolutionLineage` for current project. Shows generation history, what improved, what failed.
   - Tool: `check_improvement_proposals` — returns pending proposals. Agent can review and decide to apply.
   - Tool: `apply_improvement` — agent calls with `{ proposalId: string }` → applies the approved improvement. Requires confirmation for high-risk proposals.
   - Tool: `get_cross_project_patterns` — queries Hive for patterns from other Krakens that match current context. Returns `CrossProjectPattern[]`.
   - Tool: `report_execution_insight` — agent manually reports an insight discovered during execution: "I noticed that approach X worked better than approach Y." — stored in Hive.
   - All tools use `zod` for argument validation. All tools accessible to Kraken orchestrator agents (`kraken`, `kraken-executor`).

2. Create `src/hooks/prefrontal-context-hook.ts` (~120 lines):
   - Enhances existing Hydra context injection with Prefrontal Cortex data:
   - Inject generation number: "You are operating in Generation 3 of the evolutionary loop."
   - Inject pending improvements: "2 improvement proposals are pending review. Use check_improvement_proposals to see them."
   - Inject cross-project patterns: "Kraken project 'trident' encountered a similar task and found that pattern X improved accuracy by 12%."
   - Inject last FeedbackBrain analysis summary (truncated to 300 chars)
   - Inject lineage status: "Current best generation: 2 (accuracy: 87%). Your generation: 3."

3. Enhance `src/index.ts` (agent instructions, ~50 lines):
   - Add Prefrontal Cortex awareness to Kraken orchestrator instructions:
     ```
     PREFRONTAL CORTEX — You are part of an evolutionary loop.
     Your execution is recorded and analyzed to improve future agents.
     - Use check_improvement_proposals to see what the FeedbackBrain suggests.
     - Use get_evolution_lineage to see what worked in past generations.
     - Use get_cross_project_patterns to learn from other Krakens.
     - Your failures are NOT wasted — they train the next generation.
     ```
   - Add to cluster agent instructions (shorter):
     ```
     Your work is tracked by the Prefrontal Cortex. Every tool call
     and decision is recorded for evolutionary improvement.
     ```

4. Register new tools in `src/index.ts` config hook:
   - Add prefrontal tools to Kraken orchestrator agents' tool set
   - Add prefrontal context hook to system transform chain

**Gate**: Tools callable. Context injection includes generation awareness. `bun tsc --noEmit` passes.

### Phase 5: OpenFang Hand (P5)

**Files**: `hands/kraken-prefrontal-cortex/HAND.toml` (C11), `hands/kraken-prefrontal-cortex/SYSTEM_PROMPT.md` (C12), `hands/kraken-prefrontal-cortex/SKILL.md` (C13)

**Actions**:

1. Create `HAND.toml` (~80 lines):
   - Manifest as defined in 00_ARCHITECTURE.md Section 6
   - id, name, description, category, icon
   - tools: shell_exec, file_read, file_write, web_fetch
   - skills: 6 SKILL.md references
   - requires: sqlite3 binary
   - settings: analysis_interval_seconds, analysis_model, auto_apply_improvements, notify_channel
   - agent: provider=anthropic, model=claude-sonnet-4, max_tokens=8192, temperature=0.3
   - dashboard: 9 metrics

2. Create `SYSTEM_PROMPT.md` (~400 lines):
   - 4-phase operational playbook following SIA Feedback Agent pattern:
   - **PHASE 1: COLLECT** — Read Cortex DB across all registered projects. Query execution_trajectories for new entries. Load evaluation metrics. Check SCF incidents. Group by project/generation. Output: structured analysis context.
   - **PHASE 2: ANALYZE** — Apply SIA Feedback Agent framework:
     - Compare trajectories vs acceptance criteria
     - Identify structural instruction flaws
     - Match failures against Hive pattern database
     - Compare generation deltas: what changed and did it help?
     - Cross-reference across projects: has another Kraken solved this?
     - Identify weight update candidates (positive vs negative examples)
     - Output: improvement.md + agent_spec_update.md + hive_updates.json
   - **PHASE 3: PERSIST** — Compute Merkle hash. Append to lineage chain. Write files to Kraken project. Update Hive Mind.
   - **PHASE 4: DELIVER** — Write improvement to Context Management. Sync agent spec. Push Hive updates. Send notifications if configured.
   - Safety rules: NEVER remove critical tools (spawn_*, hive_*, get_cluster_status). NEVER propose changes that would disable the L0-L7 firewall. ALWAYS include rollback plan for high-risk changes. ALWAYS cite specific trajectory evidence for each proposed change.
   - Evolutionary lineage: track every proposal, every generation, every metric change. Build the context.md that agents can query.

3. Create `SKILL.md` (~300 lines):
   - **Kraken Brain Anatomy**: 4-brain architecture (Planning, Execution, System, Prefrontal Cortex). Brain Messenger API. Domain ownership table.
   - **Kraken Firewall Layers Reference**: L0-L7 with detection methods and actions. When proposing instruction changes, ensure they don't bypass firewalls.
   - **Kraken Agent Instruction Format**: How agent instructions are structured in `src/index.ts`. What fields are modifiable (instructions, tools, hooks) and what are not (identity, mode).
   - **Kraken Hive Mind Schema**: Table structure, query patterns, storage categories (patterns, failures, decisions, sessions).
   - **Cortex SQLite Table Layout**: execution_trajectories, evolution_lineages, generation_records, improvement_proposals, workflow_tasks, agents, discoveries, handoffs, scf_incidents, cluster_messages, micro_orchestrator_state.
   - **SIA Feedback Agent Pattern**: Meta → Target → Feedback 3-agent loop. Harness updates vs weight updates. Generation tracking. The `context.md` lineage pattern.
   - **Known Kraken Failure Modes**: L5 bash abuse, L1/L2 fire-and-forget, L4 wrong cluster assignment, SCF false completion, dual plugin loading, grep-as-verification, heredoc context injection breaking bash.
   - **Improvement Proposal Format**: JSON schema for improvement.md, agent_spec_update.md, hive_updates.json. Merkle hash computation. Risk assessment criteria.

**Gate**: `openfang hand validate kraken-prefrontal-cortex` passes. HAND.toml parses without errors. System prompt contains all 4 phases. SKILL.md contains all 7 domain sections.

### Phase 6: Integration + Tests (P6)

**Files**: `src/tests/prefrontal-execution-tracer.test.ts` (C14), `src/tests/prefrontal-sync-bridge.test.ts` (C15), `src/tests/prefrontal-lineage.test.ts` (C16), `src/tests/prefrontal-e2e.test.ts` (C17)

**Actions**:

1. Create `src/tests/prefrontal-execution-tracer.test.ts` (~250 lines):
   - Test 1: `recordToolCall` creates valid ToolCallEntry
   - Test 2: `recordLLMMessage` creates valid LLMMessageEntry
   - Test 3: Trajectory written to Cortex SQLite with `execution_trajectories` table
   - Test 4: Buffer flushes at 10 entries
   - Test 5: `finalizeTrajectory` computes correct stats
   - Test 6: `getTrajectory` retrieves complete trajectory from Cortex
   - Test 7: `getSessionTrajectories` returns all trajectories for session
   - Test 8: Multiple concurrent trajectories don't corrupt each other
   - Test 9: Tool call with error records error field correctly
   - Test 10: Tool call blocked by firewall records `blockedBy`
   - Test 11: `finalizeTrajectory` called before all tool calls recorded → outcome = 'unknown'
   - Test 12: Large tool result (16KB) gets truncated to 8KB

2. Create `src/tests/prefrontal-sync-bridge.test.ts` (~200 lines):
   - Test 1: `sendMessage` writes to Cortex sync queue
   - Test 2: `pollForMessages` reads correctly
   - Test 3: `markDelivered` updates status
   - Test 4: `registerWithOpenfang` sends correct registration payload
   - Test 5: `ingestProposals` parses improvement proposals from sync queue
   - Test 6: `reportTrajectoriesAvailable` sends correct notification
   - Test 7: Sync Bridge handles empty queue gracefully
   - Test 8: Sync Bridge handles malformed messages with error logging (doesn't crash)
   - Test 9: Multiple projects registered with different cortex paths
   - Test 10: `checkOpenfangConnectivity` detects active Hand (recent messages) vs inactive

3. Create `src/tests/prefrontal-lineage.test.ts` (~200 lines):
   - Test 1: `getOrCreateLineage` creates new lineage with correct defaults
   - Test 2: `recordGeneration` appends generation correctly
   - Test 3: `computeDelta` correctly identifies added/removed tools
   - Test 4: `computeDelta` correctly identifies instruction changes
   - Test 5: `getBestGeneration` returns generation with highest accuracy
   - Test 6: `synthesizeLearnings` aggregates patterns across generations
   - Test 7: `validateMerkleChain` passes for valid chain
   - Test 8: `validateMerkleChain` fails for tampered chain
   - Test 9: `generateContextMd` produces valid markdown with all generations
   - Test 10: Lineage with 10 generations doesn't overflow (performance test)
   - Test 11: `maxGenerations` exceeded → lineage status = 'capped'

4. Create `src/tests/prefrontal-e2e.test.ts` (~300 lines):
   - Full loop test: agent executes → trajectory logged → FeedbackBrain (simulated) analyzes → improvement proposed → improvement applied → next generation metrics improved
   - Test 1: Agent executes task → trajectory recorded in Cortex
   - Test 2: Trajectory contains messages + tool calls + stats
   - Test 3: Simulated FeedbackBrain reads trajectory, produces improvement
   - Test 4: Improvement stored in `improvement_proposals` table
   - Test 5: Sync Bridge delivers improvement to PrefrontalCortexBrain
   - Test 6: `applyImprovement` updates agent instructions
   - Test 7: Next generation agent uses updated instructions
   - Test 8: Evolution lineage tracks both generations
   - Test 9: Cross-project pattern shared between two simulated Krakens
   - Test 10: Bad improvement (tool removal) flagged as high risk, not auto-applied
   - Test 11: Merkle chain integrity maintained across full loop

5. Add 6 new SQLite tables to `Cortex.initialize()` (at end of method, after existing tables):
   - `execution_trajectories`, `evolution_lineages`, `generation_records`, `improvement_proposals`, `sync_bridge_queue`, `prefrontal_registrations`
   - All use `CREATE TABLE IF NOT EXISTS`
   - **ZERO changes to existing table definitions**

**Gate**: ALL new tests pass. ALL existing pressure tests (16/16) still pass. `bun test` runs complete test suite with 0 failures.

### Phase 7: Ship + Preserve (P7)

**Actions**:
1. Sync all new source files to `agent_plugin_boilerplates/Prefrontal-Cortex-Edition-v1.0/`
2. Create snapshot at `SHIP_PACKAGES/Prefrontal-Cortex-v1.0-PASSING-{YYYYMMDD}/`
3. Write `SHIP_MANIFEST.md` with full file inventory (17 new files, 4 enhanced files, 6 new tables)
4. Write `BUILD_STATE.md` with build phase status, test results, verification evidence
5. Update `COMPACTION_SURVIVAL.md` with session history and handover packages
6. Container TUI test report: prove plugin loads, hooks fire, trajectory recorded
7. Update `opencode.json` documentation with new plugin entry
8. Record to Hive Mind: `kraken-prefrontal-cortex-v1.0-ship`

**Gate**: All code committed, preserved, documented. SHIP_MANIFEST enumerates every file with line counts. Container TUI test shows tracer hooks firing.

---

## Layer 4: Observations — Expected vs Actual

| Checkpoint | Expected | What To Verify |
|---|---|---|
| O1: types.ts compiles | Zero errors, all types referenceable | `bun tsc --noEmit` |
| O2: ExecutionTracer records tool call | ToolCallEntry in Cortex SQLite with correct fields | `bun test src/tests/prefrontal-execution-tracer.test.ts` — Test 1 |
| O3: Trajectory buffer flushes at threshold | Buffer empties at 10 entries, all written to Cortex | `bun test src/tests/prefrontal-execution-tracer.test.ts` — Test 4 |
| O4: Sync Bridge registers project | Registration entry in Cortex `prefrontal_registrations` | `bun test src/tests/prefrontal-sync-bridge.test.ts` — Test 4 |
| O5: Sync Bridge ingests proposal | ImprovementProposal object parsed from sync queue | `bun test src/tests/prefrontal-sync-bridge.test.ts` — Test 5 |
| O6: Evolution lineage tracks 3 generations | Lineage object with 3 generations, correct deltas | `bun test src/tests/prefrontal-lineage.test.ts` — Tests 2-4 |
| O7: Merkle chain detects tampering | `validateMerkleChain` returns false after hash mismatch | `bun test src/tests/prefrontal-lineage.test.ts` — Test 8 |
| O8: Full E2E loop: execute → log → analyze → improve → re-execute | Metrics improve from Gen 1 to Gen 2 | `bun test src/tests/prefrontal-e2e.test.ts` — Tests 1-8 |
| O9: Existing pressure tests unaffected | 16/16 pass, 0 new failures | `bun test src/tests/hydra-pressure.test.ts` |
| O10: Plugin loads in container | Tracer hooks appear in tool list, plugin registered | Container TUI test: `capture-pane` output shows `opencode-prefrontal-tracer` |
| O11: Trajectory recorded at runtime | Real tool call produces trajectory in Cortex | Container TUI test: call a tool, query Cortex via `sqlite3` |
| O12: OpenFang Hand validates | `openfang hand validate` passes on HAND.toml | Run validation command against Hand directory |
| O13: L5 pattern injected at runtime | PFC-discovered regex blocks tool in real-time | `bun test src/tests/prefrontal-firewall-injection.test.ts` |
| O14: Planning Brain queries PFC for decomposition | Query returns evidence-based cluster + subtask guidance | `bun test src/tests/prefrontal-e2e.test.ts` — Test 12 |
| O15: Gradual rollout: Phase 1 (L5) complete before Phase 2 (triggers) | L5 patterns working, decision triggers not yet wired | Check BUILD_STATE.md phase gates |

---

## Layer 5: Patterns — What Should Have Been Done Differently

### Patterns Learned From v1.3 System Brain Overhaul

1. **Grep-on-bundle is not verification.** The v1.3 session declared "all 16 firewall layers present" based on grep symbol matches in the compiled bundle. Zero of those symbols were exercised at runtime. Every P2-P5 gate must include a RUNTIME test, not a grep check.

2. **In-place editing of proven files is dangerous.** Attempting to add methods directly to `system-brain.ts` broke bun's parser with "Unexpected :" — the root cause was never identified because the fix was "extract to separate file extending SystemBrain." The PrefrontalCortexBrain MUST extend SystemBrainV2 in a separate file. Never modify `system-brain.ts` or `system-brain-v2.ts` directly from this point forward.

3. **Plan mode prevents verification.** The v1.3 session claimed "Tools ✅ PASS" and "L5 hook verified" based on model responses in Plan mode — where NO tool can execute and NO hook can fire. Every firewall and tool verification MUST happen in a Build mode container where tools and hooks actually execute.

4. **Dynamic context injection without trajectory analysis is surface-level.** SystemBrainV2's `identifyDecisionPoint()` scans the message for spawn/build/fix keywords and injects related past decisions. This is reactive and shallow — it can't answer "did the fix we applied last session actually work?" The Prefrontal Cortex's trajectory analysis adds the missing depth.

5. **Fire-and-forget is the root failure of Kraken itself.** The orchestrator's #1 rule (Kraken Rule #1) applies to the orchestrator: "Output retrieval is mandatory — spawn → track → retrieve → verify → merge." Kraken enforces this on agents but never applied it to itself — the orchestrator never retrieved its own execution data to learn from it.

### Patterns For This Build

| Anti-Pattern | Correct Pattern |
|---|---|
| Verify by grep on bundle strings | Verify by runtime execution in container TUI |
| Modify proven source files in-place | Extend via inheritance in separate files |
| Test hooks in Plan mode | Test hooks in Build mode with real tool execution |
| Dynamic context from text matching only | Deep analysis from execution trajectories |
| Hive Mind as passive pattern store | Hive Mind as subconscious that PFC reads + consolidates |
| One-shot builds with manual fixes | Multi-generation evolutionary improvement loop |
| Single-Kraken learning | Cross-Kraken pattern synthesis across 6 Krakens |
| Claim improvement without metric delta | GenerationDelta with before/after metrics |
| Spawn agents without recording behavior | ExecutionTracer on every tool call + LLM message |
| PFC operating in isolation | PFC wired into ALL brains: System (nervous), Planning (strategy), Hive (subconscious), Execution (supervision) |
| Wire everything at once | Gradual rollout: L5 patterns → decision triggers → SCF thresholds |
| Planning Brain generates plans from scratch | Planning Brain draws on PFC for evidence-based decomposition guidance |
| Firewall patterns written by humans | Firewall patterns discovered + injected by PFC analysis at runtime |

---

## Layer 6: Meta-Reflection — Architecture Verification

### How To Confirm This Architecture Works

**Phase 1-5 verification**: Automated tests prove the mechanics:
- ExecutionTracer records trajectories correctly (12 tests)
- Sync Bridge communicates bidirectionally (10 tests)
- Lineage Tracker manages evolution correctly (11 tests)
- PrefrontalCortexBrain integrates with all 3 other brains
- All existing pressure tests (16/16) still pass

**Phase 6 verification**: Container TUI test proves the runtime:
- Plugin loads in opencode 1.14.34 container
- Tracer hooks fire on real tool calls
- Trajectories persisted to Cortex SQLite
- Hand validates and can read Cortex

**Phase 7 verification**: Live feedback loop:
- Execute a real task with an agent
- Verify trajectory recorded in Cortex
- Simulate or run FeedbackBrain analysis
- Verify improvement proposal generated
- Apply improvement to agent harness
- Execute again with improved agent
- Verify metrics improved between generations
- Verify Merkle chain integrity

**The architecture is verified when**:
1. All P1-P6 automated tests pass
2. Container TUI test shows tracer hooks firing
3. A complete generation loop executes: agent → trajectory → analysis → improvement → re-execute with improved metrics
4. The 16/16 existing pressure tests still pass (no regression)
5. Cross-project pattern synthesized from two simulated Krakens
6. Merkle chain verified across all generations

### Architecture Totals

| Metric | Count |
|---|---|
| New source files (Kraken plugin) | 7 (prefrontal-cortex-brain, execution-tracer, sync-bridge, lineage-tracker, types, index, prefrontal-tools) |
| New source files (standalone tracer plugin) | 2 (index.ts, package.json) |
| New OpenFang Hand files | 3 (HAND.toml, SYSTEM_PROMPT.md, SKILL.md) |
| New hook files | 1 (prefrontal-context-hook.ts) |
| Enhanced existing files | 4 (hydra/types.ts, system-brain-v2.ts, context hook, index.ts instructions) |
| New test files | 4 (execution-tracer, sync-bridge, lineage, e2e) |
| New SQLite tables | 6 |
| New agent tools | 6 (get_execution_trajectory, get_evolution_lineage, check_improvement_proposals, apply_improvement, get_cross_project_patterns, report_execution_insight) |
| Total new test assertions | ~70 |
| Agent instruction lines rewritten | ~15 lines per agent × 2 orchestrator agents |
| Total lines of new code | ~2,080 (7 source + 3 Hand + 4 tests) |
| Total lines of change | ~2,230 (new code + enhancements) |
| Bundle size increase | ~25KB (estimated: lightweight, mostly types + glue code) |

---

*END 01_BUILD_SPEC.md — Trident Deep Planning Layer 1-6 Complete*
