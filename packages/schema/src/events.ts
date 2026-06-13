/* Wide-event shapes: one denormalised row per unit of work (persisted in `pipeline_events`). */

import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Op, Source } from "./db";

export const EVENT_KINDS = [
  "pipeline.task.completed",
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
] as const;
export type TaskOutcome = (typeof TASK_OUTCOMES)[number];

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

/* Pipeline state when the event fired, captured to avoid a metrics join. */
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
  /* For `deferred`, when the task is scheduled to fire next. */
  nextRunAt: number | null;
  /* Source-gate state at commit time (cooldown / breaker), if any. */
  gate: { reason: "cooldown" | "breaker"; until: number } | null;
  pipeline: PipelineSnapshot;
}

export interface SyncRunEvent {
  kind: "sync.run.completed";
  ts: number;
  source: Source;
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
  /* Mutex age at run start; captured so retrospectives can spot ghost holds. */
  lockHeldMs: number | null;
  /* True if the watchdog aborted the run (also sets `outcome=aborted`). */
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
  /* Time from save creation to terminal status. */
  durationMs: number;
  /* Sum of `attempts` across every task. */
  attempts: number;
  /* For terminal failures, the op that broke the camel's back. */
  failedOp: Op | null;
  error: ErrorInfo | null;
  fileCount: number;
  trigger: string | null;
}

export type WideEvent = PipelineTaskEvent | SyncRunEvent | SaveIngestEvent;

/* SQLite row: common columns pulled out for indexing; full event in `payload`. */
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
