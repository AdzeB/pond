import { type Op, saves, type Task, tasks } from "@pond/schema/db";
import type { PipelineTaskEvent } from "@pond/schema/events";
import { and, asc, eq, inArray, lte, ne, sql } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import {
  commitEvent,
  commitSaveIngestEvent,
  startTaskEvent,
  toErrorInfo,
} from "../../lib/wide-event";
import { persistSave } from "../persist-save";
import { RateLimitedError, TransientError } from "./extractors/errors";
import { classifyError } from "./retry-policy";
import {
  noteSuccess,
  noteTransientFailure,
  setSourceCooldown,
  snapshotSourceGate,
  sourcePausedUntil,
} from "./source-gate";
import { runCaptureTweet } from "./workers/capture-tweet";
import { runEnsurePoster } from "./workers/ensure-poster";
import { runFetchAvatar } from "./workers/fetch-avatar";
import { runFetchBlobs } from "./workers/fetch-blobs";
import { runFetchVideoYtdlp } from "./workers/fetch-video-ytdlp";
import { FinalizeIncompleteError, runFinalize } from "./workers/finalize";
import { runHarvestMetadata } from "./workers/harvest-metadata";

const POLL_INTERVAL_MS = 5_000;
// Per-op caps are a second-order limit; the per-source pool budget binds.
const MAX_GLOBAL_INFLIGHT = 8;
const PER_OP_CONCURRENCY: Record<Op, number> = {
  harvest_metadata: 3,
  capture_tweet: 3,
  fetch_blobs: 4,
  fetch_video_ytdlp: 2,
  ensure_poster: 3,
  fetch_avatar: 4,
  finalize: 3,
};

// Per-invocation wall-clock budget; a hung worker would otherwise freeze the queue.
const TASK_WATCHDOG_MS: Record<Op, number> = {
  harvest_metadata: 90_000,
  capture_tweet: 120_000,
  fetch_blobs: 5 * 60_000,
  fetch_video_ytdlp: 10 * 60_000,
  ensure_poster: 60_000,
  fetch_avatar: 60_000,
  finalize: 30_000,
};

// Periodic orphan-sweep cadence (catches strays that appear mid-runtime).
const ORPHAN_SWEEP_INTERVAL_MS = 60_000;

class WorkerWatchdogError extends Error {
  constructor(op: Op, ms: number) {
    super(`worker watchdog: ${op} exceeded ${ms}ms`);
    this.name = "WorkerWatchdogError";
  }
}

interface WorkerContext {
  signal: AbortSignal;
}

type Worker = (
  saveId: string,
  payload: Record<string, unknown>,
  ctx: WorkerContext,
) => Promise<void>;

const WORKERS: Record<Op, Worker> = {
  harvest_metadata: (saveId, payload) =>
    runHarvestMetadata(saveId, payload as { force?: boolean }),
  capture_tweet: async (saveId) => {
    const result = await runCaptureTweet(saveId);
    // A dead/expired X session yields zero screenshots; surface it so the
    // reconciler retries with backoff (capture_tweet is non-fatal anyway).
    if (result.authWall && result.captured === 0) {
      throw new TransientError(
        "capture_tweet: X auth wall (session may be expired)",
      );
    }
  },
  fetch_blobs: (saveId) => runFetchBlobs(saveId),
  fetch_video_ytdlp: (saveId) => runFetchVideoYtdlp(saveId),
  ensure_poster: (saveId) => runEnsurePoster(saveId),
  fetch_avatar: (saveId) => runFetchAvatar(saveId),
  finalize: (saveId) => runFinalize(saveId),
};

// Cosmetic enhancer ops: when these exhaust retries the save still finalizes,
// unlike core ops (harvest/blobs/video/finalize) whose final failure fails it.
const NON_FATAL_OPS: ReadonlySet<Op> = new Set<Op>([
  "capture_tweet",
  "ensure_poster",
  "fetch_avatar",
]);

