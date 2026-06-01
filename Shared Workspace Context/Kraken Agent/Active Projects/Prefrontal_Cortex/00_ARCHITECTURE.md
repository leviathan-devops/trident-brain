# Prefrontal Cortex — Full Architecture Document

**Status**: PLAN COMPLETE — Ready for Build
**Target**: Kraken Prefrontal Cortex v1.0 — SIA-style Evolutionary Optimization Brain
**Depends on**: SystemBrain v1.2 (L0-L7 firewall), SystemBrainV2 (dynamic context injection), Hive Mind v2.2.0 (pattern store), Hydra v1.0 (manufacturing pipeline)
**Integrates with**: OpenFang v0.6.9 (Hand system, WASM sandbox, Merkle audit), SIA (Meta → Target → Feedback 3-agent loop)
**Builder Model**: MiMo 2.5 Pro / GLM 5.1 / Sonnet

---

## 1. SURFACE — What This Is

Kraken's Prefrontal Cortex is the **4th brain** — an evolutionary optimization engine that fuses the SIA self-improving AI pattern with Kraken's existing System Brain + Hive Mind. It operates as a hybrid architecture:

- **In-process (Kraken Plugin)**: The ExecutionTracer — a lightweight hook recording structured execution trajectories to Cortex SQLite on every tool call and LLM message. Real-time, zero-latency, synchronous.
- **Out-of-process (OpenFang Hand)**: The FeedbackBrain — an autonomous scheduled agent running the SIA Feedback Agent pattern. Reads accumulated trajectories across ALL Kraken sessions, performs deep analysis with a high-capability LLM (Sonnet/Opus-level), proposes structural improvements to agent harnesses, and tracks evolutionary lineage.

### The Biological Architecture: Nervous System + Prefrontal Cortex

The Kraken intelligence stack maps directly to the human nervous system architecture:

```
┌──────────────────────────────────────────────────────────────────┐
│               PREFRONTAL CORTEX (Neural Intelligence)             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ FEEDBACKBRAIN (OpenFang Hand) — Executive Function            ││
│  │  • Deliberate reasoning about agent behavior                  ││
│  │  • Pattern synthesis across time and projects                ││
│  │  • Decides WHAT to change in the agent architecture           ││
│  │  • Risk assessment before applying changes                   ││
│  └──────────────────────────┬───────────────────────────────────┘│
│                              │                                     │
│  ┌──────────────────────────┼───────────────────────────────────┐│
│  │ LINEAGE TRACKER (Hippocampus) — Memory Consolidation          ││
│  │  • Generational tracking: what changed and did it work?       ││
│  │  • Cross-project pattern synthesis                            ││
│  │  • Merkle hash-chain integrity                                ││
│  └──────────────────────────┼───────────────────────────────────┘│
│                              │                                     │
│  ┌──────────────────────────┼───────────────────────────────────┐│
│  │ HARNESS UPDATER (Dorsolateral PFC) — Working Memory            ││
│  │  • Modifies agent instructions, tools, hooks                  ││
│  │  • Preserves previous spec for rollback                       ││
│  │  • Applies changes to agent architecture                      ││
│  └──────────────────────────┼───────────────────────────────────┘│
└──────────────────────────────┼────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   WHITE MATTER      │
                    │   (Sync Bridge)     │
                    │                     │
                    │  AFFERENT (UP):     │
                    │  • Trajectories     │
                    │  • Metrics          │
                    │  • SCF incidents    │
                    │                     │
                    │  EFFERENT (DOWN):   │
                    │  • Firewall patterns│
                    │  • Decision triggers│
                    │  • SCF thresholds   │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────┼────────────────────────────────────┐
│            NERVOUS SYSTEM (System Brain v1.2 + v2.0)               │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ EXECUTION TRACER (Sensory Neurons — Afferent)                 ││
│  │  • Records every tool call, LLM message, SCF incident        ││
│  │  • Sends structured data upward to PFC for analysis           ││
│  │  • Pass-through: never blocks, never modifies                 ││
│  └──────────────────────────┬───────────────────────────────────┘│
│                              │                                     │
│  ┌──────────────────────────┼───────────────────────────────────┐│
│  │ L0-L7 FIREWALL (Spinal Cord / Brainstem — Reflexive)         ││
│  │  • L0 Identity Wall: who is calling?                         ││
│  │  • L1 Orchestration Theater: assigned ≠ done                 ││
│  │  • L2 False Completion: proof required                       ││
│  │  • L3 Output Inspection: verify on host                      ││
│  │  • L4 Wrong Cluster: domain validation                       ││
│  │  • L5 Macro Derailment: 15+ pattern detectors                ││
│  │  • L6 Kraken Protection: zone enforcement                    ││
│  │  • L7 Coordination Gates: task/retrieval/sync gates          ││
│  │  • ALL reflexive: zero cognition, instant block              ││
│  └──────────────────────────┬───────────────────────────────────┘│
│                              │                                     │
│  ┌──────────────────────────┼───────────────────────────────────┐│
│  │ SCF (Autonomic Nervous System)                                ││
│  │  • STAGNATION arm (3 repeats → warning): sympathetic          ││
│  │  • CONTEXT_DECAY (5 misses → warning): parasympathetic fail   ││
│  │  • FALSE_COMPLETION ("done" without evidence → flag): immune  ││
│  │  • Auto-isolation: fight/flight response to pathogens         ││
│  └──────────────────────────┬───────────────────────────────────┘│
│                              │                                     │
│  ┌──────────────────────────┼───────────────────────────────────┐│
│  │ DYNAMIC CONTEXT INJECTION (Interneurons — Local Processing)   ││
│  │  • identifyDecisionPoint(): detects when agent is about to act││
│  │  • getRelevantContextForDecision(): injects past decisions    ││
│  │  • Strike tracking: counts violations, triggers escalation   ││
│  │  • Operates at decision speed, no PFC involvement needed     ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ BRAIN MESSENGER (Thalamus — Sensory Relay)                    ││
│  │  • Routes all inter-brain signals                             ││
│  │  • context-inject, gate-failure, checkpoint, override, sync  ││
│  │  • Filters: only relevant signals reach each brain           ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### How the Wiring Works

The human nervous system and prefrontal cortex communicate through specific
white matter tracts. Kraken mirrors this precisely:

| Biological Pathway | Kraken Mechanism | What Flows |
|---|---|---|
| **Ascending sensory tracts** (spinothalamic, dorsal column) | ExecutionTracer → Cortex SQLite → OpenFang reads | Trajectories, tool calls, LLM messages, SCF incidents, metrics — everything that happened |
| **Descending motor tracts** (corticospinal, corticobulbar) | OpenFang writes → Sync Bridge → PrefrontalCortexBrain.applyImprovement() | Updated firewall patterns, new decision triggers, recalibrated SCF thresholds |
| **Thalamocortical loops** | Brain Messenger: `kraken-system` ↔ `kraken-prefrontal` | Gate status, task completion, session lifecycle events |
| **Autonomic modulation** | SCF threshold recalibration via PFC analysis | STAGNATION counter thresholds, FALSE_COMPLETION sensitivity, CONTEXT_DECAY window |
| **Reflex arc modulation** | L5 pattern injection into derailment-patterns.ts | New regex patterns that fire at `tool.execute.before` speed — zero PFC latency |

### The Gradual Rollout: Start Small

The nervous system is the execution layer. The PFC is the intelligence that tunes it.
But you don't wire every connection at once:

```
PHASE 1: Corticospinal tract (L5 pattern injection)
  → PFC discovers a derailment pattern → injects regex into L5
  → System Brain now blocks this pattern in real-time
  → SIMPLEST mechanism, highest immediate impact
  → Target: reduce bash abuse derailments by 80% within 3 generations

PHASE 2: Thalamocortical loops (decision point triggers)
  → PFC discovers that failures cluster around "spawn" decisions
  → Injects new trigger into identifyDecisionPoint()
  → SystemBrainV2 injects context BEFORE agent makes spawning mistake
  → Target: reduce wrong-cluster assignments by 50%

PHASE 3: Autonomic modulation (SCF threshold recalibration)
  → PFC discovers FALSE_COMPLETION fires too late (agents already wasted 5 turns)
  → Lowers threshold from 3 to 2 for specific tool types
  → SCF isolates failing agents faster
  → Target: reduce fire-and-forget waste by 60%
