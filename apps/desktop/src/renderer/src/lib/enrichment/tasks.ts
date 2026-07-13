import { setSaveTags } from "@/lib/save/mutate";
import type { Save } from "@/lib/types";
import { clearClipEmbeddings } from "@/stores/clip-embedding-store";
import { clearEmbeddings } from "@/stores/embedding-store";
import { pool } from "@/stores/pool";
import { getPrefsSnapshot } from "@/stores/prefs";
import { mergeUniqueTags } from "@/stores/tag-clipboard";
import { rescanEnrichment } from "./sweep";

export interface TaskResult {
  ok: boolean;
  message: string;
}

/** Save ids to scope a task to; omit or empty to run over the whole non-trashed library. */
export type TaskScope = readonly string[] | undefined;

function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/** Trashed saves are always excluded. */
function targetSaves(ids: TaskScope): Save[] {
  const live = pool.snapshot().filter((s) => !s.deletedAt);
  if (!ids || ids.length === 0) return live;
  const set = new Set(ids);
  return live.filter((s) => set.has(s.id));
}

function scopeNoun(ids: TaskScope): string {
  return ids && ids.length > 0 ? "selection" : "library";
}

/** Non-destructive: existing tags are kept and suggestions merge uniquely, so re-running is idempotent. */
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
  return {
    ok: true,
    message:
      changed > 0
        ? `Applied tags to ${changed} ${plural(changed, "item")}.`
        : "No suggested tags to apply.",
  };
}

/** Backend job; only images without a palette are touched. */
export async function backfillColors(): Promise<TaskResult> {
  const res = (await window.pond.query("saves.backfillColors", {})) as {
    ok: boolean;
    updated?: number;
  };
  if (!res.ok) return { ok: false, message: "Color backfill failed." };
  const updated = res.updated ?? 0;
  return {
    ok: true,
    message:
      updated > 0
        ? `Updated ${updated} ${plural(updated, "image")}.`
        : "All images already have colors.",
  };
}

export function runEnrichment(): TaskResult {
  rescanEnrichment();
  return { ok: true, message: "Enrichment sweep started." };
}

/**
 * Nulls the model stamp in the pool only; the DB row keeps its value until a fresh result lands, so an interrupted run loses nothing.
 * @remarks Clearing the stamp makes `eligible()` true, and the pool mutation wakes the sweep, which re-derives and persists.
 */
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
  rescanEnrichment(ids && ids.length > 0 ? ids : undefined);
  const n = updated.length;
  return {
    ok: true,
    message:
      n > 0
        ? `Reprocessing ${n} ${plural(n, "item")} in the background…`
        : "Nothing to reprocess.",
  };
}

export function recaption(ids?: TaskScope): TaskResult {
  return reprocessStamped(
    getPrefsSnapshot()?.ai?.enableCaption === true,
    "Turn on Image captions in Enrichment first.",
    (s) => (s.captionModel == null ? null : { ...s, captionModel: null }),
    ids,
  );
}

export function reocr(ids?: TaskScope): TaskResult {
  return reprocessStamped(
    getPrefsSnapshot()?.ai?.enableOcr === true,
    "Turn on Text in images (OCR) in Enrichment first.",
    (s) => (s.ocrModel == null ? null : { ...s, ocrModel: null }),
    ids,
  );
}

export function retranscribe(ids?: TaskScope): TaskResult {
  return reprocessStamped(
    getPrefsSnapshot()?.ai?.enableTranscript === true,
    "Turn on Transcribe audio & video in Enrichment first.",
    (s) => (s.transcriptModel == null ? null : { ...s, transcriptModel: null }),
    ids,
  );
}

/** Drops in-memory text vectors so the sweep re-embeds every eligible save. */
export function reembed(ids?: TaskScope): TaskResult {
  if (getPrefsSnapshot()?.ai?.semanticSearch !== true) {
    return { ok: false, message: "Turn on Semantic search in AI first." };
  }
  const n = clearEmbeddings(ids && ids.length > 0 ? ids : undefined);
  rescanEnrichment(ids && ids.length > 0 ? ids : undefined);
  return {
    ok: true,
    message:
      n > 0
        ? `Re-embedding ${n} ${plural(n, "item")} in the background…`
        : `No embeddings to rebuild in the ${scopeNoun(ids)} yet.`,
  };
}

export function rebuildVisualIndex(ids?: TaskScope): TaskResult {
  if (getPrefsSnapshot()?.ai?.enableClip !== true) {
    return {
      ok: false,
      message: "Turn on Visual similarity (CLIP) in Enrichment first.",
    };
  }
  const n = clearClipEmbeddings(ids && ids.length > 0 ? ids : undefined);
  rescanEnrichment(ids && ids.length > 0 ? ids : undefined);
  return {
    ok: true,
    message:
      n > 0
        ? `Rebuilding the visual index for ${n} ${plural(n, "item")}…`
        : `No visual index to rebuild in the ${scopeNoun(ids)} yet.`,
  };
}
