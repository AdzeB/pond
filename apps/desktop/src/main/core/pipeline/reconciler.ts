import { type Op, saves, tasks } from "@pond/schema/db";
import type { PipelineTaskEvent } from "@pond/schema/events";
import { and, eq, inArray } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { commitEvent, startTaskEvent, toErrorInfo } from "../../lib/wide-event";
import { persistSave } from "../persist-save";
import {
  type DueTask,
  isSourceTask,
  MAX_GLOBAL_INFLIGHT,
  metrics,
  ORPHAN_SWEEP_INTERVAL_MS,
  PER_OP_CONCURRENCY,
  POLL_INTERVAL_MS,
  TASK_WATCHDOG_MS,
  WORKERS,
  WorkerWatchdogError,
} from "./reconciler-config";
import { noteSuccess } from "./source-gate";
import {
  pullDueTasks,
  sweepOrphanTasks,
  sweepTasklessIngestingSaves,
} from "./task-queue";
import {
  enrichTaskEventWithSave,
  gateForSource,
  handleFailure,
  markDone,
  markRunning,
  maybeFinalizeSave,
} from "./task-settlement";

let started = false;
let paused = false;
let pollTimer: NodeJS.Timeout | null = null;
let kickPending = false;
let nextOrphanSweepAt = 0;
const inflightByOp: Record<Op, number> = {
  harvest_metadata: 0,
  capture_tweet: 0,
  render_text_cover: 0,
  fetch_blobs: 0,
  archive_page: 0,
  fetch_video_ytdlp: 0,
  ensure_poster: 0,
  fetch_avatar: 0,
  finalize: 0,
};
let inflightGlobal = 0;
const runningTaskIds = new Set<string>();
const runningTasks = new Map<string, AbortController>();

export function isReconcilerPaused(): boolean {
  return paused;
}

export function pauseReconciler(): void {
  if (paused) return;
  paused = true;
  log.info("[pond pipeline:reconciler] paused");
}

export function resumeReconciler(): void {
  if (!paused) return;
  paused = false;
  log.info("[pond pipeline:reconciler] resumed");
  kickReconciler();
}

export async function cancelSaveIngest(saveId: string): Promise<boolean> {
  const db = await getDb();
  const save = db
    .select({ status: saves.status })
    .from(saves)
    .where(eq(saves.id, saveId))
    .get();
  if (save?.status !== "ingesting") return false;

  const running = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.saveId, saveId), eq(tasks.status, "running")))
    .all();
  for (const { id } of running) {
    const controller = runningTasks.get(id);
    if (controller) {
      try {
        controller.abort();
      } catch {}
    }
  }

  db.update(tasks)
    .set({
      status: "failed",
      lastError: "cancelled by user",
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.saveId, saveId), eq(tasks.status, "pending")))
    .run();

  await persistSave(
    saveId,
    { status: "failed" },
    { actorReason: "user:cancel-ingest" },
  );
  log.info("[pond pipeline:reconciler] cancelled save ingest", { saveId });
  return true;
}

export async function cancelAllIngest(): Promise<number> {
  const wasPaused = paused;
  pauseReconciler();
  const db = await getDb();
  const rows = db
    .select({ id: saves.id })
    .from(saves)
    .where(eq(saves.status, "ingesting"))
    .all();
  let cancelled = 0;
  for (const { id } of rows) {
    if (await cancelSaveIngest(id)) cancelled += 1;
  }
  if (!wasPaused) resumeReconciler();
  log.info("[pond pipeline:reconciler] cancelled all ingest", { cancelled });
  return cancelled;
}

export function startReconciler(): void {
  if (started) return;
  started = true;
  log.info("[pond pipeline:reconciler] starting");
  void recoverOrphanedRunningTasks().catch((err) =>
    log.warn("[pond pipeline:reconciler] stale-running sweep failed", err),
  );
  void sweepOrphanTasks().catch((err) =>
    log.warn("[pond pipeline:reconciler] orphan sweep failed", err),
  );
  void sweepTasklessIngestingSaves().catch((err) =>
    log.warn("[pond pipeline:reconciler] taskless sweep failed", err),
  );
  nextOrphanSweepAt = Date.now() + ORPHAN_SWEEP_INTERVAL_MS;
  schedulePoll(POLL_INTERVAL_MS);
  void tick();
}

export function kickReconciler(): void {
  if (!started) return;
  if (kickPending) return;
  kickPending = true;
  setImmediate(() => {
    kickPending = false;
    void tick();
  });
}

