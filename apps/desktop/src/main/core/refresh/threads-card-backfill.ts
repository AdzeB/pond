/** Recapture Threads cards whose native PNG predates the carousel layout and inlined PFPs. */
import { saves } from "@pond/schema/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import log from "electron-log/main.js";
import pLimit from "p-limit";
import { getDb } from "../../db";
import {
  isCaptureTweetStale,
  runCaptureTweet,
} from "../pipeline/workers/capture-tweet";

const PAGE_SIZE = 200;
const MAX_INFLIGHT = 1;

export async function startThreadsCardBackfill(): Promise<{
  ok: true;
  recaptured: number;
}> {
  const db = await getDb();
  let recaptured = 0;
  let offset = 0;
  const limit = pLimit(MAX_INFLIGHT);
  const jobs: Promise<void>[] = [];

  for (;;) {
    const page = db
      .select({
        id: saves.id,
        rawJson: saves.rawJson,
      })
      .from(saves)
      .where(
        and(
          eq(saves.source, "threads"),
          inArray(saves.status, ["complete", "failed"]),
          isNull(saves.deletedAt),
        ),
      )
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();
    if (page.length === 0) break;
    offset += page.length;

    for (const row of page) {
      if (!isCaptureTweetStale(row.rawJson)) continue;
      jobs.push(
        limit(async () => {
          try {
            const result = await runCaptureTweet(row.id, { nativeOnly: true });
            if (result.captured > 0) recaptured += 1;
          } catch (err) {
            log.warn("[pond threads-card-backfill] failed", row.id, err);
          }
        }),
      );
    }

    if (page.length < PAGE_SIZE) break;
  }

  await Promise.all(jobs);
  if (recaptured > 0) {
    log.info("[pond threads-card-backfill] recaptured", { recaptured });
  }
  return { ok: true, recaptured };
}