```

### The Octopus RNA Editing Analogy

Hydra v1.0 described Kraken's architecture as an octopus:
- **Kraken (central brain)**: Strategic planning, cross-cluster coordination — 30% of neural activity
- **Micro Orchestrators (arm ganglia)**: Each cluster has its own mini-brain — 70% of neural activity

The octopus also has a capability no vertebrate possesses — and it maps to the
harness-editing mechanism that the PFC uses:

**Cephalopod RNA editing.** Octopuses recode neural proteins on the fly by editing mRNA
transcripts. Over 60% of their neural transcripts are edited — compared to <1% in humans.
This is **experience-driven**, **targeted**, **reversible**, and **neural-enriched**.

The Kraken Prefrontal Cortex mirrors this at the agent architecture level:

| Octopus RNA Editing | Kraken Prefrontal Cortex |
|---|---|
| **DNA** — the genome, fixed and protected | **Core source code** — `system-brain.ts`, `firewall/`, `Cortex.ts`, `SCF.ts`. Never modified by the PFC. |
| **RNA** — transcribed from DNA, expressed at runtime, editable | **Agent harness** — instructions, tool definitions, hook configurations. Expressed at runtime, modifiable based on experience. |
| **ADAR enzymes** — scan mRNA, deaminate adenosine to inosine at specific sites | **FeedbackBrain (OpenFang Hand)** — scans execution trajectories, identifies specific instruction flaws, tool gaps, hook issues |
| **A-to-I editing** — targeted recoding of specific codons, not random mutation | **Harness updates** — targeted instruction rewrites, tool additions/removals, hook modifications. Specific changes with evidence, not random experimentation. |
| **Neural-enriched** — editing concentrated in nervous system transcripts | **Agent-enriched** — modifications concentrated in agent behavior layer (instructions, tools, hooks), not infrastructure |
| **Experience-driven** — editing increases under environmental pressure (temperature, salinity) | **Trajectory-driven** — analysis triggered by failure patterns, SCF incidents, metric regressions |
| **Reversible** — RNA is transient; the genome remains the stable reference | **Rollback-able** — every change preserved in `GenerationRecord.agentSpec`. Previous harness restorable. Merkle chain detects unauthorized modifications. |
| **Rapid adaptation** — functional changes within hours, no generational evolution needed | **Rapid improvement loop** — analyze → propose → apply → verify within one cycle. No waiting for human code review. |

The Prefrontal Cortex is Kraken's **ADAR system** — an enzyme-like process that scans the
expressed agent architecture, identifies sites where small targeted edits would improve
function, applies them, and verifies the result.

But the PFC is more than the ADAR enzyme. It is the **central intelligence** that every other
brain draws upon. The biological model is a cephalopod-human hybrid:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE OCTOPUS BODY (Distributed Execution)                  │
│                                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                   │
│  │  ALPHA   │  │   BETA   │  │  GAMMA   │   ← 3 autonomous clusters          │
│  │ Steamroll│  │ Precision│  │  Testing │     each with micro-orchestrator    │
│  │          │  │          │  │          │     arms = ganglia with own brains  │
│  │ 3 agents │  │ 3 agents │  │ 3 agents │     suckers = individual agents     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘     decisions made at arm level     │
│       │             │             │                                           │
│       └─────────────┼─────────────┘                                           │
│                     │                                                         │
│              ┌──────┴──────┐                                                  │
│              │   KRAKEN    │  ← Central brain: direction only                  │
│              │ (Planning + │     "swim that way" — never micromanages         │
│              │  Execution) │     arms decide HOW to execute                   │
│              └──────┬──────┘                                                  │
│                     │                                                         │
│  OCTOPUS CAPABILITY: RNA editing — recode proteins on the fly                 │
│  KRAKEN EQUIVALENT: PFC harness editing — recode agent behavior on the fly    │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              │  Sensory data flows UP (trajectories, metrics)
                              │  Motor commands flow DOWN (patterns, thresholds)
                              │
┌─────────────────────────────┼───────────────────────────────────────────────┐
│                  THE HUMAN PREFRONTAL CORTEX (Central Intelligence)           │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                        PREFRONTAL CORTEX                               │    │
│  │                        (The Deeper Knowledge)                          │    │
│  │                                                                        │    │
│  │  • Analyzes everything every arm ever did (across time, across bodies) │    │
│  │  • Synthesizes patterns no single arm could see                        │    │
│  │  • Tracks what worked across generations (evolutionary lineage)         │    │
│  │  • Tunes the nervous system to prevent future failures                 │    │
│  │  • Consolidates learning into the subconscious (Hive)                  │    │
│  │  • Provides deeper knowledge to Planning Brain for better strategy     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  The PFC is the DEEP knowledge. Every other brain DRAWS FROM IT:              │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   SYSTEM     │  │   PLANNING   │  │    HIVE      │  │  EXECUTION   │     │
│  │   BRAIN      │  │    BRAIN     │  │    MIND      │  │   BRAIN      │     │
│  │  (Nervous    │  │  (Strategy)  │  │(Subconscious)│  │ (Supervision)│     │
│  │   System)    │  │              │  │              │  │              │     │
│  │              │  │              │  │              │  │              │     │
│  │ PFC tunes:   │  │ Draws from   │  │ PFC reads +  │  │ PFC informs: │     │
│  │ • L5 patterns│  │ PFC for:     │  │ writes:      │  │ • what to    │     │
│  │ • decision   │  │ • how to     │  │ • queries    │  │   verify     │     │
│  │   triggers   │  │   decompose  │  │   accumulated│  │ • timeout    │     │
│  │ • SCF limits │  │ • which      │  │   memory     │  │   tuning     │     │
│  │              │  │   cluster    │  │ • stores     │  │ • delegation │     │
│  │              │  │ • dependency │  │   synthesized│  │   priority   │     │
│  │              │  │   ordering   │  │   patterns   │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │                  │             │
│         └─────────────────┼─────────────────┼──────────────────┘             │
│                           │                 │                                 │
│                    ┌──────┴─────────────────┴──────┐                          │
│                    │        BRAIN MESSENGER        │  ← Thalamus              │
│                    │    (routes all PFC outputs)    │                          │
│                    └───────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The Intuition

**The octopus body** handles execution: autonomous arms with local ganglia, distributed
sensing and acting. The central brain gives direction, not commands. Agents pull tasks
and decide how to execute — Kraken never micromanages.

**But octopus intelligence has a ceiling.** RNA editing adapts proteins locally. Each arm
learns. But there's no mechanism for one arm's learning to improve another arm's behavior.
No systematic synthesis across arms. No generational improvement tracking.

**The human prefrontal cortex** solves this. It sits above the nervous system, receiving
sensory data from everywhere, integrating across time and context, and sending tuning
signals back down. It doesn't execute — it **understands** and **directs**.

Kraken's PFC is this layer. It sits above the octopus body. It analyzes what every agent
in every cluster did. It discovers patterns no single agent could see. And it feeds that
deeper knowledge back down to the nervous system, the planning layer, and the subconscious.

The PFC is the **deeper knowledge** — every other brain draws from it.

### Connection 1: System Brain (Nervous System) ← PFC Tunes It

The System Brain is the execution layer — autonomic reflexes, sensory processing,
motor output. It runs autonomously but the PFC continuously recalibrates it.

**SENSORY (Nervous System → PFC):** Trajectories, SCF incidents, firewall trigger stats,
gate evaluation results, strike records — everything that happened flows upward.

**MOTOR (PFC → Nervous System):** New L5 derailment regex patterns injected into
`derailment-patterns.ts`. New decision point triggers for `identifyDecisionPoint()`.
SCF threshold recalibration. Firewall sensitivity tuning.

**Example:** PFC discovers agents derail on Docker commands missing `--name`. It injects a
regex into L5: `docker\s+(run|exec).*--rm(?!.*--name)`. Next session, the nervous system
blocks this at `tool.execute.before` speed — zero PFC latency. The body learned a new reflex.

### Connection 2: Planning Brain (Strategy) ← PFC Provides Deeper Knowledge

The Planning Brain generates T1 task decompositions and WorkflowPlans. It **draws from**
the PFC's deeper knowledge to improve planning quality. The PFC analyzes across time and
projects; the Planning Brain applies that analysis to the current task.

**SENSORY (Planning Brain → PFC):** WorkflowPlan structures, T1 generation history, task
dependency graphs, domain assignment decisions — what was planned, so PFC can correlate
plan structure with execution outcomes.

**KNOWLEDGE (PFC → Planning Brain):** "Tasks decomposed into 3-5 subtasks succeed 78% of
the time vs 31% for 10+ subtasks." "Mantas succeed 3x more than Sharks on this task type
— prefer Beta cluster." "Cross-project: Trident's modular decomposition resolves this."
"Gen 4's dependency ordering improved accuracy 22% — use this pattern."

**Example:** PFC analyzes 50 sessions across 3 Krakens. Discovers that tasks decomposed into
3-5 subtasks have 78% success, while 10+ subtasks have 31%. The Planning Brain queries PFC
before generating T1: "How should I decompose this build task?" PFC responds with the
evidence-based decomposition pattern. The Planning Brain now generates measurably better
WorkflowPlans — not because it got smarter, but because it draws on deeper knowledge.

### Connection 3: Hive Mind (Subconscious) ← PFC Reads + Writes

The Hive Mind is the **subconscious** — accumulated memory of everything every Kraken has
ever learned. The PFC queries it for patterns and writes synthesized discoveries back.

The Hive Mind is the **subconscious** — the accumulated memory of everything every Kraken
has ever learned. The PFC is the **conscious** intelligence that queries the subconscious
for patterns and writes new discoveries back.

**AFFERENT (Hive → PFC — memory retrieval):**
- Pattern database: query for "what worked when agents failed on path handling?"
- Failure database: query for "has this exact error signature appeared before?"
- Decision history: query for "what did we decide about tool X in session 847?"
- Cross-project patterns: query for "what did Kraken B learn about Docker networking?"
- Evolution lineage: query for "what was the improvement trajectory for project X?"

**EFFERENT (PFC → Hive — memory consolidation):**
- New patterns discovered: "agents succeed when given project root path in context"
- New failures cataloged: "ENOENT errors caused by missing path injection in 78% of cases"
- New decisions recorded: "auto-applied low-risk improvement: added get_project_paths tool"
- Evolution lineage updated: "Gen 3 improved accuracy from 62% to 87% via path awareness"
- Weight update candidates stored: "trajectory X is a positive example for path-aware agents"
- SCF incident correlations: "FALSE_COMPLETION fires 4x more often in bash-heavy sessions"

**Example:** PFC queries Hive: "show me all patterns tagged 'docker' across all projects."
Hive returns 14 patterns from 3 Krakens. PFC synthesizes: the top 3 patterns all relate to
`--name` flag omission. PFC writes a consolidated pattern to Hive with cross-project validation
evidence. Future Krakens querying Hive for Docker patterns get this synthesized knowledge
immediately — no need to rediscover what 3 Krakens already learned.

### Connection 4: PFC ↔ Execution Brain (Supervision)

The Execution Brain monitors task execution and output retrieval. The PFC enhances this by
providing learned patterns of what execution supervision should look for.

**AFFERENT (Execution Brain → PFC):**
- Task completion statistics (success rate, failure rate, blocked rate by cluster)
- Output retrieval verification (how often L2 false completion fires)
- Async delegation engine metrics (queue depth, processing latency, failure patterns)
- Cluster load history (when are agents overloaded vs idle)

**EFFERENT (PFC → Execution Brain):**
- Output retrieval verification patterns ("task type X requires these 3 specific files to exist")
- Delegation priority adjustments ("sessions show cluster Alpha is 40% overloaded on Tuesdays")
- Fire-and-forget detection patterns (updated L1/L2 triggers from trajectory analysis)
- Task timeout recommendations ("this task type averages 45s; set timeout to 90s not 300s")

### The Complete Data Flow: One Analysis Cycle

```
SESSION COMPLETES
      │
      ├──► System Brain: final gate evaluation, metrics computed
      ├──► ExecutionTracer: finalizeTrajectory() → Cortex SQLite
      ├──► Hive Mind: session patterns, failures, decisions stored
      │
      ▼
