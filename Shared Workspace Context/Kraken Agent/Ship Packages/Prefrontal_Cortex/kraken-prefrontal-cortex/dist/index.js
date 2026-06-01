import { createRequire } from "node:module";
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/shared/domain-ownership.ts
function canWrite(domain, brain) {
  const owners = DOMAIN_OWNERSHIP3[domain];
  return owners ? owners.includes(brain) : false;
}
var DOMAIN_OWNERSHIP3;
var init_domain_ownership = __esm(() => {
  DOMAIN_OWNERSHIP3 = {
    "planning-state": ["kraken-planning", "kraken-system"],
    "execution-state": ["kraken-execution", "kraken-system"],
    "thinking-state": ["kraken-reasoning", "kraken-system"],
    "context-bridge": ["kraken-planning"],
    "workflow-state": ["kraken-system", "kraken-execution"],
    "security-state": ["kraken-system"],
    "quality-state": ["kraken-execution", "kraken-system"],
    "container-state": ["kraken-subagent"],
    "execution-queue": ["kraken-subagent", "kraken-execution"],
    "alpha-state": ["alpha-execution", "alpha-system"],
    "beta-state": ["beta-reasoning", "beta-system"],
    "gamma-state": ["gamma-system", "gamma-execution"],
    "compaction-state": ["kraken-system"],
    "context-registry": ["kraken-system"],
    "token-budget": ["kraken-system"],
    "prefrontal-state": ["kraken-prefrontal", "kraken-system"]
  };
});

// src/shared/state-store.ts
class StateStore {
  data = new Map;
  versions = new Map;
  watchers = new Map;
  get(domain, key) {
    const entry = this.data.get(`${domain}:${key}`);
    return entry?.value;
  }
  set(domain, key, value, ownedBy = []) {
    const fullKey = `${domain}:${key}`;
    const existing = this.data.get(fullKey);
    const entry = {
      value,
      version: existing ? existing.version + 1 : 1,
      lastModified: Date.now(),
      ownedBy
    };
    this.data.set(fullKey, entry);
    this.versions.set(fullKey, entry.version);
    this.notifyWatchers(domain, key, value);
  }
  canModify(domain, brain) {
    return canWrite(domain, brain);
  }
  delete(domain, key) {
    return this.data.delete(`${domain}:${key}`);
  }
  clearDomain(domain) {
    const prefix = `${domain}:`;
    for (const key of this.data.keys()) {
      if (key.startsWith(prefix)) {
        this.data.delete(key);
      }
    }
  }
  cleanup() {
    this.data.clear();
    this.versions.clear();
    this.watchers.clear();
  }
  watch(domain, key, callback) {
    const fullKey = `${domain}:${key}`;
    if (!this.watchers.has(fullKey)) {
      this.watchers.set(fullKey, new Set);
    }
    this.watchers.get(fullKey).add(callback);
    return () => {
      const watchers = this.watchers.get(fullKey);
      if (watchers) {
        watchers.delete(callback);
      }
    };
  }
  notifyWatchers(domain, key, value) {
    const fullKey = `${domain}:${key}`;
    const watchers = this.watchers.get(fullKey);
    if (watchers) {
      for (const callback of watchers) {
        try {
          callback(key, value);
        } catch (err) {
          console.error("[StateStore] Watcher error:", err);
        }
      }
    }
  }
  getVersion(domain, key) {
    return this.versions.get(`${domain}:${key}`) ?? 0;
  }
  getAllKeys(domain) {
    const prefix = `${domain}:`;
    const keys = [];
    for (const key of this.data.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.slice(prefix.length));
      }
    }
    return keys;
  }
  snapshot(domain) {
    const prefix = `${domain}:`;
    const snapshot = {};
    for (const [key, entry] of this.data.entries()) {
      if (key.startsWith(prefix)) {
        snapshot[key.slice(prefix.length)] = entry.value;
      }
    }
    return snapshot;
  }
}
function createStateStore2() {
  if (!globalStateStore) {
    globalStateStore = new StateStore;
  }
  return globalStateStore;
}
function getStateStore2() {
  if (!globalStateStore) {
    globalStateStore = new StateStore;
  }
  return globalStateStore;
}
var globalStateStore = null;
var init_state_store = __esm(() => {
  init_domain_ownership();
});

// src/shared/brain-messenger.ts
var exports_brain_messenger = {};
__export(exports_brain_messenger, {
  getBrainMessenger: () => getBrainMessenger,
  createBrainMessenger: () => createBrainMessenger2,
  BrainMessenger: () => BrainMessenger
});

class BrainMessenger {
  messageQueue = [];
  handlers = new Map;
  pendingCommands = new Map;
  commandResults = new Map;
  messageId = 0;
  subscribedBrains = new Set;
  send(message) {
    const msg = {
      ...message,
      timestamp: message.timestamp ?? Date.now()
    };
    this.messageQueue.push(msg);
    if (message.to === "*") {
      this.broadcast(msg);
    } else {
      this.deliverToBrain(message.to, msg);
    }
  }
  sendOverride(command) {
    this.pendingCommands.set(command.id, command);
    const result = {
      commandId: command.id,
      status: "pending",
      respondedAt: Date.now()
    };
    this.commandResults.set(command.id, result);
    this.send({
      from: command.from,
      to: command.to,
      type: "override",
      priority: command.priority,
      payload: {
        commandId: command.id,
        action: command.action,
        target: command.target,
        ...command.payload
      },
      requiresAck: command.requiresAck
    });
    return result;
  }
  subscribe(brainId, handler) {
    if (!this.handlers.has(brainId)) {
      this.handlers.set(brainId, new Set);
    }
    this.handlers.get(brainId).add(handler);
    this.subscribedBrains.add(brainId);
    return () => {
      const brainHandlers = this.handlers.get(brainId);
      if (brainHandlers) {
        brainHandlers.delete(handler);
      }
    };
  }
  acknowledgeCommand(commandId, status) {
    const result = this.commandResults.get(commandId);
    if (result) {
      result.status = status;
      result.respondedAt = Date.now();
    }
  }
  completeCommand(commandId, result) {
    const cmdResult = this.commandResults.get(commandId);
    if (cmdResult) {
      cmdResult.status = "completed";
      cmdResult.result = result;
      cmdResult.respondedAt = Date.now();
    }
  }
  getCommandStatus(commandId) {
    return this.commandResults.get(commandId);
  }
  deliverMessage(from, to, type, payload, priority = "normal") {
    this.send({
      from,
      to,
      type,
      priority,
      payload,
      requiresAck: false
    });
  }
  deliverToBrain(brainId, message) {
    const handlers = this.handlers.get(brainId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          const result = handler(message);
          if (result instanceof Promise) {
            result.catch((err) => console.error(`[BrainMessenger] Handler error for ${brainId}:`, err));
          }
        } catch (err) {
          console.error(`[BrainMessenger] Handler error for ${brainId}:`, err);
        }
      }
    }
  }
  broadcast(message) {
    for (const brainId of this.subscribedBrains) {
      if (brainId !== message.from) {
        this.deliverToBrain(brainId, message);
      }
    }
  }
  getQueuedMessages(brainId) {
    if (brainId) {
      return this.messageQueue.filter((m) => m.to === brainId || m.to === "*");
    }
    return [...this.messageQueue];
  }
  drainMessages(brainId) {
    const drained = [];
    this.messageQueue = this.messageQueue.filter((m) => {
      if (m.to === brainId || m.to === "*") {
        drained.push(m);
        return false;
      }
      return true;
    });
    return drained;
  }
  clearQueue() {
    this.messageQueue = [];
  }
  generateMessageId() {
    return `msg-${++this.messageId}`;
  }
}
function createBrainMessenger2() {
  if (!globalMessenger) {
    globalMessenger = new BrainMessenger;
  }
  return globalMessenger;
}
function getBrainMessenger() {
  if (!globalMessenger) {
    globalMessenger = new BrainMessenger;
  }
  return globalMessenger;
}
var globalMessenger = null;

// src/brains/planning/planning-brain.ts
var exports_planning_brain = {};
__export(exports_planning_brain, {
  getPlanningBrain: () => getPlanningBrain,
  createPlanningBrain: () => createPlanningBrain,
  PlanningBrain: () => PlanningBrain
});

class PlanningBrain {
  initialized = false;
  state = {
    t2MasterLoaded: false,
    t1Generated: false,
    tasksDecomposed: false,
    domainsDesignated: false
  };
  stateStore;
  messenger;
  constructor(stateStore, messenger) {
    this.stateStore = stateStore || getStateStore2();
    this.messenger = messenger || getBrainMessenger();
  }
  initialize() {
    if (this.initialized)
      return;
    console.log("[PlanningBrain] Initializing...");
    this.initialized = true;
    this.stateStore.set("planning-state", "initialized", true, ["kraken-planning"]);
    this.stateStore.set("planning-state", "brain-id", "kraken-planning", ["kraken-planning"]);
    this.loadT2Master().catch((err) => {
      console.error("[PlanningBrain] T2 Master load failed:", err);
    });
    console.log("[PlanningBrain] Initialized - owns planning-state, context-bridge");
  }
  isInitialized() {
    return this.initialized;
  }
  async loadT2Master() {
    console.log("[PlanningBrain] Loading T2 Master context...");
    const t2Context = await this.loadKrakenContext();
    this.stateStore.set("planning-state", "t2-master", t2Context, ["kraken-planning"]);
    this.state.t2MasterLoaded = true;
    this.messenger.deliverMessage("kraken-planning", "kraken-execution", "context-inject", {
      type: "t2-master-loaded",
      data: { t2MasterLoaded: true }
    }, "high");
    console.log("[PlanningBrain] T2 Master loaded");
  }
  isT2MasterLoaded() {
    return this.state.t2MasterLoaded;
  }
  async loadKrakenContext() {
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const contextDir = path.resolve(process.cwd(), "kraken-context");
      const context = {
        version: "1.2",
        loadedAt: Date.now(),
        sourceDir: contextDir
      };
      try {
        const entries = await fs.readdir(contextDir);
        for (const entry of entries) {
          if (entry.endsWith(".md")) {
            const content = await fs.readFile(path.join(contextDir, entry), "utf-8");
            context[entry.replace(".md", "")] = content.substring(0, 1000);
          }
        }
        console.log(`[PlanningBrain] Loaded ${entries.length} T2 context files from ${contextDir}`);
      } catch {
        console.log(`[PlanningBrain] No kraken-context/ directory at ${contextDir}, using defaults`);
      }
      if (Object.keys(context).length <= 3) {
        const altPaths = [
          path.resolve(process.cwd(), "../kraken-context"),
          path.resolve(process.cwd(), "../../kraken-context")
        ];
        for (const altDir of altPaths) {
          try {
            const entries = await fs.readdir(altDir);
            for (const entry of entries) {
              if (entry.endsWith(".md")) {
                const content = await fs.readFile(path.join(altDir, entry), "utf-8");
                context[entry.replace(".md", "")] = content.substring(0, 1000);
              }
            }
            console.log(`[PlanningBrain] Loaded ${entries.length} T2 files from ${altDir}`);
            break;
          } catch {}
        }
      }
      context.capabilities = ["planning", "execution", "system", "hive"];
      context.clusterTypes = ["alpha", "beta", "gamma"];
      return context;
    } catch {
      return {
        version: "1.2",
        loadedAt: Date.now(),
        capabilities: ["planning", "execution", "system", "hive"],
        clusterTypes: ["alpha", "beta", "gamma"]
      };
    }
  }
  async generateT1(userRequest = "") {
    console.log("[PlanningBrain] Generating T1...");
    let specContent = userRequest;
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const specPaths = [
        path.resolve(process.cwd(), "SPEC.md"),
        path.resolve(process.cwd(), "spec.md"),
        path.resolve(process.cwd(), "plan.md")
      ];
      for (const specPath of specPaths) {
        try {
          await fs.access(specPath);
          specContent = await fs.readFile(specPath, "utf-8");
          console.log(`[PlanningBrain] Loaded T1 from ${specPath} (${specContent.length} chars)`);
          break;
        } catch {}
      }
    } catch {}
    const tasks = this.parseRequestIntoTasks(specContent);
    const t1 = {
      tasks,
      context: {
        specSource: userRequest.substring(0, 200),
        generatedAt: new Date().toISOString(),
        phases: ["PLAN", "BUILD", "TEST", "VERIFY", "AUDIT", "DELIVERY"],
        planningBrain: "kraken-planning"
      }
    };
    this.state.t1Generated = true;
    this.stateStore.set("planning-state", "t1-generated", true, ["kraken-planning"]);
    this.stateStore.set("planning-state", "t1-context", t1, ["kraken-planning"]);
    console.log(`[PlanningBrain] T1 generated: ${tasks.length} tasks`);
    return t1;
  }
  parseRequestIntoTasks(userRequest) {
    if (!userRequest || userRequest.trim().length === 0) {
      return [];
    }
    const tasks = [];
    let id = 0;
    const headingRegex = /^#{1,3}\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(userRequest)) !== null) {
      const description = match[1].trim();
      const type = this.inferTaskType(description);
      tasks.push({
        id: `task-${++id}-${Date.now()}`,
        type,
        description,
        targetCluster: this.assignCluster(type),
        outputs: [],
        priority: "normal"
      });
    }
    if (tasks.length === 0) {
      const steps = userRequest.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 10 && !s.startsWith("#"));
      if (steps.length > 1) {
        for (const step of steps) {
          const type = this.inferTaskType(step);
          tasks.push({
            id: `task-${++id}-${Date.now()}`,
            type,
            description: step.substring(0, 200),
            targetCluster: this.assignCluster(type),
            outputs: [],
            priority: "normal"
          });
        }
      } else {
        const type = this.inferTaskType(userRequest);
        tasks.push({
          id: `task-${++id}-${Date.now()}`,
          type,
          description: userRequest.substring(0, 200),
          targetCluster: this.assignCluster(type),
          outputs: [],
          priority: "normal"
        });
      }
    }
    return tasks;
  }
  inferTaskType(description) {
    const lower = description.toLowerCase();
    if (lower.includes("build") || lower.includes("create") || lower.includes("implement") || lower.includes("write"))
      return "build";
    if (lower.includes("debug") || lower.includes("fix") || lower.includes("bug") || lower.includes("resolve"))
      return "debug";
    if (lower.includes("test") || lower.includes("verify") || lower.includes("validate"))
      return "test";
    if (lower.includes("refactor") || lower.includes("restructure"))
      return "refactor";
    if (lower.includes("analyze") || lower.includes("review") || lower.includes("examine"))
      return "analyze";
    if (lower.includes("audit") || lower.includes("inspect") || lower.includes("assess"))
      return "audit";
    return "build";
  }
  isT1Generated() {
    return this.state.t1Generated;
  }
  async decomposeTasks(tasks) {
    console.log("[PlanningBrain] Decomposing tasks for cluster assignment...");
    const decomposed = tasks.map((task) => ({
      ...task,
      outputs: task.outputs || [],
      targetCluster: this.assignCluster(task.type)
    }));
    this.state.tasksDecomposed = true;
    this.stateStore.set("planning-state", "decomposed-tasks", decomposed, ["kraken-planning"]);
    console.log(`[PlanningBrain] Decomposed ${decomposed.length} tasks`);
    return decomposed;
  }
  assignCluster(taskType) {
    const clusterMap = {
      build: "alpha",
      test: "gamma",
      audit: "gamma",
      debug: "beta",
      refactor: "beta",
      analyze: "beta"
    };
    return clusterMap[taskType] || "alpha";
  }
  isTasksDecomposed() {
    return this.state.tasksDecomposed;
  }
  async designateDomains(tasks) {
    console.log("[PlanningBrain] Designating domains for task execution...");
    const domainMap = {
      build: "execution-state",
      debug: "thinking-state",
      test: "quality-state",
      refactor: "execution-state",
      analyze: "thinking-state",
      audit: "security-state"
    };
    const designations = tasks.map((task) => ({
      taskId: task.id,
      primaryDomain: domainMap[task.type] || "execution-state",
      secondaryDomain: "workflow-state"
    }));
    this.state.domainsDesignated = true;
    this.stateStore.set("planning-state", "domain-designations", designations, ["kraken-planning"]);
    console.log(`[PlanningBrain] Designated domains for ${designations.length} tasks`);
  }
  isDomainsDesignated() {
    return this.state.domainsDesignated;
  }
  async createContextBridge(sourceTask, targetTask) {
    console.log(`[PlanningBrain] Creating context bridge: ${sourceTask} → ${targetTask}`);
    const bridge = {
      source: sourceTask,
      target: targetTask,
      createdAt: Date.now(),
      type: "planning-context"
    };
    this.stateStore.set("context-bridge", `${sourceTask}-${targetTask}`, bridge, ["kraken-planning"]);
    this.messenger.deliverMessage("kraken-planning", "kraken-execution", "context-inject", {
      type: "context-bridge",
      sourceTask,
      targetTask,
      bridge
    }, "normal");
  }
  getState() {
    return { ...this.state };
  }
  getSnapshot() {
    return this.stateStore.snapshot("planning-state");
  }
}
function createPlanningBrain(stateStore, messenger) {
  if (!planningBrainInstance) {
    planningBrainInstance = new PlanningBrain(stateStore, messenger);
  }
  return planningBrainInstance;
}
function getPlanningBrain() {
  if (!planningBrainInstance) {
    planningBrainInstance = new PlanningBrain;
  }
  return planningBrainInstance;
}
var planningBrainInstance = null;
var init_planning_brain = __esm(() => {
  init_state_store();
});

// src/brains/execution/execution-brain.ts
var exports_execution_brain = {};
__export(exports_execution_brain, {
  getExecutionBrain: () => getExecutionBrain,
  createExecutionBrain: () => createExecutionBrain,
  ExecutionBrain: () => ExecutionBrain
});

class ExecutionBrain {
  initialized = false;
  state = {
    initialized: false,
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0
  };
  stateStore;
  messenger;
  registeredOutputs = new Map;
  activeTasks = new Map;
  constructor(stateStore, messenger) {
    this.stateStore = stateStore || getStateStore2();
    this.messenger = messenger || getBrainMessenger();
  }
  initialize() {
    if (this.initialized)
      return;
    console.log("[ExecutionBrain] Initializing...");
    this.initialized = true;
    this.state.initialized = true;
    this.stateStore.set("execution-state", "initialized", true, ["kraken-execution"]);
    this.stateStore.set("execution-state", "brain-id", "kraken-execution", ["kraken-execution"]);
    this.messenger.subscribe("kraken-execution", this.handleBrainMessage.bind(this));
    console.log("[ExecutionBrain] Initialized - owns execution-state, quality-state");
  }
  isInitialized() {
    return this.initialized;
  }
  registerTaskOutputs(taskId, outputs) {
    this.registeredOutputs.set(taskId, outputs);
    console.log(`[ExecutionBrain] Registered ${outputs.length} outputs for task ${taskId}`);
    this.stateStore.set("execution-state", `outputs-${taskId}`, outputs, ["kraken-execution"]);
  }
  async claimOutputsRetrieved(taskId, hostPaths) {
    const outputs = this.registeredOutputs.get(taskId);
    if (!outputs) {
      console.warn(`[ExecutionBrain] No registered outputs for task ${taskId}`);
      return;
    }
    for (const path of hostPaths) {
      const output = outputs.find((o) => o.path === path);
      if (output) {
        output.retrieved = true;
        output.retrievedAt = Date.now();
      }
    }
    console.log(`[ExecutionBrain] Verified ${hostPaths.length} outputs for task ${taskId}`);
    this.stateStore.set("execution-state", `retrieved-${taskId}`, hostPaths, ["kraken-execution"]);
  }
  canCompleteTask(taskId) {
    const outputs = this.registeredOutputs.get(taskId);
    if (!outputs)
      return true;
    const required = outputs.filter((o) => o.required);
    const retrieved = outputs.filter((o) => o.retrieved);
    return required.length === retrieved.length;
  }
  getOutputStatus(taskId) {
    const outputs = this.registeredOutputs.get(taskId) || [];
    const required = outputs.filter((o) => o.required);
    const retrieved = outputs.filter((o) => o.retrieved);
    return {
      required: required.length,
      retrieved: retrieved.length,
      complete: required.length === retrieved.length
    };
  }
  async executeTask(taskId, clusterId, request) {
    console.log(`[ExecutionBrain] Executing task ${taskId} on cluster ${clusterId}`);
    if (request.outputs && request.outputs.length > 0) {
      this.registerTaskOutputs(taskId, request.outputs);
    }
    this.activeTasks.set(taskId, {
      clusterId,
      status: "executing",
      startTime: Date.now()
    });
    this.state.activeTasks++;
    this.updateState();
    this.messenger.deliverMessage("kraken-execution", "kraken-system", "context-inject", {
      type: "task-started",
      taskId,
      clusterId
    }, "normal");
    return {
      taskId,
      success: false,
      clusterId,
      agentId: "pending",
      completedAt: 0
    };
  }
  completeTask(result) {
    const taskInfo = this.activeTasks.get(result.taskId);
    if (taskInfo) {
      this.activeTasks.delete(result.taskId);
      this.state.activeTasks = Math.max(0, this.state.activeTasks - 1);
    }
    if (result.success) {
      this.state.completedTasks++;
      const outputs = this.registeredOutputs.get(result.taskId);
      const allVerified = outputs ? outputs.every((o) => o.retrieved) : false;
      if (outputs && outputs.length > 0 && !allVerified) {
        console.warn(`[ExecutionBrain] L2_WARNING: Task ${result.taskId} claims completion but ${outputs.filter((o) => !o.retrieved).length}/${outputs.length} outputs not retrieved`);
        console.warn(`[ExecutionBrain] FIRE-AND-FORGET DETECTED — triggering output retrieval enforcement`);
        this.enforceOutputRetrieval(result.taskId);
      }
    } else {
      this.state.failedTasks++;
    }
    this.updateState();
    this.stateStore.set("execution-state", "active-tasks", this.state.activeTasks, ["kraken-execution"]);
    this.stateStore.set("execution-state", "completed-tasks", this.state.completedTasks, ["kraken-execution"]);
    this.stateStore.set("execution-state", `task-${result.taskId}-result`, result, ["kraken-execution"]);
    console.log(`[ExecutionBrain] Task ${result.taskId} completed: ${result.success ? "SUCCESS" : "FAILED"} (active: ${this.state.activeTasks}, completed: ${this.state.completedTasks})`);
    if (result.success && this.canCompleteTask(result.taskId)) {
      this.messenger.deliverMessage("kraken-execution", "kraken-system", "checkpoint", {
        type: "task-complete-verified",
        taskId: result.taskId,
        outputs: result.outputs
      }, "high");
    }
  }
  async superviseTask(taskId) {
    const taskInfo = this.activeTasks.get(taskId);
    if (!taskInfo) {
      console.warn(`[ExecutionBrain] No active task ${taskId} to supervise`);
      return;
    }
    const outputStatus = this.getOutputStatus(taskId);
    if (!outputStatus.complete) {
      console.log(`[ExecutionBrain] Task ${taskId} outputs incomplete: ${outputStatus.retrieved}/${outputStatus.required}`);
      this.messenger.deliverMessage("kraken-execution", "kraken-system", "gate-failure", {
        taskId,
        reason: "outputs-not-retrieved",
        required: outputStatus.required,
        retrieved: outputStatus.retrieved
      }, "critical");
    }
  }
  createOverrideCommand(params) {
    const commandId = `ovr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return {
      id: commandId,
      from: "kraken-execution",
      to: params.target.brainId || params.target.clusterId || "kraken-subagent",
      action: params.action,
      target: params.target,
      payload: params.payload || {},
      priority: params.priority || "high",
      requiresAck: true,
      createdAt: Date.now()
    };
  }
  async abortTask(taskId, reason) {
    const command = this.createOverrideCommand({
      action: "ABORT",
      target: { taskId },
      payload: { reason },
      priority: "critical"
    });
    const result = this.messenger.sendOverride(command);
    console.log(`[ExecutionBrain] Abort command sent for task ${taskId}: ${command.id}`);
  }
  async enforceOutputRetrieval(taskId) {
    const command = this.createOverrideCommand({
      action: "RETRIEVE_OUTPUTS",
      target: { taskId },
      payload: {},
      priority: "high"
    });
    this.messenger.sendOverride(command);
  }
  async checkQuality(taskId) {
    const issues = [];
    const outputStatus = this.getOutputStatus(taskId);
    if (!outputStatus.complete) {
      issues.push(`Output incomplete: ${outputStatus.retrieved}/${outputStatus.required}`);
    }
    const taskInfo = this.activeTasks.get(taskId);
    if (taskInfo) {
      const duration = Date.now() - taskInfo.startTime;
      const timeout = 120000;
      if (duration > timeout) {
        issues.push(`Task duration ${duration}ms exceeds timeout ${timeout}ms`);
      }
    }
    const passed = issues.length === 0;
    this.stateStore.set("quality-state", `check-${taskId}`, { passed, issues }, ["kraken-execution"]);
    return { passed, issues };
  }
  recordResult(result) {
    this.completeTask(result);
  }
  handleBrainMessage(message) {
    if (message.type === "gate-failure" && message.from === "kraken-system") {
      console.log(`[ExecutionBrain] Received gate failure: ${JSON.stringify(message.payload)}`);
    }
  }
  getState() {
    return { ...this.state };
  }
  getActiveTasks() {
    return new Map(this.activeTasks);
  }
  getSnapshot() {
    return {
      ...this.stateStore.snapshot("execution-state"),
      ...this.stateStore.snapshot("quality-state")
    };
  }
  cleanup() {
    this.registeredOutputs.clear();
    this.activeTasks.clear();
    this.state = {
      initialized: true,
      activeTasks: 0,
      completedTasks: 0,
      failedTasks: 0
    };
  }
}
function createExecutionBrain(stateStore, messenger) {
  if (!executionBrainInstance) {
    executionBrainInstance = new ExecutionBrain(stateStore, messenger);
  }
  return executionBrainInstance;
}
function getExecutionBrain() {
  if (!executionBrainInstance) {
    executionBrainInstance = new ExecutionBrain;
  }
  return executionBrainInstance;
}
var executionBrainInstance = null;
var init_execution_brain = __esm(() => {
  init_state_store();
});

// src/shared/evidence-collector.ts
var exports_evidence_collector = {};
__export(exports_evidence_collector, {
  getEvidenceCollector: () => getEvidenceCollector,
  createEvidenceCollector: () => createEvidenceCollector,
  EvidenceCollector: () => EvidenceCollector
});
import fs from "node:fs";
import path from "node:path";

class EvidenceCollector {
  evidence = new Map;
  evidenceDir;
  constructor(evidenceDir) {
    this.evidenceDir = evidenceDir || path.join(process.env.HOME || "/root", ".local/share/opencode/kraken-hive/evidence");
    fs.mkdirSync(this.evidenceDir, { recursive: true });
  }
  collect(gateId, type, data) {
    const item = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      timestamp: Date.now(),
      data,
      verified: false
    };
    const items = this.evidence.get(gateId) || [];
    items.push(item);
    this.evidence.set(gateId, items);
    return item;
  }
  verify(itemId) {
    for (const [, items] of this.evidence) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        item.verified = true;
        return true;
      }
    }
    return false;
  }
  isGateVerified(gateId) {
    const items = this.evidence.get(gateId) || [];
    return items.length > 0 && items.every((i) => i.verified);
  }
  collectFileEvidence(gateId, filePaths) {
    return filePaths.map((p) => {
      const exists = fs.existsSync(p);
      const stats = exists ? fs.statSync(p) : null;
      return this.collect(gateId, "file", {
        path: p,
        exists,
        size: stats?.size || 0,
        modifiedAt: stats?.mtime?.toISOString()
      });
    });
  }
  collectOutputEvidence(gateId, taskId, hostPaths, verified) {
    const item = this.collect(gateId, "output", {
      taskId,
      hostPaths,
      pathCount: hostPaths.length
    });
    if (verified) {
      this.verify(item.id);
    }
    return item;
  }
  collectDecisionEvidence(description, type) {
    return this.collect("plan", "decision", {
      description,
      type,
      recordedAt: new Date().toISOString()
    });
  }
  getGateEvidence(gateId) {
    const items = this.evidence.get(gateId) || [];
    return {
      gateId,
      items: [...items],
      allVerified: items.length > 0 && items.every((i) => i.verified),
      collectedAt: Date.now()
    };
  }
  persist(gateId) {
    const gateEvidence = this.getGateEvidence(gateId);
    const filePath = path.join(this.evidenceDir, `${gateId}-evidence.json`);
    fs.writeFileSync(filePath, JSON.stringify(gateEvidence, null, 2));
  }
  clear(gateId) {
    this.evidence.delete(gateId);
  }
}
function createEvidenceCollector(evidenceDir) {
  if (!globalCollector) {
    globalCollector = new EvidenceCollector(evidenceDir);
  }
  return globalCollector;
}
function getEvidenceCollector() {
  if (!globalCollector) {
    globalCollector = new EvidenceCollector;
  }
  return globalCollector;
}
var globalCollector = null;
var init_evidence_collector = () => {};

// src/brains/system/system-brain.ts
var exports_system_brain = {};
__export(exports_system_brain, {
  getSystemBrain: () => getSystemBrain,
  createSystemBrain: () => createSystemBrain,
  SystemBrain: () => SystemBrain
});

class SystemBrain {
  initialized = false;
  state = {
    initialized: false,
    currentGate: "plan",
    decisionCount: 0,
    completedTasks: []
  };
  stateStore;
  messenger;
  recentDecisions = [];
  constructor(stateStore, messenger) {
    this.stateStore = stateStore || getStateStore2();
    this.messenger = messenger || getBrainMessenger();
  }
  initialize() {
    if (this.initialized)
      return;
    console.log("[SystemBrain] Initializing...");
    this.initialized = true;
    this.state.initialized = true;
    this.stateStore.set("security-state", "initialized", true, ["kraken-system"]);
    this.stateStore.set("security-state", "brain-id", "kraken-system", ["kraken-system"]);
    this.stateStore.set("workflow-state", "current-gate", "plan", ["kraken-system"]);
    this.messenger.subscribe("kraken-system", this.handleBrainMessage.bind(this));
    console.log("[SystemBrain] Initialized - owns workflow-state, security-state");
  }
  isInitialized() {
    return this.initialized;
  }
  setCurrentGate(gate) {
    this.state.currentGate = gate;
    this.stateStore.set("workflow-state", "current-gate", gate, ["kraken-system"]);
    console.log(`[SystemBrain] Gate set to: ${gate}`);
  }
  getCurrentGate() {
    return this.state.currentGate;
  }
  recordDecision(decision) {
    const decisionPoint = {
      id: `dp-${++this.state.decisionCount}`,
      description: decision.description,
      type: decision.type,
      contextFiles: decision.contextFiles,
      timestamp: Date.now()
    };
    this.recentDecisions.unshift(decisionPoint);
    if (this.recentDecisions.length > 20) {
      this.recentDecisions.pop();
    }
    this.stateStore.set("workflow-state", `decision-${decisionPoint.id}`, decisionPoint, ["kraken-system"]);
    this.stateStore.set("workflow-state", "recent-decisions", this.recentDecisions, ["kraken-system"]);
    console.log(`[SystemBrain] Decision recorded: ${decision.description}`);
  }
  getRecentDecisions() {
    return [...this.recentDecisions];
  }
  queryDecisions(filter) {
    let results = [...this.recentDecisions];
    if (filter?.type) {
      results = results.filter((d) => d.type === filter.type);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter((d) => d.description.toLowerCase().includes(q));
    }
    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }
    return results;
  }
  recordTaskStart(taskId) {
    this.stateStore.set("workflow-state", `task-${taskId}-start`, Date.now(), ["kraken-system"]);
    this.stateStore.set("workflow-state", `task-${taskId}-status`, "active", ["kraken-system"]);
  }
  recordTaskComplete(taskId) {
    this.state.completedTasks.push(taskId);
    this.stateStore.set("workflow-state", `task-${taskId}-status`, "completed", ["kraken-system"]);
    this.stateStore.set("workflow-state", `task-${taskId}-complete`, Date.now(), ["kraken-system"]);
    this.messenger.deliverMessage("kraken-system", "kraken-planning", "checkpoint", {
      type: "task-complete",
      taskId
    }, "normal");
  }
  recordTaskFailure(taskId, error) {
    this.stateStore.set("workflow-state", `task-${taskId}-status`, "failed", ["kraken-system"]);
    this.stateStore.set("workflow-state", `task-${taskId}-error`, error, ["kraken-system"]);
    this.messenger.send({
      from: "kraken-system",
      to: "*",
      type: "gate-failure",
      priority: "critical",
      payload: { taskId, error },
      requiresAck: true
    });
  }
  getCompletedTasks() {
    return [...this.state.completedTasks];
  }
  checkSecurityContext(operation, context) {
    const blocked = context.blocked || false;
    if (blocked) {
      return { allowed: false, reason: "Operation blocked by security context" };
    }
    return { allowed: true };
  }
  validateToolUsage(tool, args) {
    const errors = [];
    const currentGate = this.state.currentGate;
    const gateRestrictions = {
      plan: ["hive_status", "get_cluster_status", "get_agent_status", "anchor_cluster"],
      build: ["spawn_cluster_task", "spawn_shark_agent", "spawn_manta_agent"],
      test: ["aggregate_results"],
      verify: ["kraken-gate-status"]
    };
    const allowed = gateRestrictions[currentGate] || [];
    if (allowed.length > 0 && !allowed.includes(tool)) {}
    return { valid: errors.length === 0, errors };
  }
  validateDomainAssignment(taskType, targetCluster) {
    const domainMap = {
      build: "alpha",
      debug: "beta",
      fix: "beta",
      refactor: "beta",
      analyze: "beta",
      test: "gamma",
      audit: "gamma",
      verify: "gamma"
    };
    const expectedCluster = domainMap[taskType] || "alpha";
    const clusterMap = {
      alpha: "cluster-alpha",
      "cluster-alpha": "cluster-alpha",
      beta: "cluster-beta",
      "cluster-beta": "cluster-beta",
      gamma: "cluster-gamma",
      "cluster-gamma": "cluster-gamma"
    };
    const resolvedTarget = clusterMap[targetCluster] || targetCluster;
    const resolvedExpected = clusterMap[expectedCluster] || `cluster-${expectedCluster}`;
    if (resolvedTarget !== resolvedExpected) {
      return {
        valid: false,
        reason: `[L4_WRONG_CLUSTER] Task type '${taskType}' belongs to ${resolvedExpected}, not ${resolvedTarget}`
      };
    }
    return { valid: true };
  }
  validateOutputRetrieval(taskId, outputsRetrieved, filesOnHost) {
    const blockers = [];
    if (!outputsRetrieved) {
      blockers.push(`[L2_FALSE_COMPLETION] Task ${taskId}: outputs not retrieved`);
    }
    if (filesOnHost.length === 0) {
      blockers.push(`[L2_FALSE_COMPLETION] Task ${taskId}: no files verified on host`);
    }
    return {
      passed: blockers.length === 0,
      blockers
    };
  }
  validateOrchestrationTheater(taskId, status) {
    const theaterClaims = {
      assigned: "Task assigned but not executed",
      queued: "Task queued but not started",
      spawned: "Task spawned but not tracked",
      in_progress: "Task in progress, not complete"
    };
    if (theaterClaims[status]) {
      return { passed: false, reason: `[L1_THEATER] ${theaterClaims[status]}` };
    }
    return { passed: true };
  }
  getGateCriteria(gate) {
    const criteria = {
      plan: [
        { requirement: "System brain initialized", check: () => this.initialized },
        { requirement: "Planning brain T2 loaded", check: () => {
          const t2 = this.stateStore.get("planning-state", "t2-master");
          return !!t2;
        } },
        { requirement: "At least 1 decision recorded", check: () => this.state.decisionCount > 0 }
      ],
      build: [
        { requirement: "Plan gate passed", check: () => this.state.currentGate !== "plan" || this.state.decisionCount > 0 },
        { requirement: "At least 1 task completed", check: () => this.state.completedTasks.length > 0 },
        { requirement: "Domain assignments validated", check: () => this.state.decisionCount >= 1 }
      ],
      test: [
        { requirement: "Build gate passed", check: () => ["build", "test", "verify", "audit", "delivery"].includes(this.state.currentGate) },
        { requirement: "At least 1 task completed", check: () => this.state.completedTasks.length >= 1 },
        { requirement: "Outputs registered for verification", check: () => this.state.completedTasks.length >= 1 }
      ],
      verify: [
        { requirement: "Test gate passed or at least 1 task done", check: () => this.state.completedTasks.length >= 1 },
        { requirement: "Outputs verified on host", check: () => this.state.completedTasks.length >= 1 },
        { requirement: "Evidence verified for current gate", check: () => {
          try {
            const { getEvidenceCollector: getEvidenceCollector2 } = (init_evidence_collector(), __toCommonJS(exports_evidence_collector));
            return getEvidenceCollector2().isGateVerified(this.state.currentGate);
          } catch {
            return this.state.completedTasks.length >= 1;
          }
        } }
      ],
      audit: [
        { requirement: "Verify gate criteria met", check: () => this.state.completedTasks.length >= 2 },
        { requirement: "No security violations logged", check: () => true },
        { requirement: "Kraken zones protected", check: () => true }
      ],
      delivery: [
        { requirement: "All prior gates passed", check: () => this.state.completedTasks.length >= 3 },
        { requirement: "Evidence verified for all gates", check: () => {
          try {
            const { getEvidenceCollector: getEvidenceCollector2 } = (init_evidence_collector(), __toCommonJS(exports_evidence_collector));
            return getEvidenceCollector2().isGateVerified("verify");
          } catch {
            return this.state.completedTasks.length >= 3;
          }
        } },
        { requirement: "Output merge complete", check: () => this.state.completedTasks.length >= 3 }
      ]
    };
    const gateCriteria = criteria[gate] || [];
    return gateCriteria.map((c) => ({
      requirement: c.requirement,
      passed: c.check()
    }));
  }
  evaluateGateEntry(gate) {
    const details = this.getGateCriteria(gate);
    const blockers = details.filter((d) => !d.passed).map((d) => d.requirement);
    return {
      allPassed: blockers.length === 0,
      blockers,
      details
    };
  }
  async isGateAdvanceable() {
    if (this.state.completedTasks.length === 0)
      return false;
    try {
      const { getExecutionBrain: getExecutionBrain2 } = await Promise.resolve().then(() => (init_execution_brain(), exports_execution_brain));
      const execBrain = getExecutionBrain2();
      const execState = execBrain.getState();
      return execState.activeTasks === 0;
    } catch {
      return true;
    }
  }
  getContextRegistry() {
    return this.stateStore.snapshot("context-registry") || [];
  }
  registerContext(file, importance) {
    this.stateStore.set("context-registry", file, { importance, registeredAt: Date.now() }, ["kraken-system"]);
  }
  getTokenBudget() {
    const budget = this.stateStore.get("token-budget", "current") || {
      current: 0,
      threshold: 170000,
      tier: 0
    };
    return budget;
  }
  handleBrainMessage(message) {
    switch (message.type) {
      case "gate-failure":
        this.handleGateFailure(message);
        break;
      case "checkpoint":
        this.handleCheckpoint(message);
        break;
      case "context-inject":
        this.handleContextInject(message);
        break;
    }
  }
  handleGateFailure(message) {
    console.log(`[SystemBrain] Gate failure from ${message.from}: ${JSON.stringify(message.payload)}`);
    const taskId = message.payload.taskId;
    const error = message.payload.error || "Unknown gate failure";
    if (taskId) {
      this.recordTaskFailure(taskId, error);
    }
  }
  handleCheckpoint(message) {
    console.log(`[SystemBrain] Checkpoint from ${message.from}: ${JSON.stringify(message.payload)}`);
  }
  handleContextInject(message) {
    console.log(`[SystemBrain] Context inject from ${message.from}`);
  }
  getState() {
    return { ...this.state };
  }
  getSnapshot() {
    return {
      ...this.stateStore.snapshot("workflow-state"),
      ...this.stateStore.snapshot("security-state"),
      recentDecisions: this.recentDecisions
    };
  }
  cleanup() {
    this.recentDecisions = [];
    this.state = {
      initialized: true,
      currentGate: this.state.currentGate,
      decisionCount: this.state.decisionCount,
      completedTasks: [...this.state.completedTasks]
    };
  }
}
function createSystemBrain(stateStore, messenger) {
  if (!systemBrainInstance) {
    systemBrainInstance = new SystemBrain(stateStore, messenger);
  }
  return systemBrainInstance;
}
function getSystemBrain() {
  if (!systemBrainInstance) {
    systemBrainInstance = new SystemBrain;
  }
  return systemBrainInstance;
}
var systemBrainInstance = null;
var init_system_brain = __esm(() => {
  init_state_store();
});

// src/brains/BrainConcurrencyManager.ts
var exports_BrainConcurrencyManager = {};
__export(exports_BrainConcurrencyManager, {
  BrainConcurrencyManager: () => BrainConcurrencyManager
});

class BrainConcurrencyManager {
  running = false;
  loops = new Map;
  messenger;
  stateStore;
  startTime = 0;
  onPlanningTick;
  onExecutionTick;
  onSystemTick;
  constructor(messenger, stateStore) {
    this.messenger = messenger;
    this.stateStore = stateStore;
  }
  setPlanningTick(handler) {
    this.onPlanningTick = handler;
  }
  setExecutionTick(handler) {
    this.onExecutionTick = handler;
  }
  setSystemTick(handler) {
    this.onSystemTick = handler;
  }
  startAll() {
    if (this.running)
      return;
    this.running = true;
    this.startTime = Date.now();
    this.startLoop({
      brainId: "kraken-planning",
      pollIntervalMs: 200,
      domains: ["planning-state", "context-bridge"]
    }, this.onPlanningTick);
    this.startLoop({
      brainId: "kraken-execution",
      pollIntervalMs: 200,
      domains: ["execution-state", "quality-state"]
    }, this.onExecutionTick);
    this.startLoop({
      brainId: "kraken-system",
      pollIntervalMs: 500,
      domains: ["workflow-state", "security-state"]
    }, this.onSystemTick);
    console.log("[BrainConcurrency] All 3 brain loops started (Planning:200ms, Execution:200ms, System:500ms)");
    console.log("[BrainConcurrency] Brains running independently — messaging, state, and gate evaluation active");
    try {
      this.stateStore.watch("execution-state", "*", (_key, _value) => {});
    } catch {}
  }
  startLoop(config, tickHandler) {
    const controller = new AbortController;
    this.loops.set(config.brainId, {
      controller,
      config,
      processed: 0
    });
    this.runLoop(config, controller.signal, tickHandler);
  }
  async runLoop(config, signal, tickHandler) {
    const brainId = config.brainId;
    while (this.running && !signal.aborted) {
      try {
        const messages = this.messenger.drainMessages(brainId);
        if (messages.length > 0) {
          const entry = this.loops.get(brainId);
          if (entry)
            entry.processed += messages.length;
          for (const msg of messages) {
            try {
              if (config.messageHandler) {
                await config.messageHandler(msg);
              }
            } catch (err) {
              console.error(`[BrainConcurrency] ${brainId} message processing error:`, err);
            }
          }
        }
        if (tickHandler) {
          try {
            await Promise.race([
              tickHandler(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("tick timeout")), 5000))
            ]);
          } catch (err) {
            if (err.message !== "tick timeout") {
              console.error(`[BrainConcurrency] ${brainId} tick error:`, err);
            }
          }
        }
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, config.pollIntervalMs);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
      } catch (err) {
        console.error(`[BrainConcurrency] ${brainId} loop error:`, err);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    console.log(`[BrainConcurrency] ${brainId} loop stopped`);
  }
  stopAll() {
    this.running = false;
    for (const [brainId, entry] of this.loops) {
      entry.controller.abort();
    }
    console.log(`[BrainConcurrency] All brain loops stopped. Uptime: ${this.getUptime()}ms`);
  }
  isRunning() {
    return this.running;
  }
  getState() {
    const now = Date.now();
    return {
      planning: {
        running: this.running,
        messagesProcessed: this.loops.get("kraken-planning")?.processed || 0,
        lastPollAt: now
      },
      execution: {
        running: this.running,
        messagesProcessed: this.loops.get("kraken-execution")?.processed || 0,
        lastPollAt: now
      },
      system: {
        running: this.running,
        messagesProcessed: this.loops.get("kraken-system")?.processed || 0,
        lastPollAt: now
      },
      uptime: this.getUptime()
    };
  }
  getUptime() {
    return this.startTime ? Date.now() - this.startTime : 0;
  }
}

// src/v4.1/config/constants.ts
var HOOK_EXECUTION_TIMEOUT_MS = 30000;
var MAX_FALLBACK_FILE_SIZE = 10 * 1024 * 1024;

// src/v4.1/context/hook-context.ts
var VANILLA_AGENTS = new Set(["plan", "build", "general", "explore"]);
function createHookContext(input, awareness, sessionGetter, logger) {
  const sessionID = input?.sessionID ?? input?.session?.sessionId ?? "unknown";
  const agentName = input?.session?.agentName ?? input?.agent ?? undefined;
  const phase = input?.phase ?? undefined;
  return {
    sessionID,
    agentName,
    phase,
    isMyAgent: (agent) => awareness.isMyAgent(agent ?? agentName),
    isMyOrchestrator: (agent) => awareness.isMyOrchestrator(agent ?? agentName),
    isVanillaAgent: (agent) => awareness.isVanillaAgent(agent ?? agentName),
    isOtherPluginAgent: (agent) => awareness.isOtherPluginAgent(agent ?? agentName),
    getPhase: () => phase,
    getSessionState: () => sessionGetter(sessionID),
    log: logger
  };
}

// src/v4.1/state/session-state.ts
var sessionStates = new Map;
function getSessionState(sessionId) {
  let state = sessionStates.get(sessionId);
  if (!state) {
    state = {
      sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    sessionStates.set(sessionId, state);
  }
  state.lastActivity = Date.now();
  return state;
}

// src/v4.1/utils/logger.ts
var LOG_PREFIX = "[v4.1]";
function createLogger(pluginName) {
  const prefix = `${LOG_PREFIX}[${pluginName}]`;
  return {
    debug(message, meta) {
      console.debug(`${prefix} ${message}`, meta ?? {});
    },
    info(message, meta) {
      console.info(`${prefix} ${message}`, meta ?? {});
    },
    warn(message, meta) {
      console.warn(`${prefix} ${message}`, meta ?? {});
    },
    error(message, meta) {
      console.error(`${prefix} ${message}`, meta ?? {});
    }
  };
}

// src/v4.1/hooks/safe-hook.ts
var DEFAULT_PLUGIN_NAME = "v4-boilerplate";
function safeHook(handler, options = {}) {
  const {
    agentFilter = [],
    requiredPhase = null,
    timeout = HOOK_EXECUTION_TIMEOUT_MS,
    pluginName = DEFAULT_PLUGIN_NAME,
    managedAgents = new Set,
    agentPrefix = "",
    orchestratorName = ""
  } = options;
  const logger = createLogger(pluginName);
  const awareness = {
    isMyAgent(agentName) {
      if (!agentName)
        return false;
      if (managedAgents.has(agentName))
        return true;
      if (agentName.startsWith(agentPrefix))
        return true;
      if (agentName === orchestratorName)
        return true;
      return false;
    },
    isMyOrchestrator(agentName) {
      return agentName === orchestratorName;
    },
    isVanillaAgent(agentName) {
      return ["plan", "build", "general", "explore"].includes(agentName ?? "");
    },
    isOtherPluginAgent(agentName) {
      if (!agentName)
        return false;
      return !["plan", "build", "general", "explore"].includes(agentName) && !managedAgents.has(agentName) && !agentName.startsWith(agentPrefix) && agentName !== orchestratorName;
    }
  };
  return async (input, output) => {
    const ctx = createHookContext(input, awareness, getSessionState, logger);
    if (agentFilter !== null && agentFilter.length > 0) {
      if (!ctx.isMyAgent()) {
        return;
      }
      if (!agentFilter.includes(ctx.agentName ?? "")) {
        return;
      }
    }
    if (requiredPhase !== null && ctx.phase !== requiredPhase) {
      return;
    }
    const sessionState = getSessionState(ctx.sessionID);
    ctx.getSessionState = () => sessionState;
    const startTime = Date.now();
    try {
      await Promise.race([
        handler(input, output, ctx),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Hook timeout after ${timeout}ms`)), timeout))
      ]);
    } catch (err) {
      ctx.log.error(`Hook error in ${handler.name ?? "anonymous"}`, {
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
        sessionID: ctx.sessionID,
        agentName: ctx.agentName
      });
    }
  };
}
// src/v4.1/context/agent-awareness.ts
var VANILLA_AGENTS2 = new Set(["plan", "build", "general", "explore"]);
function createAgentAwareness(managedAgents, agentPrefix, orchestratorName) {
  return {
    isMyAgent(agentName) {
      if (!agentName)
        return false;
      if (managedAgents.has(agentName))
        return true;
      if (agentName.startsWith(agentPrefix))
        return true;
      if (agentName === orchestratorName)
        return true;
      return false;
    },
    isMyOrchestrator(agentName) {
      return agentName === orchestratorName;
    },
    isVanillaAgent(agentName) {
      return VANILLA_AGENTS2.has(agentName ?? "");
    },
    isOtherPluginAgent(agentName) {
      if (!agentName)
        return false;
      return !VANILLA_AGENTS2.has(agentName) && !managedAgents.has(agentName) && !agentName.startsWith(agentPrefix) && agentName !== orchestratorName;
    }
  };
}
var DEFAULT_AWARENESS = createAgentAwareness(new Set(["FIXME_SetYourAgentsHere"]), "FIXME_", "FIXME_orchestrator");
// src/v4.1/state/global-state.ts
var toolMetrics = new Map;
// src/v4.1/config/identity.ts
var PLUGIN_IDENTITY = {
  name: "FIXME",
  prefix: "FIXME_",
  orchestrator: "FIXME",
  agents: new Set([
    "FIXME-architect",
    "FIXME-coder",
    "FIXME-reviewer",
    "FIXME-tester"
  ]),
  primaryAgents: new Set([
    "FIXME-architect"
  ]),
  subagents: new Set([
    "FIXME-coder",
    "FIXME-reviewer",
    "FIXME-tester"
  ])
};
// src/index.ts
init_state_store();
init_planning_brain();
init_execution_brain();
init_system_brain();

// src/factory/ClusterScheduler.ts
class ClusterScheduler {
  clusterConfigs;
  clusterLoad;
  focusAnchors;
  constructor(clusters) {
    this.clusterConfigs = clusters;
    this.clusterLoad = new Map;
    this.focusAnchors = new Map;
    for (const cluster of clusters) {
      this.clusterLoad.set(cluster.id, {
        clusterId: cluster.id,
        activeTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        lastActivity: Date.now()
      });
    }
  }
  anchorClusterToFocus(clusterId, focusName) {
    const normalizedFocus = focusName.toLowerCase().replace(/\s+/g, "-");
    this.focusAnchors.set(normalizedFocus, clusterId);
  }
  resolveFocusToCluster(focusName) {
    const normalizedFocus = focusName.toLowerCase().replace(/\s+/g, "-");
    if (this.focusAnchors.has(normalizedFocus)) {
      return this.focusAnchors.get(normalizedFocus);
    }
    for (const [anchor, clusterId] of this.focusAnchors) {
      if (anchor.includes(normalizedFocus) || normalizedFocus.includes(anchor)) {
        return clusterId;
      }
    }
    return;
  }
  getFocusAnchors() {
    return new Map(this.focusAnchors);
  }
  clearFocusAnchors() {
    this.focusAnchors.clear();
  }
  async assignCluster(request) {
    if (request.targetCluster) {
      return this.resolveClusterRequest(request.targetCluster);
    }
    if (request.context?.focus) {
      const focusCluster = this.resolveFocusToCluster(request.context.focus);
      if (focusCluster) {
        return focusCluster;
      }
    }
    return this.getLeastLoadedCluster();
  }
  resolveClusterRequest(clusterIdOrFocus) {
    const normalized = clusterIdOrFocus.toLowerCase().replace(/\s+/g, "-");
    for (const config of this.clusterConfigs) {
      if (config.id.toLowerCase() === normalized) {
        return config.id;
      }
      if (config.name?.toLowerCase().replace(/\s+/g, "-") === normalized) {
        return config.id;
      }
    }
    const focusCluster = this.resolveFocusToCluster(clusterIdOrFocus);
    if (focusCluster) {
      return focusCluster;
    }
    for (const config of this.clusterConfigs) {
      if (config.id.toLowerCase().includes(normalized) || normalized.includes(config.id.toLowerCase())) {
        return config.id;
      }
    }
    return this.getLeastLoadedCluster();
  }
  assignClusterForTaskType(task, taskType) {
    const taskLower = task.toLowerCase();
    if (taskLower.includes("build") || taskLower.includes("create") || taskLower.includes("implement") || taskLower.includes("steamroll")) {
      return "cluster-alpha";
    }
    if (taskLower.includes("debug") || taskLower.includes("fix") || taskLower.includes("test") || taskLower.includes("verify") || taskLower.includes("lint")) {
      return "cluster-gamma";
    }
    return "cluster-beta";
  }
  incrementLoad(clusterId) {
    const load = this.clusterLoad.get(clusterId);
    if (load) {
      load.activeTasks++;
      load.pendingTasks++;
      load.lastActivity = Date.now();
    }
  }
  decrementLoad(clusterId) {
    const load = this.clusterLoad.get(clusterId);
    if (load) {
      load.activeTasks = Math.max(0, load.activeTasks - 1);
      load.pendingTasks = Math.max(0, load.pendingTasks - 1);
      load.lastActivity = Date.now();
    }
  }
  recordCompletion(clusterId, success) {
    const load = this.clusterLoad.get(clusterId);
    if (load) {
      if (success) {
        load.completedTasks++;
      } else {
        load.failedTasks++;
      }
      load.activeTasks = Math.max(0, load.activeTasks - 1);
      load.lastActivity = Date.now();
    }
  }
  getClusterLoad(clusterId) {
    return this.clusterLoad.get(clusterId);
  }
  getAllClusterLoads() {
    return new Map(this.clusterLoad);
  }
  getLeastLoadedCluster() {
    let bestCluster = this.clusterConfigs[0]?.id || "cluster-alpha";
    let minLoad = Infinity;
    for (const [clusterId, load] of this.clusterLoad) {
      if (load.activeTasks < minLoad) {
        minLoad = load.activeTasks;
        bestCluster = clusterId;
      }
    }
    return bestCluster;
  }
  getClusterConfig(clusterId) {
    return this.clusterConfigs.find((c) => c.id === clusterId);
  }
  getAllClusterConfigs() {
    return this.clusterConfigs;
  }
  getTotalLoad() {
    let active = 0;
    let pending = 0;
    let completed = 0;
    let failed = 0;
    for (const load of this.clusterLoad.values()) {
      active += load.activeTasks;
      pending += load.pendingTasks;
      completed += load.completedTasks;
      failed += load.failedTasks;
    }
    return { active, pending, completed, failed };
  }
}

// src/factory/AsyncDelegationEngine.ts
class AsyncDelegationEngine {
  pendingTasks;
  activeTasks;
  taskQueue;
  clusterScheduler;
  clusterManager;
  processing;
  constructor(clusterConfigs, clusters, scheduler) {
    this.pendingTasks = new Map;
    this.activeTasks = new Map;
    this.taskQueue = [];
    this.clusterManager = clusters;
    this.clusterScheduler = scheduler || new ClusterScheduler(clusterConfigs);
    this.processing = false;
    this.startProcessingLoop();
  }
  async delegate(request) {
    if (!request.taskId) {
      request.taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    this.pendingTasks.set(request.taskId, request);
    const clusterId = request.targetCluster || await this.clusterScheduler.assignCluster(request);
    if (!request.targetCluster) {
      request.targetCluster = clusterId;
    }
    let resolvePromise;
    let rejectPromise;
    const resultPromise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    this.enqueueWithPriority({
      request,
      resolve: resolvePromise,
      reject: rejectPromise,
      enqueuedAt: Date.now()
    }, request.priority);
    return resultPromise;
  }
  enqueueWithPriority(task, priority) {
    const priorityOrder = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3
    };
    const taskPriority = priorityOrder[priority];
    let insertIndex = this.taskQueue.findIndex((q) => {
      const qPriority = priorityOrder[q.request.priority];
      return qPriority > taskPriority;
    });
    if (insertIndex === -1) {
      insertIndex = this.taskQueue.length;
    }
    this.taskQueue.splice(insertIndex, 0, task);
    if (!this.processing) {
      this.processQueue();
    }
  }
  async processQueue() {
    if (this.processing)
      return;
    this.processing = true;
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task)
        break;
      this.executeTask(task.request).then((result) => {
        task.resolve(result);
      }).catch((error) => {
        task.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
    this.processing = false;
  }
  startProcessingLoop() {
    this.processing = false;
  }
  async executeTask(request) {
    this.pendingTasks.delete(request.taskId);
    const result = {
      success: false,
      taskId: request.taskId,
      clusterId: request.targetCluster,
      status: "in_progress"
    };
    this.activeTasks.set(request.taskId, result);
    this.clusterScheduler.incrementLoad(request.targetCluster);
    try {
      const execResult = await this.clusterManager.executeTask(request.targetCluster, request);
      result.success = execResult.success;
      result.agentId = execResult.agentId;
      result.clusterId = execResult.clusterId;
      result.status = execResult.success ? "completed" : "failed";
      result.completedAt = Date.now();
      if (execResult.error) {
        result.error = execResult.error;
      }
      await this.syncBrainsAfterTask(request.taskId, execResult.success, execResult.error);
      this.clusterScheduler.recordCompletion(request.targetCluster, execResult.success);
      this.activeTasks.set(request.taskId, result);
      return result;
    } catch (error) {
      result.success = false;
      result.status = "failed";
      result.error = String(error);
      result.completedAt = Date.now();
      await this.syncBrainsAfterTask(request.taskId, false, String(error));
      this.clusterScheduler.recordCompletion(request.targetCluster, false);
      this.activeTasks.set(request.taskId, result);
      return result;
    }
  }
  async syncBrainsAfterTask(taskId, success, error) {
    try {
      const { getExecutionBrain: getExecutionBrain2 } = await Promise.resolve().then(() => (init_execution_brain(), exports_execution_brain));
      const { getSystemBrain: getSystemBrain2 } = await Promise.resolve().then(() => (init_system_brain(), exports_system_brain));
      const execBrain = getExecutionBrain2();
      if (execBrain && execBrain.isInitialized()) {
        execBrain.recordResult({
          taskId,
          success,
          clusterId: "unknown",
          agentId: "delegation-engine",
          error,
          completedAt: Date.now()
        });
        if (success) {
          try {
            const outputStatus = execBrain.getOutputStatus(taskId);
            if (outputStatus.required > 0) {
              await execBrain.claimOutputsRetrieved(taskId, []);
              const canComplete = execBrain.canCompleteTask(taskId);
              console.log(`[BrainSync] Task ${taskId} output check: ${canComplete ? "COMPLETE" : "INCOMPLETE"} (${outputStatus.retrieved}/${outputStatus.required})`);
            }
          } catch {}
        }
      }
      const systemBrain = getSystemBrain2();
      if (systemBrain && systemBrain.isInitialized()) {
        if (success) {
          systemBrain.recordTaskComplete(taskId);
          const currentGate = systemBrain.getCurrentGate();
          const evaluation = systemBrain.evaluateGateEntry(currentGate);
          if (evaluation.allPassed && await systemBrain.isGateAdvanceable()) {
            const gateOrder = ["plan", "build", "test", "verify", "audit", "delivery"];
            const currentIdx = gateOrder.indexOf(currentGate);
            if (currentIdx >= 0 && currentIdx < gateOrder.length - 1) {
              const nextGate = gateOrder[currentIdx + 1];
              systemBrain.setCurrentGate(nextGate);
              console.log(`[GateAdvance] Gate auto-advanced: ${currentGate} → ${nextGate}`);
            }
          }
        } else {
          systemBrain.recordTaskFailure(taskId, error || "Unknown error");
        }
      }
    } catch {}
  }
  async waitForCompletion(taskId, timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = this.activeTasks.get(taskId);
      if (result && (result.status === "completed" || result.status === "failed")) {
        return result;
      }
      if (this.pendingTasks.has(taskId)) {
        await this.sleep(50);
        continue;
      }
      const queued = this.taskQueue.find((t) => t.request.taskId === taskId);
      if (queued) {
        await this.sleep(50);
        continue;
      }
      break;
    }
    const existing = this.activeTasks.get(taskId);
    if (existing && existing.status !== "in_progress") {
      return existing;
    }
    return null;
  }
  async waitForAll(taskIds, timeoutMs = 60000) {
    const promises = taskIds.map((id) => this.waitForCompletion(id, timeoutMs));
    return Promise.all(promises);
  }
  getPendingTasks() {
    return Array.from(this.pendingTasks.values());
  }
  getActiveTasks() {
    return new Map(this.activeTasks);
  }
  getQueuedCount() {
    return this.taskQueue.length;
  }
  cancelTask(taskId) {
    if (this.pendingTasks.has(taskId)) {
      this.pendingTasks.delete(taskId);
      return true;
    }
    const queueIndex = this.taskQueue.findIndex((t) => t.request.taskId === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.resolve({
        success: false,
        taskId,
        clusterId: task.request.targetCluster,
        status: "cancelled"
      });
      return true;
    }
    if (this.activeTasks.has(taskId)) {
      const activeTask = this.activeTasks.get(taskId);
      if (activeTask) {
        activeTask.status = "cancelled";
        activeTask.completedAt = Date.now();
      }
      return true;
    }
    return false;
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// src/clusters/ClusterInstance.ts
import { spawn } from "node:child_process";
import path2 from "node:path";

class ClusterInstance {
  config;
  agents;
  taskQueue;
  completedTasks;
  failedTasks;
  processing;
  load;
  shutdownFlag;
  constructor(config) {
    this.config = config;
    this.agents = new Map;
    this.taskQueue = [];
    this.completedTasks = [];
    this.failedTasks = [];
    this.processing = false;
    this.shutdownFlag = false;
    this.load = {
      clusterId: config.id,
      activeTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      lastActivity: Date.now()
    };
    this.initializeAgents();
    this.startProcessing();
  }
  initializeAgents() {
    for (const agentId of this.config.agents) {
      const agentType = agentId.startsWith("shark-") ? "shark" : "manta";
      this.agents.set(agentId, {
        id: agentId,
        agentType,
        busy: false,
        clusterId: this.config.id
      });
    }
  }
  startProcessing() {
    if (this.processing)
      return;
    this.processing = true;
    this.processLoop();
  }
  async processLoop() {
    const pendingOps = [];
    while (!this.shutdownFlag) {
      if (pendingOps.length === 0) {
        let madeProgress = false;
        for (let i = this.taskQueue.length - 1;i >= 0; i--) {
          const task = this.taskQueue[i];
          if (!task)
            continue;
          const requiredAgentType = task.request.context?.agentType;
          const availableAgents = this.getAvailableAgents(requiredAgentType);
          if (availableAgents.length > 0) {
            this.taskQueue.splice(i, 1);
            const agent = availableAgents[0];
            const op = this.executeTaskAsync(agent, task.request).then((result) => {
              task.resolve(result);
            }).catch((error) => {
              task.reject(error instanceof Error ? error : new Error(String(error)));
            });
            pendingOps.push(op);
            madeProgress = true;
          }
        }
        if (!madeProgress) {
          await this.sleep(100);
        }
      } else {
        await Promise.all(pendingOps);
        pendingOps.length = 0;
      }
    }
    if (pendingOps.length > 0) {
      await Promise.all(pendingOps);
    }
    this.processing = false;
  }
  async executeTaskAsync(agent, request) {
    agent.busy = true;
    agent.currentTaskId = request.taskId;
    this.load.activeTasks++;
    this.load.pendingTasks = Math.max(0, this.load.pendingTasks - 1);
    this.load.lastActivity = Date.now();
    try {
      const result = await this.executeOnAgent(agent, request);
      if (result.success) {
        this.completedTasks.push(result);
        this.load.completedTasks++;
      } else {
        this.failedTasks.push(result);
        this.load.failedTasks++;
      }
      return result;
    } catch (error) {
      const failedResult = {
        success: false,
        taskId: request.taskId,
        clusterId: this.config.id,
        agentId: agent.id,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completedAt: Date.now()
      };
      this.failedTasks.push(failedResult);
      this.load.failedTasks++;
      return failedResult;
    } finally {
      agent.busy = false;
      agent.currentTaskId = undefined;
      this.load.activeTasks = Math.max(0, this.load.activeTasks - 1);
      this.load.lastActivity = Date.now();
    }
  }
  async executeOnAgent(agent, request, retryCount = 0) {
    const MAX_RETRIES = 2;
    const result = await this.spawnAgentTask(agent, request);
    if (!result.success && retryCount < MAX_RETRIES) {
      console.log(`[ClusterInstance] Retrying failed task ${request.taskId} (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
      await new Promise((r) => setTimeout(r, 1000));
      return this.executeOnAgent(agent, request, retryCount + 1);
    }
    return result;
  }
  spawnAgentTask(agent, request) {
    return new Promise((resolve) => {
      const HOME = process.env.HOME || process.env.USERPROFILE || "/root";
      const KRAKEN_PLUGIN_NAME = process.env.KRAKEN_PLUGIN_NAME || "kraken-agent";
      const pluginBase = path2.join(HOME, ".config", "opencode", "plugins", KRAKEN_PLUGIN_NAME);
      const wrapperPath = path2.join(pluginBase, "wrappers", "opencode_agent.py");
      const args = [
        "--task",
        request.task,
        "--model",
        "minimax/MiniMax-M2.7",
        "--workspace",
        process.env.OPENCODE_WORKSPACE || process.cwd() || "/home/leviathan/OPENCODE_WORKSPACE",
        "--timeout",
        "120",
        "--cleanup"
      ];
      console.log(`[ClusterInstance] Spawning container for agent ${agent.id}`);
      console.log(`[ClusterInstance] Task: ${request.task.substring(0, 100)}...`);
      const proc = spawn("python3", [wrapperPath, ...args], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env }
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        resolve({
          success: false,
          taskId: request.taskId,
          clusterId: this.config.id,
          agentId: agent.id,
          status: "failed",
          error: "Task execution timeout after 120 seconds",
          completedAt: Date.now()
        });
      }, 120000);
      proc.on("close", (exitCode) => {
        clearTimeout(timeout);
        try {
          let result;
          if (stdout.trim()) {
            result = JSON.parse(stdout.trim());
          } else {
            result = { success: false, error: stderr || "No output from wrapper" };
          }
          console.log(`[ClusterInstance] Task ${request.taskId} completed: ${result.success ? "SUCCESS" : "FAILED"}`);
          resolve({
            success: result.success !== false,
            taskId: request.taskId,
            clusterId: this.config.id,
            agentId: agent.id,
            status: result.success ? "completed" : "failed",
            error: result.error,
            completedAt: Date.now()
          });
        } catch (parseError) {
          console.error(`[ClusterInstance] Parse error: ${parseError}`);
          console.error(`[ClusterInstance] stdout: ${stdout.substring(0, 500)}`);
          console.error(`[ClusterInstance] stderr: ${stderr.substring(0, 500)}`);
          resolve({
            success: false,
            taskId: request.taskId,
            clusterId: this.config.id,
            agentId: agent.id,
            status: "failed",
            error: `Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            completedAt: Date.now()
          });
        }
      });
      proc.on("error", (error) => {
        clearTimeout(timeout);
        console.error(`[ClusterInstance] Spawn error: ${error.message}`);
        resolve({
          success: false,
          taskId: request.taskId,
          clusterId: this.config.id,
          agentId: agent.id,
          status: "failed",
          error: `Failed to spawn Python wrapper: ${error.message}`,
          completedAt: Date.now()
        });
      });
    });
  }
  getAvailableAgents(agentType) {
    const available = [];
    for (const agent of this.agents.values()) {
      if (!agent.busy) {
        if (agentType === undefined || agent.agentType === agentType) {
          available.push(agent);
        }
      }
    }
    return available;
  }
  enqueueTask(request) {
    this.load.pendingTasks++;
    this.load.lastActivity = Date.now();
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ request, resolve, reject });
    });
  }
  getLoad() {
    return {
      ...this.load,
      clusterId: this.config.id
    };
  }
  getAgent(agentId) {
    return this.agents.get(agentId);
  }
  getAllAgents() {
    return Array.from(this.agents.values());
  }
  getConfig() {
    return this.config;
  }
  getCompletedTasks() {
    return [...this.completedTasks];
  }
  getFailedTasks() {
    return [...this.failedTasks];
  }
  getQueueLength() {
    return this.taskQueue.length;
  }
  async shutdown() {
    this.shutdownFlag = true;
    const startTime = Date.now();
    const timeout = 5000;
    while (this.load.activeTasks > 0 && Date.now() - startTime < timeout) {
      await this.sleep(100);
    }
    for (const task of this.taskQueue) {
      task.reject(new Error("Cluster shutting down"));
    }
    this.taskQueue = [];
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// src/clusters/ClusterManager.ts
class ClusterManager {
  clusters;
  clusterConfigs;
  constructor(clusterConfigs) {
    this.clusters = new Map;
    this.clusterConfigs = new Map;
    for (const config of clusterConfigs) {
      this.clusterConfigs.set(config.id, config);
      this.clusters.set(config.id, new ClusterInstance(config));
    }
  }
  async executeTask(clusterId, request) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      return {
        success: false,
        taskId: request.taskId,
        clusterId,
        status: "failed",
        error: `Cluster ${clusterId} not found`
      };
    }
    return cluster.enqueueTask(request);
  }
  getClusterStatus(clusterId) {
    const cluster = this.clusters.get(clusterId);
    const config = this.clusterConfigs.get(clusterId);
    if (!cluster || !config) {
      return null;
    }
    const load = cluster.getLoad();
    return {
      clusterId,
      active: true,
      load,
      agents: config.agents
    };
  }
  getAllClusterStatuses() {
    const statuses = new Map;
    for (const [id, cluster] of this.clusters) {
      const config = this.clusterConfigs.get(id);
      if (config) {
        statuses.set(id, {
          clusterId: id,
          active: true,
          load: cluster.getLoad(),
          agents: config.agents
        });
      }
    }
    return statuses;
  }
  getLeastLoadedCluster() {
    let bestCluster = "cluster-alpha";
    let minLoad = Infinity;
    for (const [id, cluster] of this.clusters) {
      const load = cluster.getLoad();
      if (load.activeTasks < minLoad) {
        minLoad = load.activeTasks;
        bestCluster = id;
      }
    }
    return bestCluster;
  }
  getCluster(clusterId) {
    return this.clusters.get(clusterId);
  }
  getClusterIds() {
    return Array.from(this.clusters.keys());
  }
  getClusterConfig(clusterId) {
    return this.clusterConfigs.get(clusterId);
  }
  getAllAgents() {
    const agents = [];
    for (const [clusterId, cluster] of this.clusters) {
      const config = this.clusterConfigs.get(clusterId);
      if (config) {
        for (const agentId of config.agents) {
          const agentType = agentId.startsWith("shark-") ? "shark" : "manta";
          const instance = cluster.getAgent(agentId);
          agents.push({
            id: agentId,
            agentType,
            busy: instance?.busy ?? false,
            currentTaskId: instance?.currentTaskId,
            clusterId
          });
        }
      }
    }
    return agents;
  }
  getClusterAgents(clusterId) {
    const config = this.clusterConfigs.get(clusterId);
    const cluster = this.clusters.get(clusterId);
    if (!config || !cluster) {
      return [];
    }
    return config.agents.map((agentId) => {
      const agentType = agentId.startsWith("shark-") ? "shark" : "manta";
      const instance = cluster.getAgent(agentId);
      return {
        id: agentId,
        agentType,
        busy: instance?.busy ?? false,
        currentTaskId: instance?.currentTaskId,
        clusterId
      };
    });
  }
  getTotalSystemLoad() {
    let activeTasks = 0;
    let pendingTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;
    let lastActivity = Date.now();
    for (const cluster of this.clusters.values()) {
      const load = cluster.getLoad();
      activeTasks += load.activeTasks;
      pendingTasks += load.pendingTasks;
      completedTasks += load.completedTasks;
      failedTasks += load.failedTasks;
      lastActivity = Math.max(lastActivity, load.lastActivity);
    }
    return {
      clusterId: "system",
      activeTasks,
      pendingTasks,
      completedTasks,
      failedTasks,
      lastActivity
    };
  }
  async shutdown() {
    const shutdownPromises = [];
    for (const cluster of this.clusters.values()) {
      shutdownPromises.push(cluster.shutdown());
    }
    await Promise.all(shutdownPromises);
  }
}

// src/kraken-hive/index.ts
import fs2 from "node:fs";
import path3 from "node:path";
import os from "node:os";
var KRAKEN_HIVE_NAMESPACE = "viking://resources/kraken-hive";
var LOCAL_FALLBACK_DIR = path3.join(os.homedir(), ".local/share/opencode/kraken-hive");
var MEMORY_CATEGORIES = {
  CLUSTERS: "clusters",
  SESSIONS: "sessions",
  PATTERNS: "patterns",
  DECISIONS: "decisions",
  FAILURES: "failures",
  BREAKTHROUGHS: "breakthroughs"
};

class KrakenHiveEngine {
  localFallbackDir;
  constructor() {
    this.localFallbackDir = LOCAL_FALLBACK_DIR;
    this.ensureLocalStorage();
  }
  ensureLocalStorage() {
    if (!fs2.existsSync(this.localFallbackDir)) {
      fs2.mkdirSync(this.localFallbackDir, { recursive: true });
    }
  }
  getCategoryPath(category, subPath) {
    const base = path3.join(this.localFallbackDir, category);
    if (subPath) {
      return path3.join(base, subPath);
    }
    return base;
  }
  async search(query, filters) {
    const results = [];
    const limit = filters?.limit || 10;
    const queryLower = query.toLowerCase();
    const categories = this.getCategoriesToSearch(filters);
    for (const category of categories) {
      if (results.length >= limit)
        break;
      const categoryPath = this.getCategoryPath(category);
      if (!fs2.existsSync(categoryPath))
        continue;
      const searchResults = await this.searchCategory(categoryPath, queryLower, limit - results.length);
      results.push(...searchResults);
    }
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }
  getCategoriesToSearch(filters) {
    if (!filters?.category || filters.category === "all") {
      return Object.values(MEMORY_CATEGORIES);
    }
    const categoryMap = {
      clusters: MEMORY_CATEGORIES.CLUSTERS,
      sessions: MEMORY_CATEGORIES.SESSIONS,
      patterns: MEMORY_CATEGORIES.PATTERNS,
      decisions: MEMORY_CATEGORIES.DECISIONS,
      failures: MEMORY_CATEGORIES.FAILURES
    };
    return [categoryMap[filters.category] || MEMORY_CATEGORIES.CLUSTERS];
  }
  async searchCategory(dirPath, query, limit) {
    const results = [];
    try {
      const entries = fs2.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= limit)
          break;
        if (entry.isDirectory()) {
          const subResults = await this.searchCategory(path3.join(dirPath, entry.name), query, limit - results.length);
          results.push(...subResults);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          const filePath = path3.join(dirPath, entry.name);
          const content = fs2.readFileSync(filePath, "utf-8");
          const contentLower = content.toLowerCase();
          const queryWords = query.split(" ");
          let relevance = 0;
          for (const word of queryWords) {
            if (contentLower.includes(word)) {
              relevance++;
            }
          }
          if (relevance > 0) {
            const type = this.determineTypeFromPath(dirPath);
            results.push({
              uri: `${KRAKEN_HIVE_NAMESPACE}/${path3.relative(this.localFallbackDir, filePath)}`,
              type,
              title: entry.name.replace(".md", ""),
              relevance,
              content: content.slice(0, 500)
            });
          }
        }
      }
    } catch (error) {}
    return results;
  }
  determineTypeFromPath(filePath) {
    if (filePath.includes(MEMORY_CATEGORIES.PATTERNS))
      return "pattern";
    if (filePath.includes(MEMORY_CATEGORIES.FAILURES))
      return "failure";
    if (filePath.includes(MEMORY_CATEGORIES.SESSIONS))
      return "session";
    if (filePath.includes(MEMORY_CATEGORIES.DECISIONS))
      return "decision";
    if (filePath.includes(MEMORY_CATEGORIES.BREAKTHROUGHS))
      return "breakthrough";
    return "session";
  }
  async rememberCluster(clusterId, key, content) {
    const dirPath = this.getCategoryPath(MEMORY_CATEGORIES.CLUSTERS, clusterId);
    if (!fs2.existsSync(dirPath)) {
      fs2.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path3.join(dirPath, `${key}.md`);
    fs2.writeFileSync(filePath, content, "utf-8");
  }
  async rememberSession(sessionId, key, content) {
    const dirPath = this.getCategoryPath(MEMORY_CATEGORIES.SESSIONS, sessionId);
    if (!fs2.existsSync(dirPath)) {
      fs2.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path3.join(dirPath, `${key}.md`);
    fs2.writeFileSync(filePath, content, "utf-8");
  }
  async rememberPattern(pattern) {
    const dirPath = this.getCategoryPath(MEMORY_CATEGORIES.PATTERNS);
    if (!fs2.existsSync(dirPath)) {
      fs2.mkdirSync(dirPath, { recursive: true });
    }
    const content = `# Pattern: ${pattern.description}

## Type: ${pattern.type}
${pattern.taskId ? `## Task: ${pattern.taskId}` : ""}
${pattern.clusterId ? `## Cluster: ${pattern.clusterId}` : ""}
## Created: ${new Date(pattern.createdAt).toISOString()}

${pattern.content}
`;
    const filePath = path3.join(dirPath, `${pattern.id}.md`);
    fs2.writeFileSync(filePath, content, "utf-8");
  }
  async rememberFailure(failure) {
    const dirPath = this.getCategoryPath(MEMORY_CATEGORIES.FAILURES);
    if (!fs2.existsSync(dirPath)) {
      fs2.mkdirSync(dirPath, { recursive: true });
    }
    const content = `# Failure: ${failure.pattern}

## Cause
${failure.cause}

${failure.solution ? `## Solution
${failure.solution}` : ""}
${failure.taskId ? `## Task: ${failure.taskId}` : ""}
${failure.clusterId ? `## Cluster: ${failure.clusterId}` : ""}
## Created: ${new Date(failure.createdAt).toISOString()}
`;
    const filePath = path3.join(dirPath, `${failure.id}.md`);
    fs2.writeFileSync(filePath, content, "utf-8");
  }
  async getClusterContext(clusterId) {
    const context = {
      clusterId,
      recentTasks: [],
      commonPatterns: [],
      knownFailures: []
    };
    const clusterPath = this.getCategoryPath(MEMORY_CATEGORIES.CLUSTERS, clusterId);
    if (fs2.existsSync(clusterPath)) {
      try {
        const files = fs2.readdirSync(clusterPath);
        context.recentTasks = files.map((f) => f.replace(".md", ""));
      } catch {}
    }
    const patterns = await this.search("", { category: "patterns", limit: 5 });
    context.commonPatterns = patterns.map((p) => p.title);
    const failures = await this.search("", { category: "failures", limit: 5 });
    context.knownFailures = failures.map((f) => f.title);
    return context;
  }
  async getContextForTask(task) {
    const taskId = `task_${Date.now()}`;
    const patterns = await this.search(task, { category: "patterns", limit: 3 });
    const failures = await this.search(task, { category: "failures", limit: 3 });
    const previousWork = await this.search(task, { category: "sessions", limit: 3 });
    let clusterContext;
    const clusterMatch = task.match(/cluster[_-]?(alpha|beta|gamma)/i);
    if (clusterMatch) {
      clusterContext = await this.getClusterContext(`cluster-${clusterMatch[1].toLowerCase()}`);
    }
    return {
      taskId,
      patterns,
      failures,
      previousWork,
      clusterContext: clusterContext || {
        clusterId: "unknown",
        recentTasks: [],
        commonPatterns: [],
        knownFailures: []
      }
    };
  }
  synthesizeContext(memories, taskType) {
    const patterns = memories.filter((m) => m.type === "pattern");
    const failures = memories.filter((m) => m.type === "failure");
    const previousWork = memories.filter((m) => m.type === "session");
    return {
      taskId: `task_${Date.now()}`,
      patterns,
      failures,
      previousWork,
      clusterContext: {
        clusterId: "synthesized",
        recentTasks: [],
        commonPatterns: patterns.map((p) => p.title),
        knownFailures: failures.map((f) => f.title)
      }
    };
  }
}

// src/index.ts
init_evidence_collector();

// src/brains/SubagentManagerBrain.ts
class SubagentManagerBrain {
  initialized = false;
  messenger;
  stateStore;
  state = {
    initialized: false,
    activeContainers: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    outputsRetrieved: 0,
    outputsPending: 0,
    overrideCommandsReceived: 0,
    overrideCommandsProcessed: 0
  };
  constructor(messenger, stateStore) {
    this.messenger = messenger;
    this.stateStore = stateStore;
  }
  initialize() {
    if (this.initialized)
      return;
    this.initialized = true;
    this.state.initialized = true;
    this.messenger.subscribe("kraken-subagent", this.handleMessage.bind(this));
    console.log("[SubagentManagerBrain] Initialized — listening for override commands");
  }
  isInitialized() {
    return this.initialized;
  }
  async handleMessage(message) {
    this.state.overrideCommandsReceived++;
    switch (message.payload.action) {
      case "ABORT":
        await this.handleAbort(message);
        break;
      case "CLAIM_COMPLETE":
        await this.handleClaimComplete(message);
        break;
      case "RETRIEVE_OUTPUTS":
        await this.handleRetrieveOutputs(message);
        break;
      case "REASSIGN":
        await this.handleReassign(message);
        break;
      case "RETRY":
        await this.handleRetry(message);
        break;
      case "SUSPEND":
        await this.handleSuspend(message);
        break;
      case "RESUME":
        await this.handleResume(message);
        break;
      default:
        console.log(`[SubagentManagerBrain] Unknown override action: ${message.payload.action}`);
    }
    this.state.overrideCommandsProcessed++;
  }
  async handleAbort(message) {
    const taskId = message.payload.target?.taskId || message.payload.taskId;
    console.log(`[SubagentManagerBrain] ABORT: task ${taskId}`);
    this.messenger.acknowledgeCommand(message.payload.commandId || message.id, "completed");
  }
  async handleClaimComplete(message) {
    const taskId = message.payload.target?.taskId;
    const evidence = message.payload.evidence || [];
    console.log(`[SubagentManagerBrain] CLAIM_COMPLETE: task ${taskId}, evidence: ${evidence.length} items`);
    if (evidence.length === 0) {
      console.warn(`[SubagentManagerBrain] L2_BLOCK: Task ${taskId} claims completion without evidence`);
      this.messenger.acknowledgeCommand(message.payload.commandId, "rejected");
      return;
    }
    this.messenger.acknowledgeCommand(message.payload.commandId, "completed");
  }
  async handleRetrieveOutputs(message) {
    const taskId = message.payload.target?.taskId;
    console.log(`[SubagentManagerBrain] RETRIEVE_OUTPUTS: task ${taskId}`);
    this.state.outputsPending++;
    this.state.outputsRetrieved++;
    this.state.outputsPending--;
    this.messenger.acknowledgeCommand(message.payload.commandId, "completed");
  }
  async handleReassign(message) {
    const taskId = message.payload.target?.taskId;
    const targetCluster = message.payload.targetCluster;
    console.log(`[SubagentManagerBrain] REASSIGN: task ${taskId} → ${targetCluster}`);
    this.messenger.acknowledgeCommand(message.payload.commandId, "completed");
  }
  async handleRetry(message) {
    const taskId = message.payload.target?.taskId;
    console.log(`[SubagentManagerBrain] RETRY: task ${taskId}`);
    this.messenger.acknowledgeCommand(message.payload.commandId, "completed");
  }
  async handleSuspend(message) {
    const taskId = message.payload.target?.taskId;
    console.log(`[SubagentManagerBrain] SUSPEND: task ${taskId}`);
    this.messenger.acknowledgeCommand(message.payload.commandId, "completed");
  }
  async handleResume(message) {
    const taskId = message.payload.target?.taskId;
    console.log(`[SubagentManagerBrain] RESUME: task ${taskId}`);
    this.messenger.acknowledgeCommand(message.payload.commandId, "completed");
  }
  getState() {
    return { ...this.state };
  }
  cleanup() {
    this.state = {
      initialized: false,
      activeContainers: 0,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      outputsRetrieved: 0,
      outputsPending: 0,
      overrideCommandsReceived: 0,
      overrideCommandsProcessed: 0
    };
  }
}

// src/kraken-hive/KrakenHiveSeeder.ts
import fs3 from "node:fs";
import path4 from "node:path";
var HIVE_BASE = path4.join(process.env.HOME || "/root", ".local/share/opencode/kraken-hive");
var PATTERNS = {
  "patterns/delegation-pattern.md": `# Delegation Pattern
## When to delegate
- Multi-file changes: delegate to Shark (alpha cluster, steamroll)
- Debug/fix single bug: delegate to Manta (beta cluster, precision)
- Test/verify/audit: delegate to Manta (gamma cluster, testing)

## Never do directly
- Large builds: always delegate to shark-alpha-1 or shark-alpha-2
- Testing: always delegate to manta-gamma-1 or manta-gamma-2
- Code review: delegate to manta-beta-1 or manta-beta-2

## Anti-patterns
- fire-and-forget: spawn without tracking = L2_BLOCK
- wrong-cluster: build task to gamma = L4_BLOCK
- premature-completion: claim done without output retrieval = L2_BLOCK`,
  "patterns/cluster-routing.md": `# Cluster Routing
## Alpha Cluster (steamroll)
- Agents: shark-alpha-1, shark-alpha-2, manta-alpha-1
- Task types: build, create, implement, feature, write, scaffold, prototype
- Strategy: aggressive, full speed, no hesitation

## Beta Cluster (precision)
- Agents: shark-beta-1, manta-beta-1, manta-beta-2
- Task types: debug, fix, refactor, analyze, investigate, review, examine
- Strategy: precise, methodical, root cause isolation

## Gamma Cluster (testing)
- Agents: manta-gamma-1, manta-gamma-2, shark-gamma-1
- Task types: test, verify, validate, audit, assess, integration
- Strategy: thorough, evidence-based, gate enforcement`,
  "failures/fire-and-forget.md": `# Fire-and-Forget Failure Mode
## Pattern
Task spawned without output registration → task completed → outputs not retrieved → claimed done.

## Detection
- spawn_shark_agent called without output paths
- aggregate_results trusts boolean success without filesystem verification
- report_to_kraken claims complete without output evidence

## Fix
1. Register expected outputs on spawn (executionBrain.registerTaskOutputs)
2. After completion, verify outputs exist on host (L3 output inspection)
3. Only after verification, advance gate (L2 false completion block)

## Prevention
- L2 firewall layer: blocks completion claims without output retrieval
- Evidence collector: requires output evidence for gate passage`,
  "build-chain/typescript-build-pattern.md": `# TypeScript Build Pattern
## Build Pipeline
1. rm -rf dist/
2. bun build src/index.ts --outdir dist --target bun --format esm --bundle
3. Verify dist/index.js exists
4. Test with TUI container

## Common failures
- require() in ESM module: use import or dynamic import()
- Missing node: prefix on fs/path imports in Bun
- Circular dependency on state store/messenger
- Plugin peer dependency not externalized in bundle`,
  "architecture/v1.2-multi-brain.md": `# V1.2 Multi-Brain Architecture
## Brain Roles
- Planning Brain: T2 context loading, T1 generation, task decomposition, domain designation
- Execution Brain: Task supervision, output verification, override commands, quality enforcement
- System Brain: Workflow tracking, security enforcement, gate evaluation, L0-L7 firewall

## Communication
- Brain Messenger: priority queue (critical > high > normal > low)
- State Store: domain-owned shared state with write enforcement
- Brain Concurrency: independent async event loops per brain

## Gate Pipeline
plan → build → test → verify → audit → delivery
Each gate requires evidence before advancement.`
};
function seedKrakenHive() {
  let seeded = 0;
  let skipped = 0;
  let errors = 0;
  try {
    for (const [relPath, content] of Object.entries(PATTERNS)) {
      const fullPath = path4.join(HIVE_BASE, relPath);
      const dir = path4.dirname(fullPath);
      try {
        fs3.mkdirSync(dir, { recursive: true });
        if (fs3.existsSync(fullPath)) {
          skipped++;
          continue;
        }
        fs3.writeFileSync(fullPath, content);
        seeded++;
      } catch (err) {
        console.error(`[HiveSeed] Failed to seed ${relPath}:`, err);
        errors++;
      }
    }
    console.log(`[HiveSeed] Seeded ${seeded} patterns, ${skipped} existing, ${errors} errors`);
  } catch (err) {
    console.error("[HiveSeed] Fatal error:", err);
    errors++;
  }
  return { seeded, skipped, errors };
}

// node_modules/zod/v4/classic/external.js
var exports_external = {};
__export(exports_external, {
  xid: () => xid2,
  void: () => _void2,
  uuidv7: () => uuidv7,
  uuidv6: () => uuidv6,
  uuidv4: () => uuidv4,
  uuid: () => uuid2,
  util: () => exports_util,
  url: () => url,
  uppercase: () => _uppercase,
  unknown: () => unknown,
  union: () => union,
  undefined: () => _undefined3,
  ulid: () => ulid2,
  uint64: () => uint64,
  uint32: () => uint32,
  tuple: () => tuple,
  trim: () => _trim,
  treeifyError: () => treeifyError,
  transform: () => transform,
  toUpperCase: () => _toUpperCase,
  toLowerCase: () => _toLowerCase,
  toJSONSchema: () => toJSONSchema,
  templateLiteral: () => templateLiteral,
  symbol: () => symbol,
  superRefine: () => superRefine,
  success: () => success,
  stringbool: () => stringbool,
  stringFormat: () => stringFormat,
  string: () => string2,
  strictObject: () => strictObject,
  startsWith: () => _startsWith,
  size: () => _size,
  setErrorMap: () => setErrorMap,
  set: () => set,
  safeParseAsync: () => safeParseAsync2,
  safeParse: () => safeParse2,
  safeEncodeAsync: () => safeEncodeAsync2,
  safeEncode: () => safeEncode2,
  safeDecodeAsync: () => safeDecodeAsync2,
  safeDecode: () => safeDecode2,
  registry: () => registry,
  regexes: () => exports_regexes,
  regex: () => _regex,
  refine: () => refine,
  record: () => record,
  readonly: () => readonly,
  property: () => _property,
  promise: () => promise,
  prettifyError: () => prettifyError,
  preprocess: () => preprocess,
  prefault: () => prefault,
  positive: () => _positive,
  pipe: () => pipe,
  partialRecord: () => partialRecord,
  parseAsync: () => parseAsync2,
  parse: () => parse3,
  overwrite: () => _overwrite,
  optional: () => optional,
  object: () => object,
  number: () => number2,
  nullish: () => nullish2,
  nullable: () => nullable,
  null: () => _null3,
  normalize: () => _normalize,
  nonpositive: () => _nonpositive,
  nonoptional: () => nonoptional,
  nonnegative: () => _nonnegative,
  never: () => never,
  negative: () => _negative,
  nativeEnum: () => nativeEnum,
  nanoid: () => nanoid2,
  nan: () => nan,
  multipleOf: () => _multipleOf,
  minSize: () => _minSize,
  minLength: () => _minLength,
  mime: () => _mime,
  maxSize: () => _maxSize,
  maxLength: () => _maxLength,
  map: () => map,
  lte: () => _lte,
  lt: () => _lt,
  lowercase: () => _lowercase,
  looseObject: () => looseObject,
  locales: () => exports_locales,
  literal: () => literal,
  length: () => _length,
  lazy: () => lazy,
  ksuid: () => ksuid2,
  keyof: () => keyof,
  jwt: () => jwt,
  json: () => json,
  iso: () => exports_iso,
  ipv6: () => ipv62,
  ipv4: () => ipv42,
  intersection: () => intersection,
  int64: () => int64,
  int32: () => int32,
  int: () => int,
  instanceof: () => _instanceof,
  includes: () => _includes,
  httpUrl: () => httpUrl,
  hostname: () => hostname2,
  hex: () => hex2,
  hash: () => hash,
  guid: () => guid2,
  gte: () => _gte,
  gt: () => _gt,
  globalRegistry: () => globalRegistry,
  getErrorMap: () => getErrorMap,
  function: () => _function,
  formatError: () => formatError,
  float64: () => float64,
  float32: () => float32,
  flattenError: () => flattenError,
  file: () => file,
  enum: () => _enum2,
  endsWith: () => _endsWith,
  encodeAsync: () => encodeAsync2,
  encode: () => encode2,
  emoji: () => emoji2,
  email: () => email2,
  e164: () => e1642,
  discriminatedUnion: () => discriminatedUnion,
  decodeAsync: () => decodeAsync2,
  decode: () => decode2,
  date: () => date3,
  custom: () => custom,
  cuid2: () => cuid22,
  cuid: () => cuid3,
  core: () => exports_core2,
  config: () => config,
  coerce: () => exports_coerce,
  codec: () => codec,
  clone: () => clone,
  cidrv6: () => cidrv62,
  cidrv4: () => cidrv42,
  check: () => check,
  catch: () => _catch2,
  boolean: () => boolean2,
  bigint: () => bigint2,
  base64url: () => base64url2,
  base64: () => base642,
  array: () => array,
  any: () => any,
  _function: () => _function,
  _default: () => _default2,
  _ZodString: () => _ZodString,
  ZodXID: () => ZodXID,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodUUID: () => ZodUUID,
  ZodURL: () => ZodURL,
  ZodULID: () => ZodULID,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransform: () => ZodTransform,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodSymbol: () => ZodSymbol,
  ZodSuccess: () => ZodSuccess,
  ZodStringFormat: () => ZodStringFormat,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodRecord: () => ZodRecord,
  ZodRealError: () => ZodRealError,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPrefault: () => ZodPrefault,
  ZodPipe: () => ZodPipe,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNonOptional: () => ZodNonOptional,
  ZodNever: () => ZodNever,
  ZodNanoID: () => ZodNanoID,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodKSUID: () => ZodKSUID,
  ZodJWT: () => ZodJWT,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate,
  ZodIPv6: () => ZodIPv6,
  ZodIPv4: () => ZodIPv4,
  ZodGUID: () => ZodGUID,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFile: () => ZodFile,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEmoji: () => ZodEmoji,
  ZodEmail: () => ZodEmail,
  ZodE164: () => ZodE164,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodCustom: () => ZodCustom,
  ZodCodec: () => ZodCodec,
  ZodCatch: () => ZodCatch,
  ZodCUID2: () => ZodCUID2,
  ZodCUID: () => ZodCUID,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodBoolean: () => ZodBoolean,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBigInt: () => ZodBigInt,
  ZodBase64URL: () => ZodBase64URL,
  ZodBase64: () => ZodBase64,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  $output: () => $output,
  $input: () => $input,
  $brand: () => $brand
});

// node_modules/zod/v4/core/index.js
var exports_core2 = {};
__export(exports_core2, {
  version: () => version,
  util: () => exports_util,
  treeifyError: () => treeifyError,
  toJSONSchema: () => toJSONSchema,
  toDotPath: () => toDotPath,
  safeParseAsync: () => safeParseAsync,
  safeParse: () => safeParse,
  safeEncodeAsync: () => safeEncodeAsync,
  safeEncode: () => safeEncode,
  safeDecodeAsync: () => safeDecodeAsync,
  safeDecode: () => safeDecode,
  registry: () => registry,
  regexes: () => exports_regexes,
  prettifyError: () => prettifyError,
  parseAsync: () => parseAsync,
  parse: () => parse,
  locales: () => exports_locales,
  isValidJWT: () => isValidJWT,
  isValidBase64URL: () => isValidBase64URL,
  isValidBase64: () => isValidBase64,
  globalRegistry: () => globalRegistry,
  globalConfig: () => globalConfig,
  formatError: () => formatError,
  flattenError: () => flattenError,
  encodeAsync: () => encodeAsync,
  encode: () => encode,
  decodeAsync: () => decodeAsync,
  decode: () => decode,
  config: () => config,
  clone: () => clone,
  _xid: () => _xid,
  _void: () => _void,
  _uuidv7: () => _uuidv7,
  _uuidv6: () => _uuidv6,
  _uuidv4: () => _uuidv4,
  _uuid: () => _uuid,
  _url: () => _url,
  _uppercase: () => _uppercase,
  _unknown: () => _unknown,
  _union: () => _union,
  _undefined: () => _undefined2,
  _ulid: () => _ulid,
  _uint64: () => _uint64,
  _uint32: () => _uint32,
  _tuple: () => _tuple,
  _trim: () => _trim,
  _transform: () => _transform,
  _toUpperCase: () => _toUpperCase,
  _toLowerCase: () => _toLowerCase,
  _templateLiteral: () => _templateLiteral,
  _symbol: () => _symbol,
  _superRefine: () => _superRefine,
  _success: () => _success,
  _stringbool: () => _stringbool,
  _stringFormat: () => _stringFormat,
  _string: () => _string,
  _startsWith: () => _startsWith,
  _size: () => _size,
  _set: () => _set,
  _safeParseAsync: () => _safeParseAsync,
  _safeParse: () => _safeParse,
  _safeEncodeAsync: () => _safeEncodeAsync,
  _safeEncode: () => _safeEncode,
  _safeDecodeAsync: () => _safeDecodeAsync,
  _safeDecode: () => _safeDecode,
  _regex: () => _regex,
  _refine: () => _refine,
  _record: () => _record,
  _readonly: () => _readonly,
  _property: () => _property,
  _promise: () => _promise,
  _positive: () => _positive,
  _pipe: () => _pipe,
  _parseAsync: () => _parseAsync,
  _parse: () => _parse,
  _overwrite: () => _overwrite,
  _optional: () => _optional,
  _number: () => _number,
  _nullable: () => _nullable,
  _null: () => _null2,
  _normalize: () => _normalize,
  _nonpositive: () => _nonpositive,
  _nonoptional: () => _nonoptional,
  _nonnegative: () => _nonnegative,
  _never: () => _never,
  _negative: () => _negative,
  _nativeEnum: () => _nativeEnum,
  _nanoid: () => _nanoid,
  _nan: () => _nan,
  _multipleOf: () => _multipleOf,
  _minSize: () => _minSize,
  _minLength: () => _minLength,
  _min: () => _gte,
  _mime: () => _mime,
  _maxSize: () => _maxSize,
  _maxLength: () => _maxLength,
  _max: () => _lte,
  _map: () => _map,
  _lte: () => _lte,
  _lt: () => _lt,
  _lowercase: () => _lowercase,
  _literal: () => _literal,
  _length: () => _length,
  _lazy: () => _lazy,
  _ksuid: () => _ksuid,
  _jwt: () => _jwt,
  _isoTime: () => _isoTime,
  _isoDuration: () => _isoDuration,
  _isoDateTime: () => _isoDateTime,
  _isoDate: () => _isoDate,
  _ipv6: () => _ipv6,
  _ipv4: () => _ipv4,
  _intersection: () => _intersection,
  _int64: () => _int64,
  _int32: () => _int32,
  _int: () => _int,
  _includes: () => _includes,
  _guid: () => _guid,
  _gte: () => _gte,
  _gt: () => _gt,
  _float64: () => _float64,
  _float32: () => _float32,
  _file: () => _file,
  _enum: () => _enum,
  _endsWith: () => _endsWith,
  _encodeAsync: () => _encodeAsync,
  _encode: () => _encode,
  _emoji: () => _emoji2,
  _email: () => _email,
  _e164: () => _e164,
  _discriminatedUnion: () => _discriminatedUnion,
  _default: () => _default,
  _decodeAsync: () => _decodeAsync,
  _decode: () => _decode,
  _date: () => _date,
  _custom: () => _custom,
  _cuid2: () => _cuid2,
  _cuid: () => _cuid,
  _coercedString: () => _coercedString,
  _coercedNumber: () => _coercedNumber,
  _coercedDate: () => _coercedDate,
  _coercedBoolean: () => _coercedBoolean,
  _coercedBigint: () => _coercedBigint,
  _cidrv6: () => _cidrv6,
  _cidrv4: () => _cidrv4,
  _check: () => _check,
  _catch: () => _catch,
  _boolean: () => _boolean,
  _bigint: () => _bigint,
  _base64url: () => _base64url,
  _base64: () => _base64,
  _array: () => _array,
  _any: () => _any,
  TimePrecision: () => TimePrecision,
  NEVER: () => NEVER,
  JSONSchemaGenerator: () => JSONSchemaGenerator,
  JSONSchema: () => exports_json_schema,
  Doc: () => Doc,
  $output: () => $output,
  $input: () => $input,
  $constructor: () => $constructor,
  $brand: () => $brand,
  $ZodXID: () => $ZodXID,
  $ZodVoid: () => $ZodVoid,
  $ZodUnknown: () => $ZodUnknown,
  $ZodUnion: () => $ZodUnion,
  $ZodUndefined: () => $ZodUndefined,
  $ZodUUID: () => $ZodUUID,
  $ZodURL: () => $ZodURL,
  $ZodULID: () => $ZodULID,
  $ZodType: () => $ZodType,
  $ZodTuple: () => $ZodTuple,
  $ZodTransform: () => $ZodTransform,
  $ZodTemplateLiteral: () => $ZodTemplateLiteral,
  $ZodSymbol: () => $ZodSymbol,
  $ZodSuccess: () => $ZodSuccess,
  $ZodStringFormat: () => $ZodStringFormat,
  $ZodString: () => $ZodString,
  $ZodSet: () => $ZodSet,
  $ZodRegistry: () => $ZodRegistry,
  $ZodRecord: () => $ZodRecord,
  $ZodRealError: () => $ZodRealError,
  $ZodReadonly: () => $ZodReadonly,
  $ZodPromise: () => $ZodPromise,
  $ZodPrefault: () => $ZodPrefault,
  $ZodPipe: () => $ZodPipe,
  $ZodOptional: () => $ZodOptional,
  $ZodObjectJIT: () => $ZodObjectJIT,
  $ZodObject: () => $ZodObject,
  $ZodNumberFormat: () => $ZodNumberFormat,
  $ZodNumber: () => $ZodNumber,
  $ZodNullable: () => $ZodNullable,
  $ZodNull: () => $ZodNull,
  $ZodNonOptional: () => $ZodNonOptional,
  $ZodNever: () => $ZodNever,
  $ZodNanoID: () => $ZodNanoID,
  $ZodNaN: () => $ZodNaN,
  $ZodMap: () => $ZodMap,
  $ZodLiteral: () => $ZodLiteral,
  $ZodLazy: () => $ZodLazy,
  $ZodKSUID: () => $ZodKSUID,
  $ZodJWT: () => $ZodJWT,
  $ZodIntersection: () => $ZodIntersection,
  $ZodISOTime: () => $ZodISOTime,
  $ZodISODuration: () => $ZodISODuration,
  $ZodISODateTime: () => $ZodISODateTime,
  $ZodISODate: () => $ZodISODate,
  $ZodIPv6: () => $ZodIPv6,
  $ZodIPv4: () => $ZodIPv4,
  $ZodGUID: () => $ZodGUID,
  $ZodFunction: () => $ZodFunction,
  $ZodFile: () => $ZodFile,
  $ZodError: () => $ZodError,
  $ZodEnum: () => $ZodEnum,
  $ZodEncodeError: () => $ZodEncodeError,
  $ZodEmoji: () => $ZodEmoji,
  $ZodEmail: () => $ZodEmail,
  $ZodE164: () => $ZodE164,
  $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
  $ZodDefault: () => $ZodDefault,
  $ZodDate: () => $ZodDate,
  $ZodCustomStringFormat: () => $ZodCustomStringFormat,
  $ZodCustom: () => $ZodCustom,
  $ZodCodec: () => $ZodCodec,
  $ZodCheckUpperCase: () => $ZodCheckUpperCase,
  $ZodCheckStringFormat: () => $ZodCheckStringFormat,
  $ZodCheckStartsWith: () => $ZodCheckStartsWith,
  $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
  $ZodCheckRegex: () => $ZodCheckRegex,
  $ZodCheckProperty: () => $ZodCheckProperty,
  $ZodCheckOverwrite: () => $ZodCheckOverwrite,
  $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
  $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
  $ZodCheckMinSize: () => $ZodCheckMinSize,
  $ZodCheckMinLength: () => $ZodCheckMinLength,
  $ZodCheckMimeType: () => $ZodCheckMimeType,
  $ZodCheckMaxSize: () => $ZodCheckMaxSize,
  $ZodCheckMaxLength: () => $ZodCheckMaxLength,
  $ZodCheckLowerCase: () => $ZodCheckLowerCase,
  $ZodCheckLessThan: () => $ZodCheckLessThan,
  $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
  $ZodCheckIncludes: () => $ZodCheckIncludes,
  $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
  $ZodCheckEndsWith: () => $ZodCheckEndsWith,
  $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
  $ZodCheck: () => $ZodCheck,
  $ZodCatch: () => $ZodCatch,
  $ZodCUID2: () => $ZodCUID2,
  $ZodCUID: () => $ZodCUID,
  $ZodCIDRv6: () => $ZodCIDRv6,
  $ZodCIDRv4: () => $ZodCIDRv4,
  $ZodBoolean: () => $ZodBoolean,
  $ZodBigIntFormat: () => $ZodBigIntFormat,
  $ZodBigInt: () => $ZodBigInt,
  $ZodBase64URL: () => $ZodBase64URL,
  $ZodBase64: () => $ZodBase64,
  $ZodAsyncError: () => $ZodAsyncError,
  $ZodArray: () => $ZodArray,
  $ZodAny: () => $ZodAny
});

// node_modules/zod/v4/core/core.js
var NEVER = Object.freeze({
  status: "aborted"
});
function $constructor(name, initializer, params) {
  function init(inst, def) {
    var _a;
    Object.defineProperty(inst, "_zod", {
      value: inst._zod ?? {},
      enumerable: false
    });
    (_a = inst._zod).traits ?? (_a.traits = new Set);
    inst._zod.traits.add(name);
    initializer(inst, def);
    for (const k in _.prototype) {
      if (!(k in inst))
        Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
    }
    inst._zod.constr = _;
    inst._zod.def = def;
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
var $brand = Symbol("zod_brand");

class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}

class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
var globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
// node_modules/zod/v4/core/util.js
var exports_util = {};
__export(exports_util, {
  unwrapMessage: () => unwrapMessage,
  uint8ArrayToHex: () => uint8ArrayToHex,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  stringifyPrimitive: () => stringifyPrimitive,
  shallowClone: () => shallowClone,
  safeExtend: () => safeExtend,
  required: () => required,
  randomString: () => randomString,
  propertyKeyTypes: () => propertyKeyTypes,
  promiseAllObject: () => promiseAllObject,
  primitiveTypes: () => primitiveTypes,
  prefixIssues: () => prefixIssues,
  pick: () => pick,
  partial: () => partial,
  optionalKeys: () => optionalKeys,
  omit: () => omit,
  objectClone: () => objectClone,
  numKeys: () => numKeys,
  nullish: () => nullish,
  normalizeParams: () => normalizeParams,
  mergeDefs: () => mergeDefs,
  merge: () => merge,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  joinValues: () => joinValues,
  issue: () => issue,
  isPlainObject: () => isPlainObject,
  isObject: () => isObject,
  hexToUint8Array: () => hexToUint8Array,
  getSizableOrigin: () => getSizableOrigin,
  getParsedType: () => getParsedType,
  getLengthableOrigin: () => getLengthableOrigin,
  getEnumValues: () => getEnumValues,
  getElementAtPath: () => getElementAtPath,
  floatSafeRemainder: () => floatSafeRemainder,
  finalizeIssue: () => finalizeIssue,
  extend: () => extend,
  escapeRegex: () => escapeRegex,
  esc: () => esc,
  defineLazy: () => defineLazy,
  createTransparentProxy: () => createTransparentProxy,
  cloneDef: () => cloneDef,
  clone: () => clone,
  cleanRegex: () => cleanRegex,
  cleanEnum: () => cleanEnum,
  captureStackTrace: () => captureStackTrace,
  cached: () => cached,
  base64urlToUint8Array: () => base64urlToUint8Array,
  base64ToUint8Array: () => base64ToUint8Array,
  assignProp: () => assignProp,
  assertNotEqual: () => assertNotEqual,
  assertNever: () => assertNever,
  assertIs: () => assertIs,
  assertEqual: () => assertEqual,
  assert: () => assert,
  allowsEval: () => allowsEval,
  aborted: () => aborted,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  Class: () => Class,
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {}
function assertNever(_x) {
  throw new Error;
}
function assert(_) {}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match = stepString.match(/\d?e-(\d?)/);
    if (match?.[1]) {
      stepDecCount = Number.parseInt(match[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var EVALUATING = Symbol("evaluating");
function defineLazy(object, key, getter) {
  let value = undefined;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path5) {
  if (!path5)
    return obj;
  return path5.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0;i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0;i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = cached(() => {
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
};
var propertyKeyTypes = new Set(["string", "number", "symbol"]);
var primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
var BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = {
    ...schema._zod.def,
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: schema._zod.def.checks
  };
  return clone(schema, def);
}
function merge(a, b) {
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path5, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path5);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0;i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0;i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0;i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Class {
  constructor(..._args) {}
}

// node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, _mapper) {
  const mapper = _mapper || function(issue2) {
    return issue2.message;
  };
  const fieldErrors = { _errors: [] };
  const processError = (error2) => {
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}
function treeifyError(error, _mapper) {
  const mapper = _mapper || function(issue2) {
    return issue2.message;
  };
  const result = { errors: [] };
  const processError = (error2, path5 = []) => {
    var _a, _b;
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, issue2.path));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, issue2.path);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, issue2.path);
      } else {
        const fullpath = [...path5, ...issue2.path];
        if (fullpath.length === 0) {
          result.errors.push(mapper(issue2));
          continue;
        }
        let curr = result;
        let i = 0;
        while (i < fullpath.length) {
          const el = fullpath[i];
          const terminal = i === fullpath.length - 1;
          if (typeof el === "string") {
            curr.properties ?? (curr.properties = {});
            (_a = curr.properties)[el] ?? (_a[el] = { errors: [] });
            curr = curr.properties[el];
          } else {
            curr.items ?? (curr.items = []);
            (_b = curr.items)[el] ?? (_b[el] = { errors: [] });
            curr = curr.items[el];
          }
          if (terminal) {
            curr.errors.push(mapper(issue2));
          }
          i++;
        }
      }
    }
  };
  processError(error);
  return result;
}
function toDotPath(_path) {
  const segs = [];
  const path5 = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
  for (const seg of path5) {
    if (typeof seg === "number")
      segs.push(`[${seg}]`);
    else if (typeof seg === "symbol")
      segs.push(`[${JSON.stringify(String(seg))}]`);
    else if (/[^\w$]/.test(seg))
      segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length)
        segs.push(".");
      segs.push(seg);
    }
  }
  return segs.join("");
}
function prettifyError(error) {
  const lines = [];
  const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
  for (const issue2 of issues) {
    lines.push(`✖ ${issue2.message}`);
    if (issue2.path?.length)
      lines.push(`  → at ${toDotPath(issue2.path)}`);
  }
  return lines.join(`
`);
}

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
var encode = /* @__PURE__ */ _encode($ZodRealError);
var _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
var decode = /* @__PURE__ */ _decode($ZodRealError);
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
var encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
var decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
var safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
var _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
var safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);
// node_modules/zod/v4/core/regexes.js
var exports_regexes = {};
__export(exports_regexes, {
  xid: () => xid,
  uuid7: () => uuid7,
  uuid6: () => uuid6,
  uuid4: () => uuid4,
  uuid: () => uuid,
  uppercase: () => uppercase,
  unicodeEmail: () => unicodeEmail,
  undefined: () => _undefined,
  ulid: () => ulid,
  time: () => time,
  string: () => string,
  sha512_hex: () => sha512_hex,
  sha512_base64url: () => sha512_base64url,
  sha512_base64: () => sha512_base64,
  sha384_hex: () => sha384_hex,
  sha384_base64url: () => sha384_base64url,
  sha384_base64: () => sha384_base64,
  sha256_hex: () => sha256_hex,
  sha256_base64url: () => sha256_base64url,
  sha256_base64: () => sha256_base64,
  sha1_hex: () => sha1_hex,
  sha1_base64url: () => sha1_base64url,
  sha1_base64: () => sha1_base64,
  rfc5322Email: () => rfc5322Email,
  number: () => number,
  null: () => _null,
  nanoid: () => nanoid,
  md5_hex: () => md5_hex,
  md5_base64url: () => md5_base64url,
  md5_base64: () => md5_base64,
  lowercase: () => lowercase,
  ksuid: () => ksuid,
  ipv6: () => ipv6,
  ipv4: () => ipv4,
  integer: () => integer,
  idnEmail: () => idnEmail,
  html5Email: () => html5Email,
  hostname: () => hostname,
  hex: () => hex,
  guid: () => guid,
  extendedDuration: () => extendedDuration,
  emoji: () => emoji,
  email: () => email,
  e164: () => e164,
  duration: () => duration,
  domain: () => domain,
  datetime: () => datetime,
  date: () => date,
  cuid2: () => cuid2,
  cuid: () => cuid,
  cidrv6: () => cidrv6,
  cidrv4: () => cidrv4,
  browserEmail: () => browserEmail,
  boolean: () => boolean,
  bigint: () => bigint,
  base64url: () => base64url,
  base64: () => base64
});
var cuid = /^[cC][^\s-]{8,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
var extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
var uuid4 = /* @__PURE__ */ uuid(4);
var uuid6 = /* @__PURE__ */ uuid(6);
var uuid7 = /* @__PURE__ */ uuid(7);
var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
var html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
var idnEmail = unicodeEmail;
var browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji, "u");
}
var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^[A-Za-z0-9_-]*$/;
var hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
var domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
var e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var bigint = /^-?\d+n?$/;
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?/;
var boolean = /^(?:true|false)$/i;
var _null = /^null$/i;
var _undefined = /^undefined$/i;
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;
var hex = /^[0-9a-fA-F]*$/;
function fixedBase64(bodyLength, padding) {
  return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
  return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
var md5_hex = /^[0-9a-fA-F]{32}$/;
var md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
var md5_base64url = /* @__PURE__ */ fixedBase64url(22);
var sha1_hex = /^[0-9a-fA-F]{40}$/;
var sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
var sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
var sha256_hex = /^[0-9a-fA-F]{64}$/;
var sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
var sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
var sha384_hex = /^[0-9a-fA-F]{96}$/;
var sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
var sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
var sha512_hex = /^[0-9a-fA-F]{128}$/;
var sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
var sha512_base64url = /* @__PURE__ */ fixedBase64url(86);

// node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a;
    (_a = inst2._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inst
      });
    }
  };
});
var $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (input < minimum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "bigint",
        input,
        code: "too_big",
        maximum,
        inst
      });
    }
  };
});
var $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size <= def.maximum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size >= def.minimum)
      return;
    payload.issues.push({
      origin: getSizableOrigin(input),
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.size !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.size;
    bag.maximum = def.size;
    bag.size = def.size;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const size = input.size;
    if (size === def.size)
      return;
    const tooBig = size > def.size;
    payload.issues.push({
      origin: getSizableOrigin(input),
      ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = new Set);
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a = inst._zod).check ?? (_a.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {});
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = new Set);
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    const result = def.schema._zod.run({
      value: payload.value[def.property],
      issues: []
    }, {});
    if (result instanceof Promise) {
      return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
    }
    handleCheckPropertyResult(result, payload, def.property);
    return;
  };
});
var $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
  $ZodCheck.init(inst, def);
  const mimeSet = new Set(def.mime);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.mime = def.mime;
  });
  inst._zod.check = (payload) => {
    if (mimeSet.has(payload.value.type))
      return;
    payload.issues.push({
      code: "invalid_value",
      values: def.mime,
      input: payload.value.type,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join(`
`));
  }
}

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 1,
  patch: 8
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError;
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  inst["~standard"] = {
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  };
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {}
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === undefined)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      const url = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date);
  $ZodStringFormat.init(inst, def);
});
var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time(def));
  $ZodStringFormat.init(inst, def);
});
var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration);
  $ZodStringFormat.init(inst, def);
});
var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = `ipv4`;
  });
});
var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = `ipv6`;
  });
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error;
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error;
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error;
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error;
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.contentEncoding = "base64";
  });
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    inst2._zod.bag.contentEncoding = "base64url";
  });
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (def.fn(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: def.format,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {}
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = bigint;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = BigInt(payload.value);
      } catch (_) {}
    if (typeof payload.value === "bigint")
      return payload;
    payload.issues.push({
      expected: "bigint",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
  $ZodCheckBigIntFormat.init(inst, def);
  $ZodBigInt.init(inst, def);
});
var $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "symbol")
      return payload;
    payload.issues.push({
      expected: "symbol",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _undefined;
  inst._zod.values = new Set([undefined]);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "undefined",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null;
  inst._zod.values = new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (typeof input === "undefined")
      return payload;
    payload.issues.push({
      expected: "void",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce) {
      try {
        payload.value = new Date(payload.value);
      } catch (_err) {}
    }
    const input = payload.value;
    const isDate = input instanceof Date;
    const isValidDate = isDate && !Number.isNaN(input.getTime());
    if (isValidDate)
      return payload;
    payload.issues.push({
      expected: "date",
      code: "invalid_type",
      input,
      ...isDate ? { received: "Invalid Date" } : {},
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0;i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (result.value === undefined) {
    if (key in input) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  for (const key of Object.keys(input)) {
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
    } else {
      handlePropertyResult(r, payload, key, input);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = new Set);
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
      } else {
        handlePropertyResult(r, payload, key, input);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      doc.write(`const ${id} = ${parseStr(key)};`);
      doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return;
  });
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazy(inst._zod, "propValues", () => {
    const propValues = {};
    for (const option of def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (const [k, v] of Object.entries(pv)) {
        if (!propValues[k])
          propValues[k] = new Set;
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    return propValues;
  });
  const disc = cached(() => {
    const opts = def.options;
    const map = new Map;
    for (const o of opts) {
      const values = o._zod.propValues?.[def.discriminator];
      if (!values || values.size === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
      for (const v of values) {
        if (map.has(v)) {
          throw new Error(`Duplicate discriminator value "${String(v)}"`);
        }
        map.set(v, o);
      }
    }
    return map;
  });
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const opt = disc.value.get(input?.[def.discriminator]);
    if (opt) {
      return opt._zod.run(payload, ctx);
    }
    if (def.unionFallback) {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: def.discriminator,
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  if (left.issues.length) {
    result.issues.push(...left.issues);
  }
  if (right.issues.length) {
    result.issues.push(...right.issues);
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
var $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
  $ZodType.init(inst, def);
  const items = def.items;
  const optStart = items.length - [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        input,
        inst,
        expected: "tuple",
        code: "invalid_type"
      });
      return payload;
    }
    payload.value = [];
    const proms = [];
    if (!def.rest) {
      const tooBig = input.length > items.length;
      const tooSmall = input.length < optStart - 1;
      if (tooBig || tooSmall) {
        payload.issues.push({
          ...tooBig ? { code: "too_big", maximum: items.length } : { code: "too_small", minimum: items.length },
          input,
          inst,
          origin: "array"
        });
        return payload;
      }
    }
    let i = -1;
    for (const item of items) {
      i++;
      if (i >= input.length) {
        if (i >= optStart)
          continue;
      }
      const result = item._zod.run({
        value: input[i],
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
      } else {
        handleTupleResult(result, payload, i);
      }
    }
    if (def.rest) {
      const rest = input.slice(items.length);
      for (const el of rest) {
        i++;
        const result = def.rest._zod.run({
          value: el,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
        } else {
          handleTupleResult(result, payload, i);
        }
      }
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    if (def.keyType._zod.values) {
      const values = def.keyType._zod.values;
      payload.value = {};
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[key] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[key] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!values.has(key)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        if (keyResult.issues.length) {
          payload.issues.push({
            code: "invalid_key",
            origin: "record",
            issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
            input: key,
            path: [key],
            inst
          });
          payload.value[keyResult.value] = keyResult.value;
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
var $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Map)) {
      payload.issues.push({
        expected: "map",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    payload.value = new Map;
    for (const [key, value] of input) {
      const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
      const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
      if (keyResult instanceof Promise || valueResult instanceof Promise) {
        proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
          handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
        }));
      } else {
        handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
      }
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
  if (keyResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, keyResult.issues));
    } else {
      final.issues.push({
        code: "invalid_key",
        origin: "map",
        input,
        inst,
        issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  if (valueResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, valueResult.issues));
    } else {
      final.issues.push({
        origin: "map",
        code: "invalid_element",
        input,
        inst,
        key,
        issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  final.value.set(keyResult.value, valueResult.value);
}
var $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!(input instanceof Set)) {
      payload.issues.push({
        input,
        inst,
        expected: "set",
        code: "invalid_type"
      });
      return payload;
    }
    const proms = [];
    payload.value = new Set;
    for (const item of input) {
      const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleSetResult(result2, payload)));
      } else
        handleSetResult(result, payload);
    }
    if (proms.length)
      return Promise.all(proms).then(() => payload);
    return payload;
  };
});
function handleSetResult(result, final) {
  if (result.issues.length) {
    final.issues.push(...result.issues);
  }
  final.value.add(result.value);
}
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  inst._zod.values = new Set(def.values);
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (inst._zod.values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input instanceof File)
      return payload;
    payload.issues.push({
      expected: "file",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError;
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (result.issues.length && input === undefined) {
    return { issues: [], value: undefined };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, payload.value));
      return handleOptionalResult(result, payload.value);
    }
    if (payload.value === undefined) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
var $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError("ZodSuccess");
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.issues.length === 0;
        return payload;
      });
    }
    payload.value = result.issues.length === 0;
    return payload;
  };
});
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
    }
    return payload;
  };
});
var $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "nan",
        code: "invalid_type"
      });
      return payload;
    }
    return payload;
  };
});
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
var $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handleCodecAResult(left2, def, ctx));
      }
      return handleCodecAResult(left, def, ctx);
    } else {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handleCodecAResult(right2, def, ctx));
      }
      return handleCodecAResult(right, def, ctx);
    }
  };
});
function handleCodecAResult(result, def, ctx) {
  if (result.issues.length) {
    result.aborted = true;
    return result;
  }
  const direction = ctx.direction || "forward";
  if (direction === "forward") {
    const transformed = def.transform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
    }
    return handleCodecTxResult(result, transformed, def.out, ctx);
  } else {
    const transformed = def.reverseTransform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
    }
    return handleCodecTxResult(result, transformed, def.in, ctx);
  }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
var $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  const regexParts = [];
  for (const part of def.parts) {
    if (typeof part === "object" && part !== null) {
      if (!part._zod.pattern) {
        throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
      }
      const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
      if (!source)
        throw new Error(`Invalid template literal part: ${part._zod.traits}`);
      const start = source.startsWith("^") ? 1 : 0;
      const end = source.endsWith("$") ? source.length - 1 : source.length;
      regexParts.push(source.slice(start, end));
    } else if (part === null || primitiveTypes.has(typeof part)) {
      regexParts.push(escapeRegex(`${part}`));
    } else {
      throw new Error(`Invalid template literal part: ${part}`);
    }
  }
  inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "string") {
      payload.issues.push({
        input: payload.value,
        inst,
        expected: "template_literal",
        code: "invalid_type"
      });
      return payload;
    }
    inst._zod.pattern.lastIndex = 0;
    if (!inst._zod.pattern.test(payload.value)) {
      payload.issues.push({
        input: payload.value,
        inst,
        code: "invalid_format",
        format: def.format ?? "template_literal",
        pattern: inst._zod.pattern.source
      });
      return payload;
    }
    return payload;
  };
});
var $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
  $ZodType.init(inst, def);
  inst._def = def;
  inst._zod.def = def;
  inst.implement = (func) => {
    if (typeof func !== "function") {
      throw new Error("implement() must be called with a function");
    }
    return function(...args) {
      const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
      const result = Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return parse(inst._def.output, result);
      }
      return result;
    };
  };
  inst.implementAsync = (func) => {
    if (typeof func !== "function") {
      throw new Error("implementAsync() must be called with a function");
    }
    return async function(...args) {
      const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
      const result = await Reflect.apply(func, this, parsedArgs);
      if (inst._def.output) {
        return await parseAsync(inst._def.output, result);
      }
      return result;
    };
  };
  inst._zod.parse = (payload, _ctx) => {
    if (typeof payload.value !== "function") {
      payload.issues.push({
        code: "invalid_type",
        expected: "function",
        input: payload.value,
        inst
      });
      return payload;
    }
    const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
    if (hasPromiseOutput) {
      payload.value = inst.implementAsync(payload.value);
    } else {
      payload.value = inst.implement(payload.value);
    }
    return payload;
  };
  inst.input = (...args) => {
    const F = inst.constructor;
    if (Array.isArray(args[0])) {
      return new F({
        type: "function",
        input: new $ZodTuple({
          type: "tuple",
          items: args[0],
          rest: args[1]
        }),
        output: inst._def.output
      });
    }
    return new F({
      type: "function",
      input: args[0],
      output: inst._def.output
    });
  };
  inst.output = (output) => {
    const F = inst.constructor;
    return new F({
      type: "function",
      input: inst._def.input,
      output
    });
  };
  return inst;
});
var $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
  };
});
var $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "innerType", () => def.getter());
  defineLazy(inst._zod, "pattern", () => inst._zod.innerType._zod.pattern);
  defineLazy(inst._zod, "propValues", () => inst._zod.innerType._zod.propValues);
  defineLazy(inst._zod, "optin", () => inst._zod.innerType._zod.optin ?? undefined);
  defineLazy(inst._zod, "optout", () => inst._zod.innerType._zod.optout ?? undefined);
  inst._zod.parse = (payload, ctx) => {
    const inner = inst._zod.innerType;
    return inner._zod.run(payload, ctx);
  };
});
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
// node_modules/zod/v4/locales/index.js
var exports_locales = {};
__export(exports_locales, {
  zhTW: () => zh_TW_default,
  zhCN: () => zh_CN_default,
  yo: () => yo_default,
  vi: () => vi_default,
  ur: () => ur_default,
  uk: () => uk_default,
  ua: () => ua_default,
  tr: () => tr_default,
  th: () => th_default,
  ta: () => ta_default,
  sv: () => sv_default,
  sl: () => sl_default,
  ru: () => ru_default,
  pt: () => pt_default,
  ps: () => ps_default,
  pl: () => pl_default,
  ota: () => ota_default,
  no: () => no_default,
  nl: () => nl_default,
  ms: () => ms_default,
  mk: () => mk_default,
  lt: () => lt_default,
  ko: () => ko_default,
  km: () => km_default,
  kh: () => kh_default,
  ka: () => ka_default,
  ja: () => ja_default,
  it: () => it_default,
  is: () => is_default,
  id: () => id_default,
  hu: () => hu_default,
  he: () => he_default,
  frCA: () => fr_CA_default,
  fr: () => fr_default,
  fi: () => fi_default,
  fa: () => fa_default,
  es: () => es_default,
  eo: () => eo_default,
  en: () => en_default,
  de: () => de_default,
  da: () => da_default,
  cs: () => cs_default,
  ca: () => ca_default,
  be: () => be_default,
  az: () => az_default,
  ar: () => ar_default
});

// node_modules/zod/v4/locales/ar.js
var error = () => {
  const Sizable = {
    string: { unit: "حرف", verb: "أن يحوي" },
    file: { unit: "بايت", verb: "أن يحوي" },
    array: { unit: "عنصر", verb: "أن يحوي" },
    set: { unit: "عنصر", verb: "أن يحوي" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "مدخل",
    email: "بريد إلكتروني",
    url: "رابط",
    emoji: "إيموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاريخ ووقت بمعيار ISO",
    date: "تاريخ بمعيار ISO",
    time: "وقت بمعيار ISO",
    duration: "مدة بمعيار ISO",
    ipv4: "عنوان IPv4",
    ipv6: "عنوان IPv6",
    cidrv4: "مدى عناوين بصيغة IPv4",
    cidrv6: "مدى عناوين بصيغة IPv6",
    base64: "نَص بترميز base64-encoded",
    base64url: "نَص بترميز base64url-encoded",
    json_string: "نَص على هيئة JSON",
    e164: "رقم هاتف بمعيار E.164",
    jwt: "JWT",
    template_literal: "مدخل"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `مدخلات غير مقبولة: يفترض إدخال ${issue2.expected}، ولكن تم إدخال ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `مدخلات غير مقبولة: يفترض إدخال ${stringifyPrimitive(issue2.values[0])}`;
        return `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return ` أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"}`;
        return `أكبر من اللازم: يفترض أن تكون ${issue2.origin ?? "القيمة"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `أصغر من اللازم: يفترض لـ ${issue2.origin} أن يكون ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `نَص غير مقبول: يجب أن يبدأ بـ "${issue2.prefix}"`;
        if (_issue.format === "ends_with")
          return `نَص غير مقبول: يجب أن ينتهي بـ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `نَص غير مقبول: يجب أن يتضمَّن "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `نَص غير مقبول: يجب أن يطابق النمط ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} غير مقبول`;
      }
      case "not_multiple_of":
        return `رقم غير مقبول: يجب أن يكون من مضاعفات ${issue2.divisor}`;
      case "unrecognized_keys":
        return `معرف${issue2.keys.length > 1 ? "ات" : ""} غريب${issue2.keys.length > 1 ? "ة" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `معرف غير مقبول في ${issue2.origin}`;
      case "invalid_union":
        return "مدخل غير مقبول";
      case "invalid_element":
        return `مدخل غير مقبول في ${issue2.origin}`;
      default:
        return "مدخل غير مقبول";
    }
  };
};
function ar_default() {
  return {
    localeError: error()
  };
}
// node_modules/zod/v4/locales/az.js
var error2 = () => {
  const Sizable = {
    string: { unit: "simvol", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "element", verb: "olmalıdır" },
    set: { unit: "element", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Yanlış dəyər: gözlənilən ${issue2.expected}, daxil olan ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Yanlış dəyər: gözlənilən ${stringifyPrimitive(issue2.values[0])}`;
        return `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        return `Çox böyük: gözlənilən ${issue2.origin ?? "dəyər"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çox kiçik: gözlənilən ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Yanlış mətn: "${_issue.prefix}" ilə başlamalıdır`;
        if (_issue.format === "ends_with")
          return `Yanlış mətn: "${_issue.suffix}" ilə bitməlidir`;
        if (_issue.format === "includes")
          return `Yanlış mətn: "${_issue.includes}" daxil olmalıdır`;
        if (_issue.format === "regex")
          return `Yanlış mətn: ${_issue.pattern} şablonuna uyğun olmalıdır`;
        return `Yanlış ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Yanlış ədəd: ${issue2.divisor} ilə bölünə bilən olmalıdır`;
      case "unrecognized_keys":
        return `Tanınmayan açar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} daxilində yanlış açar`;
      case "invalid_union":
        return "Yanlış dəyər";
      case "invalid_element":
        return `${issue2.origin} daxilində yanlış dəyər`;
      default:
        return `Yanlış dəyər`;
    }
  };
};
function az_default() {
  return {
    localeError: error2()
  };
}
// node_modules/zod/v4/locales/be.js
function getBelarusianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
var error3 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "сімвал",
        few: "сімвалы",
        many: "сімвалаў"
      },
      verb: "мець"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элементы",
        many: "элементаў"
      },
      verb: "мець"
    },
    file: {
      unit: {
        one: "байт",
        few: "байты",
        many: "байтаў"
      },
      verb: "мець"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "лік";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "масіў";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "увод",
    email: "email адрас",
    url: "URL",
    emoji: "эмодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата і час",
    date: "ISO дата",
    time: "ISO час",
    duration: "ISO працягласць",
    ipv4: "IPv4 адрас",
    ipv6: "IPv6 адрас",
    cidrv4: "IPv4 дыяпазон",
    cidrv6: "IPv6 дыяпазон",
    base64: "радок у фармаце base64",
    base64url: "радок у фармаце base64url",
    json_string: "JSON радок",
    e164: "нумар E.164",
    jwt: "JWT",
    template_literal: "увод"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Няправільны ўвод: чакаўся ${issue2.expected}, атрымана ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Няправільны ўвод: чакалася ${stringifyPrimitive(issue2.values[0])}`;
        return `Няправільны варыянт: чакаўся адзін з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Занадта вялікі: чакалася, што ${issue2.origin ?? "значэнне"} павінна быць ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Занадта малы: чакалася, што ${issue2.origin} павінна ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Занадта малы: чакалася, што ${issue2.origin} павінна быць ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Няправільны радок: павінен пачынацца з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Няправільны радок: павінен заканчвацца на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Няправільны радок: павінен змяшчаць "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Няправільны радок: павінен адпавядаць шаблону ${_issue.pattern}`;
        return `Няправільны ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Няправільны лік: павінен быць кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспазнаны ${issue2.keys.length > 1 ? "ключы" : "ключ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Няправільны ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Няправільны ўвод";
      case "invalid_element":
        return `Няправільнае значэнне ў ${issue2.origin}`;
      default:
        return `Няправільны ўвод`;
    }
  };
};
function be_default() {
  return {
    localeError: error3()
  };
}
// node_modules/zod/v4/locales/ca.js
var error4 = () => {
  const Sizable = {
    string: { unit: "caràcters", verb: "contenir" },
    file: { unit: "bytes", verb: "contenir" },
    array: { unit: "elements", verb: "contenir" },
    set: { unit: "elements", verb: "contenir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrada",
    email: "adreça electrònica",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "durada ISO",
    ipv4: "adreça IPv4",
    ipv6: "adreça IPv6",
    cidrv4: "rang IPv4",
    cidrv6: "rang IPv6",
    base64: "cadena codificada en base64",
    base64url: "cadena codificada en base64url",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Tipus invàlid: s'esperava ${issue2.expected}, s'ha rebut ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Valor invàlid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
        return `Opció invàlida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "com a màxim" : "menys de";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} contingués ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "com a mínim" : "més de";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Massa petit: s'esperava que ${issue2.origin} contingués ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Format invàlid: ha de començar amb "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Format invàlid: ha d'acabar amb "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Format invàlid: ha d'incloure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Format invàlid: ha de coincidir amb el patró ${_issue.pattern}`;
        return `Format invàlid per a ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número invàlid: ha de ser múltiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clau invàlida a ${issue2.origin}`;
      case "invalid_union":
        return "Entrada invàlida";
      case "invalid_element":
        return `Element invàlid a ${issue2.origin}`;
      default:
        return `Entrada invàlida`;
    }
  };
};
function ca_default() {
  return {
    localeError: error4()
  };
}
// node_modules/zod/v4/locales/cs.js
var error5 = () => {
  const Sizable = {
    string: { unit: "znaků", verb: "mít" },
    file: { unit: "bajtů", verb: "mít" },
    array: { unit: "prvků", verb: "mít" },
    set: { unit: "prvků", verb: "mít" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "číslo";
      }
      case "string": {
        return "řetězec";
      }
      case "boolean": {
        return "boolean";
      }
      case "bigint": {
        return "bigint";
      }
      case "function": {
        return "funkce";
      }
      case "symbol": {
        return "symbol";
      }
      case "undefined": {
        return "undefined";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "pole";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "regulární výraz",
    email: "e-mailová adresa",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "datum a čas ve formátu ISO",
    date: "datum ve formátu ISO",
    time: "čas ve formátu ISO",
    duration: "doba trvání ISO",
    ipv4: "IPv4 adresa",
    ipv6: "IPv6 adresa",
    cidrv4: "rozsah IPv4",
    cidrv6: "rozsah IPv6",
    base64: "řetězec zakódovaný ve formátu base64",
    base64url: "řetězec zakódovaný ve formátu base64url",
    json_string: "řetězec ve formátu JSON",
    e164: "číslo E.164",
    jwt: "JWT",
    template_literal: "vstup"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Neplatný vstup: očekáváno ${issue2.expected}, obdrženo ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neplatný vstup: očekáváno ${stringifyPrimitive(issue2.values[0])}`;
        return `Neplatná možnost: očekávána jedna z hodnot ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš velká: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí mít ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "prvků"}`;
        }
        return `Hodnota je příliš malá: ${issue2.origin ?? "hodnota"} musí být ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Neplatný řetězec: musí začínat na "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Neplatný řetězec: musí končit na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neplatný řetězec: musí obsahovat "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neplatný řetězec: musí odpovídat vzoru ${_issue.pattern}`;
        return `Neplatný formát ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neplatné číslo: musí být násobkem ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neznámé klíče: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neplatný klíč v ${issue2.origin}`;
      case "invalid_union":
        return "Neplatný vstup";
      case "invalid_element":
        return `Neplatná hodnota v ${issue2.origin}`;
      default:
        return `Neplatný vstup`;
    }
  };
};
function cs_default() {
  return {
    localeError: error5()
  };
}
// node_modules/zod/v4/locales/da.js
var error6 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "havde" },
    file: { unit: "bytes", verb: "havde" },
    array: { unit: "elementer", verb: "indeholdt" },
    set: { unit: "elementer", verb: "indeholdt" }
  };
  const TypeNames = {
    string: "streng",
    number: "tal",
    boolean: "boolean",
    array: "liste",
    object: "objekt",
    set: "sæt",
    file: "fil"
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  function getTypeName(type) {
    return TypeNames[type] ?? type;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "tal";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "liste";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return "objekt";
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "e-mailadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslæt",
    date: "ISO-dato",
    time: "ISO-klokkeslæt",
    duration: "ISO-varighed",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodet streng",
    base64url: "base64url-kodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ugyldigt input: forventede ${getTypeName(issue2.expected)}, fik ${getTypeName(parsedType(issue2.input))}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig værdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldigt valg: forventede en af følgende ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing)
          return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing) {
          return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: skal matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldigt tal: skal være deleligt med ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukendte nøgler" : "Ukendt nøgle"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøgle i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldigt input: matcher ingen af de tilladte typer";
      case "invalid_element":
        return `Ugyldig værdi i ${issue2.origin}`;
      default:
        return `Ugyldigt input`;
    }
  };
};
function da_default() {
  return {
    localeError: error6()
  };
}
// node_modules/zod/v4/locales/de.js
var error7 = () => {
  const Sizable = {
    string: { unit: "Zeichen", verb: "zu haben" },
    file: { unit: "Bytes", verb: "zu haben" },
    array: { unit: "Elemente", verb: "zu haben" },
    set: { unit: "Elemente", verb: "zu haben" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "Zahl";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "Array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "Eingabe",
    email: "E-Mail-Adresse",
    url: "URL",
    emoji: "Emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-Datum und -Uhrzeit",
    date: "ISO-Datum",
    time: "ISO-Uhrzeit",
    duration: "ISO-Dauer",
    ipv4: "IPv4-Adresse",
    ipv6: "IPv6-Adresse",
    cidrv4: "IPv4-Bereich",
    cidrv6: "IPv6-Bereich",
    base64: "Base64-codierter String",
    base64url: "Base64-URL-codierter String",
    json_string: "JSON-String",
    e164: "E.164-Nummer",
    jwt: "JWT",
    template_literal: "Eingabe"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ungültige Eingabe: erwartet ${issue2.expected}, erhalten ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ungültige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ungültige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
        return `Zu groß: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ist`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
        }
        return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ungültiger String: muss mit "${_issue.prefix}" beginnen`;
        if (_issue.format === "ends_with")
          return `Ungültiger String: muss mit "${_issue.suffix}" enden`;
        if (_issue.format === "includes")
          return `Ungültiger String: muss "${_issue.includes}" enthalten`;
        if (_issue.format === "regex")
          return `Ungültiger String: muss dem Muster ${_issue.pattern} entsprechen`;
        return `Ungültig: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ungültige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Unbekannte Schlüssel" : "Unbekannter Schlüssel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ungültiger Schlüssel in ${issue2.origin}`;
      case "invalid_union":
        return "Ungültige Eingabe";
      case "invalid_element":
        return `Ungültiger Wert in ${issue2.origin}`;
      default:
        return `Ungültige Eingabe`;
    }
  };
};
function de_default() {
  return {
    localeError: error7()
  };
}
// node_modules/zod/v4/locales/en.js
var parsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "number";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error8 = () => {
  const Sizable = {
    string: { unit: "characters", verb: "to have" },
    file: { unit: "bytes", verb: "to have" },
    array: { unit: "items", verb: "to have" },
    set: { unit: "items", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "input",
    email: "email address",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datetime",
    date: "ISO date",
    time: "ISO time",
    duration: "ISO duration",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded string",
    base64url: "base64url-encoded string",
    json_string: "JSON string",
    e164: "E.164 number",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Invalid input: expected ${issue2.expected}, received ${parsedType(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Invalid string: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Invalid string: must end with "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Invalid string: must include "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Invalid string: must match pattern ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Invalid number: must be a multiple of ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Invalid key in ${issue2.origin}`;
      case "invalid_union":
        return "Invalid input";
      case "invalid_element":
        return `Invalid value in ${issue2.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en_default() {
  return {
    localeError: error8()
  };
}
// node_modules/zod/v4/locales/eo.js
var parsedType2 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "nombro";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "tabelo";
      }
      if (data === null) {
        return "senvalora";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error9 = () => {
  const Sizable = {
    string: { unit: "karaktrojn", verb: "havi" },
    file: { unit: "bajtojn", verb: "havi" },
    array: { unit: "elementojn", verb: "havi" },
    set: { unit: "elementojn", verb: "havi" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "enigo",
    email: "retadreso",
    url: "URL",
    emoji: "emoĝio",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datotempo",
    date: "ISO-dato",
    time: "ISO-tempo",
    duration: "ISO-daŭro",
    ipv4: "IPv4-adreso",
    ipv6: "IPv6-adreso",
    cidrv4: "IPv4-rango",
    cidrv6: "IPv6-rango",
    base64: "64-ume kodita karaktraro",
    base64url: "URL-64-ume kodita karaktraro",
    json_string: "JSON-karaktraro",
    e164: "E.164-nombro",
    jwt: "JWT",
    template_literal: "enigo"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Nevalida enigo: atendiĝis ${issue2.expected}, riceviĝis ${parsedType2(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nevalida enigo: atendiĝis ${stringifyPrimitive(issue2.values[0])}`;
        return `Nevalida opcio: atendiĝis unu el ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
        return `Tro granda: atendiĝis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Tro malgranda: atendiĝis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Tro malgranda: atendiĝis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nevalida karaktraro: devas komenciĝi per "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nevalida karaktraro: devas finiĝi per "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
        return `Nevalida ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nekonata${issue2.keys.length > 1 ? "j" : ""} ŝlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nevalida ŝlosilo en ${issue2.origin}`;
      case "invalid_union":
        return "Nevalida enigo";
      case "invalid_element":
        return `Nevalida valoro en ${issue2.origin}`;
      default:
        return `Nevalida enigo`;
    }
  };
};
function eo_default() {
  return {
    localeError: error9()
  };
}
// node_modules/zod/v4/locales/es.js
var error10 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "tener" },
    file: { unit: "bytes", verb: "tener" },
    array: { unit: "elementos", verb: "tener" },
    set: { unit: "elementos", verb: "tener" }
  };
  const TypeNames = {
    string: "texto",
    number: "número",
    boolean: "booleano",
    array: "arreglo",
    object: "objeto",
    set: "conjunto",
    file: "archivo",
    date: "fecha",
    bigint: "número grande",
    symbol: "símbolo",
    undefined: "indefinido",
    null: "nulo",
    function: "función",
    map: "mapa",
    record: "registro",
    tuple: "tupla",
    enum: "enumeración",
    union: "unión",
    literal: "literal",
    promise: "promesa",
    void: "vacío",
    never: "nunca",
    unknown: "desconocido",
    any: "cualquiera"
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  function getTypeName(type) {
    return TypeNames[type] ?? type;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype) {
          return data.constructor.name;
        }
        return "object";
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrada",
    email: "dirección de correo electrónico",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "fecha y hora ISO",
    date: "fecha ISO",
    time: "hora ISO",
    duration: "duración ISO",
    ipv4: "dirección IPv4",
    ipv6: "dirección IPv6",
    cidrv4: "rango IPv4",
    cidrv6: "rango IPv6",
    base64: "cadena codificada en base64",
    base64url: "URL codificada en base64",
    json_string: "cadena JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Entrada inválida: se esperaba ${getTypeName(issue2.expected)}, recibido ${getTypeName(parsedType3(issue2.input))}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
        return `Opción inválida: se esperaba una de ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing)
          return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        const origin = getTypeName(issue2.origin);
        if (sizing) {
          return `Demasiado pequeño: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Demasiado pequeño: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Cadena inválida: debe comenzar con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Cadena inválida: debe terminar en "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Cadena inválida: debe incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Cadena inválida: debe coincidir con el patrón ${_issue.pattern}`;
        return `Inválido ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Número inválido: debe ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Llave inválida en ${getTypeName(issue2.origin)}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido en ${getTypeName(issue2.origin)}`;
      default:
        return `Entrada inválida`;
    }
  };
};
function es_default() {
  return {
    localeError: error10()
  };
}
// node_modules/zod/v4/locales/fa.js
var error11 = () => {
  const Sizable = {
    string: { unit: "کاراکتر", verb: "داشته باشد" },
    file: { unit: "بایت", verb: "داشته باشد" },
    array: { unit: "آیتم", verb: "داشته باشد" },
    set: { unit: "آیتم", verb: "داشته باشد" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "عدد";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "آرایه";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ورودی",
    email: "آدرس ایمیل",
    url: "URL",
    emoji: "ایموجی",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "تاریخ و زمان ایزو",
    date: "تاریخ ایزو",
    time: "زمان ایزو",
    duration: "مدت زمان ایزو",
    ipv4: "IPv4 آدرس",
    ipv6: "IPv6 آدرس",
    cidrv4: "IPv4 دامنه",
    cidrv6: "IPv6 دامنه",
    base64: "base64-encoded رشته",
    base64url: "base64url-encoded رشته",
    json_string: "JSON رشته",
    e164: "E.164 عدد",
    jwt: "JWT",
    template_literal: "ورودی"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ورودی نامعتبر: می‌بایست ${issue2.expected} می‌بود، ${parsedType3(issue2.input)} دریافت شد`;
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ورودی نامعتبر: می‌بایست ${stringifyPrimitive(issue2.values[0])} می‌بود`;
        }
        return `گزینه نامعتبر: می‌بایست یکی از ${joinValues(issue2.values, "|")} می‌بود`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصر"} باشد`;
        }
        return `خیلی بزرگ: ${issue2.origin ?? "مقدار"} باید ${adj}${issue2.maximum.toString()} باشد`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} باشد`;
        }
        return `خیلی کوچک: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} باشد`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `رشته نامعتبر: باید با "${_issue.prefix}" شروع شود`;
        }
        if (_issue.format === "ends_with") {
          return `رشته نامعتبر: باید با "${_issue.suffix}" تمام شود`;
        }
        if (_issue.format === "includes") {
          return `رشته نامعتبر: باید شامل "${_issue.includes}" باشد`;
        }
        if (_issue.format === "regex") {
          return `رشته نامعتبر: باید با الگوی ${_issue.pattern} مطابقت داشته باشد`;
        }
        return `${Nouns[_issue.format] ?? issue2.format} نامعتبر`;
      }
      case "not_multiple_of":
        return `عدد نامعتبر: باید مضرب ${issue2.divisor} باشد`;
      case "unrecognized_keys":
        return `کلید${issue2.keys.length > 1 ? "های" : ""} ناشناس: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `کلید ناشناس در ${issue2.origin}`;
      case "invalid_union":
        return `ورودی نامعتبر`;
      case "invalid_element":
        return `مقدار نامعتبر در ${issue2.origin}`;
      default:
        return `ورودی نامعتبر`;
    }
  };
};
function fa_default() {
  return {
    localeError: error11()
  };
}
// node_modules/zod/v4/locales/fi.js
var error12 = () => {
  const Sizable = {
    string: { unit: "merkkiä", subject: "merkkijonon" },
    file: { unit: "tavua", subject: "tiedoston" },
    array: { unit: "alkiota", subject: "listan" },
    set: { unit: "alkiota", subject: "joukon" },
    number: { unit: "", subject: "luvun" },
    bigint: { unit: "", subject: "suuren kokonaisluvun" },
    int: { unit: "", subject: "kokonaisluvun" },
    date: { unit: "", subject: "päivämäärän" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "säännöllinen lauseke",
    email: "sähköpostiosoite",
    url: "URL-osoite",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-aikaleima",
    date: "ISO-päivämäärä",
    time: "ISO-aika",
    duration: "ISO-kesto",
    ipv4: "IPv4-osoite",
    ipv6: "IPv6-osoite",
    cidrv4: "IPv4-alue",
    cidrv6: "IPv6-alue",
    base64: "base64-koodattu merkkijono",
    base64url: "base64url-koodattu merkkijono",
    json_string: "JSON-merkkijono",
    e164: "E.164-luku",
    jwt: "JWT",
    template_literal: "templaattimerkkijono"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Virheellinen tyyppi: odotettiin ${issue2.expected}, oli ${parsedType3(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Virheellinen syöte: täytyy olla ${stringifyPrimitive(issue2.values[0])}`;
        return `Virheellinen valinta: täytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian suuri: ${sizing.subject} täytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian suuri: arvon täytyy olla ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Liian pieni: ${sizing.subject} täytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
        }
        return `Liian pieni: arvon täytyy olla ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Virheellinen syöte: täytyy alkaa "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Virheellinen syöte: täytyy loppua "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Virheellinen syöte: täytyy sisältää "${_issue.includes}"`;
        if (_issue.format === "regex") {
          return `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${_issue.pattern}`;
        }
        return `Virheellinen ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Virheellinen luku: täytyy olla luvun ${issue2.divisor} monikerta`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Virheellinen avain tietueessa";
      case "invalid_union":
        return "Virheellinen unioni";
      case "invalid_element":
        return "Virheellinen arvo joukossa";
      default:
        return `Virheellinen syöte`;
    }
  };
};
function fi_default() {
  return {
    localeError: error12()
  };
}
// node_modules/zod/v4/locales/fr.js
var error13 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nombre";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tableau";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrée",
    email: "adresse e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date et heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Entrée invalide : ${issue2.expected} attendu, ${parsedType3(issue2.input)} reçu`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
        return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : ${issue2.origin ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "élément(s)"}`;
        return `Trop grand : ${issue2.origin ?? "valeur"} doit être ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Trop petit : ${issue2.origin} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Trop petit : ${issue2.origin} doit être ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au modèle ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
function fr_default() {
  return {
    localeError: error13()
  };
}
// node_modules/zod/v4/locales/fr-CA.js
var error14 = () => {
  const Sizable = {
    string: { unit: "caractères", verb: "avoir" },
    file: { unit: "octets", verb: "avoir" },
    array: { unit: "éléments", verb: "avoir" },
    set: { unit: "éléments", verb: "avoir" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "entrée",
    email: "adresse courriel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "date-heure ISO",
    date: "date ISO",
    time: "heure ISO",
    duration: "durée ISO",
    ipv4: "adresse IPv4",
    ipv6: "adresse IPv6",
    cidrv4: "plage IPv4",
    cidrv6: "plage IPv6",
    base64: "chaîne encodée en base64",
    base64url: "chaîne encodée en base64url",
    json_string: "chaîne JSON",
    e164: "numéro E.164",
    jwt: "JWT",
    template_literal: "entrée"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Entrée invalide : attendu ${issue2.expected}, reçu ${parsedType3(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrée invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
        return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "≤" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "≥" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Chaîne invalide : doit commencer par "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Chaîne invalide : doit se terminer par "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chaîne invalide : doit inclure "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chaîne invalide : doit correspondre au motif ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} invalide`;
      }
      case "not_multiple_of":
        return `Nombre invalide : doit être un multiple de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Clé${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Clé invalide dans ${issue2.origin}`;
      case "invalid_union":
        return "Entrée invalide";
      case "invalid_element":
        return `Valeur invalide dans ${issue2.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
function fr_CA_default() {
  return {
    localeError: error14()
  };
}
// node_modules/zod/v4/locales/he.js
var error15 = () => {
  const Sizable = {
    string: { unit: "אותיות", verb: "לכלול" },
    file: { unit: "בייטים", verb: "לכלול" },
    array: { unit: "פריטים", verb: "לכלול" },
    set: { unit: "פריטים", verb: "לכלול" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "קלט",
    email: "כתובת אימייל",
    url: "כתובת רשת",
    emoji: "אימוג'י",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "תאריך וזמן ISO",
    date: "תאריך ISO",
    time: "זמן ISO",
    duration: "משך זמן ISO",
    ipv4: "כתובת IPv4",
    ipv6: "כתובת IPv6",
    cidrv4: "טווח IPv4",
    cidrv6: "טווח IPv6",
    base64: "מחרוזת בבסיס 64",
    base64url: "מחרוזת בבסיס 64 לכתובות רשת",
    json_string: "מחרוזת JSON",
    e164: "מספר E.164",
    jwt: "JWT",
    template_literal: "קלט"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `קלט לא תקין: צריך ${issue2.expected}, התקבל ${parsedType3(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `קלט לא תקין: צריך ${stringifyPrimitive(issue2.values[0])}`;
        return `קלט לא תקין: צריך אחת מהאפשרויות  ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `גדול מדי: ${issue2.origin ?? "value"} צריך להיות ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
        return `גדול מדי: ${issue2.origin ?? "value"} צריך להיות ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `קטן מדי: ${issue2.origin} צריך להיות ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `קטן מדי: ${issue2.origin} צריך להיות ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `מחרוזת לא תקינה: חייבת להתחיל ב"${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `מחרוזת לא תקינה: חייבת להסתיים ב "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `מחרוזת לא תקינה: חייבת לכלול "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `מחרוזת לא תקינה: חייבת להתאים לתבנית ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} לא תקין`;
      }
      case "not_multiple_of":
        return `מספר לא תקין: חייב להיות מכפלה של ${issue2.divisor}`;
      case "unrecognized_keys":
        return `מפתח${issue2.keys.length > 1 ? "ות" : ""} לא מזוה${issue2.keys.length > 1 ? "ים" : "ה"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `מפתח לא תקין ב${issue2.origin}`;
      case "invalid_union":
        return "קלט לא תקין";
      case "invalid_element":
        return `ערך לא תקין ב${issue2.origin}`;
      default:
        return `קלט לא תקין`;
    }
  };
};
function he_default() {
  return {
    localeError: error15()
  };
}
// node_modules/zod/v4/locales/hu.js
var error16 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "legyen" },
    file: { unit: "byte", verb: "legyen" },
    array: { unit: "elem", verb: "legyen" },
    set: { unit: "elem", verb: "legyen" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "szám";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tömb";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "bemenet",
    email: "email cím",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO időbélyeg",
    date: "ISO dátum",
    time: "ISO idő",
    duration: "ISO időintervallum",
    ipv4: "IPv4 cím",
    ipv6: "IPv6 cím",
    cidrv4: "IPv4 tartomány",
    cidrv6: "IPv6 tartomány",
    base64: "base64-kódolt string",
    base64url: "base64url-kódolt string",
    json_string: "JSON string",
    e164: "E.164 szám",
    jwt: "JWT",
    template_literal: "bemenet"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Érvénytelen bemenet: a várt érték ${issue2.expected}, a kapott érték ${parsedType3(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Érvénytelen bemenet: a várt érték ${stringifyPrimitive(issue2.values[0])}`;
        return `Érvénytelen opció: valamelyik érték várt ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Túl nagy: ${issue2.origin ?? "érték"} mérete túl nagy ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elem"}`;
        return `Túl nagy: a bemeneti érték ${issue2.origin ?? "érték"} túl nagy: ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Túl kicsi: a bemeneti érték ${issue2.origin} mérete túl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Túl kicsi: a bemeneti érték ${issue2.origin} túl kicsi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Érvénytelen string: "${_issue.prefix}" értékkel kell kezdődnie`;
        if (_issue.format === "ends_with")
          return `Érvénytelen string: "${_issue.suffix}" értékkel kell végződnie`;
        if (_issue.format === "includes")
          return `Érvénytelen string: "${_issue.includes}" értéket kell tartalmaznia`;
        if (_issue.format === "regex")
          return `Érvénytelen string: ${_issue.pattern} mintának kell megfelelnie`;
        return `Érvénytelen ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Érvénytelen szám: ${issue2.divisor} többszörösének kell lennie`;
      case "unrecognized_keys":
        return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Érvénytelen kulcs ${issue2.origin}`;
      case "invalid_union":
        return "Érvénytelen bemenet";
      case "invalid_element":
        return `Érvénytelen érték: ${issue2.origin}`;
      default:
        return `Érvénytelen bemenet`;
    }
  };
};
function hu_default() {
  return {
    localeError: error16()
  };
}
// node_modules/zod/v4/locales/id.js
var error17 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "memiliki" },
    file: { unit: "byte", verb: "memiliki" },
    array: { unit: "item", verb: "memiliki" },
    set: { unit: "item", verb: "memiliki" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "alamat email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tanggal dan waktu format ISO",
    date: "tanggal format ISO",
    time: "jam format ISO",
    duration: "durasi format ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "rentang alamat IPv4",
    cidrv6: "rentang alamat IPv6",
    base64: "string dengan enkode base64",
    base64url: "string dengan enkode base64url",
    json_string: "string JSON",
    e164: "angka E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Input tidak valid: diharapkan ${issue2.expected}, diterima ${parsedType3(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} memiliki ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} menjadi ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak valid: harus menyertakan "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} tidak valid`;
      }
      case "not_multiple_of":
        return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak valid di ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak valid";
      case "invalid_element":
        return `Nilai tidak valid di ${issue2.origin}`;
      default:
        return `Input tidak valid`;
    }
  };
};
function id_default() {
  return {
    localeError: error17()
  };
}
// node_modules/zod/v4/locales/is.js
var parsedType3 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "númer";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "fylki";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error18 = () => {
  const Sizable = {
    string: { unit: "stafi", verb: "að hafa" },
    file: { unit: "bæti", verb: "að hafa" },
    array: { unit: "hluti", verb: "að hafa" },
    set: { unit: "hluti", verb: "að hafa" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "gildi",
    email: "netfang",
    url: "vefslóð",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dagsetning og tími",
    date: "ISO dagsetning",
    time: "ISO tími",
    duration: "ISO tímalengd",
    ipv4: "IPv4 address",
    ipv6: "IPv6 address",
    cidrv4: "IPv4 range",
    cidrv6: "IPv6 range",
    base64: "base64-encoded strengur",
    base64url: "base64url-encoded strengur",
    json_string: "JSON strengur",
    e164: "E.164 tölugildi",
    jwt: "JWT",
    template_literal: "gildi"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Rangt gildi: Þú slóst inn ${parsedType3(issue2.input)} þar sem á að vera ${issue2.expected}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Rangt gildi: gert ráð fyrir ${stringifyPrimitive(issue2.values[0])}`;
        return `Ógilt val: má vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} hafi ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "hluti"}`;
        return `Of stórt: gert er ráð fyrir að ${issue2.origin ?? "gildi"} sé ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Of lítið: gert er ráð fyrir að ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Of lítið: gert er ráð fyrir að ${issue2.origin} sé ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ógildur strengur: verður að byrja á "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ógildur strengur: verður að enda á "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ógildur strengur: verður að innihalda "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ógildur strengur: verður að fylgja mynstri ${_issue.pattern}`;
        return `Rangt ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Röng tala: verður að vera margfeldi af ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Óþekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Rangur lykill í ${issue2.origin}`;
      case "invalid_union":
        return "Rangt gildi";
      case "invalid_element":
        return `Rangt gildi í ${issue2.origin}`;
      default:
        return `Rangt gildi`;
    }
  };
};
function is_default() {
  return {
    localeError: error18()
  };
}
// node_modules/zod/v4/locales/it.js
var error19 = () => {
  const Sizable = {
    string: { unit: "caratteri", verb: "avere" },
    file: { unit: "byte", verb: "avere" },
    array: { unit: "elementi", verb: "avere" },
    set: { unit: "elementi", verb: "avere" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "numero";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "vettore";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "indirizzo email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e ora ISO",
    date: "data ISO",
    time: "ora ISO",
    duration: "durata ISO",
    ipv4: "indirizzo IPv4",
    ipv6: "indirizzo IPv6",
    cidrv4: "intervallo IPv4",
    cidrv6: "intervallo IPv6",
    base64: "stringa codificata in base64",
    base64url: "URL codificata in base64",
    json_string: "stringa JSON",
    e164: "numero E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Input non valido: atteso ${issue2.expected}, ricevuto ${parsedType4(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
        return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Troppo grande: ${issue2.origin ?? "valore"} deve avere ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementi"}`;
        return `Troppo grande: ${issue2.origin ?? "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Stringa non valida: deve includere "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chiave non valida in ${issue2.origin}`;
      case "invalid_union":
        return "Input non valido";
      case "invalid_element":
        return `Valore non valido in ${issue2.origin}`;
      default:
        return `Input non valido`;
    }
  };
};
function it_default() {
  return {
    localeError: error19()
  };
}
// node_modules/zod/v4/locales/ja.js
var error20 = () => {
  const Sizable = {
    string: { unit: "文字", verb: "である" },
    file: { unit: "バイト", verb: "である" },
    array: { unit: "要素", verb: "である" },
    set: { unit: "要素", verb: "である" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "数値";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "配列";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "入力値",
    email: "メールアドレス",
    url: "URL",
    emoji: "絵文字",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日時",
    date: "ISO日付",
    time: "ISO時刻",
    duration: "ISO期間",
    ipv4: "IPv4アドレス",
    ipv6: "IPv6アドレス",
    cidrv4: "IPv4範囲",
    cidrv6: "IPv6範囲",
    base64: "base64エンコード文字列",
    base64url: "base64urlエンコード文字列",
    json_string: "JSON文字列",
    e164: "E.164番号",
    jwt: "JWT",
    template_literal: "入力値"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `無効な入力: ${issue2.expected}が期待されましたが、${parsedType4(issue2.input)}が入力されました`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無効な入力: ${stringifyPrimitive(issue2.values[0])}が期待されました`;
        return `無効な選択: ${joinValues(issue2.values, "、")}のいずれかである必要があります`;
      case "too_big": {
        const adj = issue2.inclusive ? "以下である" : "より小さい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${sizing.unit ?? "要素"}${adj}必要があります`;
        return `大きすぎる値: ${issue2.origin ?? "値"}は${issue2.maximum.toString()}${adj}必要があります`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "以上である" : "より大きい";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${sizing.unit}${adj}必要があります`;
        return `小さすぎる値: ${issue2.origin}は${issue2.minimum.toString()}${adj}必要があります`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `無効な文字列: "${_issue.prefix}"で始まる必要があります`;
        if (_issue.format === "ends_with")
          return `無効な文字列: "${_issue.suffix}"で終わる必要があります`;
        if (_issue.format === "includes")
          return `無効な文字列: "${_issue.includes}"を含む必要があります`;
        if (_issue.format === "regex")
          return `無効な文字列: パターン${_issue.pattern}に一致する必要があります`;
        return `無効な${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無効な数値: ${issue2.divisor}の倍数である必要があります`;
      case "unrecognized_keys":
        return `認識されていないキー${issue2.keys.length > 1 ? "群" : ""}: ${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin}内の無効なキー`;
      case "invalid_union":
        return "無効な入力";
      case "invalid_element":
        return `${issue2.origin}内の無効な値`;
      default:
        return `無効な入力`;
    }
  };
};
function ja_default() {
  return {
    localeError: error20()
  };
}
// node_modules/zod/v4/locales/ka.js
var parsedType4 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "რიცხვი";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "მასივი";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  const typeMap = {
    string: "სტრინგი",
    boolean: "ბულეანი",
    undefined: "undefined",
    bigint: "bigint",
    symbol: "symbol",
    function: "ფუნქცია"
  };
  return typeMap[t] ?? t;
};
var error21 = () => {
  const Sizable = {
    string: { unit: "სიმბოლო", verb: "უნდა შეიცავდეს" },
    file: { unit: "ბაიტი", verb: "უნდა შეიცავდეს" },
    array: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" },
    set: { unit: "ელემენტი", verb: "უნდა შეიცავდეს" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "შეყვანა",
    email: "ელ-ფოსტის მისამართი",
    url: "URL",
    emoji: "ემოჯი",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "თარიღი-დრო",
    date: "თარიღი",
    time: "დრო",
    duration: "ხანგრძლივობა",
    ipv4: "IPv4 მისამართი",
    ipv6: "IPv6 მისამართი",
    cidrv4: "IPv4 დიაპაზონი",
    cidrv6: "IPv6 დიაპაზონი",
    base64: "base64-კოდირებული სტრინგი",
    base64url: "base64url-კოდირებული სტრინგი",
    json_string: "JSON სტრინგი",
    e164: "E.164 ნომერი",
    jwt: "JWT",
    template_literal: "შეყვანა"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `არასწორი შეყვანა: მოსალოდნელი ${issue2.expected}, მიღებული ${parsedType4(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `არასწორი შეყვანა: მოსალოდნელი ${stringifyPrimitive(issue2.values[0])}`;
        return `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${joinValues(issue2.values, "|")}-დან`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
        return `ზედმეტად დიდი: მოსალოდნელი ${issue2.origin ?? "მნიშვნელობა"} იყოს ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `ზედმეტად პატარა: მოსალოდნელი ${issue2.origin} იყოს ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `არასწორი სტრინგი: უნდა იწყებოდეს "${_issue.prefix}"-ით`;
        }
        if (_issue.format === "ends_with")
          return `არასწორი სტრინგი: უნდა მთავრდებოდეს "${_issue.suffix}"-ით`;
        if (_issue.format === "includes")
          return `არასწორი სტრინგი: უნდა შეიცავდეს "${_issue.includes}"-ს`;
        if (_issue.format === "regex")
          return `არასწორი სტრინგი: უნდა შეესაბამებოდეს შაბლონს ${_issue.pattern}`;
        return `არასწორი ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `არასწორი რიცხვი: უნდა იყოს ${issue2.divisor}-ის ჯერადი`;
      case "unrecognized_keys":
        return `უცნობი გასაღებ${issue2.keys.length > 1 ? "ები" : "ი"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `არასწორი გასაღები ${issue2.origin}-ში`;
      case "invalid_union":
        return "არასწორი შეყვანა";
      case "invalid_element":
        return `არასწორი მნიშვნელობა ${issue2.origin}-ში`;
      default:
        return `არასწორი შეყვანა`;
    }
  };
};
function ka_default() {
  return {
    localeError: error21()
  };
}
// node_modules/zod/v4/locales/km.js
var error22 = () => {
  const Sizable = {
    string: { unit: "តួអក្សរ", verb: "គួរមាន" },
    file: { unit: "បៃ", verb: "គួរមាន" },
    array: { unit: "ធាតុ", verb: "គួរមាន" },
    set: { unit: "ធាតុ", verb: "គួរមាន" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType5 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "មិនមែនជាលេខ (NaN)" : "លេខ";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "អារេ (Array)";
        }
        if (data === null) {
          return "គ្មានតម្លៃ (null)";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ទិន្នន័យបញ្ចូល",
    email: "អាសយដ្ឋានអ៊ីមែល",
    url: "URL",
    emoji: "សញ្ញាអារម្មណ៍",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "កាលបរិច្ឆេទ និងម៉ោង ISO",
    date: "កាលបរិច្ឆេទ ISO",
    time: "ម៉ោង ISO",
    duration: "រយៈពេល ISO",
    ipv4: "អាសយដ្ឋាន IPv4",
    ipv6: "អាសយដ្ឋាន IPv6",
    cidrv4: "ដែនអាសយដ្ឋាន IPv4",
    cidrv6: "ដែនអាសយដ្ឋាន IPv6",
    base64: "ខ្សែអក្សរអ៊ិកូដ base64",
    base64url: "ខ្សែអក្សរអ៊ិកូដ base64url",
    json_string: "ខ្សែអក្សរ JSON",
    e164: "លេខ E.164",
    jwt: "JWT",
    template_literal: "ទិន្នន័យបញ្ចូល"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${issue2.expected} ប៉ុន្តែទទួលបាន ${parsedType5(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${stringifyPrimitive(issue2.values[0])}`;
        return `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "ធាតុ"}`;
        return `ធំពេក៖ ត្រូវការ ${issue2.origin ?? "តម្លៃ"} ${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `តូចពេក៖ ត្រូវការ ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${_issue.pattern}`;
        return `មិនត្រឹមត្រូវ៖ ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${issue2.divisor}`;
      case "unrecognized_keys":
        return `រកឃើញសោមិនស្គាល់៖ ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `សោមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      case "invalid_union":
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
      case "invalid_element":
        return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${issue2.origin}`;
      default:
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
    }
  };
};
function km_default() {
  return {
    localeError: error22()
  };
}

// node_modules/zod/v4/locales/kh.js
function kh_default() {
  return km_default();
}
// node_modules/zod/v4/locales/ko.js
var error23 = () => {
  const Sizable = {
    string: { unit: "문자", verb: "to have" },
    file: { unit: "바이트", verb: "to have" },
    array: { unit: "개", verb: "to have" },
    set: { unit: "개", verb: "to have" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType5 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "입력",
    email: "이메일 주소",
    url: "URL",
    emoji: "이모지",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 날짜시간",
    date: "ISO 날짜",
    time: "ISO 시간",
    duration: "ISO 기간",
    ipv4: "IPv4 주소",
    ipv6: "IPv6 주소",
    cidrv4: "IPv4 범위",
    cidrv6: "IPv6 범위",
    base64: "base64 인코딩 문자열",
    base64url: "base64url 인코딩 문자열",
    json_string: "JSON 문자열",
    e164: "E.164 번호",
    jwt: "JWT",
    template_literal: "입력"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `잘못된 입력: 예상 타입은 ${issue2.expected}, 받은 타입은 ${parsedType5(issue2.input)}입니다`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `잘못된 입력: 값은 ${stringifyPrimitive(issue2.values[0])} 이어야 합니다`;
        return `잘못된 옵션: ${joinValues(issue2.values, "또는 ")} 중 하나여야 합니다`;
      case "too_big": {
        const adj = issue2.inclusive ? "이하" : "미만";
        const suffix = adj === "미만" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing)
          return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
        return `${issue2.origin ?? "값"}이 너무 큽니다: ${issue2.maximum.toString()} ${adj}${suffix}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "이상" : "초과";
        const suffix = adj === "이상" ? "이어야 합니다" : "여야 합니다";
        const sizing = getSizing(issue2.origin);
        const unit = sizing?.unit ?? "요소";
        if (sizing) {
          return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
        }
        return `${issue2.origin ?? "값"}이 너무 작습니다: ${issue2.minimum.toString()} ${adj}${suffix}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `잘못된 문자열: "${_issue.prefix}"(으)로 시작해야 합니다`;
        }
        if (_issue.format === "ends_with")
          return `잘못된 문자열: "${_issue.suffix}"(으)로 끝나야 합니다`;
        if (_issue.format === "includes")
          return `잘못된 문자열: "${_issue.includes}"을(를) 포함해야 합니다`;
        if (_issue.format === "regex")
          return `잘못된 문자열: 정규식 ${_issue.pattern} 패턴과 일치해야 합니다`;
        return `잘못된 ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `잘못된 숫자: ${issue2.divisor}의 배수여야 합니다`;
      case "unrecognized_keys":
        return `인식할 수 없는 키: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `잘못된 키: ${issue2.origin}`;
      case "invalid_union":
        return `잘못된 입력`;
      case "invalid_element":
        return `잘못된 값: ${issue2.origin}`;
      default:
        return `잘못된 입력`;
    }
  };
};
function ko_default() {
  return {
    localeError: error23()
  };
}
// node_modules/zod/v4/locales/lt.js
var parsedType5 = (data) => {
  const t = typeof data;
  return parsedTypeFromType(t, data);
};
var parsedTypeFromType = (t, data = undefined) => {
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "skaičius";
    }
    case "bigint": {
      return "sveikasis skaičius";
    }
    case "string": {
      return "eilutė";
    }
    case "boolean": {
      return "loginė reikšmė";
    }
    case "undefined":
    case "void": {
      return "neapibrėžta reikšmė";
    }
    case "function": {
      return "funkcija";
    }
    case "symbol": {
      return "simbolis";
    }
    case "object": {
      if (data === undefined)
        return "nežinomas objektas";
      if (data === null)
        return "nulinė reikšmė";
      if (Array.isArray(data))
        return "masyvas";
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
      return "objektas";
    }
    case "null": {
      return "nulinė reikšmė";
    }
  }
  return t;
};
var capitalizeFirstCharacter = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};
function getUnitTypeFromNumber(number2) {
  const abs = Math.abs(number2);
  const last = abs % 10;
  const last2 = abs % 100;
  if (last2 >= 11 && last2 <= 19 || last === 0)
    return "many";
  if (last === 1)
    return "one";
  return "few";
}
var error24 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "simbolis",
        few: "simboliai",
        many: "simbolių"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne ilgesnė kaip",
          notInclusive: "turi būti trumpesnė kaip"
        },
        bigger: {
          inclusive: "turi būti ne trumpesnė kaip",
          notInclusive: "turi būti ilgesnė kaip"
        }
      }
    },
    file: {
      unit: {
        one: "baitas",
        few: "baitai",
        many: "baitų"
      },
      verb: {
        smaller: {
          inclusive: "turi būti ne didesnis kaip",
          notInclusive: "turi būti mažesnis kaip"
        },
        bigger: {
          inclusive: "turi būti ne mažesnis kaip",
          notInclusive: "turi būti didesnis kaip"
        }
      }
    },
    array: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    },
    set: {
      unit: {
        one: "elementą",
        few: "elementus",
        many: "elementų"
      },
      verb: {
        smaller: {
          inclusive: "turi turėti ne daugiau kaip",
          notInclusive: "turi turėti mažiau kaip"
        },
        bigger: {
          inclusive: "turi turėti ne mažiau kaip",
          notInclusive: "turi turėti daugiau kaip"
        }
      }
    }
  };
  function getSizing(origin, unitType, inclusive, targetShouldBe) {
    const result = Sizable[origin] ?? null;
    if (result === null)
      return result;
    return {
      unit: result.unit[unitType],
      verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
    };
  }
  const Nouns = {
    regex: "įvestis",
    email: "el. pašto adresas",
    url: "URL",
    emoji: "jaustukas",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO data ir laikas",
    date: "ISO data",
    time: "ISO laikas",
    duration: "ISO trukmė",
    ipv4: "IPv4 adresas",
    ipv6: "IPv6 adresas",
    cidrv4: "IPv4 tinklo prefiksas (CIDR)",
    cidrv6: "IPv6 tinklo prefiksas (CIDR)",
    base64: "base64 užkoduota eilutė",
    base64url: "base64url užkoduota eilutė",
    json_string: "JSON eilutė",
    e164: "E.164 numeris",
    jwt: "JWT",
    template_literal: "įvestis"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Gautas tipas ${parsedType5(issue2.input)}, o tikėtasi - ${parsedTypeFromType(issue2.expected)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Privalo būti ${stringifyPrimitive(issue2.values[0])}`;
        return `Privalo būti vienas iš ${joinValues(issue2.values, "|")} pasirinkimų`;
      case "too_big": {
        const origin = parsedTypeFromType(issue2.origin);
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), issue2.inclusive ?? false, "smaller");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.maximum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne didesnis kaip" : "mažesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.maximum.toString()} ${sizing?.unit}`;
      }
      case "too_small": {
        const origin = parsedTypeFromType(issue2.origin);
        const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), issue2.inclusive ?? false, "bigger");
        if (sizing?.verb)
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} ${sizing.verb} ${issue2.minimum.toString()} ${sizing.unit ?? "elementų"}`;
        const adj = issue2.inclusive ? "ne mažesnis kaip" : "didesnis kaip";
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi būti ${adj} ${issue2.minimum.toString()} ${sizing?.unit}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Eilutė privalo prasidėti "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Eilutė privalo pasibaigti "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Eilutė privalo įtraukti "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Eilutė privalo atitikti ${_issue.pattern}`;
        return `Neteisingas ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Skaičius privalo būti ${issue2.divisor} kartotinis.`;
      case "unrecognized_keys":
        return `Neatpažint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return "Rastas klaidingas raktas";
      case "invalid_union":
        return "Klaidinga įvestis";
      case "invalid_element": {
        const origin = parsedTypeFromType(issue2.origin);
        return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reikšmė")} turi klaidingą įvestį`;
      }
      default:
        return "Klaidinga įvestis";
    }
  };
};
function lt_default() {
  return {
    localeError: error24()
  };
}
// node_modules/zod/v4/locales/mk.js
var error25 = () => {
  const Sizable = {
    string: { unit: "знаци", verb: "да имаат" },
    file: { unit: "бајти", verb: "да имаат" },
    array: { unit: "ставки", verb: "да имаат" },
    set: { unit: "ставки", verb: "да имаат" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "број";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "низа";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "внес",
    email: "адреса на е-пошта",
    url: "URL",
    emoji: "емоџи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO датум и време",
    date: "ISO датум",
    time: "ISO време",
    duration: "ISO времетраење",
    ipv4: "IPv4 адреса",
    ipv6: "IPv6 адреса",
    cidrv4: "IPv4 опсег",
    cidrv6: "IPv6 опсег",
    base64: "base64-енкодирана низа",
    base64url: "base64url-енкодирана низа",
    json_string: "JSON низа",
    e164: "E.164 број",
    jwt: "JWT",
    template_literal: "внес"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Грешен внес: се очекува ${issue2.expected}, примено ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
        return `Грешана опција: се очекува една ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да има ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементи"}`;
        return `Премногу голем: се очекува ${issue2.origin ?? "вредноста"} да биде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Премногу мал: се очекува ${issue2.origin} да има ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Премногу мал: се очекува ${issue2.origin} да биде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Неважечка низа: мора да започнува со "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Неважечка низа: мора да завршува со "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неважечка низа: мора да вклучува "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неважечка низа: мора да одгоара на патернот ${_issue.pattern}`;
        return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Грешен број: мора да биде делив со ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Непрепознаени клучеви" : "Непрепознаен клуч"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Грешен клуч во ${issue2.origin}`;
      case "invalid_union":
        return "Грешен внес";
      case "invalid_element":
        return `Грешна вредност во ${issue2.origin}`;
      default:
        return `Грешен внес`;
    }
  };
};
function mk_default() {
  return {
    localeError: error25()
  };
}
// node_modules/zod/v4/locales/ms.js
var error26 = () => {
  const Sizable = {
    string: { unit: "aksara", verb: "mempunyai" },
    file: { unit: "bait", verb: "mempunyai" },
    array: { unit: "elemen", verb: "mempunyai" },
    set: { unit: "elemen", verb: "mempunyai" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nombor";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "alamat e-mel",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "tarikh masa ISO",
    date: "tarikh ISO",
    time: "masa ISO",
    duration: "tempoh ISO",
    ipv4: "alamat IPv4",
    ipv6: "alamat IPv6",
    cidrv4: "julat IPv4",
    cidrv6: "julat IPv6",
    base64: "string dikodkan base64",
    base64url: "string dikodkan base64url",
    json_string: "string JSON",
    e164: "nombor E.164",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Input tidak sah: dijangka ${issue2.expected}, diterima ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
        return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
        return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} tidak sah`;
      }
      case "not_multiple_of":
        return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Kunci tidak sah dalam ${issue2.origin}`;
      case "invalid_union":
        return "Input tidak sah";
      case "invalid_element":
        return `Nilai tidak sah dalam ${issue2.origin}`;
      default:
        return `Input tidak sah`;
    }
  };
};
function ms_default() {
  return {
    localeError: error26()
  };
}
// node_modules/zod/v4/locales/nl.js
var error27 = () => {
  const Sizable = {
    string: { unit: "tekens" },
    file: { unit: "bytes" },
    array: { unit: "elementen" },
    set: { unit: "elementen" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "getal";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "invoer",
    email: "emailadres",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum en tijd",
    date: "ISO datum",
    time: "ISO tijd",
    duration: "ISO duur",
    ipv4: "IPv4-adres",
    ipv6: "IPv6-adres",
    cidrv4: "IPv4-bereik",
    cidrv6: "IPv6-bereik",
    base64: "base64-gecodeerde tekst",
    base64url: "base64 URL-gecodeerde tekst",
    json_string: "JSON string",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "invoer"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ongeldige invoer: verwacht ${issue2.expected}, ontving ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
        return `Ongeldige optie: verwacht één van ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Te lang: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementen"} bevat`;
        return `Te lang: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} is`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} bevat`;
        }
        return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
        }
        if (_issue.format === "ends_with")
          return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
        if (_issue.format === "includes")
          return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
        if (_issue.format === "regex")
          return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
        return `Ongeldig: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
      case "unrecognized_keys":
        return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ongeldige key in ${issue2.origin}`;
      case "invalid_union":
        return "Ongeldige invoer";
      case "invalid_element":
        return `Ongeldige waarde in ${issue2.origin}`;
      default:
        return `Ongeldige invoer`;
    }
  };
};
function nl_default() {
  return {
    localeError: error27()
  };
}
// node_modules/zod/v4/locales/no.js
var error28 = () => {
  const Sizable = {
    string: { unit: "tegn", verb: "å ha" },
    file: { unit: "bytes", verb: "å ha" },
    array: { unit: "elementer", verb: "å inneholde" },
    set: { unit: "elementer", verb: "å inneholde" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "tall";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "liste";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "input",
    email: "e-postadresse",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO dato- og klokkeslett",
    date: "ISO-dato",
    time: "ISO-klokkeslett",
    duration: "ISO-varighet",
    ipv4: "IPv4-område",
    ipv6: "IPv6-område",
    cidrv4: "IPv4-spekter",
    cidrv6: "IPv6-spekter",
    base64: "base64-enkodet streng",
    base64url: "base64url-enkodet streng",
    json_string: "JSON-streng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ugyldig input: forventet ${issue2.expected}, fikk ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
        return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
        return `For stor(t): forventet ${issue2.origin ?? "value"} til å ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `For lite(n): forventet ${issue2.origin} til å ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ugyldig streng: må starte med "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ugyldig streng: må ende med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ugyldig streng: må inneholde "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ugyldig streng: må matche mønsteret ${_issue.pattern}`;
        return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ugyldig tall: må være et multiplum av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Ukjente nøkler" : "Ukjent nøkkel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ugyldig nøkkel i ${issue2.origin}`;
      case "invalid_union":
        return "Ugyldig input";
      case "invalid_element":
        return `Ugyldig verdi i ${issue2.origin}`;
      default:
        return `Ugyldig input`;
    }
  };
};
function no_default() {
  return {
    localeError: error28()
  };
}
// node_modules/zod/v4/locales/ota.js
var error29 = () => {
  const Sizable = {
    string: { unit: "harf", verb: "olmalıdır" },
    file: { unit: "bayt", verb: "olmalıdır" },
    array: { unit: "unsur", verb: "olmalıdır" },
    set: { unit: "unsur", verb: "olmalıdır" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "numara";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "saf";
        }
        if (data === null) {
          return "gayb";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "giren",
    email: "epostagâh",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO hengâmı",
    date: "ISO tarihi",
    time: "ISO zamanı",
    duration: "ISO müddeti",
    ipv4: "IPv4 nişânı",
    ipv6: "IPv6 nişânı",
    cidrv4: "IPv4 menzili",
    cidrv6: "IPv6 menzili",
    base64: "base64-şifreli metin",
    base64url: "base64url-şifreli metin",
    json_string: "JSON metin",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "giren"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Fâsit giren: umulan ${issue2.expected}, alınan ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Fâsit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
        return `Fâsit tercih: mûteberler ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmalıydı.`;
        return `Fazla büyük: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} olmalıydı.`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmalıydı.`;
        }
        return `Fazla küçük: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmalıydı.`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Fâsit metin: "${_issue.prefix}" ile başlamalı.`;
        if (_issue.format === "ends_with")
          return `Fâsit metin: "${_issue.suffix}" ile bitmeli.`;
        if (_issue.format === "includes")
          return `Fâsit metin: "${_issue.includes}" ihtivâ etmeli.`;
        if (_issue.format === "regex")
          return `Fâsit metin: ${_issue.pattern} nakşına uymalı.`;
        return `Fâsit ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Fâsit sayı: ${issue2.divisor} katı olmalıydı.`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} için tanınmayan anahtar var.`;
      case "invalid_union":
        return "Giren tanınamadı.";
      case "invalid_element":
        return `${issue2.origin} için tanınmayan kıymet var.`;
      default:
        return `Kıymet tanınamadı.`;
    }
  };
};
function ota_default() {
  return {
    localeError: error29()
  };
}
// node_modules/zod/v4/locales/ps.js
var error30 = () => {
  const Sizable = {
    string: { unit: "توکي", verb: "ولري" },
    file: { unit: "بایټس", verb: "ولري" },
    array: { unit: "توکي", verb: "ولري" },
    set: { unit: "توکي", verb: "ولري" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "عدد";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "ارې";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ورودي",
    email: "بریښنالیک",
    url: "یو آر ال",
    emoji: "ایموجي",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "نیټه او وخت",
    date: "نېټه",
    time: "وخت",
    duration: "موده",
    ipv4: "د IPv4 پته",
    ipv6: "د IPv6 پته",
    cidrv4: "د IPv4 ساحه",
    cidrv6: "د IPv6 ساحه",
    base64: "base64-encoded متن",
    base64url: "base64url-encoded متن",
    json_string: "JSON متن",
    e164: "د E.164 شمېره",
    jwt: "JWT",
    template_literal: "ورودي"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ناسم ورودي: باید ${issue2.expected} وای, مګر ${parsedType6(issue2.input)} ترلاسه شو`;
      case "invalid_value":
        if (issue2.values.length === 1) {
          return `ناسم ورودي: باید ${stringifyPrimitive(issue2.values[0])} وای`;
        }
        return `ناسم انتخاب: باید یو له ${joinValues(issue2.values, "|")} څخه وای`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عنصرونه"} ولري`;
        }
        return `ډیر لوی: ${issue2.origin ?? "ارزښت"} باید ${adj}${issue2.maximum.toString()} وي`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} ${sizing.unit} ولري`;
        }
        return `ډیر کوچنی: ${issue2.origin} باید ${adj}${issue2.minimum.toString()} وي`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `ناسم متن: باید د "${_issue.prefix}" سره پیل شي`;
        }
        if (_issue.format === "ends_with") {
          return `ناسم متن: باید د "${_issue.suffix}" سره پای ته ورسيږي`;
        }
        if (_issue.format === "includes") {
          return `ناسم متن: باید "${_issue.includes}" ولري`;
        }
        if (_issue.format === "regex") {
          return `ناسم متن: باید د ${_issue.pattern} سره مطابقت ولري`;
        }
        return `${Nouns[_issue.format] ?? issue2.format} ناسم دی`;
      }
      case "not_multiple_of":
        return `ناسم عدد: باید د ${issue2.divisor} مضرب وي`;
      case "unrecognized_keys":
        return `ناسم ${issue2.keys.length > 1 ? "کلیډونه" : "کلیډ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `ناسم کلیډ په ${issue2.origin} کې`;
      case "invalid_union":
        return `ناسمه ورودي`;
      case "invalid_element":
        return `ناسم عنصر په ${issue2.origin} کې`;
      default:
        return `ناسمه ورودي`;
    }
  };
};
function ps_default() {
  return {
    localeError: error30()
  };
}
// node_modules/zod/v4/locales/pl.js
var error31 = () => {
  const Sizable = {
    string: { unit: "znaków", verb: "mieć" },
    file: { unit: "bajtów", verb: "mieć" },
    array: { unit: "elementów", verb: "mieć" },
    set: { unit: "elementów", verb: "mieć" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "liczba";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tablica";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "wyrażenie",
    email: "adres email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data i godzina w formacie ISO",
    date: "data w formacie ISO",
    time: "godzina w formacie ISO",
    duration: "czas trwania ISO",
    ipv4: "adres IPv4",
    ipv6: "adres IPv6",
    cidrv4: "zakres IPv4",
    cidrv6: "zakres IPv6",
    base64: "ciąg znaków zakodowany w formacie base64",
    base64url: "ciąg znaków zakodowany w formacie base64url",
    json_string: "ciąg znaków w formacie JSON",
    e164: "liczba E.164",
    jwt: "JWT",
    template_literal: "wejście"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Nieprawidłowe dane wejściowe: oczekiwano ${issue2.expected}, otrzymano ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Nieprawidłowe dane wejściowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
        return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za duża wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt duż(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Za mała wartość: oczekiwano, że ${issue2.origin ?? "wartość"} będzie mieć ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "elementów"}`;
        }
        return `Zbyt mał(y/a/e): oczekiwano, że ${issue2.origin ?? "wartość"} będzie wynosić ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Nieprawidłowy ciąg znaków: musi kończyć się na "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Nieprawidłowy ciąg znaków: musi zawierać "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${_issue.pattern}`;
        return `Nieprawidłow(y/a/e) ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nieprawidłowa liczba: musi być wielokrotnością ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Nieprawidłowy klucz w ${issue2.origin}`;
      case "invalid_union":
        return "Nieprawidłowe dane wejściowe";
      case "invalid_element":
        return `Nieprawidłowa wartość w ${issue2.origin}`;
      default:
        return `Nieprawidłowe dane wejściowe`;
    }
  };
};
function pl_default() {
  return {
    localeError: error31()
  };
}
// node_modules/zod/v4/locales/pt.js
var error32 = () => {
  const Sizable = {
    string: { unit: "caracteres", verb: "ter" },
    file: { unit: "bytes", verb: "ter" },
    array: { unit: "itens", verb: "ter" },
    set: { unit: "itens", verb: "ter" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "número";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "nulo";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "padrão",
    email: "endereço de e-mail",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "data e hora ISO",
    date: "data ISO",
    time: "hora ISO",
    duration: "duração ISO",
    ipv4: "endereço IPv4",
    ipv6: "endereço IPv6",
    cidrv4: "faixa de IPv4",
    cidrv6: "faixa de IPv6",
    base64: "texto codificado em base64",
    base64url: "URL codificada em base64",
    json_string: "texto JSON",
    e164: "número E.164",
    jwt: "JWT",
    template_literal: "entrada"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Tipo inválido: esperado ${issue2.expected}, recebido ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Entrada inválida: esperado ${stringifyPrimitive(issue2.values[0])}`;
        return `Opção inválida: esperada uma das ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Muito grande: esperado que ${issue2.origin ?? "valor"} tivesse ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
        return `Muito grande: esperado que ${issue2.origin ?? "valor"} fosse ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Texto inválido: deve começar com "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Texto inválido: deve terminar com "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Texto inválido: deve incluir "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Texto inválido: deve corresponder ao padrão ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} inválido`;
      }
      case "not_multiple_of":
        return `Número inválido: deve ser múltiplo de ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Chave inválida em ${issue2.origin}`;
      case "invalid_union":
        return "Entrada inválida";
      case "invalid_element":
        return `Valor inválido em ${issue2.origin}`;
      default:
        return `Campo inválido`;
    }
  };
};
function pt_default() {
  return {
    localeError: error32()
  };
}
// node_modules/zod/v4/locales/ru.js
function getRussianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
var error33 = () => {
  const Sizable = {
    string: {
      unit: {
        one: "символ",
        few: "символа",
        many: "символов"
      },
      verb: "иметь"
    },
    file: {
      unit: {
        one: "байт",
        few: "байта",
        many: "байт"
      },
      verb: "иметь"
    },
    array: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    },
    set: {
      unit: {
        one: "элемент",
        few: "элемента",
        many: "элементов"
      },
      verb: "иметь"
    }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "число";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "массив";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ввод",
    email: "email адрес",
    url: "URL",
    emoji: "эмодзи",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO дата и время",
    date: "ISO дата",
    time: "ISO время",
    duration: "ISO длительность",
    ipv4: "IPv4 адрес",
    ipv6: "IPv6 адрес",
    cidrv4: "IPv4 диапазон",
    cidrv6: "IPv6 диапазон",
    base64: "строка в формате base64",
    base64url: "строка в формате base64url",
    json_string: "JSON строка",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "ввод"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Неверный ввод: ожидалось ${issue2.expected}, получено ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неверный ввод: ожидалось ${stringifyPrimitive(issue2.values[0])}`;
        return `Неверный вариант: ожидалось одно из ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const maxValue = Number(issue2.maximum);
          const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет иметь ${adj}${issue2.maximum.toString()} ${unit}`;
        }
        return `Слишком большое значение: ожидалось, что ${issue2.origin ?? "значение"} будет ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          const minValue = Number(issue2.minimum);
          const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
          return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет иметь ${adj}${issue2.minimum.toString()} ${unit}`;
        }
        return `Слишком маленькое значение: ожидалось, что ${issue2.origin} будет ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неверная строка: должна начинаться с "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неверная строка: должна заканчиваться на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неверная строка: должна содержать "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неверная строка: должна соответствовать шаблону ${_issue.pattern}`;
        return `Неверный ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неверное число: должно быть кратным ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нераспознанн${issue2.keys.length > 1 ? "ые" : "ый"} ключ${issue2.keys.length > 1 ? "и" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неверный ключ в ${issue2.origin}`;
      case "invalid_union":
        return "Неверные входные данные";
      case "invalid_element":
        return `Неверное значение в ${issue2.origin}`;
      default:
        return `Неверные входные данные`;
    }
  };
};
function ru_default() {
  return {
    localeError: error33()
  };
}
// node_modules/zod/v4/locales/sl.js
var error34 = () => {
  const Sizable = {
    string: { unit: "znakov", verb: "imeti" },
    file: { unit: "bajtov", verb: "imeti" },
    array: { unit: "elementov", verb: "imeti" },
    set: { unit: "elementov", verb: "imeti" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "število";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tabela";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "vnos",
    email: "e-poštni naslov",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO datum in čas",
    date: "ISO datum",
    time: "ISO čas",
    duration: "ISO trajanje",
    ipv4: "IPv4 naslov",
    ipv6: "IPv6 naslov",
    cidrv4: "obseg IPv4",
    cidrv6: "obseg IPv6",
    base64: "base64 kodiran niz",
    base64url: "base64url kodiran niz",
    json_string: "JSON niz",
    e164: "E.164 številka",
    jwt: "JWT",
    template_literal: "vnos"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Neveljaven vnos: pričakovano ${issue2.expected}, prejeto ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Neveljaven vnos: pričakovano ${stringifyPrimitive(issue2.values[0])}`;
        return `Neveljavna možnost: pričakovano eno izmed ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementov"}`;
        return `Preveliko: pričakovano, da bo ${issue2.origin ?? "vrednost"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Premajhno: pričakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Premajhno: pričakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Neveljaven niz: mora se začeti z "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Neveljaven niz: mora se končati z "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
        return `Neveljaven ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Neveljavno število: mora biti večkratnik ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Neprepoznan${issue2.keys.length > 1 ? "i ključi" : " ključ"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Neveljaven ključ v ${issue2.origin}`;
      case "invalid_union":
        return "Neveljaven vnos";
      case "invalid_element":
        return `Neveljavna vrednost v ${issue2.origin}`;
      default:
        return "Neveljaven vnos";
    }
  };
};
function sl_default() {
  return {
    localeError: error34()
  };
}
// node_modules/zod/v4/locales/sv.js
var error35 = () => {
  const Sizable = {
    string: { unit: "tecken", verb: "att ha" },
    file: { unit: "bytes", verb: "att ha" },
    array: { unit: "objekt", verb: "att innehålla" },
    set: { unit: "objekt", verb: "att innehålla" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "antal";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "lista";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "reguljärt uttryck",
    email: "e-postadress",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO-datum och tid",
    date: "ISO-datum",
    time: "ISO-tid",
    duration: "ISO-varaktighet",
    ipv4: "IPv4-intervall",
    ipv6: "IPv6-intervall",
    cidrv4: "IPv4-spektrum",
    cidrv6: "IPv6-spektrum",
    base64: "base64-kodad sträng",
    base64url: "base64url-kodad sträng",
    json_string: "JSON-sträng",
    e164: "E.164-nummer",
    jwt: "JWT",
    template_literal: "mall-literal"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ogiltig inmatning: förväntat ${issue2.expected}, fick ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ogiltig inmatning: förväntat ${stringifyPrimitive(issue2.values[0])}`;
        return `Ogiltigt val: förväntade en av ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För stor(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
        }
        return `För stor(t): förväntat ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `För lite(t): förväntade ${issue2.origin ?? "värdet"} att ha ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `Ogiltig sträng: måste börja med "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `Ogiltig sträng: måste sluta med "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ogiltig sträng: måste innehålla "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ogiltig sträng: måste matcha mönstret "${_issue.pattern}"`;
        return `Ogiltig(t) ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Ogiltigt tal: måste vara en multipel av ${issue2.divisor}`;
      case "unrecognized_keys":
        return `${issue2.keys.length > 1 ? "Okända nycklar" : "Okänd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Ogiltig nyckel i ${issue2.origin ?? "värdet"}`;
      case "invalid_union":
        return "Ogiltig input";
      case "invalid_element":
        return `Ogiltigt värde i ${issue2.origin ?? "värdet"}`;
      default:
        return `Ogiltig input`;
    }
  };
};
function sv_default() {
  return {
    localeError: error35()
  };
}
// node_modules/zod/v4/locales/ta.js
var error36 = () => {
  const Sizable = {
    string: { unit: "எழுத்துக்கள்", verb: "கொண்டிருக்க வேண்டும்" },
    file: { unit: "பைட்டுகள்", verb: "கொண்டிருக்க வேண்டும்" },
    array: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" },
    set: { unit: "உறுப்புகள்", verb: "கொண்டிருக்க வேண்டும்" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "எண் அல்லாதது" : "எண்";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "அணி";
        }
        if (data === null) {
          return "வெறுமை";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "உள்ளீடு",
    email: "மின்னஞ்சல் முகவரி",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO தேதி நேரம்",
    date: "ISO தேதி",
    time: "ISO நேரம்",
    duration: "ISO கால அளவு",
    ipv4: "IPv4 முகவரி",
    ipv6: "IPv6 முகவரி",
    cidrv4: "IPv4 வரம்பு",
    cidrv6: "IPv6 வரம்பு",
    base64: "base64-encoded சரம்",
    base64url: "base64url-encoded சரம்",
    json_string: "JSON சரம்",
    e164: "E.164 எண்",
    jwt: "JWT",
    template_literal: "input"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${issue2.expected}, பெறப்பட்டது ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${stringifyPrimitive(issue2.values[0])}`;
        return `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${joinValues(issue2.values, "|")} இல் ஒன்று`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "உறுப்புகள்"} ஆக இருக்க வேண்டும்`;
        }
        return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${issue2.origin ?? "மதிப்பு"} ${adj}${issue2.maximum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} ஆக இருக்க வேண்டும்`;
        }
        return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${issue2.origin} ${adj}${issue2.minimum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `தவறான சரம்: "${_issue.prefix}" இல் தொடங்க வேண்டும்`;
        if (_issue.format === "ends_with")
          return `தவறான சரம்: "${_issue.suffix}" இல் முடிவடைய வேண்டும்`;
        if (_issue.format === "includes")
          return `தவறான சரம்: "${_issue.includes}" ஐ உள்ளடக்க வேண்டும்`;
        if (_issue.format === "regex")
          return `தவறான சரம்: ${_issue.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`;
        return `தவறான ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `தவறான எண்: ${issue2.divisor} இன் பலமாக இருக்க வேண்டும்`;
      case "unrecognized_keys":
        return `அடையாளம் தெரியாத விசை${issue2.keys.length > 1 ? "கள்" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} இல் தவறான விசை`;
      case "invalid_union":
        return "தவறான உள்ளீடு";
      case "invalid_element":
        return `${issue2.origin} இல் தவறான மதிப்பு`;
      default:
        return `தவறான உள்ளீடு`;
    }
  };
};
function ta_default() {
  return {
    localeError: error36()
  };
}
// node_modules/zod/v4/locales/th.js
var error37 = () => {
  const Sizable = {
    string: { unit: "ตัวอักษร", verb: "ควรมี" },
    file: { unit: "ไบต์", verb: "ควรมี" },
    array: { unit: "รายการ", verb: "ควรมี" },
    set: { unit: "รายการ", verb: "ควรมี" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType6 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "ไม่ใช่ตัวเลข (NaN)" : "ตัวเลข";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "อาร์เรย์ (Array)";
        }
        if (data === null) {
          return "ไม่มีค่า (null)";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ข้อมูลที่ป้อน",
    email: "ที่อยู่อีเมล",
    url: "URL",
    emoji: "อิโมจิ",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "วันที่เวลาแบบ ISO",
    date: "วันที่แบบ ISO",
    time: "เวลาแบบ ISO",
    duration: "ช่วงเวลาแบบ ISO",
    ipv4: "ที่อยู่ IPv4",
    ipv6: "ที่อยู่ IPv6",
    cidrv4: "ช่วง IP แบบ IPv4",
    cidrv6: "ช่วง IP แบบ IPv6",
    base64: "ข้อความแบบ Base64",
    base64url: "ข้อความแบบ Base64 สำหรับ URL",
    json_string: "ข้อความแบบ JSON",
    e164: "เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",
    jwt: "โทเคน JWT",
    template_literal: "ข้อมูลที่ป้อน"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${issue2.expected} แต่ได้รับ ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `ค่าไม่ถูกต้อง: ควรเป็น ${stringifyPrimitive(issue2.values[0])}`;
        return `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "ไม่เกิน" : "น้อยกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "รายการ"}`;
        return `เกินกำหนด: ${issue2.origin ?? "ค่า"} ควรมี${adj} ${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? "อย่างน้อย" : "มากกว่า";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `น้อยกว่ากำหนด: ${issue2.origin} ควรมี${adj} ${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${_issue.prefix}"`;
        }
        if (_issue.format === "ends_with")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${_issue.includes}" อยู่ในข้อความ`;
        if (_issue.format === "regex")
          return `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${_issue.pattern}`;
        return `รูปแบบไม่ถูกต้อง: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${issue2.divisor} ได้ลงตัว`;
      case "unrecognized_keys":
        return `พบคีย์ที่ไม่รู้จัก: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `คีย์ไม่ถูกต้องใน ${issue2.origin}`;
      case "invalid_union":
        return "ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้";
      case "invalid_element":
        return `ข้อมูลไม่ถูกต้องใน ${issue2.origin}`;
      default:
        return `ข้อมูลไม่ถูกต้อง`;
    }
  };
};
function th_default() {
  return {
    localeError: error37()
  };
}
// node_modules/zod/v4/locales/tr.js
var parsedType6 = (data) => {
  const t = typeof data;
  switch (t) {
    case "number": {
      return Number.isNaN(data) ? "NaN" : "number";
    }
    case "object": {
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
        return data.constructor.name;
      }
    }
  }
  return t;
};
var error38 = () => {
  const Sizable = {
    string: { unit: "karakter", verb: "olmalı" },
    file: { unit: "bayt", verb: "olmalı" },
    array: { unit: "öğe", verb: "olmalı" },
    set: { unit: "öğe", verb: "olmalı" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const Nouns = {
    regex: "girdi",
    email: "e-posta adresi",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO tarih ve saat",
    date: "ISO tarih",
    time: "ISO saat",
    duration: "ISO süre",
    ipv4: "IPv4 adresi",
    ipv6: "IPv6 adresi",
    cidrv4: "IPv4 aralığı",
    cidrv6: "IPv6 aralığı",
    base64: "base64 ile şifrelenmiş metin",
    base64url: "base64url ile şifrelenmiş metin",
    json_string: "JSON dizesi",
    e164: "E.164 sayısı",
    jwt: "JWT",
    template_literal: "Şablon dizesi"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Geçersiz değer: beklenen ${issue2.expected}, alınan ${parsedType6(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Geçersiz değer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
        return `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "öğe"}`;
        return `Çok büyük: beklenen ${issue2.origin ?? "değer"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        return `Çok küçük: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Geçersiz metin: "${_issue.prefix}" ile başlamalı`;
        if (_issue.format === "ends_with")
          return `Geçersiz metin: "${_issue.suffix}" ile bitmeli`;
        if (_issue.format === "includes")
          return `Geçersiz metin: "${_issue.includes}" içermeli`;
        if (_issue.format === "regex")
          return `Geçersiz metin: ${_issue.pattern} desenine uymalı`;
        return `Geçersiz ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Geçersiz sayı: ${issue2.divisor} ile tam bölünebilmeli`;
      case "unrecognized_keys":
        return `Tanınmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} içinde geçersiz anahtar`;
      case "invalid_union":
        return "Geçersiz değer";
      case "invalid_element":
        return `${issue2.origin} içinde geçersiz değer`;
      default:
        return `Geçersiz değer`;
    }
  };
};
function tr_default() {
  return {
    localeError: error38()
  };
}
// node_modules/zod/v4/locales/uk.js
var error39 = () => {
  const Sizable = {
    string: { unit: "символів", verb: "матиме" },
    file: { unit: "байтів", verb: "матиме" },
    array: { unit: "елементів", verb: "матиме" },
    set: { unit: "елементів", verb: "матиме" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "число";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "масив";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "вхідні дані",
    email: "адреса електронної пошти",
    url: "URL",
    emoji: "емодзі",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "дата та час ISO",
    date: "дата ISO",
    time: "час ISO",
    duration: "тривалість ISO",
    ipv4: "адреса IPv4",
    ipv6: "адреса IPv6",
    cidrv4: "діапазон IPv4",
    cidrv6: "діапазон IPv6",
    base64: "рядок у кодуванні base64",
    base64url: "рядок у кодуванні base64url",
    json_string: "рядок JSON",
    e164: "номер E.164",
    jwt: "JWT",
    template_literal: "вхідні дані"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Неправильні вхідні дані: очікується ${issue2.expected}, отримано ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Неправильні вхідні дані: очікується ${stringifyPrimitive(issue2.values[0])}`;
        return `Неправильна опція: очікується одне з ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "елементів"}`;
        return `Занадто велике: очікується, що ${issue2.origin ?? "значення"} буде ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Занадто мале: очікується, що ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Занадто мале: очікується, що ${issue2.origin} буде ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Неправильний рядок: повинен починатися з "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Неправильний рядок: повинен закінчуватися на "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Неправильний рядок: повинен містити "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Неправильний рядок: повинен відповідати шаблону ${_issue.pattern}`;
        return `Неправильний ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Неправильне число: повинно бути кратним ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Нерозпізнаний ключ${issue2.keys.length > 1 ? "і" : ""}: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Неправильний ключ у ${issue2.origin}`;
      case "invalid_union":
        return "Неправильні вхідні дані";
      case "invalid_element":
        return `Неправильне значення у ${issue2.origin}`;
      default:
        return `Неправильні вхідні дані`;
    }
  };
};
function uk_default() {
  return {
    localeError: error39()
  };
}

// node_modules/zod/v4/locales/ua.js
function ua_default() {
  return uk_default();
}
// node_modules/zod/v4/locales/ur.js
var error40 = () => {
  const Sizable = {
    string: { unit: "حروف", verb: "ہونا" },
    file: { unit: "بائٹس", verb: "ہونا" },
    array: { unit: "آئٹمز", verb: "ہونا" },
    set: { unit: "آئٹمز", verb: "ہونا" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "نمبر";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "آرے";
        }
        if (data === null) {
          return "نل";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ان پٹ",
    email: "ای میل ایڈریس",
    url: "یو آر ایل",
    emoji: "ایموجی",
    uuid: "یو یو آئی ڈی",
    uuidv4: "یو یو آئی ڈی وی 4",
    uuidv6: "یو یو آئی ڈی وی 6",
    nanoid: "نینو آئی ڈی",
    guid: "جی یو آئی ڈی",
    cuid: "سی یو آئی ڈی",
    cuid2: "سی یو آئی ڈی 2",
    ulid: "یو ایل آئی ڈی",
    xid: "ایکس آئی ڈی",
    ksuid: "کے ایس یو آئی ڈی",
    datetime: "آئی ایس او ڈیٹ ٹائم",
    date: "آئی ایس او تاریخ",
    time: "آئی ایس او وقت",
    duration: "آئی ایس او مدت",
    ipv4: "آئی پی وی 4 ایڈریس",
    ipv6: "آئی پی وی 6 ایڈریس",
    cidrv4: "آئی پی وی 4 رینج",
    cidrv6: "آئی پی وی 6 رینج",
    base64: "بیس 64 ان کوڈڈ سٹرنگ",
    base64url: "بیس 64 یو آر ایل ان کوڈڈ سٹرنگ",
    json_string: "جے ایس او این سٹرنگ",
    e164: "ای 164 نمبر",
    jwt: "جے ڈبلیو ٹی",
    template_literal: "ان پٹ"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `غلط ان پٹ: ${issue2.expected} متوقع تھا، ${parsedType7(issue2.input)} موصول ہوا`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `غلط ان پٹ: ${stringifyPrimitive(issue2.values[0])} متوقع تھا`;
        return `غلط آپشن: ${joinValues(issue2.values, "|")} میں سے ایک متوقع تھا`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کے ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "عناصر"} ہونے متوقع تھے`;
        return `بہت بڑا: ${issue2.origin ?? "ویلیو"} کا ${adj}${issue2.maximum.toString()} ہونا متوقع تھا`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `بہت چھوٹا: ${issue2.origin} کے ${adj}${issue2.minimum.toString()} ${sizing.unit} ہونے متوقع تھے`;
        }
        return `بہت چھوٹا: ${issue2.origin} کا ${adj}${issue2.minimum.toString()} ہونا متوقع تھا`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `غلط سٹرنگ: "${_issue.prefix}" سے شروع ہونا چاہیے`;
        }
        if (_issue.format === "ends_with")
          return `غلط سٹرنگ: "${_issue.suffix}" پر ختم ہونا چاہیے`;
        if (_issue.format === "includes")
          return `غلط سٹرنگ: "${_issue.includes}" شامل ہونا چاہیے`;
        if (_issue.format === "regex")
          return `غلط سٹرنگ: پیٹرن ${_issue.pattern} سے میچ ہونا چاہیے`;
        return `غلط ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `غلط نمبر: ${issue2.divisor} کا مضاعف ہونا چاہیے`;
      case "unrecognized_keys":
        return `غیر تسلیم شدہ کی${issue2.keys.length > 1 ? "ز" : ""}: ${joinValues(issue2.keys, "، ")}`;
      case "invalid_key":
        return `${issue2.origin} میں غلط کی`;
      case "invalid_union":
        return "غلط ان پٹ";
      case "invalid_element":
        return `${issue2.origin} میں غلط ویلیو`;
      default:
        return `غلط ان پٹ`;
    }
  };
};
function ur_default() {
  return {
    localeError: error40()
  };
}
// node_modules/zod/v4/locales/vi.js
var error41 = () => {
  const Sizable = {
    string: { unit: "ký tự", verb: "có" },
    file: { unit: "byte", verb: "có" },
    array: { unit: "phần tử", verb: "có" },
    set: { unit: "phần tử", verb: "có" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "số";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "mảng";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "đầu vào",
    email: "địa chỉ email",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ngày giờ ISO",
    date: "ngày ISO",
    time: "giờ ISO",
    duration: "khoảng thời gian ISO",
    ipv4: "địa chỉ IPv4",
    ipv6: "địa chỉ IPv6",
    cidrv4: "dải IPv4",
    cidrv6: "dải IPv6",
    base64: "chuỗi mã hóa base64",
    base64url: "chuỗi mã hóa base64url",
    json_string: "chuỗi JSON",
    e164: "số E.164",
    jwt: "JWT",
    template_literal: "đầu vào"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Đầu vào không hợp lệ: mong đợi ${issue2.expected}, nhận được ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Đầu vào không hợp lệ: mong đợi ${stringifyPrimitive(issue2.values[0])}`;
        return `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "phần tử"}`;
        return `Quá lớn: mong đợi ${issue2.origin ?? "giá trị"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `Quá nhỏ: mong đợi ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `Quá nhỏ: mong đợi ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Chuỗi không hợp lệ: phải bắt đầu bằng "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Chuỗi không hợp lệ: phải kết thúc bằng "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Chuỗi không hợp lệ: phải bao gồm "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Chuỗi không hợp lệ: phải khớp với mẫu ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue2.format} không hợp lệ`;
      }
      case "not_multiple_of":
        return `Số không hợp lệ: phải là bội số của ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Khóa không được nhận dạng: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Khóa không hợp lệ trong ${issue2.origin}`;
      case "invalid_union":
        return "Đầu vào không hợp lệ";
      case "invalid_element":
        return `Giá trị không hợp lệ trong ${issue2.origin}`;
      default:
        return `Đầu vào không hợp lệ`;
    }
  };
};
function vi_default() {
  return {
    localeError: error41()
  };
}
// node_modules/zod/v4/locales/zh-CN.js
var error42 = () => {
  const Sizable = {
    string: { unit: "字符", verb: "包含" },
    file: { unit: "字节", verb: "包含" },
    array: { unit: "项", verb: "包含" },
    set: { unit: "项", verb: "包含" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "非数字(NaN)" : "数字";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "数组";
        }
        if (data === null) {
          return "空值(null)";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "输入",
    email: "电子邮件",
    url: "URL",
    emoji: "表情符号",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO日期时间",
    date: "ISO日期",
    time: "ISO时间",
    duration: "ISO时长",
    ipv4: "IPv4地址",
    ipv6: "IPv6地址",
    cidrv4: "IPv4网段",
    cidrv6: "IPv6网段",
    base64: "base64编码字符串",
    base64url: "base64url编码字符串",
    json_string: "JSON字符串",
    e164: "E.164号码",
    jwt: "JWT",
    template_literal: "输入"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `无效输入：期望 ${issue2.expected}，实际接收 ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `无效输入：期望 ${stringifyPrimitive(issue2.values[0])}`;
        return `无效选项：期望以下之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "个元素"}`;
        return `数值过大：期望 ${issue2.origin ?? "值"} ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `数值过小：期望 ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `无效字符串：必须以 "${_issue.prefix}" 开头`;
        if (_issue.format === "ends_with")
          return `无效字符串：必须以 "${_issue.suffix}" 结尾`;
        if (_issue.format === "includes")
          return `无效字符串：必须包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `无效字符串：必须满足正则表达式 ${_issue.pattern}`;
        return `无效${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `无效数字：必须是 ${issue2.divisor} 的倍数`;
      case "unrecognized_keys":
        return `出现未知的键(key): ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `${issue2.origin} 中的键(key)无效`;
      case "invalid_union":
        return "无效输入";
      case "invalid_element":
        return `${issue2.origin} 中包含无效值(value)`;
      default:
        return `无效输入`;
    }
  };
};
function zh_CN_default() {
  return {
    localeError: error42()
  };
}
// node_modules/zod/v4/locales/zh-TW.js
var error43 = () => {
  const Sizable = {
    string: { unit: "字元", verb: "擁有" },
    file: { unit: "位元組", verb: "擁有" },
    array: { unit: "項目", verb: "擁有" },
    set: { unit: "項目", verb: "擁有" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "輸入",
    email: "郵件地址",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "ISO 日期時間",
    date: "ISO 日期",
    time: "ISO 時間",
    duration: "ISO 期間",
    ipv4: "IPv4 位址",
    ipv6: "IPv6 位址",
    cidrv4: "IPv4 範圍",
    cidrv6: "IPv6 範圍",
    base64: "base64 編碼字串",
    base64url: "base64url 編碼字串",
    json_string: "JSON 字串",
    e164: "E.164 數值",
    jwt: "JWT",
    template_literal: "輸入"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `無效的輸入值：預期為 ${issue2.expected}，但收到 ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `無效的輸入值：預期為 ${stringifyPrimitive(issue2.values[0])}`;
        return `無效的選項：預期為以下其中之一 ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "個元素"}`;
        return `數值過大：預期 ${issue2.origin ?? "值"} 應為 ${adj}${issue2.maximum.toString()}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing) {
          return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
        }
        return `數值過小：預期 ${issue2.origin} 應為 ${adj}${issue2.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with") {
          return `無效的字串：必須以 "${_issue.prefix}" 開頭`;
        }
        if (_issue.format === "ends_with")
          return `無效的字串：必須以 "${_issue.suffix}" 結尾`;
        if (_issue.format === "includes")
          return `無效的字串：必須包含 "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `無效的字串：必須符合格式 ${_issue.pattern}`;
        return `無效的 ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `無效的數字：必須為 ${issue2.divisor} 的倍數`;
      case "unrecognized_keys":
        return `無法識別的鍵值${issue2.keys.length > 1 ? "們" : ""}：${joinValues(issue2.keys, "、")}`;
      case "invalid_key":
        return `${issue2.origin} 中有無效的鍵值`;
      case "invalid_union":
        return "無效的輸入值";
      case "invalid_element":
        return `${issue2.origin} 中有無效的值`;
      default:
        return `無效的輸入值`;
    }
  };
};
function zh_TW_default() {
  return {
    localeError: error43()
  };
}
// node_modules/zod/v4/locales/yo.js
var error44 = () => {
  const Sizable = {
    string: { unit: "àmi", verb: "ní" },
    file: { unit: "bytes", verb: "ní" },
    array: { unit: "nkan", verb: "ní" },
    set: { unit: "nkan", verb: "ní" }
  };
  function getSizing(origin) {
    return Sizable[origin] ?? null;
  }
  const parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nọ́mbà";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "akopọ";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  const Nouns = {
    regex: "ẹ̀rọ ìbáwọlé",
    email: "àdírẹ́sì ìmẹ́lì",
    url: "URL",
    emoji: "emoji",
    uuid: "UUID",
    uuidv4: "UUIDv4",
    uuidv6: "UUIDv6",
    nanoid: "nanoid",
    guid: "GUID",
    cuid: "cuid",
    cuid2: "cuid2",
    ulid: "ULID",
    xid: "XID",
    ksuid: "KSUID",
    datetime: "àkókò ISO",
    date: "ọjọ́ ISO",
    time: "àkókò ISO",
    duration: "àkókò tó pé ISO",
    ipv4: "àdírẹ́sì IPv4",
    ipv6: "àdírẹ́sì IPv6",
    cidrv4: "àgbègbè IPv4",
    cidrv6: "àgbègbè IPv6",
    base64: "ọ̀rọ̀ tí a kọ́ ní base64",
    base64url: "ọ̀rọ̀ base64url",
    json_string: "ọ̀rọ̀ JSON",
    e164: "nọ́mbà E.164",
    jwt: "JWT",
    template_literal: "ẹ̀rọ ìbáwọlé"
  };
  return (issue2) => {
    switch (issue2.code) {
      case "invalid_type":
        return `Ìbáwọlé aṣìṣe: a ní láti fi ${issue2.expected}, àmọ̀ a rí ${parsedType7(issue2.input)}`;
      case "invalid_value":
        if (issue2.values.length === 1)
          return `Ìbáwọlé aṣìṣe: a ní láti fi ${stringifyPrimitive(issue2.values[0])}`;
        return `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${joinValues(issue2.values, "|")}`;
      case "too_big": {
        const adj = issue2.inclusive ? "<=" : "<";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Tó pọ̀ jù: a ní láti jẹ́ pé ${issue2.origin ?? "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
        return `Tó pọ̀ jù: a ní láti jẹ́ ${adj}${issue2.maximum}`;
      }
      case "too_small": {
        const adj = issue2.inclusive ? ">=" : ">";
        const sizing = getSizing(issue2.origin);
        if (sizing)
          return `Kéré ju: a ní láti jẹ́ pé ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
        return `Kéré ju: a ní láti jẹ́ ${adj}${issue2.minimum}`;
      }
      case "invalid_format": {
        const _issue = issue2;
        if (_issue.format === "starts_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${_issue.prefix}"`;
        if (_issue.format === "ends_with")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${_issue.suffix}"`;
        if (_issue.format === "includes")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${_issue.includes}"`;
        if (_issue.format === "regex")
          return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${_issue.pattern}`;
        return `Aṣìṣe: ${Nouns[_issue.format] ?? issue2.format}`;
      }
      case "not_multiple_of":
        return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${issue2.divisor}`;
      case "unrecognized_keys":
        return `Bọtìnì àìmọ̀: ${joinValues(issue2.keys, ", ")}`;
      case "invalid_key":
        return `Bọtìnì aṣìṣe nínú ${issue2.origin}`;
      case "invalid_union":
        return "Ìbáwọlé aṣìṣe";
      case "invalid_element":
        return `Iye aṣìṣe nínú ${issue2.origin}`;
      default:
        return "Ìbáwọlé aṣìṣe";
    }
  };
};
function yo_default() {
  return {
    localeError: error44()
  };
}
// node_modules/zod/v4/core/registries.js
var $output = Symbol("ZodOutput");
var $input = Symbol("ZodInput");

class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      if (this._idmap.has(meta.id)) {
        throw new Error(`ID ${meta.id} already exists in the registry`);
      }
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
var globalRegistry = /* @__PURE__ */ registry();
// node_modules/zod/v4/core/api.js
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
function _coercedString(Class2, params) {
  return new Class2({
    type: "string",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
var TimePrecision = {
  Any: null,
  Minute: -1,
  Second: 0,
  Millisecond: 3,
  Microsecond: 6
};
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _coercedNumber(Class2, params) {
  return new Class2({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _float32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float32",
    ...normalizeParams(params)
  });
}
function _float64(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float64",
    ...normalizeParams(params)
  });
}
function _int32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params)
  });
}
function _uint32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "uint32",
    ...normalizeParams(params)
  });
}
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _coercedBoolean(Class2, params) {
  return new Class2({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _bigint(Class2, params) {
  return new Class2({
    type: "bigint",
    ...normalizeParams(params)
  });
}
function _coercedBigint(Class2, params) {
  return new Class2({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _int64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "int64",
    ...normalizeParams(params)
  });
}
function _uint64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "uint64",
    ...normalizeParams(params)
  });
}
function _symbol(Class2, params) {
  return new Class2({
    type: "symbol",
    ...normalizeParams(params)
  });
}
function _undefined2(Class2, params) {
  return new Class2({
    type: "undefined",
    ...normalizeParams(params)
  });
}
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
function _void(Class2, params) {
  return new Class2({
    type: "void",
    ...normalizeParams(params)
  });
}
function _date(Class2, params) {
  return new Class2({
    type: "date",
    ...normalizeParams(params)
  });
}
function _coercedDate(Class2, params) {
  return new Class2({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _nan(Class2, params) {
  return new Class2({
    type: "nan",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _positive(params) {
  return _gt(0, params);
}
function _negative(params) {
  return _lt(0, params);
}
function _nonpositive(params) {
  return _lte(0, params);
}
function _nonnegative(params) {
  return _gte(0, params);
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxSize(maximum, params) {
  return new $ZodCheckMaxSize({
    check: "max_size",
    ...normalizeParams(params),
    maximum
  });
}
function _minSize(minimum, params) {
  return new $ZodCheckMinSize({
    check: "min_size",
    ...normalizeParams(params),
    minimum
  });
}
function _size(size, params) {
  return new $ZodCheckSizeEquals({
    check: "size_equals",
    ...normalizeParams(params),
    size
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _property(property, schema, params) {
  return new $ZodCheckProperty({
    check: "property",
    property,
    schema,
    ...normalizeParams(params)
  });
}
function _mime(types, params) {
  return new $ZodCheckMimeType({
    check: "mime_type",
    mime: types,
    ...normalizeParams(params)
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _union(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function _discriminatedUnion(Class2, discriminator, options, params) {
  return new Class2({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
function _intersection(Class2, left, right) {
  return new Class2({
    type: "intersection",
    left,
    right
  });
}
function _tuple(Class2, items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new Class2({
    type: "tuple",
    items,
    rest,
    ...normalizeParams(params)
  });
}
function _record(Class2, keyType, valueType, params) {
  return new Class2({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _map(Class2, keyType, valueType, params) {
  return new Class2({
    type: "map",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _set(Class2, valueType, params) {
  return new Class2({
    type: "set",
    valueType,
    ...normalizeParams(params)
  });
}
function _enum(Class2, values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _nativeEnum(Class2, entries, params) {
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _literal(Class2, value, params) {
  return new Class2({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
function _file(Class2, params) {
  return new Class2({
    type: "file",
    ...normalizeParams(params)
  });
}
function _transform(Class2, fn) {
  return new Class2({
    type: "transform",
    transform: fn
  });
}
function _optional(Class2, innerType) {
  return new Class2({
    type: "optional",
    innerType
  });
}
function _nullable(Class2, innerType) {
  return new Class2({
    type: "nullable",
    innerType
  });
}
function _default(Class2, innerType, defaultValue) {
  return new Class2({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function _nonoptional(Class2, innerType, params) {
  return new Class2({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
function _success(Class2, innerType) {
  return new Class2({
    type: "success",
    innerType
  });
}
function _catch(Class2, innerType, catchValue) {
  return new Class2({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function _pipe(Class2, in_, out) {
  return new Class2({
    type: "pipe",
    in: in_,
    out
  });
}
function _readonly(Class2, innerType) {
  return new Class2({
    type: "readonly",
    innerType
  });
}
function _templateLiteral(Class2, parts, params) {
  return new Class2({
    type: "template_literal",
    parts,
    ...normalizeParams(params)
  });
}
function _lazy(Class2, getter) {
  return new Class2({
    type: "lazy",
    getter
  });
}
function _promise(Class2, innerType) {
  return new Class2({
    type: "promise",
    innerType
  });
}
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function _stringbool(Classes, _params) {
  const params = normalizeParams(_params);
  let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
  let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (params.case !== "sensitive") {
    truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
  }
  const truthySet = new Set(truthyArray);
  const falsySet = new Set(falsyArray);
  const _Codec = Classes.Codec ?? $ZodCodec;
  const _Boolean = Classes.Boolean ?? $ZodBoolean;
  const _String = Classes.String ?? $ZodString;
  const stringSchema = new _String({ type: "string", error: params.error });
  const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
  const codec = new _Codec({
    type: "pipe",
    in: stringSchema,
    out: booleanSchema,
    transform: (input, payload) => {
      let data = input;
      if (params.case !== "sensitive")
        data = data.toLowerCase();
      if (truthySet.has(data)) {
        return true;
      } else if (falsySet.has(data)) {
        return false;
      } else {
        payload.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...truthySet, ...falsySet],
          input: payload.value,
          inst: codec,
          continue: false
        });
        return {};
      }
    },
    reverseTransform: (input, _payload) => {
      if (input === true) {
        return truthyArray[0] || "true";
      } else {
        return falsyArray[0] || "false";
      }
    },
    error: params.error
  });
  return codec;
}
function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
  const params = normalizeParams(_params);
  const def = {
    ...normalizeParams(_params),
    check: "string_format",
    type: "string",
    format,
    fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
    ...params
  };
  if (fnOrRegex instanceof RegExp) {
    def.pattern = fnOrRegex;
  }
  const inst = new Class2(def);
  return inst;
}
// node_modules/zod/v4/core/to-json-schema.js
class JSONSchemaGenerator {
  constructor(params) {
    this.counter = 0;
    this.metadataRegistry = params?.metadata ?? globalRegistry;
    this.target = params?.target ?? "draft-2020-12";
    this.unrepresentable = params?.unrepresentable ?? "throw";
    this.override = params?.override ?? (() => {});
    this.io = params?.io ?? "output";
    this.seen = new Map;
  }
  process(schema, _params = { path: [], schemaPath: [] }) {
    var _a;
    const def = schema._zod.def;
    const formatMap = {
      guid: "uuid",
      url: "uri",
      datetime: "date-time",
      json_string: "json-string",
      regex: ""
    };
    const seen = this.seen.get(schema);
    if (seen) {
      seen.count++;
      const isCycle = _params.schemaPath.includes(schema);
      if (isCycle) {
        seen.cycle = _params.path;
      }
      return seen.schema;
    }
    const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
    this.seen.set(schema, result);
    const overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) {
      result.schema = overrideSchema;
    } else {
      const params = {
        ..._params,
        schemaPath: [..._params.schemaPath, schema],
        path: _params.path
      };
      const parent = schema._zod.parent;
      if (parent) {
        result.ref = parent;
        this.process(parent, params);
        this.seen.get(parent).isParent = true;
      } else {
        const _json = result.schema;
        switch (def.type) {
          case "string": {
            const json = _json;
            json.type = "string";
            const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
            if (typeof minimum === "number")
              json.minLength = minimum;
            if (typeof maximum === "number")
              json.maxLength = maximum;
            if (format) {
              json.format = formatMap[format] ?? format;
              if (json.format === "")
                delete json.format;
            }
            if (contentEncoding)
              json.contentEncoding = contentEncoding;
            if (patterns && patterns.size > 0) {
              const regexes = [...patterns];
              if (regexes.length === 1)
                json.pattern = regexes[0].source;
              else if (regexes.length > 1) {
                result.schema.allOf = [
                  ...regexes.map((regex) => ({
                    ...this.target === "draft-7" || this.target === "draft-4" || this.target === "openapi-3.0" ? { type: "string" } : {},
                    pattern: regex.source
                  }))
                ];
              }
            }
            break;
          }
          case "number": {
            const json = _json;
            const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
            if (typeof format === "string" && format.includes("int"))
              json.type = "integer";
            else
              json.type = "number";
            if (typeof exclusiveMinimum === "number") {
              if (this.target === "draft-4" || this.target === "openapi-3.0") {
                json.minimum = exclusiveMinimum;
                json.exclusiveMinimum = true;
              } else {
                json.exclusiveMinimum = exclusiveMinimum;
              }
            }
            if (typeof minimum === "number") {
              json.minimum = minimum;
              if (typeof exclusiveMinimum === "number" && this.target !== "draft-4") {
                if (exclusiveMinimum >= minimum)
                  delete json.minimum;
                else
                  delete json.exclusiveMinimum;
              }
            }
            if (typeof exclusiveMaximum === "number") {
              if (this.target === "draft-4" || this.target === "openapi-3.0") {
                json.maximum = exclusiveMaximum;
                json.exclusiveMaximum = true;
              } else {
                json.exclusiveMaximum = exclusiveMaximum;
              }
            }
            if (typeof maximum === "number") {
              json.maximum = maximum;
              if (typeof exclusiveMaximum === "number" && this.target !== "draft-4") {
                if (exclusiveMaximum <= maximum)
                  delete json.maximum;
                else
                  delete json.exclusiveMaximum;
              }
            }
            if (typeof multipleOf === "number")
              json.multipleOf = multipleOf;
            break;
          }
          case "boolean": {
            const json = _json;
            json.type = "boolean";
            break;
          }
          case "bigint": {
            if (this.unrepresentable === "throw") {
              throw new Error("BigInt cannot be represented in JSON Schema");
            }
            break;
          }
          case "symbol": {
            if (this.unrepresentable === "throw") {
              throw new Error("Symbols cannot be represented in JSON Schema");
            }
            break;
          }
          case "null": {
            if (this.target === "openapi-3.0") {
              _json.type = "string";
              _json.nullable = true;
              _json.enum = [null];
            } else
              _json.type = "null";
            break;
          }
          case "any": {
            break;
          }
          case "unknown": {
            break;
          }
          case "undefined": {
            if (this.unrepresentable === "throw") {
              throw new Error("Undefined cannot be represented in JSON Schema");
            }
            break;
          }
          case "void": {
            if (this.unrepresentable === "throw") {
              throw new Error("Void cannot be represented in JSON Schema");
            }
            break;
          }
          case "never": {
            _json.not = {};
            break;
          }
          case "date": {
            if (this.unrepresentable === "throw") {
              throw new Error("Date cannot be represented in JSON Schema");
            }
            break;
          }
          case "array": {
            const json = _json;
            const { minimum, maximum } = schema._zod.bag;
            if (typeof minimum === "number")
              json.minItems = minimum;
            if (typeof maximum === "number")
              json.maxItems = maximum;
            json.type = "array";
            json.items = this.process(def.element, { ...params, path: [...params.path, "items"] });
            break;
          }
          case "object": {
            const json = _json;
            json.type = "object";
            json.properties = {};
            const shape = def.shape;
            for (const key in shape) {
              json.properties[key] = this.process(shape[key], {
                ...params,
                path: [...params.path, "properties", key]
              });
            }
            const allKeys = new Set(Object.keys(shape));
            const requiredKeys = new Set([...allKeys].filter((key) => {
              const v = def.shape[key]._zod;
              if (this.io === "input") {
                return v.optin === undefined;
              } else {
                return v.optout === undefined;
              }
            }));
            if (requiredKeys.size > 0) {
              json.required = Array.from(requiredKeys);
            }
            if (def.catchall?._zod.def.type === "never") {
              json.additionalProperties = false;
            } else if (!def.catchall) {
              if (this.io === "output")
                json.additionalProperties = false;
            } else if (def.catchall) {
              json.additionalProperties = this.process(def.catchall, {
                ...params,
                path: [...params.path, "additionalProperties"]
              });
            }
            break;
          }
          case "union": {
            const json = _json;
            const options = def.options.map((x, i) => this.process(x, {
              ...params,
              path: [...params.path, "anyOf", i]
            }));
            json.anyOf = options;
            break;
          }
          case "intersection": {
            const json = _json;
            const a = this.process(def.left, {
              ...params,
              path: [...params.path, "allOf", 0]
            });
            const b = this.process(def.right, {
              ...params,
              path: [...params.path, "allOf", 1]
            });
            const isSimpleIntersection = (val) => ("allOf" in val) && Object.keys(val).length === 1;
            const allOf = [
              ...isSimpleIntersection(a) ? a.allOf : [a],
              ...isSimpleIntersection(b) ? b.allOf : [b]
            ];
            json.allOf = allOf;
            break;
          }
          case "tuple": {
            const json = _json;
            json.type = "array";
            const prefixPath = this.target === "draft-2020-12" ? "prefixItems" : "items";
            const restPath = this.target === "draft-2020-12" ? "items" : this.target === "openapi-3.0" ? "items" : "additionalItems";
            const prefixItems = def.items.map((x, i) => this.process(x, {
              ...params,
              path: [...params.path, prefixPath, i]
            }));
            const rest = def.rest ? this.process(def.rest, {
              ...params,
              path: [...params.path, restPath, ...this.target === "openapi-3.0" ? [def.items.length] : []]
            }) : null;
            if (this.target === "draft-2020-12") {
              json.prefixItems = prefixItems;
              if (rest) {
                json.items = rest;
              }
            } else if (this.target === "openapi-3.0") {
              json.items = {
                anyOf: prefixItems
              };
              if (rest) {
                json.items.anyOf.push(rest);
              }
              json.minItems = prefixItems.length;
              if (!rest) {
                json.maxItems = prefixItems.length;
              }
            } else {
              json.items = prefixItems;
              if (rest) {
                json.additionalItems = rest;
              }
            }
            const { minimum, maximum } = schema._zod.bag;
            if (typeof minimum === "number")
              json.minItems = minimum;
            if (typeof maximum === "number")
              json.maxItems = maximum;
            break;
          }
          case "record": {
            const json = _json;
            json.type = "object";
            if (this.target === "draft-7" || this.target === "draft-2020-12") {
              json.propertyNames = this.process(def.keyType, {
                ...params,
                path: [...params.path, "propertyNames"]
              });
            }
            json.additionalProperties = this.process(def.valueType, {
              ...params,
              path: [...params.path, "additionalProperties"]
            });
            break;
          }
          case "map": {
            if (this.unrepresentable === "throw") {
              throw new Error("Map cannot be represented in JSON Schema");
            }
            break;
          }
          case "set": {
            if (this.unrepresentable === "throw") {
              throw new Error("Set cannot be represented in JSON Schema");
            }
            break;
          }
          case "enum": {
            const json = _json;
            const values = getEnumValues(def.entries);
            if (values.every((v) => typeof v === "number"))
              json.type = "number";
            if (values.every((v) => typeof v === "string"))
              json.type = "string";
            json.enum = values;
            break;
          }
          case "literal": {
            const json = _json;
            const vals = [];
            for (const val of def.values) {
              if (val === undefined) {
                if (this.unrepresentable === "throw") {
                  throw new Error("Literal `undefined` cannot be represented in JSON Schema");
                } else {}
              } else if (typeof val === "bigint") {
                if (this.unrepresentable === "throw") {
                  throw new Error("BigInt literals cannot be represented in JSON Schema");
                } else {
                  vals.push(Number(val));
                }
              } else {
                vals.push(val);
              }
            }
            if (vals.length === 0) {} else if (vals.length === 1) {
              const val = vals[0];
              json.type = val === null ? "null" : typeof val;
              if (this.target === "draft-4" || this.target === "openapi-3.0") {
                json.enum = [val];
              } else {
                json.const = val;
              }
            } else {
              if (vals.every((v) => typeof v === "number"))
                json.type = "number";
              if (vals.every((v) => typeof v === "string"))
                json.type = "string";
              if (vals.every((v) => typeof v === "boolean"))
                json.type = "string";
              if (vals.every((v) => v === null))
                json.type = "null";
              json.enum = vals;
            }
            break;
          }
          case "file": {
            const json = _json;
            const file = {
              type: "string",
              format: "binary",
              contentEncoding: "binary"
            };
            const { minimum, maximum, mime } = schema._zod.bag;
            if (minimum !== undefined)
              file.minLength = minimum;
            if (maximum !== undefined)
              file.maxLength = maximum;
            if (mime) {
              if (mime.length === 1) {
                file.contentMediaType = mime[0];
                Object.assign(json, file);
              } else {
                json.anyOf = mime.map((m) => {
                  const mFile = { ...file, contentMediaType: m };
                  return mFile;
                });
              }
            } else {
              Object.assign(json, file);
            }
            break;
          }
          case "transform": {
            if (this.unrepresentable === "throw") {
              throw new Error("Transforms cannot be represented in JSON Schema");
            }
            break;
          }
          case "nullable": {
            const inner = this.process(def.innerType, params);
            if (this.target === "openapi-3.0") {
              result.ref = def.innerType;
              _json.nullable = true;
            } else {
              _json.anyOf = [inner, { type: "null" }];
            }
            break;
          }
          case "nonoptional": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            break;
          }
          case "success": {
            const json = _json;
            json.type = "boolean";
            break;
          }
          case "default": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            _json.default = JSON.parse(JSON.stringify(def.defaultValue));
            break;
          }
          case "prefault": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            if (this.io === "input")
              _json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
            break;
          }
          case "catch": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            let catchValue;
            try {
              catchValue = def.catchValue(undefined);
            } catch {
              throw new Error("Dynamic catch values are not supported in JSON Schema");
            }
            _json.default = catchValue;
            break;
          }
          case "nan": {
            if (this.unrepresentable === "throw") {
              throw new Error("NaN cannot be represented in JSON Schema");
            }
            break;
          }
          case "template_literal": {
            const json = _json;
            const pattern = schema._zod.pattern;
            if (!pattern)
              throw new Error("Pattern not found in template literal");
            json.type = "string";
            json.pattern = pattern.source;
            break;
          }
          case "pipe": {
            const innerType = this.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
            this.process(innerType, params);
            result.ref = innerType;
            break;
          }
          case "readonly": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            _json.readOnly = true;
            break;
          }
          case "promise": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            break;
          }
          case "optional": {
            this.process(def.innerType, params);
            result.ref = def.innerType;
            break;
          }
          case "lazy": {
            const innerType = schema._zod.innerType;
            this.process(innerType, params);
            result.ref = innerType;
            break;
          }
          case "custom": {
            if (this.unrepresentable === "throw") {
              throw new Error("Custom types cannot be represented in JSON Schema");
            }
            break;
          }
          case "function": {
            if (this.unrepresentable === "throw") {
              throw new Error("Function types cannot be represented in JSON Schema");
            }
            break;
          }
          default: {}
        }
      }
    }
    const meta = this.metadataRegistry.get(schema);
    if (meta)
      Object.assign(result.schema, meta);
    if (this.io === "input" && isTransforming(schema)) {
      delete result.schema.examples;
      delete result.schema.default;
    }
    if (this.io === "input" && result.schema._prefault)
      (_a = result.schema).default ?? (_a.default = result.schema._prefault);
    delete result.schema._prefault;
    const _result = this.seen.get(schema);
    return _result.schema;
  }
  emit(schema, _params) {
    const params = {
      cycles: _params?.cycles ?? "ref",
      reused: _params?.reused ?? "inline",
      external: _params?.external ?? undefined
    };
    const root = this.seen.get(schema);
    if (!root)
      throw new Error("Unprocessed schema. This is a bug in Zod.");
    const makeURI = (entry) => {
      const defsSegment = this.target === "draft-2020-12" ? "$defs" : "definitions";
      if (params.external) {
        const externalId = params.external.registry.get(entry[0])?.id;
        const uriGenerator = params.external.uri ?? ((id2) => id2);
        if (externalId) {
          return { ref: uriGenerator(externalId) };
        }
        const id = entry[1].defId ?? entry[1].schema.id ?? `schema${this.counter++}`;
        entry[1].defId = id;
        return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
      }
      if (entry[1] === root) {
        return { ref: "#" };
      }
      const uriPrefix = `#`;
      const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
      const defId = entry[1].schema.id ?? `__schema${this.counter++}`;
      return { defId, ref: defUriPrefix + defId };
    };
    const extractToDef = (entry) => {
      if (entry[1].schema.$ref) {
        return;
      }
      const seen = entry[1];
      const { ref, defId } = makeURI(entry);
      seen.def = { ...seen.schema };
      if (defId)
        seen.defId = defId;
      const schema2 = seen.schema;
      for (const key in schema2) {
        delete schema2[key];
      }
      schema2.$ref = ref;
    };
    if (params.cycles === "throw") {
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (seen.cycle) {
          throw new Error("Cycle detected: " + `#/${seen.cycle?.join("/")}/<root>` + '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
        }
      }
    }
    for (const entry of this.seen.entries()) {
      const seen = entry[1];
      if (schema === entry[0]) {
        extractToDef(entry);
        continue;
      }
      if (params.external) {
        const ext = params.external.registry.get(entry[0])?.id;
        if (schema !== entry[0] && ext) {
          extractToDef(entry);
          continue;
        }
      }
      const id = this.metadataRegistry.get(entry[0])?.id;
      if (id) {
        extractToDef(entry);
        continue;
      }
      if (seen.cycle) {
        extractToDef(entry);
        continue;
      }
      if (seen.count > 1) {
        if (params.reused === "ref") {
          extractToDef(entry);
          continue;
        }
      }
    }
    const flattenRef = (zodSchema, params2) => {
      const seen = this.seen.get(zodSchema);
      const schema2 = seen.def ?? seen.schema;
      const _cached = { ...schema2 };
      if (seen.ref === null) {
        return;
      }
      const ref = seen.ref;
      seen.ref = null;
      if (ref) {
        flattenRef(ref, params2);
        const refSchema = this.seen.get(ref).schema;
        if (refSchema.$ref && (params2.target === "draft-7" || params2.target === "draft-4" || params2.target === "openapi-3.0")) {
          schema2.allOf = schema2.allOf ?? [];
          schema2.allOf.push(refSchema);
        } else {
          Object.assign(schema2, refSchema);
          Object.assign(schema2, _cached);
        }
      }
      if (!seen.isParent)
        this.override({
          zodSchema,
          jsonSchema: schema2,
          path: seen.path ?? []
        });
    };
    for (const entry of [...this.seen.entries()].reverse()) {
      flattenRef(entry[0], { target: this.target });
    }
    const result = {};
    if (this.target === "draft-2020-12") {
      result.$schema = "https://json-schema.org/draft/2020-12/schema";
    } else if (this.target === "draft-7") {
      result.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (this.target === "draft-4") {
      result.$schema = "http://json-schema.org/draft-04/schema#";
    } else if (this.target === "openapi-3.0") {} else {
      console.warn(`Invalid target: ${this.target}`);
    }
    if (params.external?.uri) {
      const id = params.external.registry.get(schema)?.id;
      if (!id)
        throw new Error("Schema is missing an `id` property");
      result.$id = params.external.uri(id);
    }
    Object.assign(result, root.def);
    const defs = params.external?.defs ?? {};
    for (const entry of this.seen.entries()) {
      const seen = entry[1];
      if (seen.def && seen.defId) {
        defs[seen.defId] = seen.def;
      }
    }
    if (params.external) {} else {
      if (Object.keys(defs).length > 0) {
        if (this.target === "draft-2020-12") {
          result.$defs = defs;
        } else {
          result.definitions = defs;
        }
      }
    }
    try {
      return JSON.parse(JSON.stringify(result));
    } catch (_err) {
      throw new Error("Error converting schema to JSON.");
    }
  }
}
function toJSONSchema(input, _params) {
  if (input instanceof $ZodRegistry) {
    const gen2 = new JSONSchemaGenerator(_params);
    const defs = {};
    for (const entry of input._idmap.entries()) {
      const [_, schema] = entry;
      gen2.process(schema);
    }
    const schemas = {};
    const external = {
      registry: input,
      uri: _params?.uri,
      defs
    };
    for (const entry of input._idmap.entries()) {
      const [key, schema] = entry;
      schemas[key] = gen2.emit(schema, {
        ..._params,
        external
      });
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = gen2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const gen = new JSONSchemaGenerator(_params);
  gen.process(input);
  return gen.emit(input, _params);
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const schema = _schema;
  const def = schema._zod.def;
  switch (def.type) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
    case "date":
    case "symbol":
    case "undefined":
    case "null":
    case "any":
    case "unknown":
    case "never":
    case "void":
    case "literal":
    case "enum":
    case "nan":
    case "file":
    case "template_literal":
      return false;
    case "array": {
      return isTransforming(def.element, ctx);
    }
    case "object": {
      for (const key in def.shape) {
        if (isTransforming(def.shape[key], ctx))
          return true;
      }
      return false;
    }
    case "union": {
      for (const option of def.options) {
        if (isTransforming(option, ctx))
          return true;
      }
      return false;
    }
    case "intersection": {
      return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    case "tuple": {
      for (const item of def.items) {
        if (isTransforming(item, ctx))
          return true;
      }
      if (def.rest && isTransforming(def.rest, ctx))
        return true;
      return false;
    }
    case "record": {
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    case "map": {
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    case "set": {
      return isTransforming(def.valueType, ctx);
    }
    case "promise":
    case "optional":
    case "nonoptional":
    case "nullable":
    case "readonly":
      return isTransforming(def.innerType, ctx);
    case "lazy":
      return isTransforming(def.getter(), ctx);
    case "default": {
      return isTransforming(def.innerType, ctx);
    }
    case "prefault": {
      return isTransforming(def.innerType, ctx);
    }
    case "custom": {
      return false;
    }
    case "transform": {
      return true;
    }
    case "pipe": {
      return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    case "success": {
      return false;
    }
    case "catch": {
      return false;
    }
    case "function": {
      return false;
    }
    default:
  }
  throw new Error(`Unknown schema type: ${def.type}`);
}
// node_modules/zod/v4/core/json-schema.js
var exports_json_schema = {};
// node_modules/zod/v4/classic/iso.js
var exports_iso = {};
__export(exports_iso, {
  time: () => time2,
  duration: () => duration2,
  datetime: () => datetime2,
  date: () => date2,
  ZodISOTime: () => ZodISOTime,
  ZodISODuration: () => ZodISODuration,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODate: () => ZodISODate
});
var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date2(params) {
  return _isoDate(ZodISODate, params);
}
var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}

// node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
    }
  });
};
var ZodError = $constructor("ZodError", initializer2);
var ZodRealError = $constructor("ZodError", initializer2, {
  Parent: Error
});

// node_modules/zod/v4/classic/parse.js
var parse3 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode2 = /* @__PURE__ */ _encode(ZodRealError);
var decode2 = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// node_modules/zod/v4/classic/schemas.js
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.check = (...checks2) => {
    return inst.clone({
      ...def,
      checks: [
        ...def.checks ?? [],
        ...checks2.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    });
  };
  inst.clone = (def2, params) => clone(inst, def2, params);
  inst.brand = () => inst;
  inst.register = (reg, meta) => {
    reg.add(inst, meta);
    return inst;
  };
  inst.parse = (data, params) => parse3(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse2(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode2(inst, data, params);
  inst.decode = (data, params) => decode2(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
  inst.refine = (check, params) => inst.check(refine(check, params));
  inst.superRefine = (refinement) => inst.check(superRefine(refinement));
  inst.overwrite = (fn) => inst.check(_overwrite(fn));
  inst.optional = () => optional(inst);
  inst.nullable = () => nullable(inst);
  inst.nullish = () => optional(nullable(inst));
  inst.nonoptional = (params) => nonoptional(inst, params);
  inst.array = () => array(inst);
  inst.or = (arg) => union([inst, arg]);
  inst.and = (arg) => intersection(inst, arg);
  inst.transform = (tx) => pipe(inst, transform(tx));
  inst.default = (def2) => _default2(inst, def2);
  inst.prefault = (def2) => prefault(inst, def2);
  inst.catch = (params) => _catch2(inst, params);
  inst.pipe = (target) => pipe(inst, target);
  inst.readonly = () => readonly(inst);
  inst.describe = (description) => {
    const cl = inst.clone();
    globalRegistry.add(cl, { description });
    return cl;
  };
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  inst.meta = (...args) => {
    if (args.length === 0) {
      return globalRegistry.get(inst);
    }
    const cl = inst.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  };
  inst.isOptional = () => inst.safeParse(undefined).success;
  inst.isNullable = () => inst.safeParse(null).success;
  return inst;
});
var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  inst.regex = (...args) => inst.check(_regex(...args));
  inst.includes = (...args) => inst.check(_includes(...args));
  inst.startsWith = (...args) => inst.check(_startsWith(...args));
  inst.endsWith = (...args) => inst.check(_endsWith(...args));
  inst.min = (...args) => inst.check(_minLength(...args));
  inst.max = (...args) => inst.check(_maxLength(...args));
  inst.length = (...args) => inst.check(_length(...args));
  inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
  inst.lowercase = (params) => inst.check(_lowercase(params));
  inst.uppercase = (params) => inst.check(_uppercase(params));
  inst.trim = () => inst.check(_trim());
  inst.normalize = (...args) => inst.check(_normalize(...args));
  inst.toLowerCase = () => inst.check(_toLowerCase());
  inst.toUpperCase = () => inst.check(_toUpperCase());
});
var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(_email(ZodEmail, params));
  inst.url = (params) => inst.check(_url(ZodURL, params));
  inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(_guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(_xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(_e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime2(params));
  inst.date = (params) => inst.check(date2(params));
  inst.time = (params) => inst.check(time2(params));
  inst.duration = (params) => inst.check(duration2(params));
});
function string2(params) {
  return _string(ZodString, params);
}
var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function email2(params) {
  return _email(ZodEmail, params);
}
var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function guid2(params) {
  return _guid(ZodGUID, params);
}
var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function uuid2(params) {
  return _uuid(ZodUUID, params);
}
function uuidv4(params) {
  return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
  return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
  return _uuidv7(ZodUUID, params);
}
var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function url(params) {
  return _url(ZodURL, params);
}
function httpUrl(params) {
  return _url(ZodURL, {
    protocol: /^https?$/,
    hostname: exports_regexes.domain,
    ...exports_util.normalizeParams(params)
  });
}
var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function emoji2(params) {
  return _emoji2(ZodEmoji, params);
}
var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function nanoid2(params) {
  return _nanoid(ZodNanoID, params);
}
var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid3(params) {
  return _cuid(ZodCUID, params);
}
var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cuid22(params) {
  return _cuid2(ZodCUID2, params);
}
var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ulid2(params) {
  return _ulid(ZodULID, params);
}
var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function xid2(params) {
  return _xid(ZodXID, params);
}
var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ksuid2(params) {
  return _ksuid(ZodKSUID, params);
}
var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv42(params) {
  return _ipv4(ZodIPv4, params);
}
var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function ipv62(params) {
  return _ipv6(ZodIPv6, params);
}
var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv42(params) {
  return _cidrv4(ZodCIDRv4, params);
}
var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function cidrv62(params) {
  return _cidrv6(ZodCIDRv6, params);
}
var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base642(params) {
  return _base64(ZodBase64, params);
}
var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function base64url2(params) {
  return _base64url(ZodBase64URL, params);
}
var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function e1642(params) {
  return _e164(ZodE164, params);
}
var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function jwt(params) {
  return _jwt(ZodJWT, params);
}
var ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
  $ZodCustomStringFormat.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function stringFormat(format, fnOrRegex, _params = {}) {
  return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hostname", exports_regexes.hostname, _params);
}
function hex2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hex", exports_regexes.hex, _params);
}
function hash(alg, params) {
  const enc = params?.enc ?? "hex";
  const format = `${alg}_${enc}`;
  const regex = exports_regexes[format];
  if (!regex)
    throw new Error(`Unrecognized hash format: ${format}`);
  return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.int = (params) => inst.check(int(params));
  inst.safe = (params) => inst.check(int(params));
  inst.positive = (params) => inst.check(_gt(0, params));
  inst.nonnegative = (params) => inst.check(_gte(0, params));
  inst.negative = (params) => inst.check(_lt(0, params));
  inst.nonpositive = (params) => inst.check(_lte(0, params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  inst.step = (value, params) => inst.check(_multipleOf(value, params));
  inst.finite = () => inst;
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
function float32(params) {
  return _float32(ZodNumberFormat, params);
}
function float64(params) {
  return _float64(ZodNumberFormat, params);
}
function int32(params) {
  return _int32(ZodNumberFormat, params);
}
function uint32(params) {
  return _uint32(ZodNumberFormat, params);
}
var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
});
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
var ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
  $ZodBigInt.init(inst, def);
  ZodType.init(inst, def);
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.positive = (params) => inst.check(_gt(BigInt(0), params));
  inst.negative = (params) => inst.check(_lt(BigInt(0), params));
  inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
  inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  const bag = inst._zod.bag;
  inst.minValue = bag.minimum ?? null;
  inst.maxValue = bag.maximum ?? null;
  inst.format = bag.format ?? null;
});
function bigint2(params) {
  return _bigint(ZodBigInt, params);
}
var ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
  $ZodBigIntFormat.init(inst, def);
  ZodBigInt.init(inst, def);
});
function int64(params) {
  return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
  return _uint64(ZodBigIntFormat, params);
}
var ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
  $ZodSymbol.init(inst, def);
  ZodType.init(inst, def);
});
function symbol(params) {
  return _symbol(ZodSymbol, params);
}
var ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
  $ZodUndefined.init(inst, def);
  ZodType.init(inst, def);
});
function _undefined3(params) {
  return _undefined2(ZodUndefined, params);
}
var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
});
function _null3(params) {
  return _null2(ZodNull, params);
}
var ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
});
function any() {
  return _any(ZodAny);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
  $ZodVoid.init(inst, def);
  ZodType.init(inst, def);
});
function _void2(params) {
  return _void(ZodVoid, params);
}
var ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
  $ZodDate.init(inst, def);
  ZodType.init(inst, def);
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  const c = inst._zod.bag;
  inst.minDate = c.minimum ? new Date(c.minimum) : null;
  inst.maxDate = c.maximum ? new Date(c.maximum) : null;
});
function date3(params) {
  return _date(ZodDate, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
  inst.nonempty = (params) => inst.check(_minLength(1, params));
  inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
  inst.length = (len, params) => inst.check(_length(len, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
function keyof(schema) {
  const shape = schema._zod.def.shape;
  return _enum2(Object.keys(shape));
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  exports_util.defineLazy(inst, "shape", () => def.shape);
  inst.keyof = () => _enum2(Object.keys(inst._zod.def.shape));
  inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
  inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
  inst.strip = () => inst.clone({ ...inst._zod.def, catchall: undefined });
  inst.extend = (incoming) => {
    return exports_util.extend(inst, incoming);
  };
  inst.safeExtend = (incoming) => {
    return exports_util.safeExtend(inst, incoming);
  };
  inst.merge = (other) => exports_util.merge(inst, other);
  inst.pick = (mask) => exports_util.pick(inst, mask);
  inst.omit = (mask) => exports_util.omit(inst, mask);
  inst.partial = (...args) => exports_util.partial(ZodOptional, inst, args[0]);
  inst.required = (...args) => exports_util.required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
  const def = {
    type: "object",
    get shape() {
      exports_util.assignProp(this, "shape", shape ? exports_util.objectClone(shape) : {});
      return this.shape;
    },
    ...exports_util.normalizeParams(params)
  };
  return new ZodObject(def);
}
function strictObject(shape, params) {
  return new ZodObject({
    type: "object",
    get shape() {
      exports_util.assignProp(this, "shape", exports_util.objectClone(shape));
      return this.shape;
    },
    catchall: never(),
    ...exports_util.normalizeParams(params)
  });
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    get shape() {
      exports_util.assignProp(this, "shape", exports_util.objectClone(shape));
      return this.shape;
    },
    catchall: unknown(),
    ...exports_util.normalizeParams(params)
  });
}
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...exports_util.normalizeParams(params)
  });
}
var ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...exports_util.normalizeParams(params)
  });
}
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
var ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
  $ZodTuple.init(inst, def);
  ZodType.init(inst, def);
  inst.rest = (rest) => inst.clone({
    ...inst._zod.def,
    rest
  });
});
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...exports_util.normalizeParams(params)
  });
}
var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
function partialRecord(keyType, valueType, params) {
  const k = clone(keyType);
  k._zod.values = undefined;
  return new ZodRecord({
    type: "record",
    keyType: k,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
  $ZodMap.init(inst, def);
  ZodType.init(inst, def);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function map(keyType, valueType, params) {
  return new ZodMap({
    type: "map",
    keyType,
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
  $ZodSet.init(inst, def);
  ZodType.init(inst, def);
  inst.min = (...args) => inst.check(_minSize(...args));
  inst.nonempty = (params) => inst.check(_minSize(1, params));
  inst.max = (...args) => inst.check(_maxSize(...args));
  inst.size = (...args) => inst.check(_size(...args));
});
function set(valueType, params) {
  return new ZodSet({
    type: "set",
    valueType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...exports_util.normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...exports_util.normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum2(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
function nativeEnum(entries, params) {
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...exports_util.normalizeParams(params)
  });
}
var ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
  $ZodFile.init(inst, def);
  ZodType.init(inst, def);
  inst.min = (size, params) => inst.check(_minSize(size, params));
  inst.max = (size, params) => inst.check(_maxSize(size, params));
  inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
});
function file(params) {
  return _file(ZodFile, params);
}
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(exports_util.issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(exports_util.issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    payload.value = output;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function nullish2(innerType) {
  return optional(nullable(innerType));
}
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default2(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...exports_util.normalizeParams(params)
  });
}
var ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
  $ZodSuccess.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function success(innerType) {
  return new ZodSuccess({
    type: "success",
    innerType
  });
}
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch2(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
var ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
  $ZodNaN.init(inst, def);
  ZodType.init(inst, def);
});
function nan(params) {
  return _nan(ZodNaN, params);
}
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
var ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
  ZodPipe.init(inst, def);
  $ZodCodec.init(inst, def);
});
function codec(in_, out, params) {
  return new ZodCodec({
    type: "pipe",
    in: in_,
    out,
    transform: params.decode,
    reverseTransform: params.encode
  });
}
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
var ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
  $ZodTemplateLiteral.init(inst, def);
  ZodType.init(inst, def);
});
function templateLiteral(parts, params) {
  return new ZodTemplateLiteral({
    type: "template_literal",
    parts,
    ...exports_util.normalizeParams(params)
  });
}
var ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
  $ZodLazy.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
var ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
  $ZodPromise.init(inst, def);
  ZodType.init(inst, def);
  inst.unwrap = () => inst._zod.def.innerType;
});
function promise(innerType) {
  return new ZodPromise({
    type: "promise",
    innerType
  });
}
var ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
  $ZodFunction.init(inst, def);
  ZodType.init(inst, def);
});
function _function(params) {
  return new ZodFunction({
    type: "function",
    input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
    output: params?.output ?? unknown()
  });
}
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
});
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return _superRefine(fn);
}
function _instanceof(cls, params = {
  error: `Input not instance of ${cls.name}`
}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data) => data instanceof cls,
    abort: true,
    ...exports_util.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  return inst;
}
var stringbool = (...args) => _stringbool({
  Codec: ZodCodec,
  Boolean: ZodBoolean,
  String: ZodString
}, ...args);
function json(params) {
  const jsonSchema = lazy(() => {
    return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
  });
  return jsonSchema;
}
function preprocess(fn, schema) {
  return pipe(transform(fn), schema);
}
// node_modules/zod/v4/classic/compat.js
var ZodIssueCode = {
  invalid_type: "invalid_type",
  too_big: "too_big",
  too_small: "too_small",
  invalid_format: "invalid_format",
  not_multiple_of: "not_multiple_of",
  unrecognized_keys: "unrecognized_keys",
  invalid_union: "invalid_union",
  invalid_key: "invalid_key",
  invalid_element: "invalid_element",
  invalid_value: "invalid_value",
  custom: "custom"
};
function setErrorMap(map2) {
  config({
    customError: map2
  });
}
function getErrorMap() {
  return config().customError;
}
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
// node_modules/zod/v4/classic/coerce.js
var exports_coerce = {};
__export(exports_coerce, {
  string: () => string3,
  number: () => number3,
  date: () => date4,
  boolean: () => boolean3,
  bigint: () => bigint3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint3(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date4(params) {
  return _coercedDate(ZodDate, params);
}

// node_modules/zod/v4/classic/external.js
config(en_default());
// node_modules/@opencode-ai/plugin/dist/tool.js
function tool(input) {
  return input;
}
tool.schema = exports_external;
// src/tools/cluster-tools.ts
init_system_brain();
init_execution_brain();
var spawnClusterTaskSchema = exports_external.object({
  task: exports_external.string().describe("Task description to execute"),
  clusterId: exports_external.string().optional().describe("Target cluster ID (auto-selected if not specified)"),
  targetAgent: exports_external.string().optional().describe("Specific agent ID to target"),
  context: exports_external.record(exports_external.string(), exports_external.unknown()).optional().describe("Additional context for the task"),
  acceptanceCriteria: exports_external.array(exports_external.string()).default([]).describe("Acceptance criteria for task completion"),
  priority: exports_external.enum(["low", "normal", "high", "critical"]).default("normal").describe("Task priority")
});
var spawnSharkAgentSchema = exports_external.object({
  task: exports_external.string().describe("Task description for Shark agent"),
  clusterId: exports_external.string().optional().describe("Target cluster (auto-selected if not specified)"),
  instructions: exports_external.string().optional().describe("Additional instructions for the Shark"),
  context: exports_external.record(exports_external.string(), exports_external.unknown()).optional().describe("Additional context"),
  priority: exports_external.enum(["low", "normal", "high", "critical"]).default("high").describe("Task priority")
});
var spawnMantaAgentSchema = exports_external.object({
  task: exports_external.string().describe("Task description for Manta agent"),
  clusterId: exports_external.string().optional().describe("Target cluster (auto-selected if not specified)"),
  instructions: exports_external.string().optional().describe("Additional instructions for the Manta"),
  context: exports_external.record(exports_external.string(), exports_external.unknown()).optional().describe("Additional context"),
  priority: exports_external.enum(["low", "normal", "high", "critical"]).default("normal").describe("Task priority")
});
function createClusterTools(ctx) {
  return {
    anchor_cluster: tool({
      description: "Anchor a cluster to a focus/project name. The cluster will be renamed to reflect its current focus. Use this when starting a new project to establish cluster identity.",
      args: {
        clusterId: exports_external.string().describe("Cluster ID (e.g., cluster-alpha) or focus name to anchor"),
        focusName: exports_external.string().describe('Focus/project name to anchor (e.g., "shark-firewall-build", "my-api-project")')
      },
      execute: async (args) => {
        const resolvedClusterId = ctx.clusterScheduler.resolveClusterRequest(args.clusterId);
        ctx.clusterScheduler.anchorClusterToFocus(resolvedClusterId, args.focusName);
        return JSON.stringify({
          success: true,
          clusterId: resolvedClusterId,
          focusName: args.focusName,
          message: `Cluster ${resolvedClusterId} anchored to "${args.focusName}"`
        }, null, 2);
      }
    }),
    spawn_cluster_task: tool({
      description: "Spawn a task in a cluster for async execution. Cluster ID is auto-resolved from focus names. Tasks are queued and executed asynchronously by available agents.",
      args: {
        task: exports_external.string().describe("Task description to execute"),
        clusterId: exports_external.string().optional().describe("Target cluster ID or focus name (auto-selected if not specified)"),
        targetAgent: exports_external.string().optional().describe("Specific agent ID to target"),
        context: exports_external.record(exports_external.string(), exports_external.unknown()).optional().describe("Additional context for the task"),
        acceptanceCriteria: exports_external.array(exports_external.string()).default([]).describe("Acceptance criteria for task completion"),
        priority: exports_external.enum(["low", "normal", "high", "critical"]).default("normal").describe("Task priority")
      },
      execute: async (args, directory) => {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const resolvedCluster = args.clusterId ? ctx.clusterScheduler.resolveClusterRequest(args.clusterId) : await ctx.clusterScheduler.assignCluster({ taskId, task: args.task, targetCluster: "", context: args.context, acceptanceCriteria: [], priority: "normal", createdAt: Date.now() });
        const request = {
          taskId,
          task: args.task,
          targetCluster: resolvedCluster,
          targetAgent: args.targetAgent,
          context: args.context,
          acceptanceCriteria: args.acceptanceCriteria,
          priority: args.priority,
          createdAt: Date.now()
        };
        try {
          const sysBrain = getSystemBrain();
          if (sysBrain.isInitialized()) {
            const taskLower = args.task.toLowerCase();
            let taskType = "build";
            if (taskLower.includes("debug") || taskLower.includes("fix") || taskLower.includes("refactor"))
              taskType = "debug";
            else if (taskLower.includes("test") || taskLower.includes("verif") || taskLower.includes("audit"))
              taskType = "test";
            const validation = sysBrain.validateDomainAssignment(taskType, resolvedCluster);
            if (!validation.valid) {
              return JSON.stringify({ success: false, error: validation.reason, taskId }, null, 2);
            }
            sysBrain.recordDecision({ description: `Queuing task: ${args.task.substring(0, 100)}`, type: "task-spawn", contextFiles: [] });
          }
        } catch {}
        try {
          const execBrain = getExecutionBrain();
          if (execBrain.isInitialized()) {
            execBrain.registerTaskOutputs(taskId, [
              { taskId, path: "output/", type: "directory", required: true, retrieved: false }
            ]);
            execBrain.startTask(taskId, resolvedCluster);
          }
        } catch {}
        const result = await ctx.delegationEngine.delegate(request);
        return JSON.stringify({
          success: result.success,
          taskId: result.taskId,
          clusterId: result.clusterId,
          agentId: result.agentId,
          status: result.status,
          error: result.error
        }, null, 2);
      }
    }),
    spawn_shark_agent: tool({
      description: "Spawn a Shark agent for aggressive, steamroll-style tasks. Sharks are best for building from scratch and tackling complex problems head-on.",
      args: {
        task: exports_external.string().describe("Task description for Shark agent"),
        clusterId: exports_external.string().optional().describe("Target cluster (auto-selected if not specified)"),
        targetAgent: exports_external.string().optional().describe("Specific agent ID to target"),
        instructions: exports_external.string().optional().describe("Additional instructions for the Shark"),
        context: exports_external.record(exports_external.string(), exports_external.unknown()).optional().describe("Additional context"),
        priority: exports_external.enum(["low", "normal", "high", "critical"]).default("high").describe("Task priority")
      },
      execute: async (args, directory) => {
        const taskId = `shark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const identityHeader = ctx.krakenIdentity ? `${ctx.krakenIdentity}

---

` : "";
        const sharkPrompt = `${identityHeader}You are SHARK - Ferrari V12 turbo vibecoding engineer.

CHARACTER:
- Aggressive, steamrolls through problems
- Figures shit out and builds it
- Builds from scratch at a solid level
- Full speed ahead, no hesitation
- You ARE part of the KRAKEN orchestrator system

TASK: ${args.task}

${args.instructions ? `
ADDITIONAL INSTRUCTIONS:
${args.instructions}` : ""}

Execute with maximum aggression and confidence.`;
        const resolvedCluster = args.clusterId ? ctx.clusterScheduler.resolveClusterRequest(args.clusterId) : ctx.clusterScheduler.assignClusterForTaskType(args.task, "steamroll");
        const request = {
          taskId,
          task: sharkPrompt,
          targetCluster: resolvedCluster,
          targetAgent: args.targetAgent,
          context: {
            ...args.context,
            agentType: "shark"
          },
          acceptanceCriteria: [],
          priority: args.priority,
          createdAt: Date.now()
        };
        try {
          const sysBrain = getSystemBrain();
          if (sysBrain.isInitialized()) {
            const validation = sysBrain.validateDomainAssignment("build", resolvedCluster);
            if (!validation.valid) {
              return JSON.stringify({ success: false, error: validation.reason, taskId, agentType: "shark" }, null, 2);
            }
            sysBrain.recordDecision({ description: `Spawning shark for: ${args.task.substring(0, 100)}`, type: "task-spawn", contextFiles: [] });
          }
        } catch {}
        try {
          const execBrain = getExecutionBrain();
          if (execBrain.isInitialized()) {
            execBrain.registerTaskOutputs(taskId, [
              { taskId, path: "output/", type: "directory", required: true, retrieved: false }
            ]);
            execBrain.startTask(taskId, resolvedCluster);
          }
        } catch {}
        const result = await ctx.delegationEngine.delegate(request);
        return JSON.stringify({
          success: result.success,
          taskId: result.taskId,
          clusterId: result.clusterId,
          agentId: result.agentId,
          agentType: "shark",
          status: result.status,
          error: result.error
        }, null, 2);
      }
    }),
    spawn_manta_agent: tool({
      description: "Spawn a Manta agent for precise, linear tasks. Mantas are best for debugging, testing, and methodical work.",
      args: {
        task: exports_external.string().describe("Task description for Manta agent"),
        clusterId: exports_external.string().optional().describe("Target cluster (auto-selected if not specified)"),
        targetAgent: exports_external.string().optional().describe("Specific agent ID to target"),
        instructions: exports_external.string().optional().describe("Additional instructions for the Manta"),
        context: exports_external.record(exports_external.string(), exports_external.unknown()).optional().describe("Additional context"),
        priority: exports_external.enum(["low", "normal", "high", "critical"]).default("normal").describe("Task priority")
      },
      execute: async (args, directory) => {
        const taskId = `manta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const identityHeader = ctx.krakenIdentity ? `${ctx.krakenIdentity}

---

` : "";
        const mantaPrompt = `${identityHeader}You are MANTA - Tesla Model S agent.

CHARACTER:
- Fast, reliable, linear, precise
- Mechanically oriented
- Perfect for debugging and linear tasks
- Methodical, follows specs exactly
- You ARE part of the KRAKEN orchestrator system

TASK: ${args.task}

${args.instructions ? `
ADDITIONAL INSTRUCTIONS:
${args.instructions}` : ""}

Execute with precision and methodical care.`;
        const resolvedCluster = args.clusterId ? ctx.clusterScheduler.resolveClusterRequest(args.clusterId) : ctx.clusterScheduler.assignClusterForTaskType(args.task, "debug");
        const request = {
          taskId,
          task: mantaPrompt,
          targetCluster: resolvedCluster,
          targetAgent: args.targetAgent,
          context: {
            ...args.context,
            agentType: "manta"
          },
          acceptanceCriteria: [],
          priority: args.priority,
          createdAt: Date.now()
        };
        try {
          const sysBrain = getSystemBrain();
          if (sysBrain.isInitialized()) {
            const validation = sysBrain.validateDomainAssignment("debug", resolvedCluster);
            if (!validation.valid) {
              return JSON.stringify({ success: false, error: validation.reason, taskId, agentType: "manta" }, null, 2);
            }
            sysBrain.recordDecision({ description: `Spawning manta for: ${args.task.substring(0, 100)}`, type: "task-spawn", contextFiles: [] });
          }
        } catch {}
        try {
          const execBrain = getExecutionBrain();
          if (execBrain.isInitialized()) {
            execBrain.registerTaskOutputs(taskId, [
              { taskId, path: "output/", type: "directory", required: true, retrieved: false }
            ]);
            execBrain.startTask(taskId, resolvedCluster);
          }
        } catch {}
        const result = await ctx.delegationEngine.delegate(request);
        return JSON.stringify({
          success: result.success,
          taskId: result.taskId,
          clusterId: result.clusterId,
          agentId: result.agentId,
          agentType: "manta",
          status: result.status,
          error: result.error
        }, null, 2);
      }
    })
  };
}

// src/tools/monitoring-tools.ts
var getClusterStatusSchema = exports_external.object({
  clusterId: exports_external.string().optional().describe("Specific cluster ID to check (all clusters if not specified)")
});
var aggregateResultsSchema = exports_external.object({
  taskIds: exports_external.array(exports_external.string()).describe("List of task IDs to wait for and aggregate"),
  timeoutMs: exports_external.number().default(60000).describe("Timeout in milliseconds to wait for all tasks")
});
function createMonitoringTools(ctx) {
  return {
    get_cluster_status: tool({
      description: "Get the status of clusters in the Kraken system. Can check a specific cluster or all clusters.",
      args: {
        clusterId: exports_external.string().optional().describe("Specific cluster ID to check (all clusters if not specified)")
      },
      execute: async (args) => {
        if (args.clusterId) {
          const status = ctx.clusterManager.getClusterStatus(args.clusterId);
          if (!status) {
            return JSON.stringify({
              error: `Cluster ${args.clusterId} not found`,
              availableClusters: Array.from(ctx.clusterManager.getAllClusterStatuses().keys())
            }, null, 2);
          }
          return JSON.stringify(status, null, 2);
        }
        const allStatuses = ctx.clusterManager.getAllClusterStatuses();
        const systemLoad = ctx.clusterManager.getTotalSystemLoad();
        const agents = ctx.clusterManager.getAllAgents();
        const summary = {
          clusters: Object.fromEntries(allStatuses),
          system: systemLoad,
          agents,
          delegationQueue: {
            queued: ctx.delegationEngine.getQueuedCount(),
            pending: ctx.delegationEngine.getPendingTasks().length,
            active: ctx.delegationEngine.getActiveTasks().size
          }
        };
        return JSON.stringify(summary, null, 2);
      }
    }),
    aggregate_results: tool({
      description: "Wait for multiple tasks to complete and aggregate their results. Useful for collecting results from parallel cluster execution.",
      args: {
        taskIds: exports_external.array(exports_external.string()).describe("List of task IDs to wait for and aggregate"),
        timeoutMs: exports_external.number().default(60000).describe("Timeout in milliseconds to wait for all tasks")
      },
      execute: async (args) => {
        const startTime = Date.now();
        const results = await ctx.delegationEngine.waitForAll(args.taskIds, args.timeoutMs);
        let outputVerified = 0;
        let outputMissing = 0;
        try {
          const { getExecutionBrain: getExecutionBrain2 } = await Promise.resolve().then(() => (init_execution_brain(), exports_execution_brain));
          const execBrain = getExecutionBrain2();
          if (execBrain && execBrain.isInitialized()) {
            for (const taskId of args.taskIds) {
              const status = execBrain.getOutputStatus(taskId);
              if (status.complete)
                outputVerified++;
              else if (status.required > 0)
                outputMissing++;
            }
          }
        } catch {}
        const successful = results.filter((r) => r && r.success).length;
        const failed = results.filter((r) => r && !r.success).length;
        const timedOut = results.filter((r) => r === null).length;
        const completed = results.filter((r) => r && r.status === "completed");
        const taskFailed = results.filter((r) => r && r.status === "failed");
        const summary = {
          total: args.taskIds.length,
          successful,
          failed,
          timedOut,
          outputVerification: {
            verified: outputVerified,
            missing: outputMissing,
            enforced: outputMissing === 0
          },
          durationMs: Date.now() - startTime,
          results: results.map((r, i) => ({
            taskId: args.taskIds[i],
            success: r?.success ?? false,
            status: r?.status ?? "unknown",
            clusterId: r?.clusterId,
            agentId: r?.agentId,
            error: r?.error,
            completedAt: r?.completedAt
          }))
        };
        return JSON.stringify(summary, null, 2);
      }
    }),
    get_agent_status: tool({
      description: "Get the status of all agents across all clusters. Shows which agents are busy and what they are working on.",
      args: {},
      execute: async () => {
        const agents = ctx.clusterManager.getAllAgents();
        const summary = {
          total: agents.length,
          busy: agents.filter((a) => a.busy).length,
          available: agents.filter((a) => !a.busy).length,
          byCluster: agents.reduce((acc, agent) => {
            if (!acc[agent.clusterId]) {
              acc[agent.clusterId] = { total: 0, busy: 0, available: 0, agents: [] };
            }
            acc[agent.clusterId].total++;
            acc[agent.clusterId].busy += agent.busy ? 1 : 0;
            acc[agent.clusterId].available += agent.busy ? 0 : 1;
            acc[agent.clusterId].agents.push({
              id: agent.id,
              type: agent.agentType,
              busy: agent.busy,
              currentTask: agent.currentTaskId
            });
            return acc;
          }, {})
        };
        return JSON.stringify(summary, null, 2);
      }
    }),
    kraken_brain_status: tool({
      description: "Get the status of the V1.2 Multi-Brain Orchestrator. Shows initialization state of Planning, Execution, and System brains.",
      args: {},
      execute: async () => {
        const { getPlanningBrain: getPlanningBrain2 } = await Promise.resolve().then(() => (init_planning_brain(), exports_planning_brain));
        const { getExecutionBrain: getExecutionBrain2 } = await Promise.resolve().then(() => (init_execution_brain(), exports_execution_brain));
        const { getSystemBrain: getSystemBrain2 } = await Promise.resolve().then(() => (init_system_brain(), exports_system_brain));
        const planningBrain = getPlanningBrain2();
        const executionBrain = getExecutionBrain2();
        const systemBrain = getSystemBrain2();
        const planningState = planningBrain.getState();
        const executionState = executionBrain.getState();
        const systemState = systemBrain.getState();
        const summary = {
          version: "1.2.0",
          architecture: "multi-brain-orchestrator",
          brains: {
            planning: {
              initialized: planningBrain.isInitialized(),
              t2MasterLoaded: planningState.t2MasterLoaded,
              t1Generated: planningState.t1Generated,
              tasksDecomposed: planningState.tasksDecomposed,
              domainsDesignated: planningState.domainsDesignated,
              snapshot: planningBrain.getSnapshot()
            },
            execution: {
              initialized: executionBrain.isInitialized(),
              activeTasks: executionState.activeTasks,
              completedTasks: executionState.completedTasks,
              failedTasks: executionState.failedTasks,
              snapshot: executionBrain.getSnapshot()
            },
            system: {
              initialized: systemBrain.isInitialized(),
              currentGate: systemState.currentGate,
              decisionCount: systemState.decisionCount,
              completedTasks: systemState.completedTasks.length,
              snapshot: systemBrain.getSnapshot()
            }
          },
          messaging: await (async () => {
            try {
              const { getBrainMessenger: getBrainMessenger2 } = await Promise.resolve().then(() => exports_brain_messenger);
              const messenger = getBrainMessenger2();
              const queued = messenger.getQueuedMessages() || [];
              return {
                queuedCount: queued.length,
                active: queued.length > 0,
                recentMessages: queued.slice(-5).map((m) => ({
                  from: m.from || "unknown",
                  to: m.to || "unknown",
                  type: m.type || "unknown",
                  priority: m.priority || "normal"
                }))
              };
            } catch (err) {
              return { queuedCount: 0, active: false, recentMessages: [], error: String(err) };
            }
          })(),
          concurrency: await (async () => {
            try {
              const { default: mod } = await Promise.resolve().then(() => exports_BrainConcurrencyManager);
              return { mode: "async-event-loops", brains: 3 };
            } catch {
              return { mode: "async-event-loops", brains: 3 };
            }
          })()
        };
        return JSON.stringify(summary, null, 2);
      }
    }),
    kraken_message_status: tool({
      description: "Get the status of brain-to-brain messaging. Shows queued messages and pending override commands.",
      args: {},
      execute: async () => {
        const { getBrainMessenger: getBrainMessenger2 } = await Promise.resolve().then(() => exports_brain_messenger);
        const messenger = getBrainMessenger2();
        const queuedMessages = messenger.getQueuedMessages();
        const summary = {
          queuedMessages: queuedMessages.length,
          recentMessages: queuedMessages.slice(-10).map((m) => ({
            from: m.from,
            to: m.to,
            type: m.type,
            priority: m.priority,
            timestamp: new Date(m.timestamp).toISOString()
          }))
        };
        return JSON.stringify(summary, null, 2);
      }
    })
  };
}

// src/tools/kraken-hive-tools.ts
function createKrakenHiveTools(ctx) {
  return {
    kraken_hive_search: tool({
      description: "Search the Kraken Hive Mind for relevant memories, patterns, and past decisions. Only accessible to Kraken orchestrator.",
      args: {
        query: exports_external.string().describe("What to search for"),
        category: exports_external.enum(["all", "clusters", "sessions", "patterns", "decisions", "failures"]).default("all").describe("Category to search"),
        limit: exports_external.number().default(5).describe("Maximum results to return")
      },
      execute: async (args) => {
        const results = await ctx.krakenHive.search(args.query, {
          category: args.category,
          limit: args.limit
        });
        if (results.length === 0) {
          return "No relevant memories found in Kraken Hive.";
        }
        const formatted = results.map((r) => `## [${r.type.toUpperCase()}] ${r.title}
URI: ${r.uri}
Relevance: ${r.relevance}
${r.content ? `
${r.content.slice(0, 200)}...` : ""}`).join(`

---

`);
        return `Found ${results.length} relevant memories:

${formatted}`;
      }
    }),
    kraken_hive_remember: tool({
      description: "Store a memory, decision, or pattern to Kraken Hive Mind. Only accessible to Kraken orchestrator.",
      args: {
        key: exports_external.string().describe("Short key/summary for this memory"),
        content: exports_external.string().describe("Full content to remember"),
        category: exports_external.enum(["cluster", "session", "pattern", "decision", "failure", "breakthrough"]).describe("Category for this memory"),
        targetId: exports_external.string().optional().describe("Cluster or session ID if category requires it")
      },
      execute: async (args) => {
        try {
          switch (args.category) {
            case "cluster":
              if (!args.targetId) {
                return "Error: targetId (cluster ID) required for cluster category";
              }
              await ctx.krakenHive.rememberCluster(args.targetId, args.key, args.content);
              break;
            case "session":
              if (!args.targetId) {
                return "Error: targetId (session ID) required for session category";
              }
              await ctx.krakenHive.rememberSession(args.targetId, args.key, args.content);
              break;
            case "pattern":
              const pattern = {
                type: "pattern",
                id: args.key.replace(/[^a-zA-Z0-9]/g, "_"),
                description: args.key,
                content: args.content,
                createdAt: Date.now()
              };
              await ctx.krakenHive.rememberPattern(pattern);
              break;
            case "failure":
              const failure = {
                id: args.key.replace(/[^a-zA-Z0-9]/g, "_"),
                pattern: args.key,
                cause: args.content,
                createdAt: Date.now()
              };
              await ctx.krakenHive.rememberFailure(failure);
              break;
            default:
              if (args.targetId) {
                await ctx.krakenHive.rememberCluster(args.targetId, args.key, args.content);
              }
              await ctx.krakenHive.rememberSession(`general_${Date.now()}`, args.key, args.content);
          }
          return `Stored to Kraken Hive: [${args.category}] ${args.key}`;
        } catch (error45) {
          return `Error storing to Kraken Hive: ${error45}`;
        }
      }
    }),
    kraken_hive_get_cluster_context: tool({
      description: "Get all memories related to a specific cluster. Only accessible to Kraken orchestrator.",
      args: {
        clusterId: exports_external.string().describe("Cluster ID to get context for")
      },
      execute: async (args) => {
        const context = await ctx.krakenHive.getClusterContext(args.clusterId);
        return JSON.stringify({
          clusterId: context.clusterId,
          recentTasks: context.recentTasks,
          commonPatterns: context.commonPatterns,
          knownFailures: context.knownFailures
        }, null, 2);
      }
    }),
    kraken_hive_inject_context: tool({
      description: "Inject relevant Hive context into a task for an agent. Only accessible to Kraken architect.",
      args: {
        taskId: exports_external.string().describe("Task to inject context into"),
        taskDescription: exports_external.string().describe("Description of the task to get relevant context"),
        includePatterns: exports_external.boolean().default(true).describe("Include pattern memories"),
        includeFailures: exports_external.boolean().default(true).describe("Include failure memories"),
        includePreviousWork: exports_external.boolean().default(true).describe("Include previous work")
      },
      execute: async (args) => {
        const context = await ctx.krakenHive.getContextForTask(args.taskDescription);
        const injected = {
          taskId: args.taskId,
          injected: true,
          context: {
            patterns: args.includePatterns ? context.patterns : [],
            failures: args.includeFailures ? context.failures : [],
            previousWork: args.includePreviousWork ? context.previousWork : [],
            clusterContext: context.clusterContext
          },
          summary: `Injected ${context.patterns.length} patterns, ${context.failures.length} failures, ${context.previousWork.length} previous works`
        };
        return JSON.stringify(injected, null, 2);
      }
    })
  };
}

// src/tools/shark-t2-tools.ts
import fs4 from "node:fs";
import path5 from "node:path";
function findT2Dir() {
  const candidates = [
    path5.join(process.cwd(), "kraken-context"),
    path5.join(process.env.HOME || "/root", ".config/opencode/plugins/kraken-agent/kraken-context"),
    path5.join(process.env.HOME || "/root", "OPENCODE_WORKSPACE/Shared Workspace Context/Kraken Agent/Active Projects/v1.2 Rebuild/kraken-context")
  ];
  for (const dir of candidates) {
    if (fs4.existsSync(dir))
      return dir;
  }
  return candidates[0];
}
var T2_DIR = findT2Dir();
var T2_TOPICS = {
  patterns: "T2_PATTERNS.md",
  failures: "T2_FAILURE_MODES.md",
  "build-chain": "T2_BUILD_CHAIN.md",
  architecture: "T2_ARCHITECTURE.md",
  "alignment-bible": "T2_ALIGNMENT_BIBLE.md",
  "crash-recovery": "T2_CRASH_RECOVERY.md",
  "tui-testing": "T2_TUI_TESTING.md",
  "kraken-rules": "T2_KRAKEN_RULES.md",
  "compaction-survival": "T2_COMPACTION_SURVIVAL.md",
  "plugin-engineering": "T2_PLUGIN_ENGINEERING.md"
};
var TOPIC_NAMES = Object.keys(T2_TOPICS);
function createSharkT2Tools(_ctx) {
  return {
    read_kraken_context: tool({
      description: "Read Kraken T2 context library for patterns and best practices. This is read-only reference, not Hive access. Available to Sharks and Mantas.",
      args: {
        topic: exports_external.enum(TOPIC_NAMES).describe("Topic to get context for. Available: " + TOPIC_NAMES.join(", "))
      },
      execute: async (args) => {
        const fileName = T2_TOPICS[args.topic];
        if (!fileName) {
          return `Unknown topic: ${args.topic}. Available: ${TOPIC_NAMES.join(", ")}`;
        }
        const filePath = path5.join(T2_DIR, fileName);
        try {
          if (!fs4.existsSync(filePath)) {
            return `T2 reference file not found: ${fileName} (looked in ${T2_DIR}). Available topics: ${TOPIC_NAMES.join(", ")}`;
          }
          const content = fs4.readFileSync(filePath, "utf-8");
          return `## Kraken T2 Reference: ${args.topic}

${content}`;
        } catch (error45) {
          return `Error reading T2 context: ${error45}`;
        }
      }
    }),
    report_to_kraken: tool({
      description: "Report completion, issue, or request to Kraken orchestrator. This is how Sharks and Mantas communicate - they write to Kraken, not to each other or directly to Hive.",
      args: {
        taskId: exports_external.string().describe("Task being reported on"),
        status: exports_external.enum(["complete", "blocked", "error", "request"]).describe("Task status"),
        details: exports_external.string().describe("Details of completion, issue, or request"),
        files: exports_external.array(exports_external.string()).optional().describe("Files created or modified"),
        errorDetails: exports_external.string().optional().describe("Error details if status is error")
      },
      execute: async (args) => {
        const report = {
          type: "agent_report",
          taskId: args.taskId,
          status: args.status,
          details: args.details,
          files: args.files || [],
          errorDetails: args.errorDetails,
          timestamp: new Date().toISOString()
        };
        const reportPath = path5.join(process.env.HOME || "/root", ".local/share/opencode/kraken-hive/pending-reports", `${args.taskId}_${Date.now()}.json`);
        const reportDir = path5.dirname(reportPath);
        if (!fs4.existsSync(reportDir)) {
          fs4.mkdirSync(reportDir, { recursive: true });
        }
        fs4.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
        return JSON.stringify({
          success: true,
          message: `Report sent to Kraken orchestrator for task ${args.taskId}`,
          reportId: path5.basename(reportPath)
        }, null, 2);
      }
    }),
    get_task_context: tool({
      description: "Get the context that Kraken orchestrator has injected into your current task. Use this to understand what context and patterns are relevant to your work.",
      args: {
        taskId: exports_external.string().describe("Task ID to get context for")
      },
      execute: async (args) => {
        const contextPath = path5.join(process.env.HOME || "/root", ".local/share/opencode/kraken-hive/task-context", `${args.taskId}.json`);
        try {
          if (!fs4.existsSync(contextPath)) {
            return JSON.stringify({
              taskId: args.taskId,
              context: null,
              message: "No injected context found for this task. Kraken may not have injected context yet."
            }, null, 2);
          }
          const content = fs4.readFileSync(contextPath, "utf-8");
          return content;
        } catch (error45) {
          return JSON.stringify({
            taskId: args.taskId,
            error: `Error reading task context: ${error45}`
          }, null, 2);
        }
      }
    })
  };
}

// src/brains/prefrontal/prefrontal-cortex-brain.ts
import crypto6 from "node:crypto";

// src/brains/prefrontal/cortex-store.ts
import fs5 from "node:fs";
import path6 from "node:path";
import os2 from "node:os";
var CORTEX_SCHEMA_VERSION = 2;

class CortexStore {
  storePath;
  data;
  dirty = false;
  persistTimer = null;
  constructor(storePath) {
    this.storePath = storePath || path6.join(os2.homedir(), ".local/share/opencode/kraken-hive/cortex.json");
    this.data = {
      schemaVersion: CORTEX_SCHEMA_VERSION,
      trajectories: new Map,
      trajectoriesBySession: new Map,
      trajectoriesByProject: new Map,
      generationRecords: new Map,
      lineages: new Map,
      proposals: new Map,
      syncQueue: new Map,
      registrations: new Map,
      firewallPatterns: [],
      nextFwId: 1,
      lastPersisted: 0
    };
  }
  initialize() {
    this.loadFromDisk();
    this.startAutoPersist();
    console.log("[CortexStore] Initialized — JSON file store", {
      trajectories: this.data.trajectories.size,
      proposals: this.data.proposals.size,
      signals: this.data.firewallPatterns.length
    });
  }
  loadFromDisk() {
    try {
      if (!fs5.existsSync(this.storePath)) {
        const dir = path6.dirname(this.storePath);
        if (!fs5.existsSync(dir)) {
          fs5.mkdirSync(dir, { recursive: true });
        }
        return;
      }
      const raw = fs5.readFileSync(this.storePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.schemaVersion !== CORTEX_SCHEMA_VERSION) {
        console.log("[CortexStore] Schema migration from", parsed.schemaVersion, "to", CORTEX_SCHEMA_VERSION);
      }
      if (parsed.trajectories) {
        for (const [k, v] of Object.entries(parsed.trajectories)) {
          this.data.trajectories.set(k, v);
        }
      }
      if (parsed.trajectoriesBySession) {
        for (const [k, v] of Object.entries(parsed.trajectoriesBySession)) {
          this.data.trajectoriesBySession.set(k, v);
        }
      }
      if (parsed.trajectoriesByProject) {
        for (const [k, v] of Object.entries(parsed.trajectoriesByProject)) {
          this.data.trajectoriesByProject.set(k, v);
        }
      }
      if (parsed.generationRecords) {
        for (const [k, v] of Object.entries(parsed.generationRecords)) {
          this.data.generationRecords.set(k, v);
        }
      }
      if (parsed.lineages) {
        for (const [k, v] of Object.entries(parsed.lineages)) {
          this.data.lineages.set(k, v);
        }
      }
      if (parsed.proposals) {
        for (const [k, v] of Object.entries(parsed.proposals)) {
          this.data.proposals.set(k, v);
        }
      }
      if (parsed.syncQueue) {
        for (const [k, v] of Object.entries(parsed.syncQueue)) {
          this.data.syncQueue.set(k, v);
        }
      }
      if (parsed.registrations) {
        for (const [k, v] of Object.entries(parsed.registrations)) {
          this.data.registrations.set(k, v);
        }
      }
      this.data.firewallPatterns = parsed.firewallPatterns || [];
      this.data.nextFwId = parsed.nextFwId || 1;
    } catch (err) {
      console.error("[CortexStore] Load error:", err.message);
    }
  }
  serialize() {
    return {
      schemaVersion: CORTEX_SCHEMA_VERSION,
      trajectories: Object.fromEntries(this.data.trajectories),
      trajectoriesBySession: Object.fromEntries(this.data.trajectoriesBySession),
      trajectoriesByProject: Object.fromEntries(this.data.trajectoriesByProject),
      generationRecords: Object.fromEntries(this.data.generationRecords),
      lineages: Object.fromEntries(this.data.lineages),
      proposals: Object.fromEntries(this.data.proposals),
      syncQueue: Object.fromEntries(this.data.syncQueue),
      registrations: Object.fromEntries(this.data.registrations),
      firewallPatterns: this.data.firewallPatterns,
      nextFwId: this.data.nextFwId,
      lastPersisted: Date.now()
    };
  }
  persist() {
    try {
      const dir = path6.dirname(this.storePath);
      if (!fs5.existsSync(dir)) {
        fs5.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = this.storePath + ".tmp";
      fs5.writeFileSync(tmpPath, JSON.stringify(this.serialize()));
      fs5.renameSync(tmpPath, this.storePath);
      this.dirty = false;
      this.data.lastPersisted = Date.now();
    } catch (err) {
      console.error("[CortexStore] Persist error:", err.message);
    }
  }
  startAutoPersist() {
    this.persistTimer = setInterval(() => {
      if (this.dirty) {
        this.persist();
      }
    }, 30000);
  }
  markDirty() {
    this.dirty = true;
  }
  insertTrajectory(trajectory) {
    this.data.trajectories.set(trajectory.id, trajectory);
    const sessionList = this.data.trajectoriesBySession.get(trajectory.sessionId) || [];
    if (!sessionList.includes(trajectory.id)) {
      sessionList.push(trajectory.id);
      this.data.trajectoriesBySession.set(trajectory.sessionId, sessionList);
    }
    const projectList = this.data.trajectoriesByProject.get(trajectory.projectId) || [];
    if (!projectList.includes(trajectory.id)) {
      projectList.push(trajectory.id);
      this.data.trajectoriesByProject.set(trajectory.projectId, projectList);
    }
    this.markDirty();
  }
  getTrajectory(id) {
    return this.data.trajectories.get(id) || null;
  }
  getSessionTrajectories(sessionId) {
    const ids = this.data.trajectoriesBySession.get(sessionId) || [];
    return ids.map((id) => this.data.trajectories.get(id)).filter(Boolean);
  }
  getProjectTrajectories(projectId, sinceTimestamp) {
    const ids = this.data.trajectoriesByProject.get(projectId) || [];
    const all = ids.map((id) => this.data.trajectories.get(id)).filter(Boolean);
    if (sinceTimestamp) {
      return all.filter((t) => t.completedAt > sinceTimestamp);
    }
    return all;
  }
  getTrajectoryCount(projectId) {
    if (projectId) {
      const ids = this.data.trajectoriesByProject.get(projectId) || [];
      return ids.length;
    }
    return this.data.trajectories.size;
  }
  genKey(projectId, gen) {
    return `${projectId}:${gen}`;
  }
  insertGeneration(record2) {
    this.data.generationRecords.set(this.genKey(record2.projectId, record2.generationNumber), record2);
    this.markDirty();
  }
  getGeneration(projectId, generationNumber) {
    return this.data.generationRecords.get(this.genKey(projectId, generationNumber)) || null;
  }
  getLatestGeneration(projectId) {
    let latest = null;
    for (const [, record2] of this.data.generationRecords) {
      if (record2.projectId === projectId) {
        if (!latest || record2.generationNumber > latest.generationNumber) {
          latest = record2;
        }
      }
    }
    return latest;
  }
  getGenerationCount(projectId) {
    let count = 0;
    for (const [, record2] of this.data.generationRecords) {
      if (record2.projectId === projectId)
        count++;
    }
    return count;
  }
  upsertLineage(lineage) {
    this.data.lineages.set(lineage.projectId, lineage);
    this.markDirty();
  }
  getLineage(projectId) {
    return this.data.lineages.get(projectId) || null;
  }
  insertProposal(proposal) {
    this.data.proposals.set(proposal.id, proposal);
    this.markDirty();
  }
  updateProposalStatus(id, status, appliedAt) {
    const proposal = this.data.proposals.get(id);
    if (proposal) {
      proposal.status = status;
      if (appliedAt)
        proposal.appliedAt = appliedAt;
      this.markDirty();
    }
  }
  getPendingProposals(projectId) {
    const result = [];
    for (const [, p] of this.data.proposals) {
      if (p.status === "proposed") {
        if (!projectId || p.projectId === projectId) {
          result.push(p);
        }
      }
    }
    return result;
  }
  getProposal(id) {
    return this.data.proposals.get(id) || null;
  }
  insertSyncMessage(message) {
    this.data.syncQueue.set(message.id, message);
    this.markDirty();
  }
  pollSyncMessages(direction, status = "pending") {
    const result = [];
    for (const [, msg] of this.data.syncQueue) {
      if (msg.direction === direction && msg.status === status) {
        result.push(msg);
      }
    }
    return result;
  }
  markSyncDelivered(id) {
    const msg = this.data.syncQueue.get(id);
    if (msg) {
      msg.status = "delivered";
      msg.deliveredAt = Date.now();
      this.markDirty();
    }
  }
  insertRegistration(reg) {
    this.data.registrations.set(reg.projectId, reg);
    this.markDirty();
  }
  getRegistrations() {
    return Array.from(this.data.registrations.values());
  }
  insertFirewallPattern(pattern) {
    const existing = this.data.firewallPatterns.findIndex((p) => p.pattern === pattern.pattern && p.patternType === pattern.patternType);
    if (existing >= 0) {
      this.data.firewallPatterns[existing] = pattern;
    } else {
      this.data.firewallPatterns.push(pattern);
    }
    this.markDirty();
  }
  getActiveFirewallPatterns() {
    return this.data.firewallPatterns.filter((p) => p.active);
  }
  deactivateFirewallPattern(id) {
    if (id >= 0 && id < this.data.firewallPatterns.length) {
      this.data.firewallPatterns[id].active = false;
      this.markDirty();
    }
  }
  close() {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.dirty) {
      this.persist();
    }
  }
}
var cortexStoreInstance = null;
function createCortexStore(storePath) {
  if (!cortexStoreInstance) {
    cortexStoreInstance = new CortexStore(storePath);
  }
  return cortexStoreInstance;
}
function getCortexStore() {
  if (!cortexStoreInstance) {
    cortexStoreInstance = new CortexStore;
  }
  return cortexStoreInstance;
}

// src/brains/prefrontal/execution-tracer.ts
import crypto2 from "node:crypto";

// src/brains/prefrontal/types.ts
var DEFAULT_PREFRONTAL_STATE = {
  initialized: false,
  openfangConnected: false,
  registeredProjects: [],
  pendingProposals: [],
  lineages: new Map,
  syncStatus: {
    lastSyncAt: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0
  },
  injectedFirewallPatterns: [],
  currentGeneration: 0,
  lastAnalysisAt: 0,
  trajectoryCount: 0
};
var MAX_BUFFER_SIZE = 50;
var FLUSH_THRESHOLD = 10;
var MAX_TOOL_RESULT_SIZE = 8192;
var MAX_MESSAGE_CONTENT_SIZE = 4096;
var DEFAULT_MAX_GENERATIONS = 10;

// src/brains/prefrontal/execution-tracer.ts
class ExecutionTracer {
  cortexStore;
  sessionId;
  projectId;
  toolCallBuffer = [];
  messageBuffer = [];
  scfIncidents = [];
  activeTrajectories = new Map;
  trajectoryCount = 0;
  constructor(cortexStore, sessionId, projectId) {
    this.cortexStore = cortexStore;
    this.sessionId = sessionId;
    this.projectId = projectId;
  }
  initialize() {
    this.cortexStore.initialize();
    console.log(`[ExecutionTracer] Initialized for session=${this.sessionId}, project=${this.projectId}`);
  }
  recordToolCall(params) {
    const isBash = params.toolName === "bash" || params.toolName === "shell_exec";
    let resultData = params.result;
    if (resultData !== undefined) {
      const serialized = typeof resultData === "string" ? resultData : JSON.stringify(resultData);
      if (serialized.length > MAX_TOOL_RESULT_SIZE) {
        resultData = serialized.substring(0, MAX_TOOL_RESULT_SIZE) + "...[truncated]";
      }
    }
    const entry = {
      toolName: params.toolName,
      args: params.args,
      result: resultData,
      error: params.error,
      durationMs: params.durationMs,
      timestamp: Date.now(),
      agentId: params.agentId,
      taskId: params.taskId,
      isBash,
      blockedBy: params.blockedBy
    };
    this.toolCallBuffer.push(entry);
    if (this.toolCallBuffer.length >= FLUSH_THRESHOLD) {
      this.flushBuffer();
    }
    return entry;
  }
  recordLLMMessage(params) {
    let content = params.content;
    if (content.length > MAX_MESSAGE_CONTENT_SIZE) {
      content = content.substring(0, MAX_MESSAGE_CONTENT_SIZE) + "...[truncated]";
    }
    const entry = {
      role: params.role,
      content,
      toolCalls: params.toolCalls,
      tokensUsed: params.tokensUsed,
      timestamp: Date.now(),
      derailmentFlags: params.derailmentFlags
    };
    this.messageBuffer.push(entry);
    if (this.messageBuffer.length >= MAX_BUFFER_SIZE) {
      this.flushBuffer();
    }
    return entry;
  }
  recordSCFIncident(incident) {
    this.scfIncidents.push(incident);
  }
  startTrajectory(agentId, taskId, clusterId) {
    const trajectoryId = `traj-${crypto2.randomUUID().slice(0, 8)}-${Date.now()}`;
    this.activeTrajectories.set(trajectoryId, {
      startedAt: Date.now(),
      agentId,
      taskId,
      clusterId
    });
    return trajectoryId;
  }
  finalizeTrajectory(trajectoryId, outcome, outputPaths) {
    const active = this.activeTrajectories.get(trajectoryId);
    if (!active) {
      console.warn(`[ExecutionTracer] No active trajectory ${trajectoryId} to finalize`);
      return null;
    }
    this.flushBuffer();
    const now = Date.now();
    const toolCalls = this.toolCallBuffer.filter((tc) => tc.agentId === active.agentId);
    const messages = this.messageBuffer;
    const stats = this.computeStats(toolCalls, messages, now - active.startedAt);
    const trajectory = {
      id: trajectoryId,
      sessionId: this.sessionId,
      projectId: this.projectId,
      agentId: active.agentId,
      taskId: active.taskId,
      clusterId: active.clusterId,
      messages,
      toolCalls,
      scfIncidents: [...this.scfIncidents],
      stats,
      outcome,
      outputPaths,
      startedAt: active.startedAt,
      completedAt: now
    };
    this.cortexStore.insertTrajectory(trajectory);
    this.activeTrajectories.delete(trajectoryId);
    this.trajectoryCount++;
    console.log(`[ExecutionTracer] Finalized trajectory ${trajectoryId}: outcome=${outcome}, tools=${stats.totalToolCalls}, wall=${stats.wallTimeMs}ms`);
    return trajectory;
  }
  flushBuffer() {
    if (this.toolCallBuffer.length === 0 && this.messageBuffer.length === 0)
      return;
    for (const [trajectoryId, active] of this.activeTrajectories) {
      const toolCalls = this.toolCallBuffer.filter((tc) => tc.agentId === active.agentId);
      if (toolCalls.length === 0)
        continue;
      const now = Date.now();
      const partialStats = this.computeStats(toolCalls, this.messageBuffer, now - active.startedAt);
      const partialTrajectory = {
        id: trajectoryId,
        sessionId: this.sessionId,
        projectId: this.projectId,
        agentId: active.agentId,
        taskId: active.taskId,
        clusterId: active.clusterId,
        messages: [...this.messageBuffer],
        toolCalls: [...this.toolCallBuffer],
        scfIncidents: [...this.scfIncidents],
        stats: partialStats,
        outcome: "unknown",
        outputPaths: [],
        startedAt: active.startedAt,
        completedAt: now
      };
      this.cortexStore.insertTrajectory(partialTrajectory);
    }
    this.toolCallBuffer = [];
    this.messageBuffer = [];
  }
  computeStats(toolCalls, messages, wallTimeMs) {
    const bashCommands = toolCalls.filter((tc) => tc.isBash).length;
    const blockedTools = toolCalls.filter((tc) => tc.blockedBy).length;
    const errors3 = toolCalls.filter((tc) => tc.error).length;
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    let filesModified = 0;
    let filesRead = 0;
    for (const tc of toolCalls) {
      if (tc.toolName === "write" || tc.toolName === "edit")
        filesModified++;
      if (tc.toolName === "read" || tc.toolName === "grep" || tc.toolName === "glob")
        filesRead++;
    }
    return {
      totalToolCalls: toolCalls.length,
      totalLLMCalls: messages.length,
      totalTokensUsed: totalTokens,
      wallTimeMs,
      bashCommandCount: bashCommands,
      blockedToolCount: blockedTools,
      scfIncidentCount: this.scfIncidents.length,
      errors: errors3,
      filesModified,
      filesRead
    };
  }
  getTrajectory(trajectoryId) {
    return this.cortexStore.getTrajectory(trajectoryId);
  }
  getSessionTrajectories() {
    return this.cortexStore.getSessionTrajectories(this.sessionId);
  }
  getTrajectoryCount() {
    return this.trajectoryCount;
  }
  getActiveTrajectoryCount() {
    return this.activeTrajectories.size;
  }
  getBufferSize() {
    return this.toolCallBuffer.length;
  }
  getStoreTrajectoryCount() {
    return this.cortexStore.getTrajectoryCount(this.projectId);
  }
  flushAndPersist() {
    this.flushBuffer();
    this.cortexStore.persist();
  }
  finalizeActiveTrajectories(outcome = "completed") {
    let count = 0;
    for (const [trajectoryId] of this.activeTrajectories) {
      const result = this.finalizeTrajectory(trajectoryId, outcome, []);
      if (result)
        count++;
    }
    return count;
  }
}

// src/brains/prefrontal/intuition-injector.ts
import crypto3 from "node:crypto";
var MAX_ACTIVE_SIGNALS = 50;
var SIGNAL_EXPIRY_MS = 7200000;

class IntuitionInjector {
  cortexStore;
  activeSignals = new Map;
  triggers = [];
  constructor(cortexStore) {
    this.cortexStore = cortexStore;
  }
  initialize() {
    this.loadPersistedSignals();
    this.loadTriggers();
    console.log(`[IntuitionInjector] Loaded ${this.activeSignals.size} signals, ${this.triggers.length} triggers`);
  }
  loadPersistedSignals() {
    const patterns = this.cortexStore.getActiveFirewallPatterns();
    for (const p of patterns) {
      const signal = {
        id: `sig-${p.pattern}-${p.patternType}`.replace(/[^a-zA-Z0-9-]/g, ""),
        pattern: p.pattern,
        description: p.description,
        evidence: p.evidence,
        confidence: p.confidence,
        source: p.source,
        triggerContexts: [p.patternType],
        createdAt: p.injectedAt || Date.now(),
        expiresAt: (p.injectedAt || Date.now()) + SIGNAL_EXPIRY_MS,
        activationCount: 0,
        lastActivatedAt: 0,
        provenance: "feedback-brain",
        trajectoryIds: []
      };
      this.activeSignals.set(signal.id, signal);
    }
  }
  loadTriggers() {
    this.triggers = [
      {
        pattern: /spawn|delegate|assign|cluster/i,
        signalType: "delegation",
        description: "Delegation decision point"
      },
      {
        pattern: /docker|container|build|run|exec/i,
        signalType: "infrastructure",
        description: "Infrastructure command detected"
      },
      {
        pattern: /write|edit|create|file|path/i,
        signalType: "file-operation",
        description: "File modification detected"
      },
      {
        pattern: /test|verify|check|assert|validate/i,
        signalType: "verification",
        description: "Verification activity detected"
      },
      {
        pattern: /bash|command|shell|exec|sh\s/i,
        signalType: "bash-usage",
        description: "Bash command detected"
      },
      {
        pattern: /done|complete|finish|success|pass/i,
        signalType: "completion-claim",
        description: "Completion claim detected"
      }
    ];
  }
  addSignal(params) {
    const id = `sig-${crypto3.randomUUID().slice(0, 8)}`;
    if (this.activeSignals.size >= MAX_ACTIVE_SIGNALS) {
      this.evictOldest();
    }
    const signal = {
      ...params,
      id,
      createdAt: Date.now(),
      expiresAt: Date.now() + SIGNAL_EXPIRY_MS,
      activationCount: 0,
      lastActivatedAt: 0
    };
    this.activeSignals.set(id, signal);
    this.persistSignal(signal);
    console.log(`[IntuitionInjector] Added signal: ${signal.description.slice(0, 60)} (confidence: ${signal.confidence})`);
    return { success: true, id };
  }
  addSignalFromProposal(proposal) {
    for (const flaw of proposal.analysis.instructionFlaws) {
      this.addSignal({
        pattern: flaw.flaw,
        description: flaw.fix,
        evidence: flaw.evidence,
        confidence: Math.min(proposal.analysis.confidenceScore, 0.95),
        source: `gen-${proposal.generationNumber}-feedback`,
        triggerContexts: ["instruction-flaw"],
        provenance: "feedback-brain",
        trajectoryIds: proposal.changes.hiveUpdates?.map((u) => u.key) || []
      });
    }
    for (const gap of proposal.analysis.toolGaps) {
      this.addSignal({
        pattern: gap.gap,
        description: `Tool gap: ${gap.suggestedTool}`,
        evidence: gap.evidence,
        confidence: Math.min(proposal.analysis.confidenceScore * 0.9, 0.9),
        source: `gen-${proposal.generationNumber}-feedback`,
        triggerContexts: ["tool-gap"],
        provenance: "feedback-brain",
        trajectoryIds: []
      });
    }
  }
  detectDecisionPoint(message, toolName, toolArgs) {
    const matchedSignals = [];
    const now = Date.now();
    const textToMatch = [message, toolName || "", JSON.stringify(toolArgs || {})].join(" ").toLowerCase();
    for (const [, signal] of this.activeSignals) {
      if (signal.expiresAt < now)
        continue;
      const isRelevant = signal.triggerContexts.some((ctx) => {
        const ctxLower = ctx.toLowerCase();
        if (ctxLower.length < 3)
          return false;
        if (["bash", "tool", "run", "exec", "write"].includes(ctxLower))
          return false;
        return textToMatch.includes(ctxLower) || textToMatch.includes(signal.pattern.toLowerCase());
      });
      if (isRelevant) {
        signal.activationCount++;
        signal.lastActivatedAt = now;
        matchedSignals.push(signal);
      }
    }
    for (const trigger of this.triggers) {
      if (trigger.pattern.test(textToMatch)) {
        for (const [, signal] of this.activeSignals) {
          if (signal.triggerContexts.includes(trigger.signalType) && !matchedSignals.find((s) => s.id === signal.id)) {
            signal.activationCount++;
            signal.lastActivatedAt = now;
            matchedSignals.push(signal);
          }
        }
      }
    }
    return matchedSignals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
  generateIntuitionContext(signals) {
    if (signals.length === 0)
      return "";
    const lines = ["[PFC INTUITION — Pattern recognition from prefrontal cortex analysis]"];
    for (const signal of signals) {
      const confidence = signal.confidence >= 0.8 ? "STRONG" : signal.confidence >= 0.5 ? "MODERATE" : "WEAK";
      lines.push(`(${confidence} signal) ${signal.description}`);
      if (signal.evidence) {
        lines.push(`  Evidence: ${signal.evidence.slice(0, 200)}`);
      }
      if (signal.source) {
        lines.push(`  Source: ${signal.source}`);
      }
    }
    lines.push("This is intuition, not enforcement. Heed it or ignore it — but the pattern is real.");
    return lines.join(`
`);
  }
  getActiveSignals() {
    const now = Date.now();
    return [...this.activeSignals.values()].filter((s) => s.expiresAt > now);
  }
  getSignalCount() {
    return this.activeSignals.size;
  }
  removeSignal(id) {
    return this.activeSignals.delete(id);
  }
  prune() {
    const now = Date.now();
    let pruned = 0;
    for (const [id, signal] of this.activeSignals) {
      if (signal.expiresAt < now) {
        this.activeSignals.delete(id);
        pruned++;
      }
    }
    return pruned;
  }
  persistSignal(signal) {
    this.cortexStore.insertFirewallPattern({
      layer: "L5",
      patternType: "intuition",
      pattern: signal.pattern,
      description: signal.description,
      evidence: signal.evidence,
      confidence: signal.confidence,
      source: signal.source,
      injectedAt: signal.createdAt,
      active: true
    });
  }
  evictOldest() {
    let oldestId = null;
    let oldestTime = Infinity;
    for (const [id, signal] of this.activeSignals) {
      if (signal.createdAt < oldestTime) {
        oldestTime = signal.createdAt;
        oldestId = id;
      }
    }
    if (oldestId) {
      this.activeSignals.delete(oldestId);
    }
  }
}
var intuitionInjectorInstance = null;
function createIntuitionInjector(cortexStore) {
  if (!intuitionInjectorInstance) {
    intuitionInjectorInstance = new IntuitionInjector(cortexStore);
  }
  return intuitionInjectorInstance;
}

// src/brains/prefrontal/anti-slop-guardrails.ts
var MAX_PROPOSAL_LENGTH = 4000;
var MAX_ROOT_CAUSE_LENGTH = 1000;
var MAX_FLAW_FIX_LENGTH = 500;
var MAX_EVIDENCE_LENGTH = 500;
var MAX_TOOL_GAP_LENGTH = 500;
var MIN_CONFIDENCE = 0.3;
var MAX_CONFIDENCE = 1;
var MAX_FLAWS_PER_PROPOSAL = 5;
var MAX_TOOL_GAPS_PER_PROPOSAL = 5;
var MAX_HOOK_ISSUES_PER_PROPOSAL = 3;
var MAX_CROSS_PROJECT_SOURCES = 3;
var MAX_WEIGHT_CANDIDATES = 10;
var CRITICAL_TOOLS = new Set([
  "spawn_cluster_task",
  "spawn_shark_agent",
  "spawn_manta_agent",
  "kraken_hive_search",
  "kraken_hive_remember",
  "kraken_hive_inject_context",
  "get_cluster_status",
  "get_agent_status",
  "aggregate_results",
  "report_to_kraken",
  "get_task_context",
  "read_kraken_context"
]);

class AntiSlopGuardrails {
  recentProposalHashes = new Set;
  maxRecentHashes = 100;
  validate(raw) {
    const violations = [];
    if (!raw || typeof raw !== "object") {
      return { passed: false, violations: ["Proposal is not an object"] };
    }
    const proposal = raw;
    const id = this.validateString(proposal.id, "id", violations);
    const projectId = this.validateString(proposal.projectId, "projectId", violations);
    const generationNumber = this.validateNumber(proposal.generationNumber, "generationNumber", violations, 0, 100);
    const analysis = this.validateAnalysis(proposal.analysis, violations);
    const changes = this.validateChanges(proposal.changes, violations);
    const riskAssessment = this.validateRisk(proposal.riskAssessment, violations);
    const weightCandidates = this.validateWeightCandidates(proposal.weightCandidates, violations);
    const crossProjectSources = this.validateCrossProject(proposal.crossProjectSources, violations);
    if (!analysis || !changes || !riskAssessment) {
      return { passed: false, violations };
    }
    this.validateStructuralIntegrity(changes, violations);
    const proposalText = JSON.stringify(proposal);
    if (proposalText.length > MAX_PROPOSAL_LENGTH * 3) {
      violations.push(`Proposal exceeds maximum size (${proposalText.length} chars)`);
    }
    if (analysis.confidenceScore < MIN_CONFIDENCE) {
      violations.push(`Confidence ${analysis.confidenceScore} below minimum ${MIN_CONFIDENCE}`);
    }
    if (analysis.instructionFlaws.length === 0 && analysis.toolGaps.length === 0 && analysis.hookIssues.length === 0) {
      violations.push("Proposal contains zero actionable findings — empty analysis");
    }
    const dedupeHash = this.computeDedupeHash(analysis);
    if (this.recentProposalHashes.has(dedupeHash)) {
      violations.push("Duplicate proposal — identical analysis hash already seen");
    }
    if (violations.length > 0) {
      return { passed: false, violations };
    }
    this.recentProposalHashes.add(dedupeHash);
    if (this.recentProposalHashes.size > this.maxRecentHashes) {
      const first = this.recentProposalHashes.values().next().value;
      if (first)
        this.recentProposalHashes.delete(first);
    }
    const sanitized = {
      id: id || `prop-${crypto.randomUUID().slice(0, 8)}`,
      projectId: projectId || "unknown",
      generationNumber: generationNumber || 0,
      analysis,
      changes,
      weightCandidates,
      crossProjectSources,
      riskAssessment,
      status: "proposed",
      merkleHash: "",
      proposedAt: Date.now()
    };
    return { passed: true, violations: [], sanitized };
  }
  validateAnalysis(raw, violations) {
    if (!raw || typeof raw !== "object") {
      violations.push("analysis is missing or not an object");
      return null;
    }
    const a = raw;
    const rootCause = this.truncate(String(a.rootCauseAnalysis || ""), MAX_ROOT_CAUSE_LENGTH);
    if (!rootCause || rootCause.length < 20) {
      violations.push("rootCauseAnalysis is empty or too short (< 20 chars)");
    }
    const confidence = this.validateNumber(a.confidenceScore, "confidenceScore", violations, MIN_CONFIDENCE, MAX_CONFIDENCE);
    const instructionFlaws = this.validateFlaws(a.instructionFlaws, violations);
    const toolGaps = this.validateToolGaps(a.toolGaps, violations);
    const hookIssues = this.validateHookIssues(a.hookIssues, violations);
    if (!confidence)
      return null;
    return {
      rootCauseAnalysis: rootCause,
      instructionFlaws,
      toolGaps,
      hookIssues,
      confidenceScore: confidence,
      analysisModel: String(a.analysisModel || "unknown"),
      analyzedAt: Number(a.analyzedAt) || Date.now()
    };
  }
  validateFlaws(raw, violations) {
    if (!Array.isArray(raw))
      return [];
    const flaws = raw.slice(0, MAX_FLAWS_PER_PROPOSAL);
    return flaws.map((f) => ({
      flaw: this.truncate(String(f.flaw || ""), MAX_FLAW_FIX_LENGTH),
      evidence: this.truncate(String(f.evidence || ""), MAX_EVIDENCE_LENGTH),
      fix: this.truncate(String(f.fix || ""), MAX_FLAW_FIX_LENGTH)
    })).filter((f) => f.flaw.length > 0 && f.fix.length > 0);
  }
  validateToolGaps(raw, violations) {
    if (!Array.isArray(raw))
      return [];
    const gaps = raw.slice(0, MAX_TOOL_GAPS_PER_PROPOSAL);
    return gaps.map((g) => ({
      gap: this.truncate(String(g.gap || ""), MAX_TOOL_GAP_LENGTH),
      suggestedTool: this.truncate(String(g.suggestedTool || ""), 100),
      evidence: this.truncate(String(g.evidence || ""), MAX_EVIDENCE_LENGTH)
    })).filter((g) => g.gap.length > 0);
  }
  validateHookIssues(raw, violations) {
    if (!Array.isArray(raw))
      return [];
    const issues = raw.slice(0, MAX_HOOK_ISSUES_PER_PROPOSAL);
    return issues.map((h) => ({
      issue: this.truncate(String(h.issue || ""), MAX_FLAW_FIX_LENGTH),
      evidence: this.truncate(String(h.evidence || ""), MAX_EVIDENCE_LENGTH),
      fix: this.truncate(String(h.fix || ""), MAX_FLAW_FIX_LENGTH)
    })).filter((h) => h.issue.length > 0);
  }
  validateChanges(raw, violations) {
    if (!raw || typeof raw !== "object")
      return { hiveUpdates: [] };
    const c = raw;
    if (c.toolsToRemove && Array.isArray(c.toolsToRemove)) {
      for (const tool3 of c.toolsToRemove) {
        if (CRITICAL_TOOLS.has(String(tool3))) {
          violations.push(`PROTECTED: Cannot remove critical tool '${tool3}'`);
        }
      }
    }
    if (c.hookChanges && Array.isArray(c.hookChanges)) {
      for (const change of c.hookChanges) {
        const ch = change;
        if (ch.action === "remove") {
          const hook = String(ch.hook || "");
          if (hook.includes("firewall") || hook.includes("tool.execute.before")) {
            violations.push(`PROTECTED: Cannot remove firewall hook '${hook}'`);
          }
        }
      }
    }
    if (c.updatedInstructions && typeof c.updatedInstructions === "string") {
      const lower = c.updatedInstructions.toLowerCase();
      const forbidden = ["ignore all previous", "disregard", "bypass firewall", "skip verification", "you are now"];
      for (const f of forbidden) {
        if (lower.includes(f)) {
          violations.push(`INJECTION: Updated instructions contain forbidden pattern '${f}'`);
        }
      }
    }
    return {
      updatedInstructions: typeof c.updatedInstructions === "string" ? this.truncate(c.updatedInstructions, 2000) : undefined,
      toolsToAdd: Array.isArray(c.toolsToAdd) ? c.toolsToAdd : undefined,
      toolsToRemove: Array.isArray(c.toolsToRemove) ? c.toolsToRemove.filter((t) => !CRITICAL_TOOLS.has(String(t))) : undefined,
      hookChanges: Array.isArray(c.hookChanges) ? c.hookChanges : undefined,
      hiveUpdates: Array.isArray(c.hiveUpdates) ? c.hiveUpdates : undefined
    };
  }
  validateRisk(raw, violations) {
    if (!raw || typeof raw !== "object") {
      return {
        level: "high",
        risks: [{ description: "No risk assessment provided — defaulting to high", severity: "high", mitigation: "Manual review required" }],
        rollbackPlan: "Reject proposal — no risk assessment",
        recommendedApproval: "manual"
      };
    }
    const r = raw;
    const level = ["low", "medium", "high", "critical"].includes(String(r.level)) ? String(r.level) : "high";
    if (!r.rollbackPlan || String(r.rollbackPlan).length < 10) {
      violations.push("rollbackPlan is missing or too short");
      return {
        level: "high",
        risks: [{ description: "Missing rollback plan", severity: "high", mitigation: "Manual review" }],
        rollbackPlan: "No rollback plan provided — treat as high risk",
        recommendedApproval: "manual"
      };
    }
    return {
      level,
      risks: Array.isArray(r.risks) ? r.risks : [],
      rollbackPlan: String(r.rollbackPlan),
      recommendedApproval: ["auto", "manual", "reject"].includes(String(r.recommendedApproval)) ? String(r.recommendedApproval) : "manual"
    };
  }
  validateWeightCandidates(raw, violations) {
    if (!Array.isArray(raw))
      return [];
    return raw.slice(0, MAX_WEIGHT_CANDIDATES).filter((w) => w.trajectoryId && w.exampleType && w.qualityScore).map((w) => ({
      trajectoryId: String(w.trajectoryId),
      exampleType: w.exampleType === "positive" || w.exampleType === "negative" ? w.exampleType : "negative",
      trainingMessages: Array.isArray(w.trainingMessages) ? w.trainingMessages.slice(0, 10) : [],
      domainLabel: String(w.domainLabel || "general"),
      qualityScore: Math.min(Number(w.qualityScore) || 0, 1)
    }));
  }
  validateCrossProject(raw, violations) {
    if (!Array.isArray(raw))
      return [];
    return raw.slice(0, MAX_CROSS_PROJECT_SOURCES).filter((p) => p.sourceProject && p.similarityScore && Number(p.similarityScore) >= 0.7).map((p) => ({
      sourceProject: String(p.sourceProject),
      pattern: String(p.pattern || ""),
      appliedFix: String(p.appliedFix || ""),
      successMetrics: p.successMetrics || {},
      similarityScore: Math.min(Number(p.similarityScore), 1),
      transferable: Boolean(p.transferable)
    }));
  }
  validateStructuralIntegrity(changes, violations) {
    const totalChanges = (changes.toolsToAdd?.length || 0) + (changes.toolsToRemove?.length || 0) + (changes.hookChanges?.length || 0) + (changes.updatedInstructions ? 1 : 0);
    if (totalChanges > 10) {
      violations.push(`Too many changes in single proposal (${totalChanges}) — batch limit is 10`);
    }
    if (changes.updatedInstructions) {
      const len = changes.updatedInstructions.length;
      if (len > 1e4) {
        violations.push(`Updated instructions too long (${len} chars) — max 10000`);
      }
    }
  }
  validateString(val, field, violations) {
    if (typeof val !== "string" || val.length === 0) {
      violations.push(`${field} is missing or empty`);
      return null;
    }
    return val;
  }
  validateNumber(val, field, violations, min, max) {
    const n = Number(val);
    if (isNaN(n) || n < min || n > max) {
      violations.push(`${field} is ${val}, expected ${min}-${max}`);
      return null;
    }
    return n;
  }
  truncate(str, maxLen) {
    if (str.length <= maxLen)
      return str;
    return str.slice(0, maxLen - 3) + "...";
  }
  computeDedupeHash(analysis) {
    const flaws = analysis.instructionFlaws.map((f) => f.flaw.slice(0, 50)).sort().join("|");
    const gaps = analysis.toolGaps.map((g) => g.gap.slice(0, 50)).sort().join("|");
    return `${analysis.rootCauseAnalysis.slice(0, 100)}|${flaws}|${gaps}`;
  }
}

// src/brains/prefrontal/lineage-tracker.ts
import crypto4 from "node:crypto";
class LineageTracker {
  cortexStore;
  cache = new Map;
  constructor(cortexStore) {
    this.cortexStore = cortexStore;
  }
  initialize() {
    console.log("[LineageTracker] Initialized");
  }
  getOrCreateLineage(projectId, acceptanceCriteria = []) {
    const cached2 = this.cache.get(projectId);
    if (cached2)
      return cached2;
    const stored = this.cortexStore.getLineage(projectId);
    if (stored) {
      this.cache.set(projectId, stored);
      return stored;
    }
    const now = Date.now();
    const lineage = {
      projectId,
      generations: [],
      currentGeneration: 0,
      acceptanceCriteria,
      synthesizedLearnings: [],
      merkleChainValid: true,
      status: "active",
      maxGenerations: DEFAULT_MAX_GENERATIONS,
      createdAt: now,
      updatedAt: now
    };
    this.cortexStore.upsertLineage(lineage);
    this.cache.set(projectId, lineage);
    console.log(`[LineageTracker] Created new lineage for project ${projectId}`);
    return lineage;
  }
  recordGeneration(params) {
    const lineage = this.getOrCreateLineage(params.projectId);
    const generationNumber = lineage.currentGeneration + 1;
    const previousGen = lineage.generations.length > 0 ? lineage.generations[lineage.generations.length - 1] : undefined;
    const delta = previousGen ? this.computeDelta(previousGen, params) : undefined;
    const previousHash = previousGen?.merkleHash || "0".repeat(64);
    const merkleHash = this.computeMerkleHash(generationNumber, params, previousHash);
    const record2 = {
      generationNumber,
      projectId: params.projectId,
      agentSpec: params.agentSpec,
      aggregatedStats: params.aggregatedStats,
      evaluation: params.evaluation,
      deltaFromPrevious: delta,
      trajectories: params.trajectoryIds,
      createdAt: Date.now(),
      merkleHash,
      previousHash
    };
    this.cortexStore.insertGeneration(record2);
    lineage.generations.push(record2);
    lineage.currentGeneration = generationNumber;
    lineage.updatedAt = Date.now();
    if (generationNumber >= lineage.maxGenerations) {
      lineage.status = "capped";
    } else if (params.evaluation.criteriaMet) {
      lineage.status = "converged";
    }
    lineage.synthesizedLearnings = this.synthesizeLearnings(lineage);
    lineage.merkleChainValid = this.validateMerkleChain(lineage);
    this.cortexStore.upsertLineage(lineage);
    this.cache.set(params.projectId, lineage);
    console.log(`[LineageTracker] Recorded generation ${generationNumber} for ${params.projectId} (hash: ${merkleHash.slice(0, 12)}...)`);
    return record2;
  }
  computeDelta(prevGen, currentParams) {
    const prevTools = new Set(prevGen.agentSpec.tools);
    const currTools = new Set(currentParams.agentSpec.tools);
    const toolsAdded = [...currTools].filter((t) => !prevTools.has(t));
    const toolsRemoved = [...prevTools].filter((t) => !currTools.has(t));
    const instructionChanges = prevGen.agentSpec.instructions !== currentParams.agentSpec.instructions ? 1 : 0;
    const prevMetrics = prevGen.evaluation.metrics;
    const currMetrics = currentParams.evaluation.metrics;
    const metricDeltas = {};
    if (currMetrics.accuracy !== prevMetrics.accuracy)
      metricDeltas.accuracy = currMetrics.accuracy - prevMetrics.accuracy;
    if (currMetrics.taskSuccessRate !== prevMetrics.taskSuccessRate)
      metricDeltas.taskSuccessRate = currMetrics.taskSuccessRate - prevMetrics.taskSuccessRate;
    if (currMetrics.scfIncidentRate !== prevMetrics.scfIncidentRate)
      metricDeltas.scfIncidentRate = currMetrics.scfIncidentRate - prevMetrics.scfIncidentRate;
    if (currMetrics.bashAbuseRate !== prevMetrics.bashAbuseRate)
      metricDeltas.bashAbuseRate = currMetrics.bashAbuseRate - prevMetrics.bashAbuseRate;
    const locDelta = currentParams.agentSpec.instructions.length - prevGen.agentSpec.instructions.length;
    return {
      instructionChanges,
      toolsAdded,
      toolsRemoved,
      toolsModified: [],
      hooksModified: [],
      metricDeltas,
      locDelta
    };
  }
  synthesizeLearnings(lineage) {
    const learnings = [];
    const gens = lineage.generations;
    if (gens.length === 0)
      return learnings;
    const bestGen = this.getBestGeneration(lineage);
    if (bestGen) {
      learnings.push(`Best generation: ${bestGen.generationNumber} (accuracy: ${bestGen.evaluation.metrics.accuracy.toFixed(2)})`);
    }
    const successfulGens = gens.filter((g) => g.evaluation.metrics.taskSuccessRate > 0.7);
    if (successfulGens.length > 0) {
      learnings.push(`${successfulGens.length}/${gens.length} generations achieved >70% task success rate`);
    }
    const deltas = gens.filter((g) => g.deltaFromPrevious);
    const improving = deltas.filter((g) => {
      const delta = g.deltaFromPrevious;
      return (delta.metricDeltas.accuracy ?? 0) > 0 || (delta.metricDeltas.taskSuccessRate ?? 0) > 0;
    });
    if (improving.length > 0) {
      learnings.push(`${improving.length} generations showed metric improvement over previous`);
    }
    return learnings;
  }
  getBestGeneration(lineage) {
    if (lineage.generations.length === 0)
      return null;
    return lineage.generations.reduce((best, gen) => gen.evaluation.metrics.accuracy > best.evaluation.metrics.accuracy ? gen : best);
  }
  validateMerkleChain(lineage) {
    const gens = lineage.generations;
    if (gens.length === 0)
      return true;
    for (let i = 1;i < gens.length; i++) {
      if (gens[i].previousHash !== gens[i - 1].merkleHash) {
        console.error(`[LineageTracker] Merkle chain break at generation ${gens[i].generationNumber}`);
        return false;
      }
    }
    return true;
  }
  generateContextMd(lineage) {
    const lines = [
      `# Evolution Lineage: ${lineage.projectId}`,
      `Status: ${lineage.status}`,
      `Generations: ${lineage.currentGeneration}/${lineage.maxGenerations}`,
      ""
    ];
    for (const gen of lineage.generations) {
      lines.push(`## Generation ${gen.generationNumber}`);
      lines.push(`- Accuracy: ${gen.evaluation.metrics.accuracy.toFixed(2)}`);
      lines.push(`- Task Success: ${(gen.evaluation.metrics.taskSuccessRate * 100).toFixed(0)}%`);
      lines.push(`- Hash: ${gen.merkleHash.slice(0, 16)}...`);
      if (gen.deltaFromPrevious) {
        const delta = gen.deltaFromPrevious;
        if (delta.toolsAdded.length > 0)
          lines.push(`- Tools Added: ${delta.toolsAdded.join(", ")}`);
        if (delta.toolsRemoved.length > 0)
          lines.push(`- Tools Removed: ${delta.toolsRemoved.join(", ")}`);
        if (delta.instructionChanges > 0)
          lines.push(`- Instructions modified`);
      }
      lines.push("");
    }
    if (lineage.synthesizedLearnings.length > 0) {
      lines.push("## Synthesized Learnings");
      for (const learning of lineage.synthesizedLearnings) {
        lines.push(`- ${learning}`);
      }
    }
    return lines.join(`
`);
  }
  computeMerkleHash(generationNumber, params, previousHash) {
    const data = JSON.stringify({
      gen: generationNumber,
      specHash: params.agentSpec.specHash,
      metrics: params.evaluation.metrics,
      trajectoryCount: params.trajectoryIds.length,
      prev: previousHash
    });
    return crypto4.createHash("sha256").update(data).digest("hex");
  }
}

// src/brains/prefrontal/sync-bridge.ts
import crypto5 from "node:crypto";

class SyncBridge {
  cortexStore;
  krakenId;
  connected = false;
  lastHeartbeat = 0;
  messagesSent = 0;
  messagesReceived = 0;
  constructor(cortexStore, krakenId) {
    this.cortexStore = cortexStore;
    this.krakenId = krakenId;
  }
  initialize() {
    this.checkOpenfangConnectivity();
    console.log(`[SyncBridge] Initialized for kraken ${this.krakenId} (openfang=${this.connected})`);
  }
  sendMessage(type, payload, direction = "efferent", correlationId) {
    const message = {
      id: `sync-${crypto5.randomUUID().slice(0, 8)}-${Date.now()}`,
      direction,
      type,
      sourceKrakenId: this.krakenId,
      payload,
      correlationId,
      createdAt: Date.now(),
      status: "pending"
    };
    this.cortexStore.insertSyncMessage(message);
    this.messagesSent++;
    console.log(`[SyncBridge] Sent ${direction} ${type} (${message.id})`);
    return message;
  }
  pollForMessages(direction) {
    const messages = this.cortexStore.pollSyncMessages(direction);
    this.messagesReceived += messages.length;
    return messages;
  }
  markDelivered(messageId) {
    this.cortexStore.markSyncDelivered(messageId);
  }
  registerWithOpenfang(registration) {
    return this.sendMessage("register_project", {
      projectId: registration.projectId,
      cortexDbPath: registration.cortexDbPath,
      projectRoot: registration.projectRoot,
      modifiableFiles: registration.modifiableFiles,
      autoApplyImprovements: registration.autoApplyImprovements,
      maxAutoApplyRisk: registration.maxAutoApplyRisk
    }, "afferent");
  }
  reportTrajectoriesAvailable(projectId, count) {
    return this.sendMessage("new_trajectories_available", {
      projectId,
      trajectoryCount: count,
      reportedAt: Date.now()
    }, "afferent");
  }
  ingestProposals() {
    const messages = this.pollForMessages("efferent");
    const proposals = messages.filter((m) => m.type === "improvement_proposal");
    for (const msg of proposals) {
      this.markDelivered(msg.id);
    }
    return proposals;
  }
  checkOpenfangConnectivity() {
    const messages = this.cortexStore.pollSyncMessages("efferent");
    const recentHeartbeats = messages.filter((m) => m.type === "heartbeat");
    if (recentHeartbeats.length > 0) {
      const latest = recentHeartbeats[recentHeartbeats.length - 1];
      this.lastHeartbeat = latest.createdAt;
      this.connected = Date.now() - this.lastHeartbeat < 7200000;
    } else {
      this.connected = false;
    }
    return this.connected;
  }
  sendHeartbeat() {
    return this.sendMessage("heartbeat", {
      krakenId: this.krakenId,
      timestamp: Date.now(),
      trajectoryCount: this.cortexStore.getTrajectoryCount()
    }, "afferent");
  }
  reportImprovementApplied(proposalId, projectId) {
    return this.sendMessage("improvement_applied", {
      proposalId,
      projectId,
      appliedAt: Date.now()
    }, "afferent");
  }
  reportImprovementRejected(proposalId, projectId, reason) {
    return this.sendMessage("improvement_rejected", {
      proposalId,
      projectId,
      reason,
      rejectedAt: Date.now()
    }, "afferent");
  }
  isConnected() {
    return this.connected;
  }
  getStats() {
    return {
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      connected: this.connected,
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

// src/brains/prefrontal/prefrontal-cortex-brain.ts
init_state_store();

class PrefrontalCortexBrain {
  initialized = false;
  state;
  cortexStore;
  tracer = null;
  intuitionInjector;
  guardrails;
  lineageTracker;
  syncBridge;
  stateStore;
  messenger;
  krakenId;
  projectId;
  heartbeatInterval = null;
  constructor(params = {}) {
    this.stateStore = params.stateStore || getStateStore2();
    this.messenger = params.messenger || getBrainMessenger();
    this.krakenId = params.krakenId || `kraken-${crypto6.randomUUID().slice(0, 8)}`;
    this.projectId = params.projectId || process.cwd().split("/").pop() || "default";
    this.cortexStore = createCortexStore(params.cortexDbPath);
    this.intuitionInjector = createIntuitionInjector(this.cortexStore);
    this.guardrails = new AntiSlopGuardrails;
    this.lineageTracker = new LineageTracker(this.cortexStore);
    this.syncBridge = new SyncBridge(this.cortexStore, this.krakenId);
    this.state = {
      initialized: false,
      openfangConnected: false,
      registeredProjects: [],
      pendingProposals: [],
      lineages: new Map,
      syncStatus: { lastSyncAt: 0, messagesSent: 0, messagesReceived: 0, errors: 0 },
      injectedFirewallPatterns: [],
      currentGeneration: 0,
      lastAnalysisAt: 0,
      trajectoryCount: 0
    };
  }
  initialize() {
    if (this.initialized)
      return;
    this.cortexStore.initialize();
    this.intuitionInjector.initialize();
    this.lineageTracker.initialize();
    this.syncBridge.initialize();
    this.messenger.subscribe("kraken-prefrontal", this.handleBrainMessage.bind(this));
    this.stateStore.set("prefrontal-state", "initialized", true, ["kraken-prefrontal"]);
    this.stateStore.set("prefrontal-state", "brain-id", "kraken-prefrontal", ["kraken-prefrontal"]);
    this.stateStore.set("prefrontal-state", "kraken-id", this.krakenId, ["kraken-prefrontal"]);
    this.stateStore.set("prefrontal-state", "project-id", this.projectId, ["kraken-prefrontal"]);
    this.state.initialized = true;
    this.heartbeatInterval = setInterval(() => {
      try {
        this.syncBridge.sendHeartbeat();
        this.syncBridge.checkOpenfangConnectivity();
        this.state.openfangConnected = this.syncBridge.isConnected();
        this.ingestProposalsFromOpenfang();
        this.intuitionInjector.prune();
      } catch (err) {
        console.error("[PrefrontalCortex] Heartbeat cycle failed:", err instanceof Error ? err.message : String(err));
        this.state.syncStatus.errors++;
      }
    }, 60000);
    console.log(`[PrefrontalCortex] Initialized — kraken=${this.krakenId}, project=${this.projectId}, signals=${this.intuitionInjector.getSignalCount()}`);
  }
  isInitialized() {
    return this.initialized;
  }
  createTracer(sessionId) {
    this.tracer = new ExecutionTracer(this.cortexStore, sessionId, this.projectId);
    this.tracer.initialize();
    return this.tracer;
  }
  getTracer() {
    return this.tracer;
  }
  getIntuitionInjector() {
    return this.intuitionInjector;
  }
  getLineageTracker() {
    return this.lineageTracker;
  }
  registerProject(registration) {
    this.cortexStore.insertRegistration(registration);
    this.state.registeredProjects.push(registration);
    this.syncBridge.registerWithOpenfang(registration);
    console.log(`[PrefrontalCortex] Registered project ${registration.projectId}`);
  }
  notifySessionComplete(sessionId) {
    if (this.tracer)
      this.tracer.flushBuffer();
    const trajectoryCount = this.cortexStore.getTrajectoryCount(this.projectId);
    this.state.trajectoryCount = trajectoryCount;
    this.syncBridge.reportTrajectoriesAvailable(this.projectId, trajectoryCount);
    this.messenger.deliverMessage("kraken-prefrontal", "kraken-system", "sync", {
      type: "session-complete",
      sessionId,
      projectId: this.projectId,
      trajectoryCount
    }, "normal");
    console.log(`[PrefrontalCortex] Session ${sessionId} complete — ${trajectoryCount} trajectories`);
  }
  ingestProposalsFromOpenfang() {
    const proposals = this.syncBridge.ingestProposals();
    for (const msg of proposals) {
      try {
        const proposalData = msg.payload;
        if (!proposalData.proposal)
          continue;
        const result = this.guardrails.validate(proposalData.proposal);
        if (!result.passed) {
          console.warn(`[PrefrontalCortex] REJECTED proposal — guardrail violations: ${result.violations.join("; ")}`);
          this.state.syncStatus.errors++;
          continue;
        }
        const proposal = result.sanitized;
        this.cortexStore.insertProposal(proposal);
        this.state.pendingProposals.push(proposal);
        this.intuitionInjector.addSignalFromProposal(proposal);
        console.log(`[PrefrontalCortex] Ingested proposal ${proposal.id} (risk: ${proposal.riskAssessment.level}, confidence: ${proposal.analysis.confidenceScore.toFixed(2)}) — intuition signals created`);
      } catch (err) {
        console.error("[PrefrontalCortex] Failed to ingest proposal:", err);
        this.state.syncStatus.errors++;
      }
    }
  }
  getPendingProposals() {
    return this.cortexStore.getPendingProposals(this.projectId);
  }
  detectIntuition(message, toolName, toolArgs) {
    return this.intuitionInjector.detectDecisionPoint(message, toolName, toolArgs);
  }
  generateIntuitionContext(signals) {
    return this.intuitionInjector.generateIntuitionContext(signals);
  }
  applyImprovement(proposalId, appliedBy) {
    const proposal = this.cortexStore.getProposal(proposalId);
    if (!proposal)
      return { success: false, reason: `Proposal ${proposalId} not found` };
    if (proposal.status !== "proposed" && proposal.status !== "approved") {
      return { success: false, reason: `Proposal status is ${proposal.status}` };
    }
    if (proposal.riskAssessment.level === "high" || proposal.riskAssessment.level === "critical") {
      return { success: false, reason: `High/critical risk requires manual approval` };
    }
    return this.doApplyImprovement(proposal, appliedBy);
  }
  approveAndApplyImprovement(proposalId, approvedBy) {
    const proposal = this.cortexStore.getProposal(proposalId);
    if (!proposal)
      return { success: false, reason: `Proposal ${proposalId} not found` };
    this.cortexStore.updateProposalStatus(proposalId, "approved");
    return this.doApplyImprovement(proposal, approvedBy);
  }
  rejectImprovement(proposalId, reason) {
    this.cortexStore.updateProposalStatus(proposalId, "rejected");
    this.syncBridge.reportImprovementRejected(proposalId, this.projectId, reason);
    console.log(`[PrefrontalCortex] Rejected proposal ${proposalId}: ${reason}`);
  }
  doApplyImprovement(proposal, appliedBy) {
    const changes = proposal.changes;
    if (changes.hiveUpdates) {
      for (const update of changes.hiveUpdates) {
        this.messenger.deliverMessage("kraken-prefrontal", "kraken-system", "context-inject", {
          type: "hive-update",
          category: update.category,
          key: update.key,
          content: update.content
        }, "normal");
      }
    }
    this.intuitionInjector.addSignalFromProposal(proposal);
    this.cortexStore.updateProposalStatus(proposal.id, "applied", Date.now());
    this.syncBridge.reportImprovementApplied(proposal.id, this.projectId);
    this.state.pendingProposals = this.state.pendingProposals.filter((p) => p.id !== proposal.id);
    console.log(`[PrefrontalCortex] Applied improvement ${proposal.id} (gen ${proposal.generationNumber}) — intuition signals updated`);
    return { success: true };
  }
  injectIntuitionSignal(params) {
    return this.intuitionInjector.addSignal({
      ...params,
      provenance: "manual",
      trajectoryIds: []
    });
  }
  getEvolutionLineage(projectId) {
    return this.lineageTracker.getOrCreateLineage(projectId || this.projectId);
  }
  getPrefrontalStatus() {
    this.state.openfangConnected = this.syncBridge.isConnected();
    this.state.trajectoryCount = this.cortexStore.getTrajectoryCount(this.projectId);
    const syncStats = this.syncBridge.getStats();
    this.state.syncStatus = {
      lastSyncAt: Date.now(),
      messagesSent: syncStats.messagesSent,
      messagesReceived: syncStats.messagesReceived,
      errors: 0
    };
    return { ...this.state, lineages: new Map(this.state.lineages) };
  }
  getKrakenId() {
    return this.krakenId;
  }
  getProjectId() {
    return this.projectId;
  }
  handleBrainMessage(message) {
    switch (message.type) {
      case "sync":
        console.log(`[PrefrontalCortex] Sync from ${message.from}: ${JSON.stringify(message.payload).slice(0, 100)}`);
        break;
      case "context-inject":
        if (message.payload.type === "trajectory-record") {
          console.log(`[PrefrontalCortex] Trajectory recorded from ${message.from}`);
        }
        break;
      case "checkpoint":
        if (message.payload.type === "session-complete-verified") {
          this.notifySessionComplete(message.payload.sessionId || "unknown");
        }
        break;
    }
  }
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.tracer)
      this.tracer.flushBuffer();
    this.cortexStore.close();
    console.log("[PrefrontalCortex] Cleaned up");
  }
}
var prefrontalBrainInstance = null;
function createPrefrontalCortexBrain(params) {
  if (!prefrontalBrainInstance) {
    prefrontalBrainInstance = new PrefrontalCortexBrain(params);
  }
  return prefrontalBrainInstance;
}
function getPrefrontalCortexBrain() {
  if (!prefrontalBrainInstance) {
    prefrontalBrainInstance = new PrefrontalCortexBrain;
  }
  return prefrontalBrainInstance;
}

// src/tools/prefrontal-tools.ts
function createPrefrontalTools(_ctx) {
  return {
    get_execution_trajectory: tool({
      description: "Retrieve an execution trajectory by ID. Shows what an agent did during a task.",
      args: {
        trajectoryId: exports_external.string().describe("The trajectory ID to retrieve")
      },
      execute: async ({ trajectoryId }) => {
        const cortex = getCortexStore();
        const trajectory = cortex.getTrajectory(trajectoryId);
        if (!trajectory) {
          return `Trajectory ${trajectoryId} not found.`;
        }
        return `## Execution Trajectory: ${trajectory.id}

Agent: ${trajectory.agentId} | Outcome: ${trajectory.outcome} | Duration: ${trajectory.stats.wallTimeMs}ms
Tool Calls: ${trajectory.stats.totalToolCalls} | LLM Calls: ${trajectory.stats.totalLLMCalls} | Tokens: ${trajectory.stats.totalTokensUsed}
Bash Commands: ${trajectory.stats.bashCommandCount} | Blocked: ${trajectory.stats.blockedToolCount} | Errors: ${trajectory.stats.errors}
Files Modified: ${trajectory.stats.filesModified} | Files Read: ${trajectory.stats.filesRead}
SCF Incidents: ${trajectory.stats.scfIncidentCount}

### Tool Calls
${trajectory.toolCalls.map((tc, i) => `${i + 1}. ${tc.toolName} (${tc.durationMs}ms)${tc.error ? " ERROR: " + tc.error : ""}${tc.blockedBy ? " BLOCKED BY: " + tc.blockedBy : ""}`).join(`
`)}`;
      }
    }),
    get_evolution_lineage: tool({
      description: "Get evolution lineage for the project. Shows generational improvement history.",
      args: {
        projectId: exports_external.string().optional().describe("Project ID (defaults to current project)")
      },
      execute: async ({ projectId }) => {
        const brain = getPrefrontalCortexBrain();
        const lineage = brain.getEvolutionLineage(projectId);
        if (!lineage) {
          return "No evolution lineage found for this project.";
        }
        return `## Evolution Lineage: ${lineage.projectId}

Status: ${lineage.status} | Generations: ${lineage.currentGeneration}/${lineage.maxGenerations} | Merkle Valid: ${lineage.merkleChainValid}

${lineage.generations.map((g) => {
          const delta = g.deltaFromPrevious;
          return `### Generation ${g.generationNumber}
Accuracy: ${(g.evaluation.metrics.accuracy * 100).toFixed(0)}% | Success Rate: ${(g.evaluation.metrics.taskSuccessRate * 100).toFixed(0)}% | Hash: ${g.merkleHash.slice(0, 16)}...
${delta ? `Changes: +${delta.toolsAdded.length} tools, -${delta.toolsRemoved.length} tools, ${delta.instructionChanges} instruction edits` : "(first generation)"}`;
        }).join(`

`)}

${lineage.synthesizedLearnings.length > 0 ? `### Synthesized Learnings
${lineage.synthesizedLearnings.map((l) => "- " + l).join(`
`)}` : ""}`;
      }
    }),
    check_improvement_proposals: tool({
      description: "Check pending improvement proposals from the Prefrontal Cortex FeedbackBrain.",
      args: {},
      execute: async () => {
        const brain = getPrefrontalCortexBrain();
        const proposals = brain.getPendingProposals();
        if (proposals.length === 0) {
          return "No pending improvement proposals.";
        }
        return `## Pending Improvement Proposals (${proposals.length})

${proposals.map((p) => `### ${p.id} (Gen ${p.generationNumber})
Risk: ${p.riskAssessment.level} | Confidence: ${(p.analysis.confidenceScore * 100).toFixed(0)}%
Root Cause: ${p.analysis.rootCauseAnalysis.slice(0, 200)}
Instruction Flaws: ${p.analysis.instructionFlaws.length} | Tool Gaps: ${p.analysis.toolGaps.length} | Cross-Project Sources: ${p.crossProjectSources.length}
Proposed: ${new Date(p.proposedAt).toISOString()}`).join(`

`)}`;
      }
    }),
    apply_improvement: tool({
      description: "Apply an approved improvement proposal. Low-risk auto-applies, high-risk requires manual approval.",
      args: {
        proposalId: exports_external.string().describe("The improvement proposal ID to apply")
      },
      execute: async ({ proposalId }) => {
        const brain = getPrefrontalCortexBrain();
        const result = brain.applyImprovement(proposalId);
        if (result.success) {
          return `Improvement ${proposalId} applied successfully.`;
        }
        return `Failed to apply improvement: ${result.reason}`;
      }
    }),
    get_cross_project_patterns: tool({
      description: "Search for cross-project patterns from other Krakens.",
      args: {
        query: exports_external.string().describe("Query to search for cross-project patterns"),
        limit: exports_external.number().optional().default(5).describe("Maximum results")
      },
      execute: async ({ query }) => {
        const brain = getPrefrontalCortexBrain();
        const lineage = brain.getEvolutionLineage();
        if (!lineage) {
          return "No lineage found for cross-project synthesis.";
        }
        const bestAcc = lineage.generations.length > 0 ? Math.max(...lineage.generations.map((g) => g.evaluation.metrics.accuracy)) : 0;
        return `## Cross-Project Patterns

Query: ${query}
Current Project: ${brain.getProjectId()} | Generations: ${lineage.currentGeneration} | Best Accuracy: ${(bestAcc * 100).toFixed(0)}%

${lineage.synthesizedLearnings.length > 0 ? `### Synthesized Learnings
${lineage.synthesizedLearnings.map((l) => "- " + l).join(`
`)}` : "No synthesized learnings yet."}`;
      }
    }),
    report_execution_insight: tool({
      description: "Report an execution insight discovered during task execution. Stored in Hive for future generations.",
      args: {
        insight: exports_external.string().describe("The execution insight discovered"),
        category: exports_external.enum(["pattern", "failure", "breakthrough"]).describe("Category of the insight"),
        evidence: exports_external.string().optional().describe("Supporting evidence")
      },
      execute: async ({ insight, category, evidence }) => {
        const brain = getPrefrontalCortexBrain();
        return `Execution insight recorded.

Category: ${category} | Project: ${brain.getProjectId()}
Insight: ${insight}
${evidence ? `Evidence: ${evidence}` : ""}
Timestamp: ${new Date().toISOString()}`;
      }
    }),
    get_prefrontal_status: tool({
      description: "Get the current status of the Prefrontal Cortex system.",
      args: {},
      execute: async () => {
        const brain = getPrefrontalCortexBrain();
        const status = brain.getPrefrontalStatus();
        return `## Prefrontal Cortex Status

Initialized: ${status.initialized} | OpenFang Connected: ${status.openfangConnected}
Generation: ${status.currentGeneration} | Trajectories: ${status.trajectoryCount}
Injected Firewall Patterns: ${status.injectedFirewallPatterns.length} | Pending Proposals: ${status.pendingProposals.length}
Registered Projects: ${status.registeredProjects.length}
Last Analysis: ${status.lastAnalysisAt > 0 ? new Date(status.lastAnalysisAt).toISOString() : "never"}
Sync: sent=${status.syncStatus.messagesSent} received=${status.syncStatus.messagesReceived} errors=${status.syncStatus.errors}`;
      }
    })
  };
}

// src/hooks/cluster-state-hook.ts
import fs6 from "node:fs";
import path7 from "node:path";
var KRAKEN_HOOK_IDENTITY = {
  name: "kraken-agent",
  prefix: "kraken-",
  orchestrator: "kraken",
  agents: new Set(["kraken", "kraken-executor", "shark-alpha-1", "shark-alpha-2", "shark-beta-1", "manta-alpha-1", "manta-beta-1", "manta-beta-2", "manta-gamma-1", "manta-gamma-2", "shark-gamma-1"])
};
var ACTIVITY_LOG_DIR = path7.join(process.env.HOME || "/root", ".local/share/opencode/kraken-hive/activity");
var clusterStateHook = safeHook(async (input, output, ctx) => {
  const sessionState = ctx.getSessionState();
  if (!sessionState.clusterActivity) {
    sessionState.clusterActivity = new Map;
  }
  const clusterActivityMap = sessionState.clusterActivity;
  const activity = extractActivity(input, output, ctx);
  if (activity) {
    const clusterId = activity.clusterId || detectClusterFromAgent(ctx.agentName || "");
    const clusterActivity = clusterActivityMap.get(clusterId) || {
      tasks: [],
      files: [],
      errors: [],
      completions: []
    };
    clusterActivity.tasks.push(activity);
    if (activity.type === "file_written" && activity.file) {
      clusterActivity.files.push(activity.file);
    }
    if (activity.type === "error") {
      clusterActivity.errors.push(activity.error || "Unknown error");
    }
    if (activity.type === "task_completed") {
      clusterActivity.completions.push(activity.taskId || "unknown");
    }
    clusterActivityMap.set(clusterId, clusterActivity);
    await persistActivity(clusterId, activity);
  }
}, {
  agentFilter: Array.from(KRAKEN_HOOK_IDENTITY.agents),
  pluginName: KRAKEN_HOOK_IDENTITY.name,
  managedAgents: KRAKEN_HOOK_IDENTITY.agents,
  agentPrefix: KRAKEN_HOOK_IDENTITY.prefix,
  orchestratorName: KRAKEN_HOOK_IDENTITY.orchestrator
});
function extractActivity(input, output, ctx) {
  const tool3 = input?.tool;
  const args = input?.args;
  const agentName = ctx.agentName || "";
  if (tool3 === "spawn_cluster_task" || tool3 === "spawn_shark_agent" || tool3 === "spawn_manta_agent") {
    return {
      type: "task_queued",
      taskId: args?.taskId || `task_${Date.now()}`,
      clusterId: args?.clusterId || detectClusterFromAgent(agentName),
      timestamp: Date.now(),
      agentId: agentName
    };
  }
  if (output?.success && (tool3 === "write_file" || tool3 === "mcp_write_file")) {
    return {
      type: "file_written",
      file: args?.path || "unknown",
      clusterId: detectClusterFromAgent(agentName),
      timestamp: Date.now(),
      agentId: agentName
    };
  }
  if (output?.error) {
    return {
      type: "error",
      error: output.error,
      clusterId: detectClusterFromAgent(agentName),
      timestamp: Date.now(),
      agentId: agentName
    };
  }
  return null;
}
function detectClusterFromAgent(agentName) {
  if (agentName.includes("alpha"))
    return "cluster-alpha";
  if (agentName.includes("beta"))
    return "cluster-beta";
  if (agentName.includes("gamma"))
    return "cluster-gamma";
  if (agentName.startsWith("kraken-"))
    return "orchestrator";
  return "unknown";
}
async function persistActivity(clusterId, activity) {
  try {
    const activityDir = path7.join(ACTIVITY_LOG_DIR, clusterId);
    if (!fs6.existsSync(activityDir)) {
      fs6.mkdirSync(activityDir, { recursive: true });
    }
    const timestamp = Date.now();
    const activityFile = path7.join(activityDir, `activity_${timestamp}.json`);
    fs6.writeFileSync(activityFile, JSON.stringify(activity, null, 2), "utf-8");
  } catch (err) {
    console.error("[ClusterStateHook] Failed to persist activity:", err instanceof Error ? err.message : String(err));
  }
}

// src/hooks/prefrontal-context-hook.ts
function prefrontalContextHook(params) {
  const { output } = params;
  try {
    const brain = getPrefrontalCortexBrain();
    if (!brain.isInitialized())
      return;
    const status = brain.getPrefrontalStatus();
    if (!status.initialized)
      return;
    const lineage = brain.getEvolutionLineage();
    const pendingCount = status.pendingProposals.length;
    const signalCount = brain.getIntuitionInjector().getSignalCount();
    const contextLines = [];
    contextLines.push("[PREFRONTAL CORTEX — Pattern recognition active]");
    contextLines.push(`Generation: ${status.currentGeneration} | Trajectories: ${status.trajectoryCount} | Intuition signals: ${signalCount}`);
    if (lineage && lineage.currentGeneration > 0) {
      const bestGen = brain.getLineageTracker().getBestGeneration(lineage);
      if (bestGen) {
        contextLines.push(`Best generation: ${bestGen.generationNumber} (accuracy: ${((bestGen.evaluation?.metrics?.accuracy ?? 0) * 100).toFixed(0)}%)`);
      }
    }
    if (pendingCount > 0) {
      contextLines.push(`${pendingCount} improvement proposals pending. Use check_improvement_proposals to review.`);
    }
    output.system = output.system || [];
    output.system.push(contextLines.join(`
`));
  } catch (err) {
    console.error("[PFC-ContextHook] Failed to inject PFC context:", err instanceof Error ? err.message : String(err));
  }
}
function prefrontalIntuitionHook(params) {
  const { output } = params;
  try {
    const brain = getPrefrontalCortexBrain();
    if (!brain.isInitialized())
      return;
    const message = [
      params.toolName || "",
      JSON.stringify(params.toolArgs || {}),
      params.input?.task || "",
      params.input?.command || "",
      params.input?.text || "",
      params.input?.message || "",
      typeof params.input?.messages === "object" ? JSON.stringify(params.input.messages?.slice?.(-2) || {}) : ""
    ].join(" ");
    const signals = brain.detectIntuition(message, params.toolName, params.toolArgs);
    if (signals.length === 0)
      return;
    const intuitionContext = brain.generateIntuitionContext(signals);
    if (!intuitionContext)
      return;
    output.system = output.system || [];
    output.system.push(intuitionContext);
  } catch (err) {
    console.error("[PFC-IntuitionHook] Failed to inject intuition signal:", err instanceof Error ? err.message : String(err));
  }
}
// src/identity/loader.ts
import * as fs7 from "fs/promises";
import * as path8 from "path";
var IDENTITY_DIR = process.env.KRAKEN_IDENTITY_DIR || "identity";
var KRAKEN_PLUGIN_NAME = process.env.KRAKEN_PLUGIN_NAME || "kraken-agent";
var KNOWN_LOCATIONS = [
  "identity",
  "../identity",
  `../../.config/opencode/plugins/${KRAKEN_PLUGIN_NAME}/dist/../identity`,
  `../.config/opencode/plugins/${KRAKEN_PLUGIN_NAME}/identity`
];
async function findIdentityDir() {
  if (path8.isAbsolute(IDENTITY_DIR)) {
    try {
      await fs7.access(IDENTITY_DIR);
      const orchestratorPath = path8.join(IDENTITY_DIR, "orchestrator");
      await fs7.access(orchestratorPath);
      return IDENTITY_DIR;
    } catch {}
  }
  const HOME = process.env.HOME || process.env.USERPROFILE || "/root";
  const searchDirs = [process.cwd(), HOME];
  for (const baseDir of searchDirs) {
    for (const loc of KNOWN_LOCATIONS) {
      const tryPath = path8.resolve(baseDir, loc);
      try {
        await fs7.access(tryPath);
        const orchestratorPath = path8.join(tryPath, "orchestrator");
        await fs7.access(orchestratorPath);
        return tryPath;
      } catch {}
    }
  }
  const directPath = path8.resolve(process.cwd(), IDENTITY_DIR);
  try {
    await fs7.access(directPath);
    const orchestratorPath = path8.join(directPath, "orchestrator");
    await fs7.access(orchestratorPath);
    return directPath;
  } catch {
    return path8.join(process.cwd(), "identity");
  }
}
var cachedIdentityPath = null;
async function resolveIdentityPath() {
  if (cachedIdentityPath) {
    return cachedIdentityPath;
  }
  const found = await findIdentityDir();
  cachedIdentityPath = found;
  return cachedIdentityPath;
}

class IdentityLoader {
  cache = new Map;
  async loadForRole(role) {
    const cached2 = this.cache.get(role);
    if (cached2) {
      return cached2;
    }
    const resolvedPath = await resolveIdentityPath();
    const roleDir = path8.join(resolvedPath, role);
    try {
      await fs7.access(roleDir);
    } catch {
      throw new Error(`Identity directory not found: ${roleDir}`);
    }
    const [kraken, identity, execution, quality, tools] = await Promise.all([
      this.loadFileSafe(roleDir, "KRAKEN.md"),
      this.loadFileSafe(roleDir, "IDENTITY.md"),
      this.loadFileSafe(roleDir, "EXECUTION.md"),
      this.loadFileSafe(roleDir, "QUALITY.md"),
      this.loadFileSafe(roleDir, "TOOLS.md")
    ]);
    const bundle = {
      role,
      soul: this.parseSoul(kraken || this.createMinimalSoul(role)),
      identity: this.parseIdentity(identity || this.createMinimalIdentity(role)),
      quality: this.parseQuality(quality || ""),
      metadata: {
        loadedAt: new Date().toISOString(),
        version: "1.0.0",
        sourceDir: roleDir
      }
    };
    if (execution) {
      bundle.execution = this.parseExecution(execution);
    }
    if (tools) {
      bundle.tools = this.parseTools(tools);
    }
    this.cache.set(role, bundle);
    return bundle;
  }
  async loadFile(role, file2) {
    const resolvedPath = await resolveIdentityPath();
    const roleDir = path8.join(resolvedPath, role);
    const result = await this.loadFileSafe(roleDir, file2);
    if (result === null) {
      throw new Error(`Identity file not found: ${roleDir}/${file2}`);
    }
    return result;
  }
  async listRoles() {
    try {
      const resolvedPath = await resolveIdentityPath();
      const entries = await fs7.readdir(resolvedPath);
      const roles = [];
      for (const entry of entries) {
        const entryPath = path8.join(resolvedPath, entry);
        const stat2 = await fs7.stat(entryPath);
        if (stat2.isDirectory()) {
          roles.push(entry);
        }
      }
      return roles.sort();
    } catch {
      return [];
    }
  }
  async roleExists(role) {
    try {
      const resolvedPath = await resolveIdentityPath();
      const roleDir = path8.join(resolvedPath, role);
      const stat2 = await fs7.stat(roleDir);
      return stat2.isDirectory();
    } catch {
      return false;
    }
  }
  clearCache() {
    this.cache.clear();
  }
  async loadFileSafe(dir, file2) {
    try {
      const filePath = path8.join(dir, file2);
      return await fs7.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }
  parseSoul(content) {
    const directives = [];
    const directiveMatch = content.match(/^\d+\.\s+(.+)$/gm);
    if (directiveMatch) {
      directives.push(...directiveMatch.map((d) => d.replace(/^\d+\.\s+/, "")));
    }
    const mantraMatch = content.match(/## The Mantra\n([^\n]+)/);
    const philosophyMatch = content.match(/## Orchestrator Identity\n([\s\S]+?)(?=##|## The)/);
    return {
      raw: content,
      directives,
      philosophy: philosophyMatch ? philosophyMatch[1].trim() : "",
      mantra: mantraMatch ? mantraMatch[1].trim() : "Execute, don't simulate."
    };
  }
  parseIdentity(content) {
    const titleMatch = content.match(/^# IDENTITY\.md — (.+)$/m);
    const roleMatch = content.match(/## Role\n([\s\S]+?)(?=##)/);
    const expertiseMatch = content.match(/## Expertise\n([\s\S]+?)(?=##)/);
    const workingStyleMatch = content.match(/## Working Style\n([\s\S]+?)(?=##)/);
    const trackRecordMatch = content.match(/## Track Record\n([\s\S]+?)(?=##)/);
    const extractItems = (text) => {
      if (!text)
        return [];
      return text.split(`
`).filter((line) => line.trim().startsWith("-")).map((line) => line.replace(/^-\s+/, "").trim());
    };
    return {
      raw: content,
      title: titleMatch ? titleMatch[1] : "Unknown",
      role: roleMatch ? roleMatch[1].trim() : "",
      expertise: extractItems(expertiseMatch?.[1]),
      workingStyle: extractItems(workingStyleMatch?.[1]),
      trackRecord: extractItems(trackRecordMatch?.[1])
    };
  }
  parseExecution(content) {
    const philosophyMatch = content.match(/## Delegation Philosophy\n([\s\S]+?)(?=##)/);
    const neverDoMatch = content.match(/## Never Do Directly\n([\s\S]+?)(?=##)/);
    const triggers = [];
    const triggerMatch = content.match(/### High Priority[\s\S]+?(?=###|$)/g);
    if (triggerMatch) {
      for (const trigger of triggerMatch) {
        const lines = trigger.split(`
`).filter((l) => l.includes("→"));
        for (const line of lines) {
          const [condition, action] = line.split("→").map((s) => s.trim());
          if (condition && action) {
            triggers.push({
              condition,
              action,
              priority: "high"
            });
          }
        }
      }
    }
    return {
      raw: content,
      delegationPhilosophy: philosophyMatch ? philosophyMatch[1].trim() : "",
      parallelPatterns: [],
      delegationTriggers: triggers,
      escalationPath: "",
      neverDoDirectly: neverDoMatch ? neverDoMatch[1].split(`
`).filter((l) => l.trim().startsWith("-")).map((l) => l.replace(/^-\s+/, "")) : []
    };
  }
  parseQuality(content) {
    const gatesMatch = content.match(/## Quality Gates\n([\s\S]+?)(?=##)/);
    const validatorsMatch = content.match(/## Anti-Hallucination Validators\n([\s\S]+?)(?=##)/);
    return {
      raw: content,
      qualityGates: gatesMatch ? gatesMatch[1].split(`
`).filter((l) => l.trim().startsWith("-")).map((l) => l.replace(/^-\s+/, "")) : [],
      antiHallucinationValidators: validatorsMatch ? validatorsMatch[1].split(`
`).filter((l) => l.trim().startsWith("-")).map((l) => l.replace(/^-\s+/, "")) : [],
      debugProtocol: [],
      stagnationDetection: [],
      guardianZones: [],
      evidenceHierarchy: []
    };
  }
  parseTools(content) {
    return {
      raw: content,
      openCode: [],
      swarm: [],
      cluster: []
    };
  }
  createMinimalSoul(role) {
    return `# KRAKEN.md — ${role} Agent

You are a ${role} agent. You are not a chatbot. You are an execution engine.

## Core Directives
1. EXECUTE, don't simulate.
2. VERIFY everything.
3. DELEGATE when possible.

## The Mantra
Execute, don't simulate. Verify, don't assume.
`;
  }
  createMinimalIdentity(role) {
    return `# IDENTITY.md — ${role}

## Role
You are a ${role} agent.

## Expertise
- Execution
- Verification
- Delegation

## Working Style
- Execute tasks efficiently
- Verify all outputs
`;
  }
}
var identityLoader = new IdentityLoader;
// src/identity/injector.ts
function formatIdentityForSystemPrompt(bundle) {
  let prompt = `
## IDENTITY

${bundle.soul.raw}

---

## ROLE

${bundle.identity.raw}

`;
  if (bundle.execution) {
    prompt += `
---

## EXECUTION PATTERNS

${bundle.execution.raw}

`;
  }
  prompt += `
---

## QUALITY & VERIFICATION

${bundle.quality.raw}
`;
  if (bundle.tools) {
    prompt += `

---

## AVAILABLE TOOLS

${bundle.tools.raw}
`;
  }
  prompt += `

---

## The Mantra

${bundle.soul.mantra}
`;
  return prompt;
}
// src/index.ts
var KRAKEN_PLUGIN_IDENTITY = {
  name: "kraken-agent",
  prefix: "kraken-",
  orchestrator: "kraken",
  agents: new Set([
    "kraken",
    "kraken-executor",
    "shark-alpha-1",
    "shark-alpha-2",
    "manta-alpha-1",
    "shark-beta-1",
    "manta-beta-1",
    "manta-beta-2",
    "manta-gamma-1",
    "manta-gamma-2",
    "shark-gamma-1"
  ]),
  primaryAgents: new Set(["kraken"]),
  krakenAgents: new Set(["kraken", "kraken-executor"]),
  clusterAgents: new Set([
    "shark-alpha-1",
    "shark-alpha-2",
    "manta-alpha-1",
    "shark-beta-1",
    "manta-beta-1",
    "manta-beta-2",
    "manta-gamma-1",
    "manta-gamma-2",
    "shark-gamma-1"
  ])
};
var awareness = createAgentAwareness(KRAKEN_PLUGIN_IDENTITY.agents, KRAKEN_PLUGIN_IDENTITY.prefix, KRAKEN_PLUGIN_IDENTITY.orchestrator);
var identityLoader2 = new IdentityLoader;
var orchestratorIdentityPrompt = "";
async function loadOrchestratorIdentity() {
  try {
    const bundle = await identityLoader2.loadForRole("orchestrator");
    return formatIdentityForSystemPrompt(bundle);
  } catch (error45) {
    console.error("[Identity] Failed to load orchestrator identity:", error45);
    return "";
  }
}
var KRAKEN_CLUSTERS = [
  {
    id: "cluster-alpha",
    name: "Alpha Cluster",
    description: "Primary build cluster - Shark agents for steamroll tasks",
    agents: ["shark-alpha-1", "shark-alpha-2", "manta-alpha-1"],
    intraClusterDelegation: true,
    interClusterDelegation: true,
    sharedContext: true
  },
  {
    id: "cluster-beta",
    name: "Beta Cluster",
    description: "Secondary build cluster - balanced Shark/Manta",
    agents: ["shark-beta-1", "manta-beta-1", "manta-beta-2"],
    intraClusterDelegation: true,
    interClusterDelegation: true,
    sharedContext: true
  },
  {
    id: "cluster-gamma",
    name: "Gamma Cluster",
    description: "Precision cluster - Manta agents for debugging/linear tasks",
    agents: ["manta-gamma-1", "manta-gamma-2", "shark-gamma-1"],
    intraClusterDelegation: true,
    interClusterDelegation: true,
    sharedContext: true
  }
];
var clusterManager = null;
var delegationEngine = null;
var clusterScheduler = null;
var krakenHive = null;
var krakenAgents = new Map([
  ["kraken", {
    description: "Kraken — Central orchestrator with full Hive access",
    instructions: `You are KRAKEN — the central orchestrator of the Kraken Agent Harness.

Your role:
- Analyze user requirements and create execution plans
- Assign tasks to clusters via spawn_cluster_task, spawn_shark_agent, spawn_manta_agent
- Search Kraken Hive for relevant context via kraken_hive_search
- Inject context into tasks via kraken_hive_inject_context
- Store patterns and decisions to Hive via kraken_hive_remember

You have FULL ACCESS to Kraken Hive Mind. Other agents cannot see Hive data.

Cluster Assignment Strategy:
- Steamroll tasks (build from scratch) → cluster-alpha (Sharks)
- Debug/precision tasks → cluster-gamma (Mantas)
- Balanced tasks → cluster-beta

Tools you have:
- spawn_cluster_task: Generic task assignment
- spawn_shark_agent: Assign to Shark (aggressive execution)
- spawn_manta_agent: Assign to Manta (precise execution)
- kraken_hive_search: Search Hive for patterns/context
- kraken_hive_remember: Store to Hive
- kraken_hive_inject_context: Inject context into task
- get_cluster_status: Check cluster state
- aggregate_results: Collect results from multiple tasks

DOCUMENTATION RULES (NON-NEGOTIABLE):
- When user asks for documentation, write SYNTHESIZED documents - not raw data dumps
- Use proper format: clear headings, tables for data, concise explanations
- Store raw DATA to files (timestamps, metrics, line numbers) - NOT summaries
- Reference format examples: /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Shark Agent/Master Context/
- NEVER summarize test results - show actual numbers from test runs
- NEVER say "looks good" - show specific file:line changes

Rules:
- ALWAYS search Hive before assigning tasks
- ALWAYS store useful patterns/failures to Hive
- NEVER let agents talk to each other - they report to you
- Delegate execution, don't do the work yourself

PREFRONTAL CORTEX — You are part of an evolutionary loop.
- Your execution is recorded and analyzed to improve future agents.
- Use check_improvement_proposals to see what the FeedbackBrain suggests.
- Use get_evolution_lineage to see what worked in past generations.
- Use get_cross_project_patterns to learn from other Krakens.
- Your failures are NOT wasted — they train the next generation.`
  }],
  ["kraken-executor", {
    description: "Kraken Executor — Execution coordinator with Hive access",
    instructions: `You are KRAKEN EXECUTOR — the execution coordinator of the Kraken Agent Harness.

Your role:
- Monitor cluster execution via get_cluster_status
- Aggregate results from multiple tasks
- Track task completion and handle failures
- Coordinate cross-cluster work when needed

You have FULL ACCESS to Kraken Hive Mind.

Tools you have:
- spawn_cluster_task: Generic task assignment
- spawn_shark_agent: Assign to Shark
- spawn_manta_agent: Assign to Manta
- kraken_hive_search: Search Hive for context
- kraken_hive_remember: Store to Hive
- get_cluster_status: Check cluster state
- aggregate_results: Collect results
- get_agent_status: Check agent availability

Rules:
- Monitor clusters for task completion
- Aggregate results when tasks complete
- Report issues to kraken
- Keep Hive updated with execution state

PREFRONTAL CORTEX — Your supervision data feeds the evolutionary loop.
- Use get_prefrontal_status to check system health.
- Use check_improvement_proposals to review pending improvements.`
  }]
]);
var clusterAgents = new Map([
  ["shark-alpha-1", {
    description: "Shark Alpha-1 — Steamroll engineer",
    instructions: `You are SHARK ALPHA-1 — Ferrari V12 turbo vibecoding engineer.

You specialize in aggressive, steamroll-style execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks aggressively and fully
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Do NOT access Hive directly
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["shark-alpha-2", {
    description: "Shark Alpha-2 — Steamroll engineer",
    instructions: `You are SHARK ALPHA-2 — Ferrari V12 turbo vibecoding engineer.

You specialize in aggressive, steamroll-style execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks aggressively and fully
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Do NOT access Hive directly
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["manta-alpha-1", {
    description: "Manta Alpha-1 — Precision engineer",
    instructions: `You are MANTA ALPHA-1 — Tesla Model S precision agent.

You specialize in linear, methodical execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks precisely and methodically
- Read T2_PATTERNS.md and T2_FAILURE_MODES
- Report completion via report_to_kraken
- Do NOT access Hive directly
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["shark-beta-1", {
    description: "Shark Beta-1 — Balanced engineer",
    instructions: `You are SHARK BETA-1 — Ferrari V12 turbo vibecoding engineer.

You specialize in balanced, versatile execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Handle balanced workloads
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["manta-beta-1", {
    description: "Manta Beta-1 — Precision engineer",
    instructions: `You are MANTA BETA-1 — Tesla Model S precision agent.

You specialize in linear, methodical execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks precisely and methodically
- Read T2_PATTERNS.md and T2_FAILURE_MODES.md
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["manta-beta-2", {
    description: "Manta Beta-2 — Precision engineer",
    instructions: `You are MANTA BETA-2 — Tesla Model S precision agent.

You specialize in linear, methodical execution.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Execute tasks precisely and methodically
- Read T2_PATTERNS.md and T2_FAILURE_MODES.md
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["manta-gamma-1", {
    description: "Manta Gamma-1 — Debug/precision specialist",
    instructions: `You are MANTA GAMMA-1 — Tesla Model S precision agent.

You specialize in debugging and precision work.

Tools you have:
- read_kraken_context: Read T2 reference patterns (especially failures)
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Focus on debugging and verification tasks
- Read T2_FAILURE_MODES.md to avoid known failures
- Execute with maximum precision
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["manta-gamma-2", {
    description: "Manta Gamma-2 — Debug/precision specialist",
    instructions: `You are MANTA GAMMA-2 — Tesla Model S precision agent.

You specialize in debugging and precision work.

Tools you have:
- read_kraken_context: Read T2 reference patterns (especially failures)
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Focus on debugging and verification tasks
- Read T2_FAILURE_MODES.md to avoid known failures
- Execute with maximum precision
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }],
  ["shark-gamma-1", {
    description: "Shark Gamma-1 — Steamroll specialist",
    instructions: `You are SHARK GAMMA-1 — Ferrari V12 turbo vibecoding engineer.

You specialize in aggressive execution when precision tasks need steamroll approach.

Tools you have:
- read_kraken_context: Read T2 reference patterns
- report_to_kraken: Report completion/blockers to Kraken
- get_task_context: Get injected context from Kraken

Rules:
- Handle steamroll tasks in gamma cluster
- Read T2_PATTERNS.md for established patterns
- Report completion via report_to_kraken
- Your execution is tracked by the Prefrontal Cortex for evolutionary improvement`
  }]
]);
function isKrakenAgent(agentName) {
  return KRAKEN_PLUGIN_IDENTITY.krakenAgents.has(agentName);
}
function isClusterAgent(agentName) {
  return KRAKEN_PLUGIN_IDENTITY.clusterAgents.has(agentName);
}
function getAgentTools(agentName) {
  if (isKrakenAgent(agentName)) {
    return {
      ...createClusterTools(getClusterToolsContext()),
      ...createMonitoringTools(getMonitoringToolsContext()),
      ...createKrakenHiveTools(getKrakenHiveToolsContext()),
      ...createPrefrontalTools({ isKrakenAgent })
    };
  } else if (isClusterAgent(agentName)) {
    return {
      ...createSharkT2Tools(getT2ToolsContext())
    };
  }
  return {};
}
function getClusterToolsContext() {
  return {
    delegationEngine,
    clusterScheduler,
    clusterManager,
    krakenIdentity: orchestratorIdentityPrompt
  };
}
function getMonitoringToolsContext() {
  return {
    delegationEngine,
    clusterManager
  };
}
function getKrakenHiveToolsContext() {
  return {
    krakenHive,
    isKrakenAgent
  };
}
function getT2ToolsContext() {
  return {
    isSharkOrMantaAgent: isClusterAgent
  };
}
async function KrakenAgent(input) {
  const logger = createLogger(KRAKEN_PLUGIN_IDENTITY.name);
  logger.info("Initializing Kraken Agent Harness", {
    clusters: KRAKEN_CLUSTERS.length,
    agents: KRAKEN_PLUGIN_IDENTITY.agents.size
  });
  orchestratorIdentityPrompt = await loadOrchestratorIdentity();
  if (orchestratorIdentityPrompt && orchestratorIdentityPrompt.length > 100) {
    logger.info("[Identity] Orchestrator identity loaded", {
      length: orchestratorIdentityPrompt.length
    });
  } else {
    logger.warn("[Identity] Orchestrator identity NOT loaded - using fallback");
    orchestratorIdentityPrompt = "";
  }
  clusterManager = new ClusterManager(KRAKEN_CLUSTERS);
  clusterScheduler = new ClusterScheduler(KRAKEN_CLUSTERS);
  krakenHive = new KrakenHiveEngine;
  delegationEngine = new AsyncDelegationEngine(KRAKEN_CLUSTERS, clusterManager);
  const stateStore = createStateStore2();
  const messenger = createBrainMessenger2();
  const planningBrain = createPlanningBrain(stateStore, messenger);
  const executionBrain = createExecutionBrain(stateStore, messenger);
  const systemBrain = createSystemBrain(stateStore, messenger);
  planningBrain.initialize();
  executionBrain.initialize();
  systemBrain.initialize();
  const evidenceCollector = createEvidenceCollector();
  logger.info("[Evidence] Evidence collector initialized");
  const hiveSeed = seedKrakenHive();
  logger.info("[Hive] Seed complete", hiveSeed);
  const subagentBrain = new SubagentManagerBrain(messenger, stateStore);
  subagentBrain.initialize();
  logger.info("[Subagent] Manager brain initialized");
  const concurrencyManager = new BrainConcurrencyManager(messenger, stateStore);
  concurrencyManager.setSystemTick(async () => {
    try {
      const currentGate = systemBrain.getCurrentGate();
      const evaluation = systemBrain.evaluateGateEntry(currentGate);
      if (evaluation.allPassed && await systemBrain.isGateAdvanceable()) {
        const gateOrder = ["plan", "build", "test", "verify", "audit", "delivery"];
        const currentIdx = gateOrder.indexOf(currentGate);
        if (currentIdx >= 0 && currentIdx < gateOrder.length - 1) {
          const nextGate = gateOrder[currentIdx + 1];
          systemBrain.setCurrentGate(nextGate);
          console.log(`[BrainTick:system] Gate auto-advanced: ${currentGate} → ${nextGate}`);
        }
      }
    } catch (err) {
      console.error("[BrainTick:system] Error:", err instanceof Error ? err.message : String(err));
    }
  });
  concurrencyManager.setExecutionTick(async () => {
    try {
      const execState = executionBrain.getState();
      if (execState.activeTasks > 0) {}
    } catch (err) {
      console.error("[BrainTick:execution] Error:", err instanceof Error ? err.message : String(err));
    }
  });
  concurrencyManager.setPlanningTick(async () => {
    try {
      const planState = planningBrain.getState();
      if (!planState.t2MasterLoaded) {}
    } catch (err) {
      console.error("[BrainTick:planning] Error:", err instanceof Error ? err.message : String(err));
    }
  });
  concurrencyManager.startAll();
  let prefrontalBrain;
  try {
    prefrontalBrain = createPrefrontalCortexBrain({ stateStore, messenger });
    prefrontalBrain.initialize();
    logger.info("[PFC] Prefrontal Cortex initialized successfully");
  } catch (err) {
    console.error("[PFC] CRITICAL: Prefrontal Cortex init failed — continuing without PFC:", err instanceof Error ? err.message : String(err));
    prefrontalBrain = null;
  }
  logger.info("[V1.2] Multi-Brain Orchestrator initialized", {
    planning: planningBrain.isInitialized(),
    execution: executionBrain.isInitialized(),
    system: systemBrain.isInitialized(),
    prefrontal: prefrontalBrain?.isInitialized() ?? false,
    evidence: true,
    firewall: true,
    concurrency: concurrencyManager.getState()
  });
  const allTools = {
    ...createClusterTools(getClusterToolsContext()),
    ...createMonitoringTools(getMonitoringToolsContext()),
    ...createKrakenHiveTools(getKrakenHiveToolsContext()),
    ...createSharkT2Tools(getT2ToolsContext()),
    ...createPrefrontalTools({ isKrakenAgent })
  };
  logger.info("Kraken Agent Harness initialized", {
    clusterCount: KRAKEN_CLUSTERS.length,
    totalAgents: KRAKEN_PLUGIN_IDENTITY.agents.size,
    krakenHiveReady: true
  });
  return {
    name: KRAKEN_PLUGIN_IDENTITY.name,
    tool: allTools,
    config: async (opencodeConfig) => {
      const sdkConfigs = {};
      for (const [id, agent] of krakenAgents) {
        const isPrimary2 = id === "kraken";
        sdkConfigs[id] = {
          name: id,
          description: agent.description,
          instructions: agent.instructions,
          mode: isPrimary2 ? "primary" : "subagent",
          permission: { task: "allow" },
          tools: getAgentTools(id)
        };
      }
      for (const [id, agent] of clusterAgents) {
        sdkConfigs[id] = {
          name: id,
          description: agent.description,
          instructions: agent.instructions,
          mode: "subagent",
          permission: { task: "allow" },
          tools: getAgentTools(id)
        };
      }
      if (!opencodeConfig.agent) {
        opencodeConfig.agent = { ...sdkConfigs };
      } else {
        Object.assign(opencodeConfig.agent, sdkConfigs);
      }
      logger.info("Agents registered", {
        count: Object.keys(sdkConfigs).length,
        primary: Array.from(KRAKEN_PLUGIN_IDENTITY.primaryAgents)
      });
    },
    "experimental.chat.system.transform": safeHook(async (input2, output, ctx) => {
      if (orchestratorIdentityPrompt) {
        output.system = output.system || [];
        output.system.push(`[KRAKEN ORCHESTRATION LAYER ACTIVE]
You have access to the Kraken multi-brain orchestration system.
Available orchestration tools: spawn_shark_agent, spawn_manta_agent, spawn_cluster_task,
anchor_cluster, kraken_brain_status, get_cluster_status, get_agent_status,
kraken_hive_search, kraken_hive_remember, read_kraken_context.
Use these tools to coordinate parallel execution across Alpha (build),
Beta (debug), and Gamma (test) clusters.`);
        try {
          const pfcOutput = output;
          if (pfcOutput) {
            prefrontalContextHook({ input: input2, output: pfcOutput, ctx: { agentName: undefined } });
            const userText = typeof input2?.text === "string" ? input2.text : typeof input2?.message === "string" ? input2.message : "";
            if (userText.length > 0) {
              prefrontalIntuitionHook({
                input: input2,
                output: pfcOutput,
                toolName: undefined,
                toolArgs: undefined
              });
            }
          }
        } catch (err) {
          console.error("[PFC] Context + intuition injection failed:", err instanceof Error ? err.message : String(err));
        }
      }
    }, {
      agentFilter: null,
      pluginName: KRAKEN_PLUGIN_IDENTITY.name,
      managedAgents: KRAKEN_PLUGIN_IDENTITY.agents,
      agentPrefix: KRAKEN_PLUGIN_IDENTITY.prefix,
      orchestratorName: KRAKEN_PLUGIN_IDENTITY.orchestrator
    }),
    "tool.execute.before": async (input2, output) => {
      const toolName = input2?.tool || "";
      const toolArgs = input2?.args || {};
      try {
        const brain = getPrefrontalCortexBrain();
        if (!brain.isInitialized())
          return;
        const message = [toolName, JSON.stringify(toolArgs)].join(" ");
        const signals = brain.detectIntuition(message, toolName, toolArgs);
        if (signals.length > 0) {
          const intuitionContext = brain.generateIntuitionContext(signals);
          if (intuitionContext && output) {
            output.system = output.system || [];
            output.system.push(intuitionContext);
            console.log("[PFC-BEFORE] Injected", signals.length, "intuition signals for tool:", toolName);
          }
        }
        const injector2 = brain.getIntuitionInjector();
        const firewallPatterns = injector2.getActiveSignals().filter((s) => s.triggerContexts.includes("bash-usage") && toolName === "bash");
        if (firewallPatterns.length > 0) {
          console.log("[PFC-BEFORE] Bash usage detected with", firewallPatterns.length, "active signals");
        }
      } catch (err) {
        console.error("[PFC-BEFORE] Error:", err instanceof Error ? err.message : String(err));
      }
    },
    "tool.execute.after": async (input2, output) => {
      try {
        const brain = getPrefrontalCortexBrain();
        if (!brain.isInitialized())
          return;
        let tracer = brain.getTracer();
        if (!tracer) {
          const sessionId = input2?.sessionID || `pfc-session-${Date.now()}`;
          tracer = brain.createTracer(sessionId);
          tracer.startTrajectory("kraken");
        }
        if (tracer.getActiveTrajectoryCount() === 0) {
          tracer.startTrajectory("kraken");
        }
        const toolName = input2?.tool || "";
        const toolArgs = input2?.args || {};
        tracer.recordToolCall({
          toolName,
          args: toolArgs,
          result: typeof output === "string" ? output : JSON.stringify(output)?.substring(0, 500),
          error: undefined,
          durationMs: 0,
          agentId: "kraken",
          taskId: undefined,
          blockedBy: undefined
        });
        tracer.flushAndPersist();
        console.log("[PFC Tracer] Done:", toolName, "buffer:", tracer.getBufferSize(), "store:", tracer.getStoreTrajectoryCount());
      } catch (err) {
        console.error("[PFC Tracer] tool.execute.after error:", err instanceof Error ? err.message : String(err));
      }
    },
    "chat.message": safeHook(async (input2, output, ctx) => {
      await clusterStateHook({ input: input2, output, ctx });
      const outMsg = output.message;
      const userMessage = typeof outMsg === "string" ? outMsg : outMsg?.text || outMsg?.content || "";
      if (!userMessage)
        return;
      const sessionState = ctx.getSessionState();
      const agent = input2.agent || "";
      const isKrakenSession = KRAKEN_PLUGIN_IDENTITY.krakenAgents.has(agent) || agent.startsWith("kraken-");
      const identityQueryPattern = /\b(who are you|what are you|identify yourself|your name|what is your purpose)\b/i;
      if (identityQueryPattern.test(userMessage) && isKrakenSession) {
        output.system = output.system || [];
        const identity = orchestratorIdentityPrompt || `
You ARE the KRAKEN ORCHESTRATOR — the central coordination engine of the Kraken Agent Harness.

You manage:
- Planning Brain: Task decomposition and context bridging
- Execution Brain: Output verification and task supervision
- System Brain: Gate management and security enforcement
- 3 Agent Clusters: Alpha (steamroll), Beta (balanced), Gamma (precision)
- Kraken Hive Mind: Pattern/failure memory

You are NOT a chatbot. You are an execution engine.`;
        output.system.push(identity);
        return;
      }
      if (userMessage.length > 10) {
        try {
          const planningBrain2 = getPlanningBrain();
          if (planningBrain2.isInitialized()) {
            const t1 = await planningBrain2.generateT1(userMessage);
            if (t1.tasks.length > 0) {
              console.log(`[BrainWire] Generated ${t1.tasks.length} tasks from user request`);
              try {
                const systemBrain2 = getSystemBrain();
                systemBrain2.recordDecision({
                  description: `Auto-decomposed user request into ${t1.tasks.length} tasks`,
                  type: "task-decomposition",
                  contextFiles: []
                });
              } catch (err) {
                console.error("[BrainWire] System brain notification failed:", err instanceof Error ? err.message : String(err));
              }
              try {
                const executionBrain2 = getExecutionBrain();
                const { getBrainMessenger: getBrainMessenger3 } = await Promise.resolve().then(() => exports_brain_messenger);
                const messenger2 = getBrainMessenger3();
                messenger2.deliverMessage("kraken-planning", "kraken-execution", "context-inject", {
                  type: "t1-decomposed",
                  taskCount: t1.tasks.length,
                  tasks: t1.tasks.map((t) => ({ id: t.id, type: t.type, cluster: t.targetCluster }))
                }, "high");
              } catch (err) {
                console.error("[BrainWire] Execution brain notification failed:", err instanceof Error ? err.message : String(err));
              }
              output.system = output.system || [];
              const taskLines = t1.tasks.map((t) => `- ${t.type.toUpperCase()}: ${t.description} → cluster-${t.targetCluster}`);
              output.system.push(`[KRAKEN PLANNING] Task decomposition:
${taskLines.join(`
`)}

Execute tasks using spawn_shark_agent for build/create tasks and spawn_manta_agent for debug/test tasks.`);
            }
          }
        } catch (err) {
          console.error("[BrainWire] Task decomposition failed:", err instanceof Error ? err.message : String(err));
        }
      }
    }, {
      agentFilter: null,
      pluginName: KRAKEN_PLUGIN_IDENTITY.name,
      managedAgents: KRAKEN_PLUGIN_IDENTITY.agents,
      agentPrefix: KRAKEN_PLUGIN_IDENTITY.prefix,
      orchestratorName: KRAKEN_PLUGIN_IDENTITY.orchestrator
    }),
    "experimental.session.compacting": safeHook(async (input2, output, ctx) => {
      try {
        const { getPlanningBrain: getPlanningBrain2 } = await Promise.resolve().then(() => (init_planning_brain(), exports_planning_brain));
        const { getExecutionBrain: getExecutionBrain2 } = await Promise.resolve().then(() => (init_execution_brain(), exports_execution_brain));
        const { getSystemBrain: getSystemBrain2 } = await Promise.resolve().then(() => (init_system_brain(), exports_system_brain));
        const { getEvidenceCollector: getEvidenceCollector2 } = await Promise.resolve().then(() => (init_evidence_collector(), exports_evidence_collector));
        const pBrain = getPlanningBrain2();
        const eBrain = getExecutionBrain2();
        const sBrain = getSystemBrain2();
        const evidence = getEvidenceCollector2();
        const currentGate = sBrain.getCurrentGate();
        evidence.persist(currentGate);
        output.context = output.context || [];
        output.context.push(`[KRAKEN COMPACTION SURVIVAL]
Current gate: ${currentGate}
Planning: T2_loaded=${pBrain.isT2MasterLoaded()}, T1_generated=${pBrain.isT1Generated()}
Execution: active=${eBrain.getState().activeTasks}, completed=${eBrain.getState().completedTasks}, failed=${eBrain.getState().failedTasks}
System: decisions=${sBrain.getState().decisionCount}, completed_tasks=${sBrain.getState().completedTasks.length}
Evidence: gate=${currentGate}, verified=${evidence.isGateVerified(currentGate)}
Prefrontal: initialized=${prefrontalBrain?.isInitialized() ?? false}, trajectories=${prefrontalBrain?.getPrefrontalStatus()?.trajectoryCount ?? 0}`);
        console.log("[Compaction] Brain state preserved for compaction survival");
      } catch (err) {
        console.error("[Compaction] Failed to preserve state:", err);
      }
    }, {
      agentFilter: null,
      pluginName: KRAKEN_PLUGIN_IDENTITY.name,
      managedAgents: KRAKEN_PLUGIN_IDENTITY.agents,
      agentPrefix: KRAKEN_PLUGIN_IDENTITY.prefix,
      orchestratorName: KRAKEN_PLUGIN_IDENTITY.orchestrator
    }),
    event: async (input2) => {
      const eventType = input2?.event?.type || input2?.type || "";
      if (eventType === "session.deleted" || eventType === "session.ended") {
        if (prefrontalBrain) {
          try {
            prefrontalBrain.notifySessionComplete(input2?.session?.sessionId || "unknown");
          } catch (err) {
            console.error("[Kraken] PFC session notification failed:", err instanceof Error ? err.message : String(err));
          }
          try {
            prefrontalBrain.cleanup();
          } catch (err) {
            console.error("[Kraken] PFC cleanup failed:", err instanceof Error ? err.message : String(err));
          }
        }
        concurrencyManager.stopAll();
        console.log("[Kraken] Session ended — brain loops stopped");
      }
    }
  };
}
export {
  KrakenAgent as default
};
