import type { Op, Source, Task, tasks } from "@pond/schema/db";
import type { JsonValue } from "@pond/schema/json";
import type { ReportDownloadActivity } from "@shared/download-activity";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const POLL_INTERVAL_MS = 5_000;
export const MAX_GLOBAL_INFLIGHT = 4;
export const MAX_INTERACTIVE_INFLIGHT = 4;
export const PER_OP_CONCURRENCY = {
  harvest_metadata: 2,
  capture_tweet: 2,
  render_text_cover: 2,
  fetch_blobs: 4,
  archive_page: 1,
  fetch_video_ytdlp: 2,
  ensure_poster: 3,
  fetch_avatar: 4,
  finalize: 3,
} satisfies Record<Op, number>;

export { TASK_WATCHDOG_MS } from "./task-timeouts";

export const ORPHAN_SWEEP_INTERVAL_MS = 60_000;

export class WorkerWatchdogError extends Error {
  constructor(op: Op, ms: number) {
    super(`worker watchdog: ${op} exceeded ${ms}ms`);
    this.name = "WorkerWatchdogError";
  }
}

interface WorkerContext {
  signal: AbortSignal;
  reportActivity: ReportDownloadActivity;
}

type Worker = (
  saveId: string,
  payload: JsonValue,
  ctx: WorkerContext,
) => Promise<void>;

const HarvestPayloadSchema = z
  .object({ force: z.coerce.boolean().optional() })
  .catch({});

const ArchivePayloadSchema = z
  .object({ scope: z.enum(["page", "site"]).optional().catch(undefined) })
  .catch({});

export const WORKERS = {
  harvest_metadata: async (saveId, payload, ctx) => {
    const { runHarvestMetadata } = await import("./workers/harvest-metadata");
    await runHarvestMetadata(saveId, HarvestPayloadSchema.parse(payload), ctx);
  },
  capture_tweet: async (saveId) => {
    const [{ runCaptureTweet }, { TransientError }] = await Promise.all([
      import("./workers/capture-tweet"),
      import("./extractors/errors"),
    ]);
    const result = await runCaptureTweet(saveId);
    if (result.authWall && result.captured === 0) {
      throw new TransientError(
        "capture_tweet: X auth wall (session may be expired)",
      );
    }
  },
  render_text_cover: async (saveId) => {
    const { runRenderTextCover } = await import("./workers/render-text-cover");
    await runRenderTextCover(saveId);
  },
  fetch_blobs: async (saveId, _payload, ctx) => {
    const { runFetchBlobs } = await import("./workers/fetch-blobs");
    await runFetchBlobs(saveId, ctx);
  },
  archive_page: async (saveId, payload, ctx) => {
    const { runArchivePage } = await import("./workers/archive-page");
    await runArchivePage(saveId, ArchivePayloadSchema.parse(payload), ctx);
  },
  fetch_video_ytdlp: async (saveId, _payload, ctx) => {
    const { runFetchVideoYtdlp } = await import("./workers/fetch-video-ytdlp");
    await runFetchVideoYtdlp(saveId, ctx);
  },
  ensure_poster: async (saveId) => {
    const { runEnsurePoster } = await import("./workers/ensure-poster");
    await runEnsurePoster(saveId);
  },
  fetch_avatar: async (saveId) => {
    const { runFetchAvatar } = await import("./workers/fetch-avatar");
    await runFetchAvatar(saveId);
  },
  finalize: async (saveId) => {
    const { runFinalize } = await import("./workers/finalize");
    await runFinalize(saveId);
  },
} satisfies Record<Op, Worker>;

export const NON_FATAL_OPS: ReadonlySet<Op> = new Set<Op>([
  "capture_tweet",
  "render_text_cover",
  "archive_page",
  "ensure_poster",
  "fetch_avatar",
]);

export const metrics = {
  tasksDispatched: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  tasksBlocked: 0,
  watchdogTrips: 0,
  cascadeEvents: 0,
};

export interface DueTask extends Task {
  source: Source;
}

export function isSourceTask(op: Op): boolean {
  return (
    op === "harvest_metadata" || op === "capture_tweet" || op === "archive_page"
  );
}

export function opOrderCase(opCol: typeof tasks.op) {
  return sql`(CASE ${opCol}
    WHEN 'harvest_metadata' THEN 0
    WHEN 'capture_tweet' THEN 1
    WHEN 'render_text_cover' THEN 2
    WHEN 'fetch_blobs' THEN 3
    WHEN 'archive_page' THEN 4
    WHEN 'fetch_video_ytdlp' THEN 5
    WHEN 'ensure_poster' THEN 6
    WHEN 'fetch_avatar' THEN 7
    WHEN 'finalize' THEN 8
  END)`;
}

export function opOrderCaseRaw(rawCol: string) {
  return sql.raw(`(CASE ${rawCol}
    WHEN 'harvest_metadata' THEN 0
    WHEN 'capture_tweet' THEN 1
    WHEN 'render_text_cover' THEN 2
    WHEN 'fetch_blobs' THEN 3
    WHEN 'archive_page' THEN 4
    WHEN 'fetch_video_ytdlp' THEN 5
    WHEN 'ensure_poster' THEN 6
    WHEN 'fetch_avatar' THEN 7
    WHEN 'finalize' THEN 8
  END)`);
}