PREFONTAL CORTEX WAKES (schedule or trigger)
      │
      ├── QUERY HIVE (subconscious)
      │   ├── "show all patterns from last 10 sessions"
      │   ├── "show all failures tagged 'bash' or 'docker' or 'path'"
      │   ├── "show evolution lineage for this project"
      │   └── "show cross-project patterns matching current context"
      │
      ├── QUERY SYSTEM BRAIN (nervous system)
      │   ├── Read execution trajectories from Cortex
      │   ├── Read SCF incident log
      │   ├── Read firewall trigger statistics
      │   └── Read gate evaluation history
      │
      ├── QUERY PLANNING BRAIN (draws from PFC for strategy)
      │   ├── Read WorkflowPlan structures from recent sessions
      │   ├── Read task decomposition patterns
      │   └── Read domain assignment history
      │
      ├── QUERY EXECUTION BRAIN (supervision)
      │   ├── Read task completion statistics
      │   ├── Read output retrieval verification logs
      │   └── Read delegation engine metrics
      │
      ▼
FEEDBACKBRAIN LLM ANALYSIS (SIA Feedback Agent)
      │
      │ Synthesizes ALL inputs:
      │ "Across 3 Krakens and 47 sessions, I see 4 recurring failure modes.
      │  Mode 1 (path errors): 78% of failures, cross-project fix exists.
      │  Mode 2 (Docker --name): 12% of failures, no existing pattern.
      │  Mode 3 (bash abuse): 7% of failures, existing firewall catches 60%.
      │  Mode 4 (fire-and-forget): 3% of failures, L1/L2 catch rate improving."
      │
      ▼
OUTPUTS — PFC is the deeper knowledge. Every brain draws from it:
      │
      ├──► SYSTEM BRAIN: 3 new L5 patterns, 2 new decision triggers, SCF recalibrated
      ├──► PLANNING BRAIN: queries PFC for evidence-based decomposition + cluster guidance
      ├──► HIVE MIND: 4 new consolidated patterns, 7 new failure entries, lineage updated
      ├──► EXECUTION BRAIN: updated output verification rules for Docker tasks
      └──► AGENT HARNESS: updated instructions for all cluster agents