let started = false;
const paused = false;
let pollTimer: NodeJS.Timeout | null = null;
let kickPending = false;
let nextOrphanSweepAt = 0;
const inflightByOp: Record<Op, number> = {
  harvest_metadata: 0,
  capture_tweet: 0,
  fetch_blobs: 0,
  fetch_video_ytdlp: 0,
  ensure_poster: 0,
  fetch_avatar: 0,
  finalize: 0,
};
let inflightGlobal = 0;
const runningTaskIds = new Set<string>();
const runningTasks = new Map<string, AbortController>();

const metrics = {
  tasksDispatched: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  tasksBlocked: 0,
  watchdogTrips: 0,
  cascadeEvents: 0,
};

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

// Reset `running` tasks orphaned by a dead process back to pending. A task that
// is `running` in the DB but absent from this process's in-flight set can only
// be a leftover from a previous process: a fresh process tracks every task it
// dispatches (added to `runningTaskIds` before `markRunning`), and the watchdog
// settles its own tasks within their budget. Without this sweep, a restart while
// a task was mid-flight (common under dev hot-reload) pins the task `running`
// forever — `pullDueTasks` only pulls `pending`, so the save never finalizes.
// Runs at startup (when the set is empty, so all running rows recover) and on
// the periodic sweep cadence to catch strays mid-runtime.
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
    // Guard against a task settling between the read above and this write.
    .where(and(inArray(tasks.id, orphanIds), eq(tasks.status, "running")))
    .run();
  log.info("[pond pipeline:reconciler] recovered orphaned running tasks", {
    count: orphanIds.length,
  });
  kickReconciler();
}

// Fail `pending` tasks on non-ingesting saves; they can't run and starve the window.
async function sweepOrphanTasks(): Promise<void> {
  const db = await getDb();
  const orphans = db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(saves, eq(tasks.saveId, saves.id))
    .where(and(eq(tasks.status, "pending"), ne(saves.status, "ingesting")))
    .all();
  if (orphans.length === 0) return;
  db.update(tasks)
    .set({
      status: "failed",
      lastError: "orphan: save no longer ingesting",
      updatedAt: new Date(),
    })
    .where(
      inArray(
        tasks.id,
        orphans.map((o) => o.id),
      ),
    )
    .run();
  log.info("[pond pipeline:reconciler] swept orphan tasks", {
    count: orphans.length,
  });
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

interface DueTask extends Task {
  source: string;
}

// NOT EXISTS enforces the sequential op gate in SQL so the window isn't
// filled with non-runnable tasks. Pull 3x the dispatch window for round-robin.
async function pullDueTasks(): Promise<DueTask[]> {
  const db = await getDb();
  const now = new Date();
  const rows = (await db
    .select({
      id: tasks.id,
      saveId: tasks.saveId,
      op: tasks.op,
      status: tasks.status,
      attempts: tasks.attempts,
      maxAttempts: tasks.maxAttempts,
      nextRunAt: tasks.nextRunAt,
      lastError: tasks.lastError,
      payload: tasks.payload,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      source: saves.source,
    })
    .from(tasks)
    .innerJoin(saves, eq(tasks.saveId, saves.id))
    .where(
      and(
        eq(tasks.status, "pending"),
        lte(tasks.nextRunAt, now),
        eq(saves.status, "ingesting"),
        sql`NOT EXISTS (
          SELECT 1 FROM ${tasks} AS peers
          WHERE peers.save_id = ${tasks.saveId}
            AND peers.status != 'done'
            AND ${opOrderCaseRaw("peers.op")} < ${opOrderCase(tasks.op)}
        )`,
      ),
    )
    .orderBy(asc(tasks.nextRunAt))
    .limit(60)) as unknown as DueTask[];

  if (rows.length === 0) return rows;

  // Per-save round-robin so progress is shared, not monopolised by one save.
  // Skip paused sources so we don't pin inflight slots on stalled work.
  const buckets = new Map<string, DueTask[]>();
  for (const row of rows) {
    if (isSourceTask(row.op) && sourcePausedUntil(row.source as never) > 0) {
      continue;
    }
    const bucket = buckets.get(row.saveId);
    if (bucket) bucket.push(row);
    else buckets.set(row.saveId, [row]);
  }
  const interleaved: DueTask[] = [];
  let progress = true;
  while (progress && interleaved.length < 20) {
    progress = false;
    for (const bucket of buckets.values()) {
      if (interleaved.length >= 20) break;
      const next = bucket.shift();
      if (!next) continue;
      interleaved.push(next);
      progress = true;
    }
  }
  return interleaved;
}

// Ops that lease a hidden scrape window; gated on per-source pause state.
function isSourceTask(op: Op): boolean {
  return op === "harvest_metadata" || op === "capture_tweet";
}

// Maps op to its `OPS` spec position; two variants for raw alias vs Drizzle column.
function opOrderCase(opCol: typeof tasks.op) {
  return sql`(CASE ${opCol}
    WHEN 'harvest_metadata' THEN 0
    WHEN 'capture_tweet' THEN 1
    WHEN 'fetch_blobs' THEN 2
    WHEN 'fetch_video_ytdlp' THEN 3
    WHEN 'ensure_poster' THEN 4
    WHEN 'fetch_avatar' THEN 5
    WHEN 'finalize' THEN 6
  END)`;
}

function opOrderCaseRaw(rawCol: string) {
  return sql.raw(`(CASE ${rawCol}
    WHEN 'harvest_metadata' THEN 0
    WHEN 'capture_tweet' THEN 1
    WHEN 'fetch_blobs' THEN 2
    WHEN 'fetch_video_ytdlp' THEN 3
    WHEN 'ensure_poster' THEN 4
    WHEN 'fetch_avatar' THEN 5
    WHEN 'finalize' THEN 6
  END)`);
}

async function dispatchTask(task: DueTask): Promise<void> {
  runningTaskIds.add(task.id);
  inflightByOp[task.op]++;
  inflightGlobal++;
  metrics.tasksDispatched++;
  const controller = new AbortController();
  runningTasks.set(task.id, controller);
  // One wide event per task attempt, committed in the finally.
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
        } catch {
          /* worker may already have settled */
        }
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

async function enrichTaskEventWithSave(ev: PipelineTaskEvent): Promise<void> {
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
    /* enrichment is best-effort */
  }
}

