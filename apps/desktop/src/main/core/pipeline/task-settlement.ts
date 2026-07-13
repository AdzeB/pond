import { saves, type Task, tasks } from "@pond/schema/db";
import type { PipelineTaskEvent } from "@pond/schema/events";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { commitSaveIngestEvent, toErrorInfo } from "../../lib/wide-event";
import { persistSave } from "../persist-save";
import { RateLimitedError, TransientError } from "./extractors/errors";
import {
  type DueTask,
  isSourceTask,
  metrics,
  NON_FATAL_OPS,
  WorkerWatchdogError,
} from "./reconciler-config";
import { classifyError } from "./retry-policy";
import {
  noteTransientFailure,
  setSourceCooldown,
  snapshotSourceGate,
} from "./source-gate";
import { FinalizeIncompleteError } from "./workers/finalize";

export async function enrichTaskEventWithSave(
  ev: PipelineTaskEvent,
): Promise<void> {
  try {
    const db = await getDb();
    const row = db
      .select({
        sourceId: saves.sourceId,
        url: saves.url,
      })
      .from(saves)
      .where(eq(saves.id, ev.saveId))
      .get();
    if (row) {
      ev.sourceId = row.sourceId ?? null;
      ev.url = row.url ?? null;
    }
  } catch {
    /** Enrichment is best-effort. */
  }
}

export function gateForSource(source: string): PipelineTaskEvent["gate"] {
  const snap = snapshotSourceGate();
  const hit = snap.find((e) => e.source === source);
  return hit ? { reason: hit.reason, until: hit.until } : null;
}

export async function markRunning(task: Task): Promise<void> {
  const db = await getDb();
  db.update(tasks)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(tasks.id, task.id))
    .run();
}

export async function markDone(task: Task): Promise<void> {
  const db = await getDb();
  db.update(tasks)
    .set({
      status: "done",
      attempts: task.attempts + 1,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, task.id))
    .run();
}

export interface FailureResult {
  outcome: "deferred" | "blocked" | "failed";
  nextRunAt: number | null;
  recordedAttempts: number;
}

export async function handleFailure(
  task: DueTask,
  err: unknown,
): Promise<FailureResult> {
  if (err instanceof FinalizeIncompleteError) {
    /** finalize reset harvest_metadata; re-pend finalize for the next harvest cycle. */
    const db = await getDb();
    const nextRun = new Date(Date.now() + 30_000);
    db.update(tasks)
      .set({
        status: "pending",
        nextRunAt: nextRun,
        lastError: err.message,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
      .run();
    return {
      outcome: "deferred",
      nextRunAt: nextRun.getTime(),
      recordedAttempts: task.attempts,
    };
  }

  /** Rate-limit errors set a source-wide cooldown; only transient/watchdog trips advance the breaker, since other errors are per-URL, not host health. */
  if (isSourceTask(task.op)) {
    const source = task.source as never;
    if (err instanceof RateLimitedError) {
      const ms = (err.retryAfterSec ?? 60) * 1000;
      setSourceCooldown(source, ms);
    } else if (
      err instanceof TransientError ||
      err instanceof WorkerWatchdogError
    ) {
      noteTransientFailure(source);
    }
  }

  const decision = classifyError(err, {
    attempts: task.attempts,
    maxAttempts: task.maxAttempts,
  });
  if (decision.status === "blocked") metrics.tasksBlocked++;
  const db = await getDb();

  /** Non-fatal enhancer out of retries settles as `done` (keeping lastError) rather than `failed`, so finalize can still complete the save. */
  const nonFatalTerminal =
    decision.status === "failed" && NON_FATAL_OPS.has(task.op);
  if (nonFatalTerminal) {
    metrics.tasksFailed++;
    db.update(tasks)
      .set({
        status: "done",
        attempts: task.attempts + 1,
        nextRunAt: decision.nextRunAt,
        lastError: decision.lastError,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
      .run();
    await maybeFinalizeSave(task.saveId);
    return {
      outcome: "failed",
      nextRunAt: decision.nextRunAt.getTime(),
      recordedAttempts: task.attempts + 1,
    };
  }

  db.update(tasks)
    .set({
      status: decision.status,
      attempts: decision.recordAttempt ? task.attempts + 1 : task.attempts,
      nextRunAt: decision.nextRunAt,
      lastError: decision.lastError,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, task.id))
    .run();

  const recordedAttempts = decision.recordAttempt
    ? task.attempts + 1
    : task.attempts;
  if (decision.status === "failed") {
    metrics.tasksFailed++;
    /** Status only moves forward: a re-harvest failure won't downgrade a complete save. */
    const current = db
      .select({ status: saves.status })
      .from(saves)
      .where(eq(saves.id, task.saveId))
      .get();
    if (current?.status === "ingesting") {
      /** Via persistSave so the `failed` flip broadcasts to the renderer pool; a direct write wouldn't reach it until the next hydrate. */
      await persistSave(
        task.saveId,
        { status: "failed" },
        { actorReason: "pipeline:failed" },
      );
      /** Fail still-pending siblings too: this failure blocks them and they'd starve the window. */
      db.update(tasks)
        .set({
          status: "failed",
          lastError: `blocked by failed ${task.op}`,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.saveId, task.saveId), eq(tasks.status, "pending")))
        .run();
      metrics.cascadeEvents += 1;
    }
    if (current?.status === "ingesting") {
      /** Save just failed; emit the save-level ingest event (finalize handles success). */
      void commitSaveIngestEvent(task.saveId, {
        outcome: "failed",
        failedOp: task.op,
        error: toErrorInfo(err),
      });
    }
  }
  return {
    outcome:
      decision.status === "failed"
        ? "failed"
        : decision.status === "blocked"
          ? "blocked"
          : "deferred",
    nextRunAt: decision.nextRunAt.getTime(),
    recordedAttempts,
  };
}

/** Flips the save to `complete` once all its tasks are `done`. */
export async function maybeFinalizeSave(saveId: string): Promise<void> {
  const db = await getDb();
  const save = db
    .select({ status: saves.status })
    .from(saves)
    .where(eq(saves.id, saveId))
    .get();
  if (save?.status !== "ingesting") return;
  const rows = db
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.saveId, saveId))
    .all();
  if (rows.length === 0) return;
  const allDone = rows.every((t) => t.status === "done");
  if (!allDone) return;
  db.update(saves)
    .set({ status: "complete", ingestCompletedAt: new Date() })
    .where(eq(saves.id, saveId))
    .run();
}