```

This is the complete loop. The PFC doesn't replace any existing brain — it adds a layer
of autonomous intelligence that makes every other brain smarter over time.

### The SIA Pattern Applied to Kraken

SIA operates as a 3-agent feedback loop:
1. **Meta-Agent**: Reads task → generates target_agent.py
2. **Target Agent**: Executes task → records execution trajectory
3. **Feedback Agent**: Reads trajectory + metrics + history → rewrites target_agent.py for next generation

In Kraken:
1. **Planning Brain** = SIA's Meta-Agent (creates WorkflowPlan)
2. **Cluster Agents (Sharks + Mantas)** = SIA's Target Agent (execute tasks)
3. **Prefrontal Cortex (FeedbackBrain)** = SIA's Feedback Agent (analyzes execution, proposes improvements)
4. **Hive Mind** = SIA's `context.md` (evolutionary lineage tracking)

The key SIA insight preserved: **combining harness updates (agent instructions, tools, hooks) with weight updates (fine-tuning data) outperforms either alone.**

---

## 2. ARCHITECTURE — The Full 4-Brain System

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    KRAKEN AGENT PLUGIN (OpenCode Process)                       │
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  PLANNING   │  │  EXECUTION  │  │   SYSTEM BRAIN    │  │  PREFRONTAL   │ │
│  │  BRAIN      │  │  BRAIN      │  │   v1.2 + v2.0     │  │  CORTEX v3.0  │ │
│  │             │  │             │  │                   │  │  (NEW)        │ │
│  │ T1 Gen      │  │ Supervise   │  │ L0-L7 Firewall    │  │               │ │
│  │ Task Dec    │  │ Output      │  │ Gate Evaluation   │  │ ExecTracer    │ │
│  │ Domain Des  │  │ Retrieval   │  │ Dynamic Context   │  │ TrajStore     │ │
│  │ Context Inj │  │ Override    │  │ Injection (v2)    │  │ SyncBridge    │ │
│  │              │  │              │  │ Strike Tracking   │  │ ContextMgr    │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘  └───────┬───────┘ │
│         │               │                   │                     │         │
│         └───────────────┼───────────────────┼─────────────────────┘         │
│                         │                   │                                │
│              ┌──────────┴───────────────────┴──────────┐                     │
│              │              BRAIN MESSENGER              │                     │
│              └──────────────────┬───────────────────┬───┘                     │
│                                 │                   │                          │
│  ┌──────────┬──────────┬───────┴───┬──────────┬────┴──────────┐             │
│  ▼          ▼          ▼           ▼          ▼               ▼             │
│ ALPHA     BETA      GAMMA       CORTEX     HIVE MIND     EXECUTION          │
│ Steamroll Precision Testing     SQLite     Patterns +      TRACER           │
│ Cluster   Cluster   Cluster     State      Evolution       (new hook)        │
│                                              Lineage                          │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                     EXECUTION TRACER (tool.execute.after hook)     │       │
│  │                                                                   │       │
│  │  Every tool call → records:                                       │       │
│  │  { toolName, args, result, durationMs, error?, agentId, taskId }  │       │
│  │                                                                   │       │
│  │  Every chat.message → records:                                    │       │
│  │  { model, messages[], tool_calls[], tokensUsed, wallTimeMs }      │       │
│  │                                                                   │       │
│  │  Stored to: Cortex SQLite → execution_trajectories table          │       │
│  │  Lightweight: synchronous JSON write, no analysis, <1ms overhead  │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                     SYNC BRIDGE (PrefrontalCortexBrain)            │       │
│  │                                                                   │       │
│  │  • Exposes Cortex DB path + trajectory schema to OpenFang         │       │
│  │  • Checks for new improvement proposals from OpenFang             │       │
│  │  • Applies approved improvements to agent harness                 │       │
│  │  • Records improvement application to Hive lineage                │       │
│  │  • coordinates: multiple Krakens → single OpenFang Hand            │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  (in-process TypeScript, bundelled with kraken-agent plugin)                  │
└──────────────────────────────┬────────────────────────────────────────────────┘
                               │
                               │  Read: Cortex SQLite (execution_trajectories,
                               │         workflow_tasks, scf_incidents)
                               │  Write: improvement.md, hive updates,
                               │         agent spec modifications
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   OPENFANG DAEMON (Rust, 32MB binary)                          │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  HAND: "kraken-prefrontal-cortex" (v1.0.0)                            │    │
│  │                                                                       │    │
│  │  Schedule: interval=1800s (30min), or triggered on session completion │    │
│  │  Model: claude-sonnet-4-20250514 (analytical tier)                    │    │
│  │  WASM: fuel=150M, epoch=90s                                           │    │
│  │                                                                       │    │
│  │  ┌─────────────────────────────────────────────────────────────┐     │    │
│  │  │ PHASE 1: COLLECT                                             │     │    │
│  │  │                                                              │     │    │
│  │  │ For each registered Kraken project:                          │     │    │
│  │  │   1. Read Cortex SQLite → new execution_trajectories         │     │    │
│  │  │   2. Read results.json / evaluation metrics                  │     │    │
│  │  │   3. Read SCF incidents (agent failures)                     │     │    │
│  │  │   4. Read Hive Mind → current generation context             │     │    │
│  │  │   5. Group by session ID, generation number                  │     │    │
│  │  │   6. Filter: only completed generations with full logs       │     │    │
│  │  │ Output: { trajectories: TrajectoryGroup[], metrics: {} }     │     │    │
│  │  └─────────────────────────────────────────────────────────────┘     │    │
│  │                                                                       │    │
│  │  ┌─────────────────────────────────────────────────────────────┐     │    │
│  │  │ PHASE 2: ANALYZE (SIA Feedback Agent Pattern)                │     │    │
│  │  │                                                              │     │    │
│  │  │ LLM Call: claude-sonnet-4-20250514 (or Opus for deep runs)   │     │    │
│  │  │                                                              │     │    │
│  │  │ PROMPT CONTEXT:                                              │     │    │
│  │  │ • Full execution trajectories from completed sessions        │     │    │
│  │  │ • Comparison with acceptance criteria / evaluation metrics   │     │    │
│  │  │ • Current agent harness (instructions, tools, hooks)         │     │    │
│  │  │ • Previous improvement history from Hive lineage             │     │    │
│  │  │ • Known failure patterns from Hive failure database          │     │    │
│  │  │ • SCF incident patterns across all clusters                  │     │    │
│  │  │ • Cross-project: patterns found in OTHER Krakens             │     │    │
│  │  │                                                              │     │    │
│  │  │ ANALYSIS DIMENSIONS:                                         │     │    │
│  │  │ 1. Structural Flaws: Are agent instructions causing failures?│     │    │
│  │  │ 2. Tool Gaps: What tools would have prevented the failure?   │     │    │
│  │  │ 3. Pattern Recurrence: Is this failure in the Hive database? │     │    │
│  │  │ 4. Generation Delta: What changed between gen N and N+1?     │     │    │
│  │  │ 5. Cross-Project: Did another Kraken solve this already?     │     │    │
│  │  │ 6. Weight Candidates: Which trajectories are fine-tune worthy?│    │    │
│  │  │                                                              │     │    │
│  │  │ OUTPUT:                                                      │     │    │
│  │  │ • improvement.md — structural diagnosis + action plan        │     │    │
│  │  │ • agent_spec_update.md — new instructions/tools/hooks        │     │    │
│  │  │ • hive_updates.json — patterns, failures, decisions to store │     │    │
│  │  │ • weight_candidates.jsonl — trajectories for fine-tuning     │     │    │
│  │  │ • risk_assessment.md — what could go wrong with these changes│     │    │
│  │  └─────────────────────────────────────────────────────────────┘     │    │
│  │                                                                       │    │
│  │  ┌─────────────────────────────────────────────────────────────┐     │    │
│  │  │ PHASE 3: PERSIST (Merkle Hash-Chain)                        │     │    │
│  │  │                                                              │     │    │
│  │  │ 1. Compute SHA256(current_output + previous_chain_hash)      │     │    │
│  │  │ 2. Append to evolution lineage: ~/.openfang/lineage/kraken/  │     │    │
│  │  │ 3. Write improvement.md to Kraken project Context Management │     │    │
│  │  │ 4. Update Hive Mind with new patterns, failures, decisions   │     │    │
│  │  │ 5. Increment generation counter                              │     │    │
│  │  │                                                              │     │    │
│  │  │ Chain structure:                                             │     │    │
│  │  │ gen_1 → [hash_A] → gen_2 → [hash_AB] → gen_3 → [hash_ABC]   │     │    │
│  │  │ Tamper with gen_2's improvement → hash_ABC breaks            │     │    │
│  │  └─────────────────────────────────────────────────────────────┘     │    │
│  │                                                                       │    │
│  │  ┌─────────────────────────────────────────────────────────────┐     │    │
│  │  │ PHASE 4: DELIVER (40 Channel Adapters)                      │     │    │
│  │  │                                                              │     │    │
│  │  │ • Write improvement.md to Kraken project (filesystem)        │     │    │
│  │  │ • Write agent_spec_update.md → Kraken plugin config picks up │     │    │
│  │  │ • Push hive_updates.json → Hive Mind API                     │     │    │
│  │  │ • Optional: Notification channels                           │     │    │
│  │  │   - Telegram: "3 improvements proposed for session #847"     │     │    │
│  │  │   - Dashboard: Evolution lineage visualization               │     │    │
│  │  │   - Discord: Cross-project learning report                   │     │    │
│  │  └─────────────────────────────────────────────────────────────┘     │    │
│  │                                                                       │    │
│  │  Tools: shell_exec, file_read, file_write, web_fetch                 │    │
│  │  Skills:                                                              │    │
│  │    - sia-feedback-agent-pattern                                       │    │
│  │    - kraken-system-brain-anatomy                                      │    │
│  │    - kraken-firewall-layers-reference                                 │    │
│  │    - kraken-hive-mind-schema                                          │    │
│  │    - kraken-agent-instruction-format                                  │    │
│  │    - opencode-plugin-engineering-sop                                  │    │
│  │                                                                       │    │
│  │  Inherited from OpenFang:                                             │    │
│  │    - 16 security layers (WASM sandbox, Merkle audit, taint tracking)  │    │
│  │    - 40 channel adapters                                              │    │
│  │    - 27 LLM providers with intelligent routing                        │    │
│  │    - SQLite + vector memory                                           │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  16 Security Layers (inherited from OpenFang):                                │
│  1. WASM Dual-Metered Sandbox     2. Merkle Hash-Chain Audit                  │
│  3. Taint Tracking                4. Ed25519 Signed Manifests                 │
│  5. SSRF Protection               6. Secret Zeroization                      │
│  7. OFP Mutual Auth               8. Capability Gates                        │
│  9. Security Headers              10. Health Endpoint Redaction              │
│  11. Subprocess Sandbox           12. Prompt Injection Scanner               │
│  13. Loop Guard                   14. Session Repair                         │
│  15. Path Traversal Prevention    16. GCRA Rate Limiter                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The 6-Kraken Swarm Scaling

```
┌───────────────────────────────────────────────────────────────┐
│                  OPENFANG: PREFONTAL CORTEX                     │
│                                                                 │
│  Reads from 6 Cortex databases simultaneously:                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ KRAKEN A │  │ KRAKEN B │  │ KRAKEN C │  ... (x6)           │
│  │ Project: │  │ Project: │  │ Project: │                      │
│  │ pokemon  │  │ trident  │  │ hydra    │                      │
│  │          │  │          │  │          │                      │
│  │ Cortex   │  │ Cortex   │  │ Cortex   │                      │
│  │ SQLite   │  │ SQLite   │  │ SQLite   │                      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                     │
│       │             │             │                             │
│       └─────────────┼─────────────┘                             │
│                     │                                           │
│                     ▼                                           │
│  ┌─────────────────────────────────────────────────────┐      │
│  │         CROSS-PROJECT PATTERN SYNTHESIS              │      │
│  │                                                      │      │
│  │  "Kraken A and Kraken C both hit filesystem path     │      │
│  │   errors when working in /tmp/. The fix applied      │      │
│  │   to Kraken B's agents resolved this. Injecting       │      │
│  │   the same fix into A and C's agent instructions."   │      │
│  │                                                      │      │
│  │  → Writes improvement to ALL Krakens' Hive Mind      │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  Cross-project patterns:                                        │
│  • Path handling failures                                      │
│  • Docker container networking issues                          │
│  • TypeScript compilation errors from missing tsconfig         │
│  • bash tool abuse (L5 derailment across all projects)         │
│  • Fire-and-forget patterns (L1/L2 violations)                  │
│  • SCF false-completion flags                                  │
│  • Agent instruction weaknesses (generic prompts)              │
└───────────────────────────────────────────────────────────────┘
```

### The Evolutionary Improvement Loop

```
GEN_1: Plan → Build → Execute → Log Trajectory → Evaluate → [METRICS]
         │                                                    │
         │  ExecutionTracer records every tool call,           │
         │  LLM message, SCF incident to Cortex                │
         │                                                    │
         ▼                                                    │
     PREFONTAL CORTEX (OpenFang) analyzes:                    │
     • Execution trajectories from all Krakens                │
     • Metrics comparison vs acceptance criteria              │
     • Cross-project pattern matching                         │
     • Hive lineage: what worked in past generations?         │
         │                                                    │
         ├─────────────────────────────────────────┐          │
         ▼                                         ▼          │
     HARNESS UPDATE                           FIREWALL FEED    │
     • agent_spec_update.md                   • New L5 regex   │
     • New instructions, tools, hooks          • New decision   │
     • Applied to next gen agents                point triggers │
         │                                    • SCF threshold   │
         ▼                                      recalibration   │
GEN_2: Updated agents execute +                            │
       System Brain DETECTS patterns in real-time          │
         │                                                    │
         │  SystemBrainV2 now catches path-failure patterns   │
         │  BEFORE tasks fail, because PFC injected the        │
         │  detection rules into the firewall layer            │
         │                                                    │
         ▼                                                    │
     PREFONTAL CORTEX: "Gen 2 improved accuracy 5% by          │
     adding path awareness. L5 firewall now catches the        │
     pattern in real-time — 0 false negatives. 3 agents        │
     still derail on Docker networking. Cross-project fix      │
     from Kraken B resolves this."                              │
         │                                                    │
         ▼                                                    │
GEN_3: Further improved → Continue until criteria met          │
     or max generations reached                                │
```

### The PFC → System Brain Feedback Path (RNA → Immune System)

The Prefrontal Cortex doesn't just update agent instructions. It feeds discovered patterns
back into the System Brain's real-time detection layers. This is what makes the octopus
analogy complete: **RNA editing doesn't just change protein function — it changes what the
organism can detect and respond to in its environment.**

```
┌─────────────────────────────────────────────────────────────────┐
│  PFC DISCOVERS PATTERN (offline, batch analysis)                │
│  "Agents derail when task descriptions mention 'docker'          │
│   without specifying a container name. Root cause: agents        │
│   use `docker run --rm` without --name, losing track."          │
│                                                                  │
│                        │                                         │
│          ┌─────────────┼─────────────┐                           │
│          ▼             ▼             ▼                           │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐                │
│  │ HARNESS      │ │ FIREWALL │ │ SCF          │                │
│  │ UPDATE       │ │ UPDATE   │ │ RECALIBRATE  │                │
│  │              │ │          │ │              │                │
│  │ Agent instr: │ │ L5 adds: │ │ Lower FALSE_ │                │
│  │ "ALWAYS use  │ │ "docker  │ │ COMPLETION   │                │
│  │  --name with │ │  run.*   │ │ threshold    │                │
│  │  docker run" │ │  --rm[^─]│ │ from 3→2     │                │
│  │              │ │  *--name"│ │ for docker   │                │
│  │ Applied:     │ │          │ │ tasks        │                │
│  │ next spawn   │ │ Applied: │ │ Applied:     │                │
│  │              │ │ immediate│ │ immediate    │                │
│  └──────┬───────┘ └────┬─────┘ └──────┬───────┘                │
│         │              │              │                          │
│         ▼              ▼              ▼                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              NEXT SESSION: AGENT EXECUTES                │    │
│  │                                                          │    │
│  │  1. Agent types `docker run --rm alpine`                 │    │
│  │  2. L5 firewall MATCHES new pattern → BLOCKS             │    │
│  │  3. Agent receives: "Use --name with docker. Retry."     │    │
│  │  4. Agent retries: `docker run --rm --name task-7 alpine`│    │
│  │  5. L5 passes. Task continues.                           │    │
│  │  6. SCF monitors: false completion threshold now 2       │    │
│  │                                                          │    │
│  │  RESULT: Derailment prevented in real-time.              │    │
│  │  The PFC didn't just fix the bug — it taught the         │    │
│  │  immune system to recognize the pathogen.                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**What gets injected into the System Brain** (real-time, immediate effect):

