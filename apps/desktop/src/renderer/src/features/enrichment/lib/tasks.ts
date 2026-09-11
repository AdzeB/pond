import type { Prefs } from "@pond/schema/db";
import { z } from "zod";
import { statusFeed } from "@/features/downloads/lib/status-feed";
import { clearClipEmbeddings } from "@/features/enrichment/state/clip-embedding-store";
import { clearEmbeddings } from "@/features/enrichment/state/embedding-store";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { bulkMutation } from "@/features/saves/lib/mutate";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { getPrefsSnapshot } from "@/features/settings/state/prefs";

const BackfillReplySchema = z.object({
  ok: z.boolean().catch(false),
  updated: z.number().optional().catch(undefined),
});

export interface TaskResult {
  ok: boolean;
  message: string;
}

export const DISABLED_HINTS = {
  caption: "Turn on Image Captions in Enrichments first.",
  ocr: "Turn on Text in Images in Enrichments first.",
  transcribe: "Turn on Transcription in Enrichments first.",
  reembed: "Turn on Semantic Search in Enrichments first.",
  clip: "Turn on Visual Similarity in Enrichments first.",
} as const;

export const TASK_ENABLED = {
  caption: (prefs: Prefs | null) => prefs?.ai?.enableCaption === true,
  ocr: (prefs: Prefs | null) => prefs?.ai?.enableOcr === true,
  transcribe: (prefs: Prefs | null) => prefs?.ai?.enableTranscript === true,
  reembed: (prefs: Prefs | null) => prefs?.ai?.semanticSearch === true,
  clip: (prefs: Prefs | null) => prefs?.ai?.enableClip === true,
} as const;

export type TaskScope = readonly string[] | undefined;

function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

function targetSaves(ids: TaskScope): Save[] {
  const live = pool.snapshot().filter((s) => !s.deletedAt);
  if (!ids || ids.length === 0) return live;
  const set = new Set(ids);
  return live.filter((s) => set.has(s.id));
}

export async function autoTag(ids?: TaskScope): Promise<TaskResult> {
  const targets = ids?.length
    ? [...ids]
    : (
        await window.pond.query("saves.queryIds", {
          query: { combinator: "and", rules: [] },
        })
      ).ids;
  const changed = await bulkMutation(targets, { kind: "suggested-tags" });
  if (changed > 0) {
    statusFeed.note(`Applied tags to ${changed} ${plural(changed, "item")}`);
  }
  return {
    ok: true,
    message:
      changed > 0
        ? `Applied tags to ${changed} ${plural(changed, "item")}.`
        : "No suggested tags to apply.",
  };
}

export async function backfillColors(): Promise<TaskResult> {
  const job = statusFeed.start("Backfilling colors");
  const res = BackfillReplySchema.parse(
    await window.pond.query("saves.backfillColors", {}),
  );
  if (!res.ok) {
    statusFeed.fail(job, "Color backfill failed.");
    return { ok: false, message: "Color backfill failed." };
  }
  const updated = res.updated ?? 0;
  statusFeed.done(
    job,
    updated > 0
      ? `Updated ${updated} ${plural(updated, "item")}`
      : "All items already have colors",
  );
  return {
    ok: true,
    message:
      updated > 0
        ? `Updated ${updated} ${plural(updated, "item")}.`
        : "All items already have colors.",
  };
}

function kickRescan(ids?: TaskScope): void {
  void import("./sweep").then(({ rescanEnrichment }) => {
    rescanEnrichment(ids && ids.length > 0 ? ids : undefined);
  });
}

export function runEnrichment(): TaskResult {
  kickRescan();
  statusFeed.note("Enrichment sweep started");
  return { ok: true, message: "Enrichment sweep started." };
}

async function reprocessStamped(
  enabled: boolean,
  disabledHint: string,
  clear: (save: Save) => Save | null,
  ids: TaskScope,
): Promise<TaskResult> {
  if (!enabled) return { ok: false, message: disabledHint };
  if (ids?.length) await ensureSaves(ids);
  const updated: Save[] = [];
  for (const save of targetSaves(ids)) {
    const next = clear(save);
    if (next) updated.push(next);
  }
  pool.bulkUpsert(updated);
  kickRescan(ids);
  const n = updated.length;
  if (n > 0) {
    statusFeed.note(`Reprocessing ${n} ${plural(n, "item")} in the background`);
  }
  return {
    ok: true,
    message:
      n > 0
        ? `Reprocessing ${n} ${plural(n, "item")} in the background`
        : "Nothing to reprocess.",
  };
}

export function recaption(ids?: TaskScope): Promise<TaskResult> {
  return reprocessStamped(
    TASK_ENABLED.caption(getPrefsSnapshot()),
    DISABLED_HINTS.caption,
    (s) => (s.captionModel == null ? null : { ...s, captionModel: null }),
    ids,
  );
}

export function reocr(ids?: TaskScope): Promise<TaskResult> {
  return reprocessStamped(
    TASK_ENABLED.ocr(getPrefsSnapshot()),
    DISABLED_HINTS.ocr,
    (s) => (s.ocrModel == null ? null : { ...s, ocrModel: null }),
    ids,
  );
}

export function retranscribe(ids?: TaskScope): Promise<TaskResult> {
  return reprocessStamped(
    TASK_ENABLED.transcribe(getPrefsSnapshot()),
    DISABLED_HINTS.transcribe,
    (s) => (s.transcriptModel == null ? null : { ...s, transcriptModel: null }),
    ids,
  );
}

export async function reembed(ids?: TaskScope): Promise<TaskResult> {
  if (!TASK_ENABLED.reembed(getPrefsSnapshot()))
    return { ok: false, message: DISABLED_HINTS.reembed };
  if (ids?.length) await ensureSaves(ids);
  clearEmbeddings(ids && ids.length > 0 ? ids : undefined);
  return reprocessStamped(
    true,
    DISABLED_HINTS.reembed,
    (save) =>
      save.embeddingModel == null ? null : { ...save, embeddingModel: null },
    ids,
  );
}

export async function rebuildVisualIndex(ids?: TaskScope): Promise<TaskResult> {
  if (!TASK_ENABLED.clip(getPrefsSnapshot()))
    return { ok: false, message: DISABLED_HINTS.clip };
  if (ids?.length) await ensureSaves(ids);
  clearClipEmbeddings(ids && ids.length > 0 ? ids : undefined);
  return reprocessStamped(
    true,
    DISABLED_HINTS.clip,
    (save) => (save.clipModel == null ? null : { ...save, clipModel: null }),
    ids,
  );
}