function gateForSource(source: string): PipelineTaskEvent["gate"] {
  const snap = snapshotSourceGate();
  const hit = snap.find((e) => e.source === source);
  return hit ? { reason: hit.reason, until: hit.until } : null;
}

async function markRunning(task: Task): Promise<void> {
  const db = await getDb();
  db.update(tasks)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(tasks.id, task.id))
    .run();
}

async function markDone(task: Task): Promise<void> {
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

interface FailureResult {
  outcome: "deferred" | "blocked" | "failed";
  nextRunAt: number | null;
  recordedAttempts: number;
}

async function handleFailure(
  task: DueTask,
  err: unknown,
): Promise<FailureResult> {
  if (err instanceof FinalizeIncompleteError) {
    // finalize reset harvest_metadata; re-pend finalize for the next harvest cycle.
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

  // Rate-limit errors set a source-wide cooldown; only transient/watchdog
  // trips advance the breaker (other errors are per-URL, not host health).
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

  // Non-fatal enhancer out of retries: settle as `done` (keeping lastError)
  // rather than `failed`, so finalize can still complete the save.
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
    // Status only moves forward: a re-harvest failure won't downgrade a complete save.
    const current = db
      .select({ status: saves.status })
      .from(saves)
      .where(eq(saves.id, task.saveId))
      .get();
    if (current?.status === "ingesting") {
      // Via persistSave so the `failed` flip broadcasts to the renderer pool;
      // a direct write wouldn't reach it until the next hydrate.
      await persistSave(
        task.saveId,
        { status: "failed" },
        { actorReason: "pipeline:failed" },
      );
      // Fail still-pending siblings too: this failure blocks them and they'd starve the window.
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
      // Save just failed; emit the save-level ingest event (finalize handles success).
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

// Flips the save to `complete` once all its tasks are `done`.
async function maybeFinalizeSave(saveId: string): Promise<void> {
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