| PFC Discovery | System Brain Injection | Effect |
|---|---|---|
| New failure pattern with regex signature | L5 `derailment-patterns.ts` — new pattern entry | Blocked at `tool.execute.before` on next occurrence |
| Cluster of failures at specific decision type | SystemBrainV2 `identifyDecisionPoint()` — new trigger keyword | Context injected BEFORE agent makes bad decision |
| False completion rate spiking for tool X | SCF `FALSE_COMPLETION` arm threshold lowered for tool X | Faster isolation of agents claiming completion without evidence |
| Agent repeatedly ignores Hive search before spawning | L8 `ANTI_BULLSHIT` — new HIVE_IGNORANCE pattern | Blocked if agent spawns without Hive query |
| Cross-project: fix from Kraken B applies to Kraken A | L5 pattern shared across all registered Krakens | All Krakens protected simultaneously |
| Stagnation: 3 generations, same failure, no improvement | SCF `STAGNATION` arm escalation threshold lowered | Earlier escalation to Kraken orchestrator |

**This closes the loop**: PFC learns offline → System Brain gains real-time detection → fewer
failures reach the PFC for analysis → PFC focuses on deeper, subtler patterns → System Brain
gains even more precise detection. This is how the octopus gets smarter over time: RNA editing
feeds back into sensory processing, changing what the organism can perceive and respond to.

---

## 3. COMPONENTS — State Assessment

### EXISTS AND WORKS (keep as-is, zero changes)

| File | Lines | What It Does |
|------|-------|-------------|
| `src/brains/system/system-brain.ts` | 464 | Base SystemBrain: gate evaluation, L0-L7 firewall interface, task tracking, domain validation, Brain Messenger integration, compaction management |
| `src/brains/system/system-brain-v2.ts` | 482 | SystemBrainV2: Four-Tier Context Management, dynamic context injection (`identifyDecisionPoint`, `getRelevantContextForDecision`), pre-compaction export, post-compaction synthesis, auto-logging, strike tracking, Context Management auto-generation |
| `src/brains/system/firewall/` | ~2500 | 17 firewall layers: L0-L7 (identity, theater, false completion, output inspection, wrong cluster, macro derailment, kraken protection, coordination gates) + V10 theatrical (T1-T5) + AR (anti-retard) + L10 container enforcement + L11 build workflow |
| `src/hydra/Cortex.ts` | 291 | SQLite shared state: agents, discoveries, handoffs, SCF incidents. **Confirmed solid — 16/16 tests pass.** |
| `src/hydra/SCF.ts` | 166 | 3-arm reflex arc: STAGNATION, CONTEXT_DECAY, FALSE_COMPLETION. Auto-isolation. **Confirmed solid.** |
| `src/hydra/HydraCluster.ts` | 528 | v3.0 manufacturing pipeline: ingestWorkflow, getNextTask, reportTaskComplete, reportTaskFailure, receiveRevision, inter-cluster messaging, phase advancement |
| `src/hydra/HydraManager.ts` | 264 | Multi-cluster: ingestWorkflow, routeMessages, processRevision, checkAcceptanceCriteria, getPipelineStatus |
| `src/shared/state-store.ts` | ~ | Global state persistence: domain-gated key-value store |
| `src/shared/brain-messenger.ts` | ~ | Inter-brain message routing: context-inject, gate-failure, checkpoint, override, sync |
| `src/shared/evidence-collector.ts` | ~ | Gate evidence collection and verification |
| OpenFang v0.6.9 | 137K LOC | 14 Rust crates: kernel, runtime, api, channels, memory, types, skills, hands, extensions, wire, cli, desktop, migrate. 1,767+ tests. Zero clippy warnings. |

### EXISTS BUT NEEDS ENHANCEMENT

| File | Lines | Current State | What Changes |
|------|-------|--------------|-------------|
| `src/brains/system/system-brain-v2.ts` | 482 | Dynamic context injection at decision points, token management, strike tracking. Reactive — fires on messages. | Add: `ExecutionTrajectory` management interface, Sync Bridge API stubs, evolution lineage queries, improvement proposal ingestion. Will be extended by PrefrontalCortexBrain. |
| `src/hydra/types.ts` | 373 | Has all v1.0 + v3.0 pipeline types. Micro orchestrator types. | Add: ExecutionTrajectory, TrajectoryEntry, GenerationContext, EvolutionLineage, ImprovementProposal, SyncBridgeMessage types. **ZERO deletions** — all existing types preserved. |
| `src/hooks/hydra-context-hook.ts` | ~ | Injects Cortex state into agent prompts. No pipeline context. | Enhance: inject active generation number, pending improvement proposals, cross-project patterns from Hive, last FeedbackBrain analysis results. |
| `src/index.ts` | 480 | Agent instructions with Hydra coordination. Manufacturing pipeline not yet in agent prompts. | Enhance: add Prefrontal Cortex awareness to agent instructions — agents should know their behavior is being analyzed for improvement. |
| Hive Mind (`kraken_hive_*`) | ~ | Pattern/failure/decision storage. No generation tracking. | Add: evolution lineage table, generation context queries, cross-project pattern synthesis queries, improvement proposal storage. |

### MISSING — New Files to Create (Prefrontal Cortex v1.0)

| # | File | Est. Lines | Purpose |
|---|------|-----------|---------|
| C1 | `src/brains/prefrontal/prefrontal-cortex-brain.ts` | ~350 | Extended brain: ExecutionTrajectory management, Sync Bridge API, evolution lineage queries, improvement proposal coordination. Extends SystemBrainV2. |
| C2 | `src/brains/prefrontal/execution-tracer.ts` | ~200 | `tool.execute.after` + `chat.message` hook: records structured trajectory JSON to Cortex SQLite. Lightweight, synchronous, zero analysis. |
| C3 | `src/brains/prefrontal/sync-bridge.ts` | ~200 | Bidirectional bridge: exposes Cortex schema to OpenFang, checks for new improvement proposals, applies approved improvements to agent harness, coordinates multi-Kraken registration. |
| C4 | `src/brains/prefrontal/lineage-tracker.ts` | ~150 | Evolution lineage management: generation tracking, context.md generation, metrics comparison across generations, cross-project pattern synthesis. |
| C5 | `src/brains/prefrontal/types.ts` | ~250 | All Prefrontal Cortex types: ExecutionTrajectory, TrajectoryEntry, GenerationContext, EvolutionLineage, ImprovementProposal, FeedbackAnalysis, SyncBridgeMessage, HarnessUpdate. |
| C6 | `src/brains/prefrontal/index.ts` | ~30 | Barrel exports for all Prefrontal Cortex modules. |
| C7 | `src/tools/prefrontal-tools.ts` | ~200 | Agent-facing tools: `get_execution_trajectory`, `get_evolution_lineage`, `check_improvement_proposals`, `apply_improvement`, `get_cross_project_patterns`, `report_execution_insight`. |
| C8 | `src/hooks/prefrontal-context-hook.ts` | ~120 | Injects Prefrontal Cortex context: generation number, pending improvements, last FeedbackBrain analysis, cross-project patterns relevant to current task. |
| | **OpenCode Plugin (new)** | | |
| C9 | `plugins/opencode-prefrontal-tracer/src/index.ts` | ~180 | Standalone OpenCode plugin: registers ExecutionTracer hooks, initializes Cortex tables, exposes trajectory query tools. Loaded 3rd in opencode.json after subagent-manager and kraken-agent. |
| C10 | `plugins/opencode-prefrontal-tracer/package.json` | ~20 | Plugin manifest: @opencode-ai/plugin dependency, build script, TypeScript config. |
| | **OpenFang Hand (new)** | | |
| C11 | `hands/kraken-prefrontal-cortex/HAND.toml` | ~80 | Hand manifest: id, tools, skills, requirements, agent config, schedule, WASM config, dashboard metrics. |
| C12 | `hands/kraken-prefrontal-cortex/SYSTEM_PROMPT.md` | ~400 | Full FeedbackBrain operational playbook: 4-phase analysis cycle, SIA pattern application, cross-project synthesis, improvement proposal format, safety constraints. |
| C13 | `hands/kraken-prefrontal-cortex/SKILL.md` | ~300 | Domain expertise reference: Kraken brain anatomy, firewall layers, agent instruction format, Hive Mind schema, Cortex table layout, SIA Feedback Agent pattern, known failure modes. |
| | **Tests (new)** | | |
| C14 | `src/tests/prefrontal-execution-tracer.test.ts` | ~250 | Unit tests: trajectory recording, JSON schema validation, Cortex write verification, compact buffer flush, multiple concurrent trajectories. |
| C15 | `src/tests/prefrontal-sync-bridge.test.ts` | ~200 | Integration tests: OpenFang connectivity, improvement proposal ingestion, harness update application, multi-Kraken registration. |
| C16 | `src/tests/prefrontal-lineage.test.ts` | ~200 | Evolution lineage tests: generation tracking, context.md generation, metrics comparison, cross-project pattern aggregation. |
| C17 | `src/tests/prefrontal-e2e.test.ts` | ~300 | End-to-end test: agent executes task → trajectory recorded → FeedbackBrain analyzes → improvement generated → improvement applied → metrics improved. |

