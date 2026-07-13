import type { RawJson } from "@pond/schema/raw";
import type Database from "better-sqlite3";

/** Keeps only the rawJson fields the grid/filter/search read; stored in saves.raw_slim so `saves.list` can skip the heavy blob. */
export function slimRawJson(raw: RawJson | null | undefined): RawJson | null {
  if (!raw) return null;
  const cap = raw.capture;
  return {
    capture: {
      id: cap.id,
      source: cap.source,
      url: cap.url,
      ...(cap.author?.avatarUrl
        ? { author: { avatarUrl: cap.author.avatarUrl } }
        : {}),
      media: (cap.media ?? []).map((m) => ({
        url: m.url,
        type: m.type,
        ...(m.durationSec != null ? { durationSec: m.durationSec } : {}),
      })),
      ...(cap.duration != null ? { duration: cap.duration } : {}),
    },
    extractorId: raw.extractorId,
    extractedAt: raw.extractedAt,
    ...(raw.ytdlp?.duration != null
      ? { ytdlp: { duration: raw.ytdlp.duration } }
      : {}),
  };
}

/** Derives raw_slim whenever a write carries rawJson so the slim projection stays in lockstep with the source blob; untouched otherwise. */
export function withRawSlim<T extends { rawJson?: unknown }>(
  values: T,
): T & { rawSlim?: RawJson | null } {
  if (!("rawJson" in values)) return values;
  return {
    ...values,
    rawSlim: slimRawJson(values.rawJson as RawJson | null | undefined),
  };
}

/** One-time fill for rows without raw_slim; cheap no-op once done. */
export function backfillRawSlim(sqlite: Database.Database): void {
  const rows = sqlite
    .prepare(
      `SELECT id, raw_json AS rawJson FROM saves WHERE raw_slim IS NULL AND raw_json IS NOT NULL`,
    )
    .all() as Array<{ id: string; rawJson: string }>;
  if (rows.length === 0) return;

  const update = sqlite.prepare(`UPDATE saves SET raw_slim = ? WHERE id = ?`);
  const run = sqlite.transaction((batch: typeof rows) => {
    for (const row of batch) {
      let slim: RawJson | null = null;
      try {
        slim = slimRawJson(JSON.parse(row.rawJson) as RawJson);
      } catch {
        slim = null;
      }
      /** Always write a non-NULL value so unparseable rows aren't re-scanned on every boot. */
      update.run(JSON.stringify(slim), row.id);
    }
  });
  run(rows);
}
