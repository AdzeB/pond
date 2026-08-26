import type { Prefs } from "@pond/schema/db";
import { setSaveTags } from "@/lib/save/mutate";
import { statusFeed } from "@/lib/status-feed";
import type { Save } from "@/lib/types";
import { clearClipEmbeddings } from "@/stores/clip-embedding-store";
import { clearEmbeddings } from "@/stores/embedding-store";
import { pool } from "@/stores/pool";
import { getPrefsSnapshot } from "@/stores/prefs";
import { mergeUniqueTags } from "@/stores/tag-clipboard";

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

function scopeNoun(ids: TaskScope): string {
  return ids && ids.length > 0 ? "selection" : "library";
}

export async function autoTag(ids?: TaskScope): Promise<TaskResult> {
  let changed = 0;
  for (const save of targetSaves(ids)) {
    const suggested = save.suggestedTags ?? [];
    if (suggested.length === 0) continue;
    const current = save.tags ?? [];
    const next = mergeUniqueTags(current, suggested);
    if (next.length === current.length) continue;
    await setSaveTags(save.id, next);
    changed++;
  }
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
  const res = (await window.pond.query("saves.backfillColors", {})) as {
    ok: boolean;
    updated?: number;
  };
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

function reprocessStamped(
  enabled: boolean,
  disabledHint: string,
  clear: (save: Save) => Save | null,
  ids: TaskScope,
): TaskResult {
  if (!enabled) return { ok: false, message: disabledHint };
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

export function recaption(ids?: TaskScope): TaskResult {
  return reprocessStamped(
    TASK_ENABLED.caption(getPrefsSnapshot()),
    DISABLED_HINTS.caption,
    (s) => (s.captionModel == null ? null : { ...s, captionModel: null }),
    ids,
  );
}

export function reocr(ids?: TaskScope): TaskResult {
  return reprocessStamped(
    TASK_ENABLED.ocr(getPrefsSnapshot()),
    DISABLED_HINTS.ocr,
    (s) => (s.ocrModel == null ? null : { ...s, ocrModel: null }),
    ids,
  );
}

export function retranscribe(ids?: TaskScope): TaskResult {
  return reprocessStamped(
    TASK_ENABLED.transcribe(getPrefsSnapshot()),
    DISABLED_HINTS.transcribe,
    (s) => (s.transcriptModel == null ? null : { ...s, transcriptModel: null }),
    ids,
  );
}

export function reembed(ids?: TaskScope): TaskResult {
  if (!TASK_ENABLED.reembed(getPrefsSnapshot())) {
    return { ok: false, message: DISABLED_HINTS.reembed };
  }
  const n = clearEmbeddings(ids && ids.length > 0 ? ids : undefined);
  kickRescan(ids);
  const message =
    n > 0
      ? `Embedding ${n} ${plural(n, "item")} again in the background`
      : `No embeddings to rebuild in the ${scopeNoun(ids)} yet.`;
  statusFeed.note("Semantic Index", message);
  return { ok: true, message };
}

export function rebuildVisualIndex(ids?: TaskScope): TaskResult {
  if (!TASK_ENABLED.clip(getPrefsSnapshot())) {
    return { ok: false, message: DISABLED_HINTS.clip };
  }
  const n = clearClipEmbeddings(ids && ids.length > 0 ? ids : undefined);
  kickRescan(ids);
  const message =
    n > 0
      ? `Rebuilding the visual index for ${n} ${plural(n, "item")}`
      : `No visual index to rebuild in the ${scopeNoun(ids)} yet.`;
  statusFeed.note("Visual Index", message);
  return { ok: true, message };
}
