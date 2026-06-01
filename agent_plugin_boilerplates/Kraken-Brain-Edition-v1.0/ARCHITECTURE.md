# ARCHITECTURE — Kraken Brain Framework (Embedded Edition)

## The Brain Contract (Invariant)

Every Kraken brain satisfies this structural contract:

```
┌─────────────────────────────────────────────┐
│              BRAIN CLASS                      │
│  ┌─────────────────────────────────────────┐  │
│  │ CONSTRUCTOR                             │  │
│  │  • Resolve StateStore (injected/global)  │  │
│  │  • Resolve BrainMessenger (injected/glob)│  │
│  │  • Create sub-components (store, tracer) │  │
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
│  │    / checkpoint                          │  │
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
  ├── tool.execute.before → brain.detectPattern()  (optional)
  ├── tool.execute.after → brain.record()          (optional)
  │
  ├── experimental.session.compacting → brain state snapshot
  └── event: session.end → brain.cleanup()
```

## Embedded-Only Scope

This edition has NO external dependencies. Everything runs in-process within the OpenCode plugin's Node.js context. Communication with other brains is via BrainMessenger (in-process pub/sub). For external communication (OpenFang, Dragon Server), use Kraken-Brain-External-Edition-v1.0.

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
│   └── tracer.ts               Execution recording (optional)
├── tools/YOUR_BRAIN-tools.ts   Agent tools
└── hooks/YOUR_BRAIN-hook.ts    Context injection
tests/
└── brain-template.test.ts      Unit tests
configs/
└── opencode.json               Sample config
```
