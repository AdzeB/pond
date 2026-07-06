import { type SaveFile, saves } from "@pond/schema/db";
import { and, eq, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import { getDb } from "../../db";
import { isSourceConnected } from "../refresh/scrape-window";
import {
  CAPTURE_TWEET_VERSION,
  readCaptureTweetVersion,
  runCaptureTweet,
  TWEET_SCREENSHOT_DARK_KIND,
  TWEET_SCREENSHOT_LIGHT_KIND,
} from "./workers/capture-tweet";
import { runFetchBlobs } from "./workers/fetch-blobs";

// Stay one below the pool's twitter cap (3) so an interactive sync can still
// lease a window while a backfill is running.
const SCREENSHOT_BACKFILL_CONCURRENCY = 2;

// Consecutive auth-wall misses that trip the early abort (stale session).
const SCREENSHOT_AUTH_WALL_ABORT = 6;

export interface BackfillStatusUpdate {
  state: "idle" | "running" | "done" | "error";
  attempted: number;
  captured: number;
  total: number;
  message?: string;
  lastError?: string | null;
}

type BackfillListener = (update: BackfillStatusUpdate) => void;
const backfillListeners = new Set<BackfillListener>();
let backfillStatus: BackfillStatusUpdate = {
  state: "idle",
  attempted: 0,
  captured: 0,
  total: 0,
};
let backfillCancelRequested = false;

export function subscribeToBackfillStatus(cb: BackfillListener): () => void {
  backfillListeners.add(cb);
  return () => {
    backfillListeners.delete(cb);
  };
}

export function getBackfillStatus(): BackfillStatusUpdate {
  return backfillStatus;
}

export function isBackfillRunning(): boolean {
  return backfillStatus.state === "running";
}

function emitBackfill(patch: Partial<BackfillStatusUpdate>): void {
  backfillStatus = { ...backfillStatus, ...patch };
  for (const cb of backfillListeners) {
    try {
      cb(backfillStatus);
    } catch (err) {
      log.warn("[pond pipeline:capture-tweet] backfill listener threw", err);
    }
  }
}

export function cancelTweetScreenshotBackfill(): void {
  if (backfillStatus.state !== "running") return;
  backfillCancelRequested = true;
  emitBackfill({ message: "Stopping…" });
}

// User-initiated recapture for twitter saves missing a screenshot variant; never re-ingests.
export async function startTweetScreenshotBackfill(): Promise<void> {
  if (backfillStatus.state === "running") {
    log.info(
      "[pond pipeline:capture-tweet] backfill already running, ignoring",
    );
    return;
  }
  backfillCancelRequested = false;
  emitBackfill({
    state: "running",
    attempted: 0,
    captured: 0,
    total: 0,
    message: "Looking for screenshots to recapture…",
    lastError: null,
  });

  const connected = await isSourceConnected("twitter").catch(() => false);
  if (!connected) {
    log.info("[pond pipeline:capture-tweet] backfill skipped, X not connected");
    emitBackfill({
      state: "error",
      message: "Connect X to backfill screenshots.",
      lastError: "not_connected",
    });
    return;
  }

  const db = await getDb();
  const rows = db
    .select()
    .from(saves)
    .where(and(eq(saves.source, "twitter"), isNull(saves.deletedAt)))
    .all();

  const needCapture: string[] = [];
  for (const row of rows) {
    // Mid-ingest saves are owned by the reconciler; skip to avoid double-leasing.
    if (row.status === "ingesting") continue;
    // Recapture out-of-date saves even if both variants exist (version bump).
    if (readCaptureTweetVersion(row.rawJson) < CAPTURE_TWEET_VERSION) {
      needCapture.push(row.id);
      continue;
    }
    const files = (row.files ?? []) as SaveFile[];
    const hasLight = files.some((f) => f.kind === TWEET_SCREENSHOT_LIGHT_KIND);
    const hasDark = files.some((f) => f.kind === TWEET_SCREENSHOT_DARK_KIND);
    if (hasLight && hasDark) continue;
    needCapture.push(row.id);
  }
  if (needCapture.length === 0) {
    emitBackfill({
      state: "done",
      total: 0,
      message: "All screenshots are up to date.",
    });
    return;
  }

  log.info(
    "[pond pipeline:capture-tweet] backfill starting",
    needCapture.length,
    "saves",
  );

  const total = needCapture.length;
  let cursor = 0;
  let attempted = 0;
  let captured = 0;
  let authWallStreak = 0;
  let authWallAborted = false;
  emitBackfill({
    total,
    message: `Recapturing 0 of ${total}…`,
  });

  const worker = async (): Promise<void> => {
    while (!backfillCancelRequested && !authWallAborted) {
      const saveId = needCapture[cursor];
      if (saveId === undefined) break;
      cursor += 1;
      try {
        const result = await runCaptureTweet(saveId);
        captured += result.captured;
        // Out-of-band, so kick fetch_blobs ourselves for any merged quoted media.
        if (result.mediaAdded) {
          await runFetchBlobs(saveId).catch((err) =>
            log.warn(
              "[pond pipeline:capture-tweet] backfill fetch-blobs failed",
              saveId,
              err,
            ),
          );
        }
        if (result.captured === 0 && result.authWall) {
          authWallStreak += 1;
          if (authWallStreak >= SCREENSHOT_AUTH_WALL_ABORT) {
            authWallAborted = true;
            log.warn(
              "[pond pipeline:capture-tweet] backfill aborted, repeated auth walls",
            );
          }
        } else if (result.captured > 0) {
          authWallStreak = 0;
        }
      } catch (err) {
        log.warn(
          "[pond pipeline:capture-tweet] backfill capture failed",
          saveId,
          err,
        );
      }
      attempted += 1;
      emitBackfill({
        attempted,
        captured,
        message: `Recapturing ${attempted} of ${total}…`,
      });
    }
  };

  const lanes = Math.min(SCREENSHOT_BACKFILL_CONCURRENCY, needCapture.length);
  await Promise.all(Array.from({ length: lanes }, () => worker()));

  log.info("[pond pipeline:capture-tweet] backfill done", {
    attempted,
    captured,
    cancelled: backfillCancelRequested,
    authWallAborted,
  });

  if (authWallAborted) {
    emitBackfill({
      state: "error",
      message: "Sign in to X to recapture screenshots.",
      lastError: "auth_required",
    });
  } else if (backfillCancelRequested) {
    emitBackfill({
      state: "idle",
      message: `Stopped after ${captured} recaptured.`,
    });
  } else {
    emitBackfill({
      state: "done",
      message: `Recaptured ${captured} screenshot${captured === 1 ? "" : "s"}.`,
    });
  }
}
