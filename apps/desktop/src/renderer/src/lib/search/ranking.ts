import type { SortableField } from "@pond/schema";
import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import type { Save } from "@/lib/types";
import { dot } from "@/lib/util/vector";
import { embeddingStore } from "@/stores/embedding-store";
import { annNearest } from "./ann-index";
import { searchFtsScores } from "./fts-client";
import type { AskSort } from "./nl-query";

/** Shared relevance/ordering helpers so the plan executor and the agent runner rank the same way as use-ask. */

/** Pure-semantic runs shouldn't dump the whole library; cap to the most relevant matches above a soft similarity floor. */
const SEMANTIC_TOP_K = 80;
const SEMANTIC_MIN_SCORE = 0.15;

/** Best-effort media length in seconds from the capture metadata. */
function durationOf(save: Save): number {
  const raw = save.rawJson;
  const cap = raw?.capture?.duration;
  if (typeof cap === "number" && cap > 0) return cap;
  for (const m of raw?.capture?.media ?? []) {
    if (typeof m?.durationSec === "number" && m.durationSec > 0) {
      return m.durationSec;
    }
  }
  const yt = raw?.ytdlp?.duration;
  return typeof yt === "number" && yt > 0 ? yt : 0;
}

function _sortValue(save: Save, key: AskSort["key"]): number {
  switch (key) {
    case "savedAt":
      return save.savedAt ?? 0;
    case "duration":
      return durationOf(save);
    case "fileCount":
      return save.files?.length ?? 0;
  }
}

/** Uses the shared field projections so dates/duration/fileCount resolve consistently; nullish reads as 0. */
function fieldSortValue(save: Save, field: SortableField): number {
  const projected = FIELD_DESCRIPTORS[field].project(save);
  return typeof projected === "number" && Number.isFinite(projected)
    ? projected
    : 0;
}

export function sortByField(
  saves: ReadonlyArray<Save>,
  field: SortableField,
  dir: "asc" | "desc",
): Save[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...saves].sort(
    (a, b) => sign * (fieldSortValue(a, field) - fieldSortValue(b, field)),
  );
}

/** Candidates without an embedding keep their recency order, appended after the scored ones. */
export function rankByVector(
  candidates: ReadonlyArray<Save>,
  vector: Float32Array,
): Save[] {
  const scored: { save: Save; score: number; index: number }[] = [];
  const unscored: Save[] = [];
  candidates.forEach((save, index) => {
    const entry = embeddingStore.state.byId.get(save.id);
    if (entry) scored.push({ save, score: dot(vector, entry.vec), index });
    else unscored.push(save);
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return [...scored.map((s) => s.save), ...unscored];
}

/** The "find by meaning" path: uses the ANN index when available, intersecting its global nearest set with the candidate pool; exact linear scan otherwise. */
export function rankSemantic(
  candidates: ReadonlyArray<Save>,
  vector: Float32Array,
): Save[] {
  /** Over-fetch from the global index since some nearest neighbours may fall outside the candidate subset. */
  const ann = annNearest(vector, SEMANTIC_TOP_K * 4);
  if (ann) {
    const byId = new Map(candidates.map((s) => [s.id, s]));
    const out: Save[] = [];
    for (const { id, score } of ann) {
      if (score < SEMANTIC_MIN_SCORE) continue;
      const save = byId.get(id);
      if (save) out.push(save);
      if (out.length >= SEMANTIC_TOP_K) break;
    }
    return out;
  }
  const scored: { save: Save; score: number }[] = [];
  for (const save of candidates) {
    const entry = embeddingStore.state.byId.get(save.id);
    if (!entry) continue;
    const score = dot(vector, entry.vec);
    if (score >= SEMANTIC_MIN_SCORE) scored.push({ save, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, SEMANTIC_TOP_K).map((s) => s.save);
}

/**
 * Embedding-free floor that keeps "Ask" useful when semantic search is off; backed by SQLite FTS5 so it ranks like the grid search box.
 * @remarks Returns the scoring matches best-first, separately from the non-matching remainder in incoming order.
 */
export async function rankByKeyword(
  candidates: ReadonlyArray<Save>,
  text: string,
): Promise<{ matches: Save[]; rest: Save[] }> {
  const scores = await searchFtsScores(text, "any");
  if (scores.size === 0) return { matches: [], rest: [...candidates] };
  const scored: { save: Save; score: number; index: number }[] = [];
  const rest: Save[] = [];
  candidates.forEach((save, index) => {
    const score = scores.get(save.id);
    if (score != null) scored.push({ save, score, index });
    else rest.push(save);
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return { matches: scored.map((s) => s.save), rest };
}
