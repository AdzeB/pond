/** One-shot: probe video dims onto the save; restore YouTube platform thumbs. */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Save, saves } from "@pond/schema/db";
import { isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import pLimit from "p-limit";
import { getDb } from "../../db";
import {
  hasMediaDims,
  needsPosterRepair,
  usesPlatformPoster,
  videoPosterSlots,
  youtubeThumbnailUrl,
} from "../../lib/poster-policy";
import { resolvePaths } from "../../paths";
import { runEnsurePoster } from "../pipeline/workers/ensure-poster";
import { currentPondId } from "../prefs-scope";

const MIGRATION_ID = "youtube-thumb-video-dims-v6";
const MAX_INFLIGHT = 2;
const PAGE_SIZE = 200;

function markerPath(): string {
  return join(resolvePaths().indexesDir, `${currentPondId()}.${MIGRATION_ID}`);
}

function needsBackfill(
  save: Pick<Save, "source" | "files" | "rawJson" | "width" | "height">,
): boolean {
  const files = save.files ?? [];
  const { videos } = videoPosterSlots(files);
  if (videos.length === 0) return false;
  if (needsPosterRepair(files)) return true;
  if (!hasMediaDims(save) || videos.some((video) => !hasMediaDims(video))) {
    return true;
  }
  return (
    usesPlatformPoster(save.source) && youtubeThumbnailUrl(save.rawJson) != null
  );
}

/** Walks the library once; safe to call alongside media warming. */
export async function startPosterBackfill(): Promise<{
  ok: true;
  repaired: number;
  skipped: boolean;
}> {
  if (existsSync(markerPath())) {
    return { ok: true, repaired: 0, skipped: true };
  }

  const db = await getDb();
  let repaired = 0;
  let offset = 0;
  const limit = pLimit(MAX_INFLIGHT);
  const jobs: Promise<void>[] = [];

  for (;;) {
    const page = db
      .select({
        id: saves.id,
        source: saves.source,
        files: saves.files,
        rawJson: saves.rawJson,
        width: saves.width,
        height: saves.height,
      })
      .from(saves)
      .where(isNull(saves.deletedAt))
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();
    if (page.length === 0) break;
    offset += page.length;

    for (const row of page) {
      if (!needsBackfill(row)) continue;
      const forcePlatform =
        usesPlatformPoster(row.source) &&
        youtubeThumbnailUrl(row.rawJson) != null;
      jobs.push(
        limit(async () => {
          try {
            await runEnsurePoster(row.id, { forcePlatform });
            repaired += 1;
          } catch (err) {
            log.warn("[pond poster-backfill] failed", row.id, err);
          }
        }),
      );
    }
    if (page.length < PAGE_SIZE) break;
  }

  if (jobs.length === 0) {
    writeFileSync(markerPath(), `${Date.now()}\n`);
    log.info("[pond poster-backfill] nothing to repair");
    return { ok: true, repaired: 0, skipped: false };
  }

  log.info("[pond poster-backfill] repairing", jobs.length, "saves");
  await Promise.all(jobs);
  writeFileSync(markerPath(), `${Date.now()}\n`);
  log.info("[pond poster-backfill] repaired", repaired, "of", jobs.length);
  return { ok: true, repaired, skipped: false };
}
