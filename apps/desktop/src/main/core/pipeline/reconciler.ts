import { CANCEL_REASON, saves, tasks } from "@pond/schema/db";
import type { PipelineTaskEvent } from "@pond/schema/events";
import { and, eq, inArray } from "drizzle-orm";
import log from "electron-log/main.js";
import { z } from "zod";
import { getDb } from "../../db";
import { commitEvent, startTaskEvent, toErrorInfo } from "../../lib/wide-event";
import { persistSave } from "../persist-save";
import { downloadActivity } from "./download-activity";
import { canDispatchTask, isInteractiveTask } from "./priority";
import {
  type DueTask,
  isSourceTask,
  MAX_GLOBAL_INFLIGHT,
  MAX_INTERACTIVE_INFLIGHT,
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

const TaskPayloadSchema = z.json().catch(null);

let started = false;
let paused = false;
let pollTimer: NodeJS.Timeout | null = null;
let kickPending = false;
let nextOrphanSweepAt = 0;
const inflightByOp = {
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
let inflightInteractive = 0;
const runningTaskIds = new Set<string>();
const runningTasks = new Map<string, AbortController>();
const pendingWork = new Set<Promise<unknown>>();
function track<T>(work: Promise<T>): Promise<T> {
  const settled = work.then(
    () => {},
    () => {},
  );
  pendingWork.add(settled);
  void settled.then(() => pendingWork.delete(settled));
  return work;
}
export async function pauseAndDrainReconciler(
  timeoutMs = 60_000,
): Promise<boolean> {
  const wasPaused = paused;
  pauseReconciler();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      (async () => {
        while (pendingWork.size) await Promise.all(pendingWork);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Background saves are still finishing. Try the library operation again shortly.",
              ),
            ),
          timeoutMs,
        );
      }),
    ]);
    return wasPaused;
  } catch (error) {
    if (!wasPaused) resumeReconciler();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isReconcilerPaused(): boolean {
  return paused;
}

export interface PipelineSnapshot {
  paused: boolean;
  inflight: number;
}

export function pipelineSnapshot(): PipelineSnapshot {
  return { paused, inflight: inflightGlobal };
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
      lastError: CANCEL_REASON,
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
  void track(recoverOrphanedRunningTasks()).catch((err) =>
    log.warn("[pond pipeline:reconciler] stale-running sweep failed", err),
  );
  void track(sweepOrphanTasks()).catch((err) =>
    log.warn("[pond pipeline:reconciler] orphan sweep failed", err),
  );
  void track(sweepTasklessIngestingSaves()).catch((err) =>
    log.warn("[pond pipeline:reconciler] taskless sweep failed", err),
  );
  nextOrphanSweepAt = Date.now() + ORPHAN_SWEEP_INTERVAL_MS;
  schedulePoll(POLL_INTERVAL_MS);
  void track(tick());
}

export function kickReconciler(): void {
  if (!started) return;
  if (kickPending) return;
  kickPending = true;
  setImmediate(() => {
    kickPending = false;
    void track(tick());
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
    void track(tick()).finally(() => schedulePoll(POLL_INTERVAL_MS));
  }, ms);
}

async function tick(): Promise<void> {
  if (!started) return;
  if (!paused && Date.now() >= nextOrphanSweepAt) {
    nextOrphanSweepAt = Date.now() + ORPHAN_SWEEP_INTERVAL_MS;
    void track(sweepOrphanTasks()).catch((err) =>
      log.warn("[pond pipeline:reconciler] periodic orphan sweep failed", err),
    );
    void track(recoverOrphanedRunningTasks()).catch((err) =>
      log.warn(
        "[pond pipeline:reconciler] periodic stale-running sweep failed",
        err,
      ),
    );
    void track(sweepTasklessIngestingSaves()).catch((err) =>
      log.warn(
        "[pond pipeline:reconciler] periodic taskless sweep failed",
        err,
      ),
    );
  }
  const backgroundInflight = inflightGlobal - inflightInteractive;
  const interactiveRoom = inflightInteractive < MAX_INTERACTIVE_INFLIGHT;
  const backgroundRoom = !paused && backgroundInflight < MAX_GLOBAL_INFLIGHT;
  if (!interactiveRoom && !backgroundRoom) return;
  const due = await pullDueTasks();
  if (due.length === 0) return;
  for (const task of due) {
    if (runningTaskIds.has(task.id)) continue;
    if (
      !canDispatchTask({
        interactive: isInteractiveTask(task),
        paused,
        inflightGlobal,
        inflightInteractive,
        inflightForOp: inflightByOp[task.op],
        opCap: PER_OP_CONCURRENCY[task.op],
        backgroundCap: MAX_GLOBAL_INFLIGHT,
        interactiveCap: MAX_INTERACTIVE_INFLIGHT,
      })
    ) {
      continue;
    }
    void track(dispatchTask(task));
  }
}

async function dispatchTask(task: DueTask): Promise<void> {
  const interactive = isInteractiveTask(task);
  runningTaskIds.add(task.id);
  inflightByOp[task.op]++;
  inflightGlobal++;
  if (interactive) inflightInteractive++;
  metrics.tasksDispatched++;
  const controller = new AbortController();
  runningTasks.set(task.id, controller);
  const ev: PipelineTaskEvent = startTaskEvent({
    saveId: task.saveId,
    source: task.source,
    op: task.op,
    taskId: task.id,
    attempts: task.attempts,
    maxAttempts: task.maxAttempts,
  });
  await enrichTaskEventWithSave(ev);
  const t0 = Date.now();
  const activity = downloadActivity.begin(task);
  const stopActivity = () => activity.finish("failed");
  controller.signal.addEventListener("abort", stopActivity, { once: true });
  try {
    await markRunning(task);
    const payload = TaskPayloadSchema.parse(task.payload);
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
        track(
          WORKERS[task.op](task.saveId, payload, {
            signal: controller.signal,
            reportActivity: activity.report,
          }),
        ),
        watchdog,
      ]);
    } finally {
      if (watchdogHandle) clearTimeout(watchdogHandle);
    }
    controller.signal.throwIfAborted();
    await markDone(task);
    metrics.tasksCompleted++;
    if (isSourceTask(task.op)) noteSuccess(task.source);
    await maybeFinalizeSave(task.saveId);
    activity.finish("completed");
    ev.outcome = "ok";
    ev.attempts = task.attempts + 1;
  } catch (err) {
    activity.finish("failed");
    const result = await handleFailure(task, err);
    ev.outcome = result.outcome;
    ev.error = toErrorInfo(err);
    ev.nextRunAt = result.nextRunAt;
    ev.attempts = result.recordedAttempts;
  } finally {
    controller.signal.removeEventListener("abort", stopActivity);
    runningTaskIds.delete(task.id);
    runningTasks.delete(task.id);
    inflightByOp[task.op]--;
    inflightGlobal--;
    if (interactive) inflightInteractive--;
    ev.durationMs = Date.now() - t0;
    ev.pipeline = { inflight: inflightGlobal, paused };
    ev.gate = gateForSource(task.source);
    void track(commitEvent(ev));
    kickReconciler();
  }
}
