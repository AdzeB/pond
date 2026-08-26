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
  } catch {}
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
    const current = db
      .select({ status: saves.status })
      .from(saves)
      .where(eq(saves.id, task.saveId))
      .get();
    if (current?.status === "ingesting") {
      await persistSave(
        task.saveId,
        { status: "failed" },
        { actorReason: "pipeline:failed" },
      );
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
  await persistSave(
    saveId,
    { status: "complete", ingestCompletedAt: new Date() },
    { actorReason: "pipeline:tasks-complete" },
  );
}
