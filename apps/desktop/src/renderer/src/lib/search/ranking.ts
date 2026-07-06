import type { SortableField } from "@pond/schema";
import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import type { Save } from "@/lib/types";
import { dot } from "@/lib/util/vector";
import { embeddingStore } from "@/stores/embedding-store";
import { annNearest } from "./ann-index";
import type { AskSort } from "./nl-query";
import { searchScores } from "./text-index";

// Shared relevance/ordering helpers for the Ask agent. Extracted from use-ask so
// the deterministic plan executor (plan-exec.ts) and the agent runner can rank
// the same way the original flow did. Pure functions over the candidate pool.

// Pure-semantic runs (no structured constraints) shouldn't dump the whole
// library; cap to the most relevant matches above a soft similarity floor.
const SEMANTIC_TOP_K = 80;
const SEMANTIC_MIN_SCORE = 0.15;

// Best-effort media length in seconds from the capture metadata.
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
} // Numeric value for any sortable plan field, via the shared field projections so
// dates/duration/fileCount all resolve consistently. Nullish reads as 0.
function fieldSortValue(save: Save, field: SortableField): number {
  const projected = FIELD_DESCRIPTORS[field].project(save);
  return typeof projected === "number" && Number.isFinite(projected)
    ? projected
    : 0;
}

// Order by an explicit plan field (savedAt/publishedAt/modifiedAt/duration/fileCount).
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

// Rank candidates by cosine similarity to the query vector; candidates without
// an embedding keep their (recency) order, appended after the scored ones.
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

// Top-K most similar saves above the floor — the "find by meaning" path for
// questions that don't pin down any concrete filter. Uses the ANN index for the
// whole-library scan when available, intersecting its global nearest set with
// the candidate pool; falls back to an exact linear scan otherwise.
export function rankSemantic(
  candidates: ReadonlyArray<Save>,
  vector: Float32Array,
): Save[] {
  // Over-fetch from the global index since some nearest neighbours may fall
  // outside the candidate subset.
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

// Deterministic, embedding-free relevance ranking — the floor that keeps "Ask"
// useful when semantic search is off or no vectors exist yet. Backed by the
// shared Orama BM25 index ("any"-term match), so it ranks identically to the
// grid search box. Returns the scoring matches (best first) separately from the
// non-matching remainder (kept in their incoming order).
export function rankByKeyword(
  candidates: ReadonlyArray<Save>,
  text: string,
): { matches: Save[]; rest: Save[] } {
  const scores = searchScores(text, "any");
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