async function recoverOrphanedRunningTasks(): Promise<void> {
  const db = await getDb();
  const running = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.status, "running"))
    .all();
  const orphanIds = running
    .map((t) => t.id)
    .filter((id) => !runningTaskIds.has(id));
  if (orphanIds.length === 0) return;
  const now = new Date();
  db.update(tasks)
    .set({
      status: "pending",
      lastError: "recovered: process restarted while running",
      nextRunAt: now,
      updatedAt: now,
    })
    .where(and(inArray(tasks.id, orphanIds), eq(tasks.status, "running")))
    .run();
  log.info("[pond pipeline:reconciler] recovered orphaned running tasks", {
    count: orphanIds.length,
  });
  kickReconciler();
}

function schedulePoll(ms: number): void {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    if (!started) return;
    void tick().finally(() => schedulePoll(POLL_INTERVAL_MS));
  }, ms);
}

async function tick(): Promise<void> {
  if (!started) return;
  if (paused) return;
  if (Date.now() >= nextOrphanSweepAt) {
    nextOrphanSweepAt = Date.now() + ORPHAN_SWEEP_INTERVAL_MS;
    void sweepOrphanTasks().catch((err) =>
      log.warn("[pond pipeline:reconciler] periodic orphan sweep failed", err),
    );
    void recoverOrphanedRunningTasks().catch((err) =>
      log.warn(
        "[pond pipeline:reconciler] periodic stale-running sweep failed",
        err,
      ),
    );
    void sweepTasklessIngestingSaves().catch((err) =>
      log.warn(
        "[pond pipeline:reconciler] periodic taskless sweep failed",
        err,
      ),
    );
  }
  if (inflightGlobal >= MAX_GLOBAL_INFLIGHT) return;
  const due = await pullDueTasks();
  if (due.length === 0) return;
  for (const task of due) {
    if (inflightGlobal >= MAX_GLOBAL_INFLIGHT) break;
    if (runningTaskIds.has(task.id)) continue;
    if (inflightByOp[task.op] >= PER_OP_CONCURRENCY[task.op]) continue;
    void dispatchTask(task);
  }
}

async function dispatchTask(task: DueTask): Promise<void> {
  runningTaskIds.add(task.id);
  inflightByOp[task.op]++;
  inflightGlobal++;
  metrics.tasksDispatched++;
  const controller = new AbortController();
  runningTasks.set(task.id, controller);
  const ev: PipelineTaskEvent = startTaskEvent({
    saveId: task.saveId,
    source: task.source as PipelineTaskEvent["source"],
    op: task.op,
    taskId: task.id,
    attempts: task.attempts,
    maxAttempts: task.maxAttempts,
  });
  await enrichTaskEventWithSave(ev);
  const t0 = Date.now();
  try {
    await markRunning(task);
    const payload =
      task.payload && typeof task.payload === "object"
        ? (task.payload as Record<string, unknown>)
        : {};
    const budget = TASK_WATCHDOG_MS[task.op];
    let watchdogHandle: NodeJS.Timeout | null = null;
    const watchdog = new Promise<never>((_, reject) => {
      watchdogHandle = setTimeout(() => {
        metrics.watchdogTrips++;
        try {
          controller.abort();
        } catch {}
        reject(new WorkerWatchdogError(task.op, budget));
      }, budget);
    });
    try {
      await Promise.race([
        WORKERS[task.op](task.saveId, payload, { signal: controller.signal }),
        watchdog,
      ]);
    } finally {
      if (watchdogHandle) clearTimeout(watchdogHandle);
    }
    await markDone(task);
    metrics.tasksCompleted++;
    if (isSourceTask(task.op)) noteSuccess(task.source as never);
    await maybeFinalizeSave(task.saveId);
    ev.outcome = "ok";
    ev.attempts = task.attempts + 1;
  } catch (err) {
    const result = await handleFailure(task, err);
    ev.outcome = result.outcome;
    ev.error = toErrorInfo(err);
    ev.nextRunAt = result.nextRunAt;
    ev.attempts = result.recordedAttempts;
  } finally {
    runningTaskIds.delete(task.id);
    runningTasks.delete(task.id);
    inflightByOp[task.op]--;
    inflightGlobal--;
    ev.durationMs = Date.now() - t0;
    ev.pipeline = { inflight: inflightGlobal, paused };
    ev.gate = gateForSource(task.source);
    void commitEvent(ev);
    kickReconciler();
  }
}