**Total new code**: ~3,430 lines across 17 new files
**Total changed code**: ~200 lines across 4 existing files
**Total project**: ~3,630 lines of changes/additions

---

## 4. COMPLETE TYPE DEFINITIONS

```typescript
// ============================================================
// EXECUTION TRAJECTORY TYPES
// ============================================================

/**
 * A single tool execution entry within a trajectory.
 * Recorded by tool.execute.after hook.
 */
export interface ToolCallEntry {
  callId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  /** JSON-serialized result (truncated to 8KB if larger) */
  result: string | null;
  /** Error message if tool call failed */
  error?: string;
  /** Wall-clock duration in milliseconds */
  durationMs: number;
  /** Unix timestamp of call start */
  startedAt: number;
  /** Unix timestamp of call completion */
  completedAt: number;
  /** Whether this was a bash tool call (L5 derailment signal) */
  isBash: boolean;
  /** Whether this call was blocked by a firewall layer */
  blockedBy?: string;
}

/**
 * A single LLM message entry within a trajectory.
 * Recorded by chat.message hook.
 */
export interface LLMMessageEntry {
  messageId: string;
  role: 'system' | 'user' | 'assistant';
  /** Truncated to 4KB if larger */
  content: string;
  /** Tool calls the LLM requested in this message */
  toolCalls?: {
    toolName: string;
    toolArgs: Record<string, unknown>;
    callId: string;
  }[];
  /** Token usage for this message (if available from provider) */
  tokensUsed?: {
    input: number;
    output: number;
  };
  /** Unix timestamp */
  timestamp: number;
  /** Whether this message contains derailment patterns (L5) */
  derailmentFlags?: string[];
}

/**
 * Complete execution trajectory for one agent on one task.
 * Records everything the agent did: LLM messages + tool calls.
 * Stored in Cortex SQLite: execution_trajectories table.
 * This is SIA's agent_execution.json equivalent.
 */
export interface ExecutionTrajectory {
  trajectoryId: string;
  sessionId: string;
  agentId: string;
  agentType: 'shark' | 'manta';
  clusterId: string;
  taskId: string;
  taskDescription: string;
  workflowId?: string;
  generationNumber: number;
  phaseId?: string;
  /** Ordered list of LLM messages (user input, assistant responses) */
  messages: LLMMessageEntry[];
  /** Ordered list of tool calls made by this agent */
  toolCalls: ToolCallEntry[];
  /** SCF incidents triggered during this trajectory */
  scfIncidents: {
    incidentId: string;
    armsFired: string[];
    containmentLevel: string;
    loggedAt: string;
  }[];
  /** Summary statistics */
  stats: {
    totalMessages: number;
    totalToolCalls: number;
    bashToolCalls: number;
    firewallBlocks: number;
    totalDurationMs: number;
    tokensUsed: { input: number; output: number };
    errors: number;
    retries: number;
  };
  /** Whether this task succeeded or failed */
  outcome: 'success' | 'failure' | 'blocked' | 'timeout' | 'unknown';
  /** Output paths created by this task */
  outputPaths: string[];
  /** Unix timestamps */
  startedAt: number;
  completedAt?: number;
  /** Whether this trajectory has been analyzed by FeedbackBrain */
  analyzedAt?: number;
  /** Whether this trajectory was marked as a positive example for weight updates */
  isPositiveExample: boolean;
  /** Whether this trajectory was marked as a negative example (anti-pattern) */
  isNegativeExample: boolean;
}

// ============================================================
// EVOLUTION LINEAGE TYPES (SIA context.md equivalent)
// ============================================================

/**
 * A single generation in the evolution lineage.
 * Tracks what the agent harness looked like and how it performed.
 */
export interface GenerationRecord {
  generationId: string;
  generationNumber: number;
  sessionId: string;
  projectId: string;
  /** The agent spec that was used in this generation */
  agentSpec: AgentSpecAtGeneration;
  /** Aggregated trajectories from all agents in this generation */
  aggregatedTrajectories: AggregatedTrajectoryStats;
  /** Evaluation metrics for this generation */
  evaluation: GenerationEvaluation;
  /** What changed from the previous generation (gen 1 = null) */
  deltaFromPrevious: GenerationDelta | null;
  /** The improvement that produced this generation (gen 1 = null) */
  producedBy: string | null;
  /** Unix timestamps */
  startedAt: number;
  completedAt?: number;
  /** Serial number in the Merkle hash-chain */
  merkleSequence: number | null;
  /** SHA256 hash linking to previous generation + this generation's data */
  merkleHash: string | null;
}

export interface AgentSpecAtGeneration {
  /** The agent instructions (system prompt) at this generation */
  instructions: string;
  /** Tools available to the agent at this generation */
  tools: string[];
  /** Hook configuration at this generation */
  hooks: string[];
  /** SIA-style: this is target_agent.py's equivalent */
  specVersion: string;
  /** Hash of the full spec for deduplication */
  specHash: string;
}

export interface AggregatedTrajectoryStats {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  blockedTasks: number;
  averageDurationMs: number;
  totalTokensUsed: number;
  bashIncidents: number;
  firewallTriggers: Record<string, number>;
  scfIsolations: number;
  /** Cross-cluster breakdown */
  byCluster: Record<string, {
    tasks: number;
    success: number;
    failure: number;
    avgDurationMs: number;
  }>;
}

export interface GenerationEvaluation {
  /** Whether acceptance criteria were met */
  criteriaMet: boolean;
  /** How many criteria were met (N of M) */
  criteriaProgress: { met: number; total: number };
  /** Specific metrics: accuracy, latency, etc. */
  metrics: Record<string, number>;
  /** Evaluation results JSON path */
  resultsPath?: string;
  /** Whether this was the best generation so far */
  isBestSoFar: boolean;
}

export interface GenerationDelta {
  /** Changes in agent instructions (diff summary) */
  instructionChanges: string;
  /** Tools added */
  toolsAdded: string[];
  /** Tools removed */
  toolsRemoved: string[];
  /** Hooks modified */
  hooksModified: string[];
  /** Metric deltas: { "accuracy": +5.2, "latency": -120 } */
  metricDeltas: Record<string, number>;
  /** Lines of code change in agent spec */
  locDelta: number;
}

/**
 * The complete evolution lineage for a project.
 * Analogous to SIA's context.md — tracks ALL generations and their relationships.
 */
export interface EvolutionLineage {
  lineageId: string;
  projectId: string;
  projectName: string;
  generations: GenerationRecord[];
  currentGeneration: number;
  maxGenerations: number;
  bestGeneration?: number;
  /** The acceptance criteria that define success */
  acceptanceCriteria: string[];
  /** Summary of what was learned across all generations */
  synthesizedLearnings: {
    effectivePatterns: string[];
    failedApproaches: string[];
    recurringFailureModes: string[];
    crossProjectInsights: string[];
  };
  /** Merkle chain integrity verification */
  merkleChainValid: boolean;
  startedAt: number;
  lastUpdatedAt: number;
}

// ============================================================
// FEEDBACK ANALYSIS TYPES (SIA Feedback Agent output)
// ============================================================

/**
 * A proposed improvement to the agent harness.
 * Generated by the FeedbackBrain (OpenFang Hand).
 * This is SIA's "improvement.md + new target_agent.py" equivalent.
 */
export interface ImprovementProposal {
  proposalId: string;
  lineageId: string;
  generationNumber: number;
  /** What triggered this analysis (schedule, session completion, manual) */
  trigger: 'schedule' | 'session_complete' | 'gate_failure' | 'manual';
  /** The analysis that produced this proposal */
  analysis: FeedbackAnalysis;
  /** The concrete changes proposed */
  changes: HarnessUpdate;
  /** Weight update candidates extracted from trajectories */
  weightCandidates: WeightUpdateCandidate[];
  /** Cross-project patterns that influenced this proposal */
  crossProjectSources: CrossProjectPattern[];
  /** Risk assessment: what could break if these changes are applied */
  riskAssessment: RiskAssessment;
  /** Status in the approval pipeline */
  status: 'proposed' | 'approved' | 'applied' | 'rejected' | 'superseded';
  /** Who/what approved this (automatic or manual) */
  approvedBy?: string;
  /** Merkle hash for audit chain */
  merkleHash: string;
  createdAt: number;
  appliedAt?: number;
}

export interface FeedbackAnalysis {
  analysisId: string;
  /** The SIA Feedback Agent's analysis of what went wrong */
  rootCauseAnalysis: string;
  /** Specific failure pattern IDs from Hive database that matched */
  matchedFailurePatterns: string[];
  /** Structural flaws identified in agent instructions */
  instructionFlaws: string[];
  /** Tools that were missing or misconfigured */
  toolGaps: string[];
  /** Hook behavior issues */
  hookIssues: string[];
  /** What worked well and should be preserved */
  successfulPatterns: string[];
  /** Cross-project patterns that resolved similar issues */
  crossProjectFixes: {
    sourceProject: string;
    fixDescription: string;
    successRate: number;
    applicableHere: boolean;
  }[];
  /** Confidence in this analysis (0-100) */
  confidenceScore: number;
  /** Full FeedbackBrain LLM response for audit */
  rawAnalysis: string;
  createdAt: number;
}

export interface HarnessUpdate {
  /** Updated agent instructions (full text) */
  updatedInstructions: Record<string, string>;
  /** Tools to add */
  toolsToAdd: string[];
  /** Tools to remove */
  toolsToRemove: string[];
  /** Tools to modify (with new descriptions/args) */
  toolsToModify: Record<string, { description?: string; args?: Record<string, unknown> }>;
  /** Hook configuration changes */
  hookChanges: {
    hookName: string;
    changeType: 'add' | 'remove' | 'modify';
    newConfig?: Record<string, unknown>;
  }[];
  /** Hive Mind updates (patterns, failures, decisions to store) */
  hiveUpdates: {
    patterns: { key: string; content: string; category: string }[];
    failures: { key: string; content: string; category: string }[];
    decisions: { key: string; content: string; category: string }[];
  };
}

export interface WeightUpdateCandidate {
  /** The trajectory that serves as a positive/negative example */
  trajectoryId: string;
  /** Whether this is a positive (do this) or negative (don't do this) example */
  exampleType: 'positive' | 'negative';
  /** Why this trajectory was selected */
  selectionReason: string;
  /** The extracted messages suitable for fine-tuning */
  trainingMessages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  /** Domain label for domain-specific fine-tuning */
  domainLabel: string;
  /** Quality score (0-100): how clean/useful this example is */
  qualityScore: number;
}

export interface CrossProjectPattern {
  patternId: string;
  sourceProjectId: string;
  sourceProjectName: string;
  patternDescription: string;
  /** The improvement that was applied in the source project */
  appliedFix: string;
  /** How successful it was */
  successMetrics: Record<string, number>;
  /** Whether this pattern is applicable to the current project */
  applicableToCurrent: boolean;
  /** Similarity score between source project and current project context */
  similarityScore: number;
}

export interface RiskAssessment {
  /** Overall risk level */
  level: 'low' | 'medium' | 'high' | 'critical';
  /** Specific risks */
  risks: {
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likelihood: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  /** Whether a rollback plan exists */
  rollbackPlan: string;
  /** Recommended approval: automatic or manual */
  recommendedApproval: 'auto' | 'manual_review';
}

// ============================================================
// SYNC BRIDGE TYPES
// ============================================================

/**
 * Message exchanged between Kraken and OpenFang via the Sync Bridge.
 * Uses shared filesystem (Cortex SQLite) as communication medium.
 */
export interface SyncBridgeMessage {
  messageId: string;
  direction: 'kraken_to_openfang' | 'openfang_to_kraken';
  type: 'register_project' | 'new_trajectories_available' | 'improvement_proposal' |
        'apply_improvements' | 'lineage_sync' | 'health_check' | 'cross_project_query';
  sourceKrakenId: string;
  targetOpenfangInstanceId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
  requiresResponse: boolean;
  correlationId?: string;
}

/**
 * Registration of a Kraken project with the Prefrontal Cortex.
 * Tells OpenFang where to find Cortex DB and what to analyze.
 */
export interface KrakenProjectRegistration {
  projectId: string;
  projectName: string;
  cortexDbPath: string;
  hiveMindPath: string;
  workspacePath: string;
  contextManagementPath: string;
  /** Agent harness files that are modifiable by FeedbackBrain */
  modifiableFiles: {
    agentInstructions: string;
    toolDefinitions: string;
    hookConfigurations: string;
  }[];
  /** Whether automatic improvement application is enabled */
  autoApplyImprovements: boolean;
  /** Maximum allowed risk level for auto-approval */
  autoApprovalRiskThreshold: 'low' | 'medium';
  registeredAt: number;
  lastSyncAt?: number;
}

// ============================================================
// PREFRONTAL CORTEX BRAIN STATE
// ============================================================

export interface PrefrontalCortexState {
  initialized: boolean;
  /** Connected OpenFang instance IDs */
  openfangInstances: string[];
  /** Registered projects (Krakens) being analyzed */
  registeredProjects: KrakenProjectRegistration[];
  /** Pending improvement proposals awaiting application */
  pendingProposals: ImprovementProposal[];
  /** Applied improvement proposals (for lineage tracking) */
  appliedProposals: ImprovementProposal[];
  /** Current evolution lineages per project */
  lineages: Record<string, EvolutionLineage>;
  /** Trajectory buffer: accumulated trajectories not yet synced */
  trajectoryBuffer: { trajectoryCount: number; lastFlushAt: number };
  /** Sync status */
  syncStatus: {
    lastSyncAt?: number;
    lastSyncStatus: 'success' | 'failure' | 'pending' | 'never';
    trajectoriesSynced: number;
    proposalsReceived: number;
    proposalsApplied: number;
  };
  /** Brain initialization timestamp */
  initializedAt?: number;
}
```

