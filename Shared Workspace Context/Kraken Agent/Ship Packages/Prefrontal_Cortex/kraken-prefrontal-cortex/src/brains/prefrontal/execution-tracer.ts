import crypto from 'node:crypto';
import {
  type ToolCallEntry,
  type LLMMessageEntry,
  type SCFIncident,
  type ExecutionTrajectory,
  type TrajectoryStats,
  MAX_BUFFER_SIZE,
  FLUSH_THRESHOLD,
  MAX_TOOL_RESULT_SIZE,
  MAX_MESSAGE_CONTENT_SIZE,
} from './types.js';
import { type CortexStore } from './cortex-store.js';

export class ExecutionTracer {
  private cortexStore: CortexStore;
  private sessionId: string;
  private projectId: string;
  private toolCallBuffer: ToolCallEntry[] = [];
  private messageBuffer: LLMMessageEntry[] = [];
  private scfIncidents: SCFIncident[] = [];
  private activeTrajectories: Map<string, { startedAt: number; agentId: string; taskId?: string; clusterId?: string }> = new Map();
  private trajectoryCount = 0;

  constructor(cortexStore: CortexStore, sessionId: string, projectId: string) {
    this.cortexStore = cortexStore;
    this.sessionId = sessionId;
    this.projectId = projectId;
  }

  initialize(): void {
    this.cortexStore.initialize();
    console.log(`[ExecutionTracer] Initialized for session=${this.sessionId}, project=${this.projectId}`);
  }

  recordToolCall(params: {
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
    error?: string;
    durationMs: number;
    agentId: string;
    taskId?: string;
    blockedBy?: string;
  }): ToolCallEntry {
    const isBash = params.toolName === 'bash' || params.toolName === 'shell_exec';
    let resultData = params.result;
    if (resultData !== undefined) {
      const serialized = typeof resultData === 'string' ? resultData : JSON.stringify(resultData);
      if (serialized.length > MAX_TOOL_RESULT_SIZE) {
        resultData = serialized.substring(0, MAX_TOOL_RESULT_SIZE) + '...[truncated]';
      }
    }

    const entry: ToolCallEntry = {
      toolName: params.toolName,
      args: params.args,
      result: resultData,
      error: params.error,
      durationMs: params.durationMs,
      timestamp: Date.now(),
      agentId: params.agentId,
      taskId: params.taskId,
      isBash,
      blockedBy: params.blockedBy,
    };

    this.toolCallBuffer.push(entry);
    if (this.toolCallBuffer.length >= FLUSH_THRESHOLD) {
      this.flushBuffer();
    }

    return entry;
  }

  recordLLMMessage(params: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
    tokensUsed?: number;
    derailmentFlags?: string[];
  }): LLMMessageEntry {
    let content = params.content;
    if (content.length > MAX_MESSAGE_CONTENT_SIZE) {
      content = content.substring(0, MAX_MESSAGE_CONTENT_SIZE) + '...[truncated]';
    }

    const entry: LLMMessageEntry = {
      role: params.role,
      content,
      toolCalls: params.toolCalls,
      tokensUsed: params.tokensUsed,
      timestamp: Date.now(),
      derailmentFlags: params.derailmentFlags,
    };

    this.messageBuffer.push(entry);
    if (this.messageBuffer.length >= MAX_BUFFER_SIZE) {
      this.flushBuffer();
    }

    return entry;
  }

  recordSCFIncident(incident: SCFIncident): void {
    this.scfIncidents.push(incident);
  }

  startTrajectory(agentId: string, taskId?: string, clusterId?: string): string {
    const trajectoryId = `traj-${crypto.randomUUID().slice(0, 8)}-${Date.now()}`;
    this.activeTrajectories.set(trajectoryId, {
      startedAt: Date.now(),
      agentId,
      taskId,
      clusterId,
    });
    return trajectoryId;
  }

  finalizeTrajectory(trajectoryId: string, outcome: ExecutionTrajectory['outcome'], outputPaths: string[]): ExecutionTrajectory | null {
    const active = this.activeTrajectories.get(trajectoryId);
    if (!active) {
      console.warn(`[ExecutionTracer] No active trajectory ${trajectoryId} to finalize`);
      return null;
    }

    this.flushBuffer();

    const now = Date.now();
    const toolCalls = this.toolCallBuffer.filter(tc => tc.agentId === active.agentId);
    const messages = this.messageBuffer;

    const stats = this.computeStats(toolCalls, messages, now - active.startedAt);

    const trajectory: ExecutionTrajectory = {
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
      completedAt: now,
    };

    this.cortexStore.insertTrajectory(trajectory);
    this.activeTrajectories.delete(trajectoryId);
    this.trajectoryCount++;

    console.log(`[ExecutionTracer] Finalized trajectory ${trajectoryId}: outcome=${outcome}, tools=${stats.totalToolCalls}, wall=${stats.wallTimeMs}ms`);

    return trajectory;
  }

  flushBuffer(): void {
    if (this.toolCallBuffer.length === 0 && this.messageBuffer.length === 0) return;

    for (const [trajectoryId, active] of this.activeTrajectories) {
      const toolCalls = this.toolCallBuffer.filter(tc => tc.agentId === active.agentId);
      if (toolCalls.length === 0) continue;

      const now = Date.now();
      const partialStats = this.computeStats(toolCalls, this.messageBuffer, now - active.startedAt);

      const partialTrajectory: ExecutionTrajectory = {
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
        outcome: 'unknown',
        outputPaths: [],
        startedAt: active.startedAt,
        completedAt: now,
      };

      this.cortexStore.insertTrajectory(partialTrajectory);
    }

    this.toolCallBuffer = [];
    this.messageBuffer = [];
  }

  private computeStats(toolCalls: ToolCallEntry[], messages: LLMMessageEntry[], wallTimeMs: number): TrajectoryStats {
    const bashCommands = toolCalls.filter(tc => tc.isBash).length;
    const blockedTools = toolCalls.filter(tc => tc.blockedBy).length;
    const errors = toolCalls.filter(tc => tc.error).length;
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);

    let filesModified = 0;
    let filesRead = 0;
    for (const tc of toolCalls) {
      if (tc.toolName === 'write' || tc.toolName === 'edit') filesModified++;
      if (tc.toolName === 'read' || tc.toolName === 'grep' || tc.toolName === 'glob') filesRead++;
    }

    return {
      totalToolCalls: toolCalls.length,
      totalLLMCalls: messages.length,
      totalTokensUsed: totalTokens,
      wallTimeMs,
      bashCommandCount: bashCommands,
      blockedToolCount: blockedTools,
      scfIncidentCount: this.scfIncidents.length,
      errors,
      filesModified,
      filesRead,
    };
  }

  getTrajectory(trajectoryId: string): ExecutionTrajectory | null {
    return this.cortexStore.getTrajectory(trajectoryId);
  }

  getSessionTrajectories(): ExecutionTrajectory[] {
    return this.cortexStore.getSessionTrajectories(this.sessionId);
  }

  getTrajectoryCount(): number {
    return this.trajectoryCount;
  }
}
