# Prefrontal Cortex — Domain Expertise Reference

## 1. Kraken Brain Anatomy

### 4-Brain Architecture

| Brain | Role | Domain |
|---|---|---|
| **Planning Brain** | T1 generation, task decomposition, context bridging | `kraken-planning` |
| **Execution Brain** | Output retrieval verification, task supervision, delegation | `kraken-execution` |
| **System Brain** (v1.2 + v2.0) | L0-L7 firewall, gate evaluation, dynamic context injection, SCF | `kraken-system` |
| **Prefrontal Cortex** (NEW) | Evolutionary optimization, trajectory analysis, pattern synthesis | `kraken-prefrontal` |

### Brain Messenger API

Inter-brain communication via `BrainMessenger`:
- `deliverMessage(from, to, type, payload, priority)`
- Message types: `context-inject`, `gate-failure`, `checkpoint`, `override`, `sync`
- Subscription: `brain.subscribe('kraken-prefrontal', handler)`
- Domain ownership enforced: each brain can only write to its own domains

### Domain Ownership

Each brain owns specific state domains:
- `kraken-planning`: `t1-state`, `t2-state`, `workflow-state`
- `kraken-execution`: `task-state`, `delegation-state`, `output-state`
- `kraken-system`: `gate-state`, `firewall-state`, `scf-state`, `session-state`
- `kraken-prefrontal`: `prefrontal-state`, `trajectory-state`, `lineage-state`, `sync-state`

---

## 2. Kraken Firewall Layers Reference

| Layer | Name | Detection | Action |
|---|---|---|---|
| L0 | Identity Wall | Agent identity verification | Block if identity mismatch |
| L1 | Orchestration Theater | Assigned ≠ Done check | Block false assignment claims |
| L2 | False Completion | Proof required for completion | Block "done" without evidence |
| L3 | Output Inspection | Verify output exists on host | Block if output file missing |
| L4 | Wrong Cluster | Domain validation | Block if task type mismatches cluster |
| L5 | Macro Derailment | 15+ pattern detectors (regex) | Block bash abuse, fire-and-forget, etc. |
| L6 | Kraken Protection | Zone enforcement | Protect core Kraken infrastructure |
| L7 | Coordination Gates | Task/retrieval/sync gates | Block uncoordinated cross-cluster ops |

### L5 Derailment Patterns (injection target)

The PFC injects new regex patterns into L5's `derailment-patterns.ts` at runtime:
- Pattern format: `{ regex: RegExp, name: string, action: 'warn' | 'block' }`
- Patterns fire at `tool.execute.before` speed — zero PFC latency
- Example: `docker\s+(run|exec).*--rm(?!.*--name)` — blocks unnamed containers

### When Proposing Instruction Changes

Ensure proposed changes do NOT bypass firewalls:
- L0-L7 are always enforced, regardless of agent instructions
- Agent instructions can ADD constraints, never REMOVE them
- If an instruction says "always verify output", L3 will still independently verify

---

## 3. Kraken Agent Instruction Format

Agent instructions are defined in `src/index.ts` via the `config()` hook:

```typescript
sdkConfigs[agentId] = {
  name: agentId,
  description: agent.description,
  instructions: agent.instructions,  // <-- modifiable
  mode: 'primary' | 'subagent',
  permission: { task: 'allow' },
  tools: getAgentTools(agentId),     // <-- modifiable
};
```

### What's Modifiable

| Field | Modifiable? | How |
|---|---|---|
| `instructions` | Yes | Full text replacement via agent_spec_update.md |
| `tools` | Yes | Add/remove tools from agent's tool set |
| `mode` | No | Fixed: primary for kraken, subagent for all others |
| `permission` | No | Always `{ task: 'allow' }` |
| `name` | No | Identity, not configurable |

### Agent Types

- **kraken**: Primary orchestrator, full Hive access, all tools
- **kraken-executor**: Execution coordinator, Hive access, delegation tools
- **shark-alpha-1/2**: Steamroll agents, T2 tools only
- **manta-alpha-1**: Precision agent, T2 tools only
- **shark-beta-1**: Balanced agent, T2 tools only
- **manta-beta-1/2**: Precision agents, T2 tools only
- **manta-gamma-1/2**: Debug specialists, T2 tools only
- **shark-gamma-1**: Steamroll specialist, T2 tools only

---

## 4. Kraken Hive Mind Schema