---

## 5. NEW CORTEX SQLITE TABLES

Added to Cortex.initialize() — **ZERO changes to existing tables**:

```sql
-- Trajectory storage: SIA's agent_execution.json equivalent
CREATE TABLE IF NOT EXISTS execution_trajectories (
    trajectory_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    cluster_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    task_description TEXT NOT NULL,
    workflow_id TEXT,
    generation_number INTEGER DEFAULT 1,
    phase_id TEXT,
    messages TEXT NOT NULL,          -- JSON: LLMMessageEntry[]
    tool_calls TEXT NOT NULL,         -- JSON: ToolCallEntry[]
    scf_incidents TEXT,              -- JSON: SCFIncident[]
    stats TEXT NOT NULL,              -- JSON: TrajectoryStats
    outcome TEXT NOT NULL,
    output_paths TEXT,               -- JSON: string[]
    is_positive_example INTEGER DEFAULT 0,
    is_negative_example INTEGER DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    analyzed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Evolution lineage: SIA's context.md equivalent
CREATE TABLE IF NOT EXISTS evolution_lineages (
    lineage_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    generations TEXT NOT NULL,        -- JSON: GenerationRecord[]
    current_generation INTEGER DEFAULT 1,
    max_generations INTEGER DEFAULT 10,
    best_generation INTEGER,
    acceptance_criteria TEXT NOT NULL, -- JSON: string[]
    synthesized_learnings TEXT,       -- JSON
    merkle_chain_valid INTEGER DEFAULT 1,
    started_at TEXT,
    last_updated_at TEXT DEFAULT (datetime('now'))
);

-- Generation records (one per generation per project)
CREATE TABLE IF NOT EXISTS generation_records (
    generation_id TEXT PRIMARY KEY,
    lineage_id TEXT NOT NULL,
    generation_number INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    agent_spec TEXT NOT NULL,         -- JSON: AgentSpecAtGeneration
    aggregated_stats TEXT NOT NULL,   -- JSON: AggregatedTrajectoryStats
    evaluation TEXT,                  -- JSON: GenerationEvaluation
    delta_from_previous TEXT,         -- JSON: GenerationDelta | null
    produced_by TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    merkle_sequence INTEGER,
    merkle_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lineage_id) REFERENCES evolution_lineages(lineage_id)
);

-- Improvement proposals from FeedbackBrain
CREATE TABLE IF NOT EXISTS improvement_proposals (
    proposal_id TEXT PRIMARY KEY,
    lineage_id TEXT NOT NULL,
    generation_number INTEGER NOT NULL,
    trigger_type TEXT NOT NULL,
    analysis TEXT NOT NULL,            -- JSON: FeedbackAnalysis
    harness_changes TEXT NOT NULL,     -- JSON: HarnessUpdate
    weight_candidates TEXT,           -- JSON: WeightUpdateCandidate[]
    cross_project_sources TEXT,       -- JSON: CrossProjectPattern[]
    risk_assessment TEXT NOT NULL,    -- JSON: RiskAssessment
    status TEXT DEFAULT 'proposed',
    approved_by TEXT,
    merkle_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    applied_at TEXT,
    FOREIGN KEY (lineage_id) REFERENCES evolution_lineages(lineage_id)
);

-- Sync bridge messages between Kraken and OpenFang
CREATE TABLE IF NOT EXISTS sync_bridge_queue (
    message_id TEXT PRIMARY KEY,
    direction TEXT NOT NULL,
    type TEXT NOT NULL,
    source_kraken_id TEXT NOT NULL,
    target_instance_id TEXT,
    payload TEXT NOT NULL,            -- JSON
    requires_response INTEGER DEFAULT 0,
    correlation_id TEXT,
    delivered INTEGER DEFAULT 0,
    responded INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT (datetime('now'))
);

-- Kraken project registrations
CREATE TABLE IF NOT EXISTS prefrontal_registrations (
    project_id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    cortex_db_path TEXT NOT NULL,
    hive_mind_path TEXT NOT NULL,
    workspace_path TEXT NOT NULL,
    context_management_path TEXT NOT NULL,
    modifiable_files TEXT NOT NULL,
    auto_apply_improvements INTEGER DEFAULT 1,
    auto_approval_risk_threshold TEXT DEFAULT 'low',
    registered_at TEXT NOT NULL,
    last_sync_at TEXT
);
```

---

## 6. THE OPENFANG HAND DESIGN

