import type { Op, Task, tasks } from "@pond/schema/db";
import { sql } from "drizzle-orm";
import { TransientError } from "./extractors/errors";
import { runArchivePage } from "./workers/archive-page";
import { runCaptureTweet } from "./workers/capture-tweet";
import { runEnsurePoster } from "./workers/ensure-poster";
import { runFetchAvatar } from "./workers/fetch-avatar";
import { runFetchBlobs } from "./workers/fetch-blobs";
import { runFetchVideoYtdlp } from "./workers/fetch-video-ytdlp";
import { runFinalize } from "./workers/finalize";
import { runHarvestMetadata } from "./workers/harvest-metadata";

export const POLL_INTERVAL_MS = 5_000;
/** Per-op caps are a second-order limit; the per-source pool budget binds. */
export const MAX_GLOBAL_INFLIGHT = 8;
export const PER_OP_CONCURRENCY: Record<Op, number> = {
  harvest_metadata: 3,
  capture_tweet: 3,
  fetch_blobs: 4,
  archive_page: 1,
  fetch_video_ytdlp: 2,
  ensure_poster: 3,
  fetch_avatar: 4,
  finalize: 3,
};

/** Per-invocation wall-clock budget; a hung worker would otherwise freeze the queue. */
export const TASK_WATCHDOG_MS: Record<Op, number> = {
  harvest_metadata: 90_000,
  capture_tweet: 120_000,
  fetch_blobs: 5 * 60_000,
  /** Crawls up to ARCHIVE_MAX_PAGES navigations in one attempt; headroom over CRAWL_BUDGET_MS covers the final flush + WARC persist. */
  archive_page: 8 * 60_000,
  fetch_video_ytdlp: 10 * 60_000,
  ensure_poster: 60_000,
  fetch_avatar: 60_000,
  finalize: 30_000,
};

/** Periodic orphan-sweep cadence; catches strays that appear mid-runtime. */
export const ORPHAN_SWEEP_INTERVAL_MS = 60_000;

export class WorkerWatchdogError extends Error {
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

export const WORKERS: Record<Op, Worker> = {
  harvest_metadata: (saveId, payload) =>
    runHarvestMetadata(saveId, payload as { force?: boolean }),
  capture_tweet: async (saveId) => {
    const result = await runCaptureTweet(saveId);
    /** A dead/expired X session yields zero screenshots; surface it so the reconciler retries with backoff. */
    if (result.authWall && result.captured === 0) {
      throw new TransientError(
        "capture_tweet: X auth wall (session may be expired)",
      );
    }
  },
  fetch_blobs: (saveId) => runFetchBlobs(saveId),
  archive_page: (saveId, payload, ctx) =>
    runArchivePage(saveId, payload as { scope?: "page" | "site" }, ctx),
  fetch_video_ytdlp: (saveId, _payload, ctx) => runFetchVideoYtdlp(saveId, ctx),
  ensure_poster: (saveId) => runEnsurePoster(saveId),
  fetch_avatar: (saveId) => runFetchAvatar(saveId),
  finalize: (saveId) => runFinalize(saveId),
};

/** Cosmetic enhancer ops: when these exhaust retries the save still finalizes, unlike core ops whose final failure fails it. */
export const NON_FATAL_OPS: ReadonlySet<Op> = new Set<Op>([
  "capture_tweet",
  "archive_page",
  "ensure_poster",
  "fetch_avatar",
]);

/** Pipeline-wide counters, shared across the dispatch loop and task settlement. */
export const metrics = {
  tasksDispatched: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  tasksBlocked: 0,
  watchdogTrips: 0,
  cascadeEvents: 0,
};

export interface DueTask extends Task {
  source: string;
}

/** Ops that lease a hidden scrape window; gated on per-source pause state. */
export function isSourceTask(op: Op): boolean {
  return (
    op === "harvest_metadata" || op === "capture_tweet" || op === "archive_page"
  );
}

/** Maps op to its `OPS` spec position; two variants for raw alias vs Drizzle column. */
export function opOrderCase(opCol: typeof tasks.op) {
  return sql`(CASE ${opCol}
    WHEN 'harvest_metadata' THEN 0
    WHEN 'capture_tweet' THEN 1
    WHEN 'fetch_blobs' THEN 2
    WHEN 'archive_page' THEN 3
    WHEN 'fetch_video_ytdlp' THEN 4
    WHEN 'ensure_poster' THEN 5
    WHEN 'fetch_avatar' THEN 6
    WHEN 'finalize' THEN 7
  END)`;
}

export function opOrderCaseRaw(rawCol: string) {
  return sql.raw(`(CASE ${rawCol}
    WHEN 'harvest_metadata' THEN 0
    WHEN 'capture_tweet' THEN 1
    WHEN 'fetch_blobs' THEN 2
    WHEN 'archive_page' THEN 3
    WHEN 'fetch_video_ytdlp' THEN 4
    WHEN 'ensure_poster' THEN 5
    WHEN 'fetch_avatar' THEN 6
    WHEN 'finalize' THEN 7
  END)`);
}