### Storage Categories

| Category | Purpose | Examples |
|---|---|---|
| `pattern` | Reusable solutions | "docker --name pattern prevents container loss" |
| `failure` | Known failure modes | "ENOENT from missing path injection" |
| `decision` | Architectural decisions | "CortexStore uses JSON not SQLite for Node.js compat" |
| `breakthrough` | Major discoveries | "safeHook blocks tool.execute.* hooks" |
| `session` | Session summaries | "ses_18bf: L5 derailment analysis" |
| `cluster` | Cluster-level context | "alpha-cluster: optimized for build tasks" |

### Query Patterns

```typescript
kraken_hive_search({ query: "docker networking", category: "patterns" })
kraken_hive_search({ query: "bash abuse derailment", category: "failures" })
kraken_hive_remember({ key: "pattern-name", content: "...", category: "pattern" })
```

### Cross-Project Synthesis

The PFC reads Hive entries from all registered Krakens. Patterns with cross-project validation (seen in 2+ projects) get elevated confidence scores.

---

## 5. Cortex Table Layout

### execution_trajectories
| Column | Type | Description |
|---|---|---|
| trajectory_id | TEXT PK | Unique trajectory identifier |
| session_id | TEXT | Session this trajectory belongs to |
| agent_id | TEXT | Agent that executed |
| agent_type | TEXT | 'shark' or 'manta' |
| cluster_id | TEXT | Cluster that handled the task |
| task_id | TEXT | Task identifier |
| messages | TEXT (JSON) | LLMMessageEntry[] |
| tool_calls | TEXT (JSON) | ToolCallEntry[] |
| scf_incidents | TEXT (JSON) | SCFIncident[] |
| stats | TEXT (JSON) | TrajectoryStats |
| outcome | TEXT | 'success', 'failure', 'blocked', 'timeout', 'unknown' |
| output_paths | TEXT (JSON) | string[] |
| analyzed_at | TEXT | When FeedbackBrain analyzed this |

### evolution_lineages
| Column | Type | Description |
|---|---|---|
| lineage_id | TEXT PK | Unique lineage identifier |
| project_id | TEXT | Project this lineage tracks |
| generations | TEXT (JSON) | GenerationRecord[] |
| current_generation | INTEGER | Current gen number |
| max_generations | INTEGER | Cap (default 10) |
| acceptance_criteria | TEXT (JSON) | string[] |
| synthesized_learnings | TEXT (JSON) | Aggregated insights |
| merkle_chain_valid | INTEGER | 1 if chain integrity holds |

### generation_records
| Column | Type | Description |
|---|---|---|
| generation_id | TEXT PK | Unique generation identifier |
| lineage_id | TEXT FK | Parent lineage |
| generation_number | INTEGER | Gen N |
| agent_spec | TEXT (JSON) | AgentSpecAtGeneration |
| aggregated_stats | TEXT (JSON) | AggregatedTrajectoryStats |
| evaluation | TEXT (JSON) | GenerationEvaluation |
| delta_from_previous | TEXT (JSON) | GenerationDelta or null |
| merkle_hash | TEXT | Hash linking to previous gen |

### improvement_proposals
| Column | Type | Description |
|---|---|---|
| proposal_id | TEXT PK | Unique proposal identifier |
| lineage_id | TEXT FK | Parent lineage |
| generation_number | INTEGER | Gen this proposal targets |
| trigger_type | TEXT | 'schedule', 'session_complete', 'gate_failure', 'manual' |
| analysis | TEXT (JSON) | FeedbackAnalysis |
| harness_changes | TEXT (JSON) | HarnessUpdate |
| risk_assessment | TEXT (JSON) | RiskAssessment |
| status | TEXT | 'proposed', 'approved', 'applied', 'rejected' |
| merkle_hash | TEXT | Audit hash |

### sync_bridge_queue
| Column | Type | Description |
|---|---|---|
| message_id | TEXT PK | Unique message identifier |
| direction | TEXT | 'afferent' or 'efferent' |
| type | TEXT | Message type |
| payload | TEXT (JSON) | Message payload |
| status | TEXT | 'pending', 'delivered', 'error' |

### prefrontal_registrations
| Column | Type | Description |
|---|---|---|
| project_id | TEXT PK | Registered project identifier |
| project_name | TEXT | Human-readable name |
| cortex_db_path | TEXT | Path to Cortex database |
| auto_apply_improvements | INTEGER | 1 if auto-apply enabled |
| registered_at | TEXT | Registration timestamp |