```toml
# hands/kraken-prefrontal-cortex/HAND.toml

id = "kraken-prefrontal-cortex"
name = "Kraken Prefrontal Cortex"
description = "SIA-style evolutionary optimization engine for Kraken multi-brain orchestrator. Watches agent execution trajectories across all Krakens, identifies structural flaws, proposes improvements, tracks evolutionary lineage."
category = "development"
icon = "🧠"

# Tools the FeedbackBrain needs
tools = [
    "shell_exec",     # Query Cortex SQLite, read files
    "file_read",      # Read trajectories, agent specs, Hive entries
    "file_write",     # Write improvement.md, agent spec updates, Hive updates
    "web_fetch",      # Optional: fetch reference docs for analysis context
]

# Skills injected at runtime
skills = [
    "sia-feedback-agent-pattern",
    "kraken-system-brain-anatomy",
    "kraken-firewall-layers-reference",
    "kraken-hive-mind-schema",
    "kraken-agent-instruction-format",
    "opencode-plugin-engineering-sop",
]

# MCP servers
mcp_servers = []

# Requirements
[[requires]]
key = "sqlite3"
label = "SQLite3 CLI"
requirement_type = "binary"
check_value = "sqlite3"
description = "SQLite3 is required to query Cortex databases across Kraken projects."

[requires.install]
linux_apt = "sudo apt install sqlite3"
linux_dnf = "sudo dnf install sqlite"
linux_pacman = "sudo pacman -S sqlite"
macos = "brew install sqlite"

# Configurable settings
[[settings]]
key = "analysis_interval_seconds"
label = "Analysis Interval"
description = "How often the FeedbackBrain runs analysis (seconds)"
setting_type = "text"
default = "1800"

[[settings]]
key = "analysis_model"
label = "Analysis Model"
description = "LLM model to use for deep trajectory analysis"
setting_type = "select"
default = "claude-sonnet-4-20250514"

[[settings.options]]
value = "claude-sonnet-4-20250514"
label = "Claude Sonnet 4 (Balanced)"
provider_env = "ANTHROPIC_API_KEY"

[[settings.options]]
value = "claude-opus-4-20250514"
label = "Claude Opus 4 (Deep Analysis)"
provider_env = "ANTHROPIC_API_KEY"

[[settings.options]]
value = "gemini/gemini-3.1-pro-preview"
label = "Gemini 3.1 Pro"
provider_env = "GEMINI_API_KEY"

[[settings]]
key = "auto_apply_improvements"
label = "Auto-Apply Improvements"
description = "Automatically apply low-risk improvements without manual review"
setting_type = "toggle"
default = "true"

[[settings]]
key = "notify_channel"
label = "Notification Channel"
description = "Where to send improvement summaries"
setting_type = "select"
default = "none"

[[settings.options]]
value = "none"
label = "None (files only)"

[[settings.options]]
value = "telegram"
label = "Telegram"

[[settings.options]]
value = "discord"
label = "Discord"

# Agent configuration
[agent]
name = "Prefrontal Cortex"
description = "SIA-style evolutionary optimization engine for Kraken orchestrator. Analyzes agent execution trajectories, identifies structural flaws, proposes improvements, and tracks evolutionary lineage across all Kraken projects."
module = "builtin:chat"
provider = "anthropic"
model = "claude-sonnet-4-20250514"
max_tokens = 8192
temperature = 0.3
system_prompt = "See SYSTEM_PROMPT.md — 4-phase SIA Feedback Agent operational playbook"
max_iterations = 20
heartbeat_interval_secs = 120

# Dashboard metrics
[dashboard]
metrics = [
    { label = "Projects Monitored", memory_key = "projects_monitored", format = "number" },
    { label = "Generations Analyzed", memory_key = "generations_analyzed", format = "number" },
    { label = "Improvements Proposed", memory_key = "improvements_proposed", format = "number" },
    { label = "Improvements Applied", memory_key = "improvements_applied", format = "number" },
    { label = "Total Trajectories", memory_key = "total_trajectories", format = "number" },
    { label = "Average Accuracy Gain", memory_key = "avg_accuracy_gain", format = "number" },
    { label = "Cross-Project Patterns", memory_key = "cross_project_patterns", format = "number" },
    { label = "Last Analysis", memory_key = "last_analysis", format = "duration" },
    { label = "Merkle Chain Valid", memory_key = "merkle_chain_valid", format = "number" },
]
```

---

## 7. KEY DESIGN DECISIONS

| Decision | Rationale |
|---|---|
| **System Brain is the execution layer of the PFC** | The PFC learns offline; the System Brain enforces in real-time. This is the RNA → immune system analogy: the PFC discovers patterns (edits), the System Brain gains detection capability (immune response). Not two separate systems — one intelligence layer with two temporal modes. |
| **PFC → System Brain pattern injection targets the dynamic firewall engine** | The semantically intelligent L0-L7 + V10 firewall is the PERFECT injection target. The firewall already has regex pattern matching, decision point triggers, and SCF thresholds. PFC feeds new patterns directly into these layers — no new mechanism needed, just new data flowing into proven machinery. |
| **Start small: L5 first, then decision triggers, then SCF** | Gradual rollout. Phase 1: PFC injects new L5 derailment regex patterns (simplest mechanism, highest impact). Phase 2: PFC adds new decision point triggers to SystemBrainV2 (medium complexity). Phase 3: PFC recalibrates SCF thresholds based on trajectory data (requires statistical confidence). Don't wire everything at once. |
| **ExecutionTracer is in-process, FeedbackBrain is out-of-process** | Trajectory recording must be synchronous and zero-latency (OpenCode hooks). Deep analysis benefits from WASM sandboxing, scheduled batch processing, crash isolation, and Merkle audit — all OpenFang strengths. SIA's Feedback Agent is explicitly a separate process with a different LLM tier. |
| **ExecutionTracer stores to Cortex SQLite, not a separate DB** | Cortex is the proven shared state store (16/16 tests pass). Single source of truth. OpenFang reads it directly via `sqlite3` CLI — no API needed. |
| **Sync Bridge uses shared filesystem, not HTTP API** | Kraken and OpenFang may run on the same machine. Cortex SQLite is file-based. Reading/writing to known paths eliminates network complexity, authentication, and serialization overhead. |
| **Merkle hash-chain for improvement lineage** | SIA's value is in the lineage — knowing what worked and what didn't across generations. Cryptographic chaining ensures improvement history is tamper-evident. OpenFang has this built-in. |
| **6 Krakens → 1 Prefrontal Cortex** | Cross-project learning is the exponential power of this architecture. A pattern discovered in one Kraken project can immediately prevent failures in 5 others. This is SIA at swarm scale. |
| **Agent instructions are modifiable by FeedbackBrain** | SIA's Feedback Agent rewrites target_agent.py. Kraken's equivalent is agent instructions + tool definitions + hook configurations. The FeedbackBrain proposes changes; the Sync Bridge applies them (auto for low-risk, manual review for high-risk). |
| **Weight update candidates are collected, not applied** | SIA-W+H requires weight fine-tuning, but this requires a training pipeline (model access, GPU, validation). The Prefrontal Cortex COLLECTS candidates (positive/negative trajectory examples) and stores them for future use. The actual fine-tuning is a separate process (Phase 4b). |
| **Zero deletions from existing code** | Cortex.ts, SCF.ts, system-brain.ts, system-brain-v2.ts, HydraCluster.ts — all proven code gets additions only. PrefrontalCortexBrain extends SystemBrainV2. No modification of existing API surfaces. |
| **The chat.message hook must not block** | ExecutionTracer records on `tool.execute.after` and `chat.message`. These hooks are pass-through — they never block or modify. Blocking is the SystemBrain firewall's job (L0-L7, tool.execute.before). |
| **OpenFang Hand runs on schedule, not on trigger** | The FeedbackBrain should not fire on every tool call (that's SystemBrainV2's dynamic injection). It should batch-analyze accumulated data. Default: every 30 minutes. Can also be triggered by session completion events. |

---

## 8. IMPLEMENTATION ORDER

| Phase | Name | Files | What Gets Built |
|-------|------|-------|----------------|
| **P1** | Foundation Types | `C5` (prefrontal types), `src/hydra/types.ts` (additions) | All ExecutionTrajectory, EvolutionLineage, FeedbackAnalysis, ImprovementProposal types. Cortex table schemas. |
| **P2** | ExecutionTracer Plugin | `C2` (execution-tracer), `C9` (plugin index), `C10` (package.json) | tool.execute.after + chat.message hooks. Trajectory recording to Cortex. Plugin registration in opencode.json. |
| **P3** | PrefrontalCortexBrain | `C1` (brain), `C3` (sync-bridge), `C4` (lineage-tracker), `C6` (index) | Brain extension: trajectory management, sync bridge, lineage tracking. Integration with SystemBrainV2, Hive Mind, Brain Messenger. |
| **P4** | Agent Tools + Context | `C7` (tools), `C8` (hook), `src/index.ts` (instructions) | Agent-facing tools for trajectory/lineage queries. Context injection with generation awareness. Agent instruction updates. |
| **P5** | OpenFang Hand | `C11` (HAND.toml), `C12` (SYSTEM_PROMPT.md), `C13` (SKILL.md) | Complete Hand definition. 4-phase SIA Feedback Agent. Kraken anatomy skills. |
| **P6** | Integration + Tests | `C14-C17` (tests), Cortex tables | Unit tests for tracer, sync bridge, lineage. E2E: agent → trajectory → analysis → improvement. Container TUI test. |
| **P7** | Ship + Preserve | Boilerplate sync, snapshot, COMPACTION_SURVIVAL update | All code synced to agent_plugin_boilerplates. SHIP_MANIFEST.md. Evolution lineage documentation. |

---

*END 00_ARCHITECTURE.md — Full Prefrontal Cortex Architecture Document*
