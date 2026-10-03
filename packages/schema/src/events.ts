import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Op, Source } from "./db";

export const EVENT_KINDS = [
  "pipeline.task.completed",
  "pipeline.task.attempt",
  "pipeline.source-gate.transition",
  "sync.run.completed",
  "save.ingest.completed",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const TASK_OUTCOMES = [
  "ok",
  "failed",
  "blocked",
  "deferred",
  "skipped",
  "cancelled",
  "dead",
] as const;
export type TaskOutcome = (typeof TASK_OUTCOMES)[number];

export const TASK_ATTEMPT_PHASES = [
  "claimed",
  "heartbeat",
  "completed",
  "deferred",
  "blocked",
  "dead",
  "cancelled",
  "stale_rejected",
  "watchdog",
] as const;
export type TaskAttemptPhase = (typeof TASK_ATTEMPT_PHASES)[number];

export const SYNC_OUTCOMES = [
  "ok",
  "noop",
  "auth_required",
  "rate_limited",
  "aborted",
  "error",
] as const;
export type SyncOutcome = (typeof SYNC_OUTCOMES)[number];

export const INGEST_OUTCOMES = ["complete", "failed"] as const;
export type IngestOutcome = (typeof INGEST_OUTCOMES)[number];

export interface ErrorInfo {
  name: string;
  message: string;
}

export interface PipelineSnapshot {
  inflight: number;
  paused: boolean;
}

export interface PipelineTaskEvent {
  kind: "pipeline.task.completed";
  ts: number;
  saveId: string;
  source: Source;
  sourceId: string | null;
  url: string | null;
  op: Op;
  taskId: string;
  outcome: TaskOutcome;
  durationMs: number;
  attempts: number;
  maxAttempts: number;
  error: ErrorInfo | null;
  trigger: string | null;
  nextRunAt: number | null;
  gate: {
    reason: "cooldown" | "breaker" | "at_risk" | "manual";
    until: number;
  } | null;
  pipeline: PipelineSnapshot;
}

export interface PipelineTaskAttemptEvent {
  kind: "pipeline.task.attempt";
  ts: number;
  saveId: string;
  source: Source;
  op: Op;
  taskId: string;
  generationId: string | null;
  attempt: number;
  phase: TaskAttemptPhase;
  leaseOwner: string | null;
  leaseToken: string | null;
  cancellationFence: number;
  nextRunAt: number | null;
  deferredReason: string | null;
  durationMs: number | null;
  error: ErrorInfo | null;
}

export interface SourceGateTransitionEvent {
  kind: "pipeline.source-gate.transition";
  ts: number;
  source: Source;
  from: "closed" | "open" | "half_open" | "paused";
  to: "closed" | "open" | "half_open" | "paused";
  reason: string | null;
  retryAt: number | null;
  trigger: string;
}

export interface SyncRunEvent {
  kind: "sync.run.completed";
  ts: number;
  source: Source;
  accountId: string | null;
  trigger: string;
  outcome: SyncOutcome;
  durationMs: number;
  harvest: {
    seen: number | null;
    fresh: number | null;
    recovery: number | null;
  } | null;
  enqueue: {
    succeeded: number;
    failed: number;
  } | null;
  error: ErrorInfo | null;
  lockHeldMs: number | null;
  watchdogTripped: boolean;
}

export interface SaveIngestEvent {
  kind: "save.ingest.completed";
  ts: number;
  saveId: string;
  source: Source;
  sourceId: string | null;
  url: string;
  outcome: IngestOutcome;
  durationMs: number;
  attempts: number;
  failedOp: Op | null;
  error: ErrorInfo | null;
  fileCount: number;
  trigger: string | null;
}

export type WideEvent =
  | PipelineTaskEvent
  | PipelineTaskAttemptEvent
  | SourceGateTransitionEvent
  | SyncRunEvent
  | SaveIngestEvent;

export const pipelineEvents = sqliteTable(
  "pipeline_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ts: integer("ts", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    kind: text("kind").$type<EventKind>().notNull(),
    saveId: text("save_id"),
    source: text("source").$type<Source>(),
    accountId: text("account_id"),
    op: text("op").$type<Op>(),
    outcome: text("outcome").notNull(),
    durationMs: integer("duration_ms"),
    attempts: integer("attempts"),
    errorName: text("error_name"),
    errorMessage: text("error_message"),
    trigger: text("trigger"),
    payload: text("payload", { mode: "json" }).$type<WideEvent>().notNull(),
  },
  (t) => ({
    tsIdx: index("pipeline_events_ts_idx").on(t.ts),
    saveIdx: index("pipeline_events_save_idx").on(t.saveId, t.ts),
    kindOutcomeIdx: index("pipeline_events_kind_outcome_idx").on(
      t.kind,
      t.outcome,
      t.ts,
    ),
    sourceOpIdx: index("pipeline_events_source_op_idx").on(t.source, t.op),
  }),
);

export type PipelineEventRow = typeof pipelineEvents.$inferSelect;
export type NewPipelineEventRow = typeof pipelineEvents.$inferInsert;
