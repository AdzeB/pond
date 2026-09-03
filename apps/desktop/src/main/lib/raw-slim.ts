import type { RawJson } from "@pond/schema/raw";
import { StoredRawJsonSchema, storedAsRawJson } from "@pond/schema/raw-schema";
import type Database from "better-sqlite3";
import { z } from "zod";

export function slimRawJson(raw: RawJson | null | undefined): RawJson | null {
  if (!raw) return null;
  const cap = raw.capture;
  const capture: RawJson["capture"] = {
    id: cap.id,
    source: cap.source,
    url: cap.url,
    media: (cap.media ?? []).map((m) => {
      const media: RawJson["capture"]["media"][number] = {
        url: m.url,
        type: m.type,
      };
      if (m.durationSec != null) media.durationSec = m.durationSec;
      return media;
    }),
  };
  if (cap.author?.avatarUrl)
    capture.author = { avatarUrl: cap.author.avatarUrl };
  if (cap.duration != null) capture.duration = cap.duration;

  const slim: RawJson = {
    capture,
    extractorId: raw.extractorId,
    extractedAt: raw.extractedAt,
  };
  if (raw.ytdlp?.duration != null)
    slim.ytdlp = { duration: raw.ytdlp.duration };
  return slim;
}

export function withRawSlim<T extends { rawJson?: RawJson | null }>(
  values: T,
): T & { rawSlim?: RawJson | null } {
  if (!("rawJson" in values)) return values;
  return { ...values, rawSlim: slimRawJson(values.rawJson) };
}

const BackfillRowSchema = z.object({ id: z.string(), rawJson: z.string() });

const StoredJsonText = z.preprocess((text) => {
  try {
    return JSON.parse(String(text));
  } catch {
    return null;
  }
}, StoredRawJsonSchema);

export interface RawSlimBackfillResult {
  processed: number;
  hasMore: boolean;
}

export function backfillRawSlimBatch(
  sqlite: Database.Database,
  limit = 500,
): RawSlimBackfillResult {
  const batchLimit = Math.max(1, Math.floor(limit));
  const rows = sqlite
    .prepare(
      `SELECT id, raw_json AS rawJson
       FROM saves
       WHERE raw_slim IS NULL AND raw_json IS NOT NULL
       ORDER BY saved_at DESC, id DESC
       LIMIT ?`,
    )
    .all(batchLimit)
    .map((row) => BackfillRowSchema.safeParse(row))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
  if (rows.length === 0) return { processed: 0, hasMore: false };

  const update = sqlite.prepare(`UPDATE saves SET raw_slim = ? WHERE id = ?`);
  const run = sqlite.transaction((batch: typeof rows) => {
    for (const row of batch) {
      const stored = StoredJsonText.safeParse(row.rawJson);
      const slim = stored.success
        ? slimRawJson(storedAsRawJson(stored.data))
        : null;
      update.run(JSON.stringify(slim), row.id);
    }
  });
  run(rows);
  return { processed: rows.length, hasMore: rows.length === batchLimit };
}
