# ARCHITECTURE — Kraken Brain Framework

## The Brain Contract (Invariant)

Every Kraken brain satisfies this structural contract:

```
┌─────────────────────────────────────────────┐
│              BRAIN CLASS                      │
│  ┌─────────────────────────────────────────┐  │
│  │ CONSTRUCTOR                             │  │
│  │  • Resolve StateStore (injected/global)  │  │
│  │  • Resolve BrainMessenger (injected/glob)│  │
│  │  • Create sub-components (store, bridge) │  │
│  │  • Initialize default state             │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ initialize()                              │  │
│  │  • Guard: if (initialized) return          │  │
│  │  • Init sub-components                     │  │
│  │  • messenger.subscribe(BRAIN_ID, handler) │  │
│  │  • stateStore.set(DOMAIN, 'keys')          │  │
│  │  • Start heartbeat interval              │  │
│  │  • this.initialized = true                 │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ cleanup()                                 │  │
│  │  • clearInterval(heartbeat)               │  │
│  │  • Flush/close sub-components             │  │
│  │  • stateStore cleanup                    │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ handleBrainMessage(msg)                   │  │
│  │  • switch(msg.type): sync / context-inject │ │
│  │    / checkpoint / override               │  │
│  └─────────────────────────────────────────┘  │
│  SINGLETON FACTORY: create*Brain() / get*Brain()│
└─────────────────────────────────────────────┘
```

## Plugin Integration Pattern

```
src/index.ts
  │
  ├── createYourBrainBrain({ stateStore, messenger })
  ├── brain.initialize()
  │   (wrapped in try/catch — failure = graceful null)
  │
  ├── tool: { ...createYourBrainTools() }
  │
  ├── config: register agents with tools
  │
  ├── experimental.chat.system.transform → yourBrainHook()
  ├── tool.execute.before → brain.detectIntuition()  (optional)
  ├── tool.execute.after → brain.recordTrajectory()   (optional)
  │
  ├── experimental.session.compacting → brain state snapshot
  └── event: session.end → brain.cleanup()
```

## Embedded vs External Bridge

| | Embedded | External Bridge |
|---|---|---|
| Runs in | OpenCode plugin process (Node.js) | OpenFang/Dragon Server (Rust/WASM) |
| Latency | Synchronous, zero-latency | Async, batch-scheduled |
| Crash isolation | Tied to plugin lifecycle | Fully isolated |
| Communication | N/A | Queue-based via JSON files |
| Failure mode | Graceful null, try/catch hooks | AntiSlopGuardrails validates all input |

## Directory Structure

```
src/
├── index.ts                    Plugin entry point (template)
├── shared/
│   ├── state-store.ts          Zero-mod boilerplate
│   ├── brain-messenger.ts      Zero-mod boilerplate
│   └── domain-ownership.ts     Add brain ID + domain
├── brains/YOUR_BRAIN/
│   ├── types.ts                Brain state + constants
│   ├── index.ts                Barrel exports
│   ├── YOUR_BRAIN-brain.ts     Brain class
│   ├── YOUR_BRAIN-store.ts     Persistent store (optional)
│   ├── tracer.ts               Execution recording (optional)
│   └── sync-bridge.ts          External bridge (optional)
├── tools/YOUR_BRAIN-tools.ts   Agent tools
└── hooks/YOUR_BRAIN-hook.ts    Context injection
hands/YOUR_BRAIN/
├── HAND.toml                   OpenFang Hand manifest
├── SYSTEM_PROMPT.md            External agent playbook
└── SKILL.md                    Domain expertise
tests/
└── brain-template.test.ts      Unit tests
configs/
└── opencode.json               Sample config
```