---

## 6. SIA Feedback Agent Pattern

### The 3-Agent Loop

```
Meta-Agent → target_agent.py → Execution → trajectory.json → Feedback Agent → new target_agent.py
```

In Kraken:
1. **Planning Brain** = SIA's Meta-Agent (creates WorkflowPlan = target_agent.py)
2. **Cluster Agents** = SIA's Target Agent (execute tasks, produce trajectories)
3. **Prefrontal Cortex (FeedbackBrain)** = SIA's Feedback Agent (analyzes trajectories, proposes improvements)

### Key SIA Insight

**Combining harness updates (agent instructions, tools, hooks) with weight updates (fine-tuning data) outperforms either alone.**

- Harness updates: Immediate effect, low cost, reversible
- Weight updates: Delayed effect, high cost (training pipeline), permanent
- PFC collects weight candidates but does NOT apply them (separate process)

### Generation Tracking

Each generation records:
- What the agent spec looked like (instructions, tools, hooks)
- What happened during execution (trajectories, metrics, incidents)
- What changed from the previous generation (delta)
- Whether metrics improved (evaluation)
- Cryptographic chain integrity (Merkle hash)

### The context.md Pattern

SIA's `context.md` tracks evolution history. Kraken's equivalent is `EvolutionLineage.synthesizedLearnings`:
- Effective patterns: what worked
- Failed approaches: what didn't work
- Recurring failure modes: what keeps failing
- Cross-project insights: what other Krakens learned

---

## 7. Known Kraken Failure Modes

### L5 Bash Abuse
**Pattern**: Agent runs 40+ sequential bash commands without calling any Kraken orchestration tool.
**Detection**: `bashToolCalls > 10 && krakenToolCalls === 0`
**Root cause**: Agent instructions don't prioritize Kraken tools over raw bash.
**Fix**: Inject "ALWAYS prefer Kraken tools over raw bash" into instructions. Add L5 regex pattern.

### Fire-and-Forget (L1/L2)
**Pattern**: Agent spawns subagent but never retrieves output.
**Detection**: `spawn_calls > 0 && output_retrieval_calls === 0`
**Root cause**: Agent instructions don't emphasize output retrieval as mandatory.
**Fix**: Strengthen "Output retrieval is mandatory" in instructions. Lower L2 threshold for spawn-related tasks.

### Wrong Cluster Assignment (L4)
**Pattern**: Build task sent to Gamma (test cluster) or test task sent to Alpha (build cluster).
**Detection**: `taskType !== expectedClusterType`
**Root cause**: Planning Brain decomposition doesn't consider cluster specialization.
**Fix**: Add cluster preference mapping to Planning Brain context. Inject PFC-learned preferences.

### SCF False Completion
**Pattern**: Agent claims "done" or "success" without producing evidence.
**Detection**: `completion_keywords > 0 && output_files === 0`
**Root cause**: Agent optimizes for claiming completion rather than producing verifiable output.
**Fix**: Lower FALSE_COMPLETION threshold for agents with high false completion rates. Add "NEVER claim done without listing output files" to instructions.

### Dual Plugin Loading
**Pattern**: Same hook fires twice because plugin is loaded both as standalone and embedded.
**Detection**: Duplicate hook logs in tmux output.
**Root cause**: Plugin registered in both opencode.json and embedded in kraken-agent.
**Fix**: Ensure plugin loads from single source. Check opencode.json for duplicates.

### Grep-as-Verification
**Pattern**: Agent declares code "verified" based on string matching in compiled bundle.
**Detection**: `verification_method === 'grep' && runtime_test === false`
**Root cause**: Agent instructions don't distinguish between static and runtime verification.
**Fix**: Add "Grep on bundle is NOT verification. Test hooks in Build mode with real tool execution." to instructions.

### Heredoc Context Injection Breaking Bash
**Pattern**: Agent uses heredoc to inject context into bash commands, breaking shell parsing.
**Detection**: `bash_command.includes('<<') && bash_error === true`
**Root cause**: Heredoc syntax conflicts with agent context injection format.
**Fix**: Use dedicated context injection hooks instead of heredoc. Add L5 pattern to warn on heredoc usage.

---

*End of SKILL.md — Prefrontal Cortex Domain Expertise Reference*
