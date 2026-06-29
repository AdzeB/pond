import { matches } from "@pond/schema/filters/match";
import { FIELD_META } from "@pond/schema/filters/meta";
import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useCallback } from "react";
import { embedQueryImage, rankByClip } from "@/lib/enrichment/clip-query";
import { describePredicate } from "@/lib/search/fields";
import { type AskSort, flattenPredicates } from "@/lib/search/nl-query";
import type { Save } from "@/lib/types";
import { dot } from "@/lib/util/vector";
import { recordAsk } from "@/stores/ask-history";
import {
  type AskQueryImage,
  type AskSegment,
  type AskSuggestion,
  askStore,
  commitAskResult,
  setAskError,
  setAskResult,
  setAskStage,
  setAskSummary,
  setAskSummaryError,
  startAskSummary,
  startTurn,
} from "@/stores/ask-store";
import { embeddingStore } from "@/stores/embedding-store";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import { useNlCompiler } from "./use-nl-query";

// How many of the top results we describe to the summarizer. Bounded to keep
// the prompt small and the round-trip quick.
const SUMMARY_TOP_K = 12;

// Best-effort prose summary of a resolved result set. Fired after the result
// publishes so the grid never waits on it; failures leave the summary empty and
// the dock falls back to the count/question line.
async function runAskSummary(
  nonce: number,
  question: string,
  saves: ReadonlyArray<Save>,
): Promise<void> {
  startAskSummary(nonce);
  try {
    const items = saves.slice(0, SUMMARY_TOP_K).map((s) => ({
      title: s.title ?? "Untitled",
      author: s.author ?? undefined,
      source: s.source ?? undefined,
      tags: s.tags ?? undefined,
    }));
    const res = (await window.pond.query("ai.summarize", {
      question,
      items,
    })) as { summary?: string };
    setAskSummary(nonce, (res.summary ?? "").trim());
  } catch {
    setAskSummaryError(nonce);
  }
}

// Pure-semantic runs (no structured constraints) shouldn't dump the whole
// library; cap to the most relevant matches above a soft similarity floor.
const SEMANTIC_TOP_K = 80;
const SEMANTIC_MIN_SCORE = 0.15;

function hasPredicates(query: Query): boolean {
  return query.rules.length > 0;
}

// Average the embeddings of the anchored saves into one "more like these"
// vector; ids without an embedding are skipped.
function meanAnchorVector(ids: readonly string[]): Float32Array | null {
  const vecs: Float32Array[] = [];
  for (const id of ids) {
    const entry = embeddingStore.state.byId.get(id);
    if (entry) vecs.push(entry.vec);
  }
  if (vecs.length === 0) return null;
  const dim = vecs[0]?.length ?? 0;
  const out = new Float32Array(dim);
  for (const vec of vecs) {
    for (let i = 0; i < dim; i += 1) out[i] = (out[i] ?? 0) + (vec[i] ?? 0);
  }
  for (let i = 0; i < dim; i += 1) out[i] = (out[i] ?? 0) / vecs.length;
  return out;
}

// Blend the question vector with the anchor vector when both exist, so a
// question about referenced saves stays grounded in their meaning.
function blendVectors(
  a: Float32Array | null,
  b: Float32Array | null,
): Float32Array | null {
  if (!a) return b;
  if (!b) return a;
  const dim = Math.min(a.length, b.length);
  const out = new Float32Array(dim);
  for (let i = 0; i < dim; i += 1) out[i] = ((a[i] ?? 0) + (b[i] ?? 0)) / 2;
  return out;
}

// Float the explicitly anchored saves to the front, preserving the ranked
// order for everything else.
function pinAnchors(
  ordered: ReadonlyArray<Save>,
  ids: readonly string[],
): Save[] {
  if (ids.length === 0) return [...ordered];
  const pinned: Save[] = [];
  for (const id of ids) {
    const save = pool.get(id);
    if (save && !save.deletedAt) pinned.push(save);
  }
  if (pinned.length === 0) return [...ordered];
  const pinnedIds = new Set(pinned.map((s) => s.id));
  return [...pinned, ...ordered.filter((s) => !pinnedIds.has(s.id))];
}

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

function sortValue(save: Save, key: AskSort["key"]): number {
  switch (key) {
    case "savedAt":
      return save.savedAt ?? 0;
    case "duration":
      return durationOf(save);
    case "fileCount":
      return save.files?.length ?? 0;
  }
}

// Apply an explicit ordering ("newest", "longest"), overriding relevance.
function applySort(saves: ReadonlyArray<Save>, sort: AskSort): Save[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...saves].sort(
    (a, b) => sign * (sortValue(a, sort.key) - sortValue(b, sort.key)),
  );
}

// Rank candidates by cosine similarity to the query vector; candidates without
// an embedding keep their (recency) order, appended after the scored ones.
function rankByVector(
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
// questions that don't pin down any concrete filter.
function rankSemantic(
  candidates: ReadonlyArray<Save>,
  vector: Float32Array,
): Save[] {
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

// Split free-text into match tokens; one-character noise is dropped.
function keywordTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[?!.,]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

// Weighted substring score across a save's text fields. Title/tags/author count
// most; enrichment text (caption/ocr/transcript) and the url count least.
function keywordScore(save: Save, tokens: string[]): number {
  const fields: ReadonlyArray<[string, number]> = [
    [save.title ?? "", 4],
    [(save.tags ?? []).join(" "), 3],
    [save.author ?? "", 3],
    [save.notes ?? "", 2],
    [save.caption ?? "", 2],
    [save.description ?? "", 1],
    [save.ocrText ?? "", 1],
    [save.transcript ?? "", 1],
    [save.url ?? "", 1],
  ];
  const haystacks = fields.map(
    ([text, weight]) => [text.toLowerCase(), weight] as const,
  );
  let score = 0;
  for (const token of tokens) {
    for (const [hay, weight] of haystacks) {
      if (hay.includes(token)) score += weight;
    }
  }
  return score;
}

// Deterministic, embedding-free relevance ranking — the floor that keeps "Ask"
// useful when semantic search is off or no vectors exist yet. Returns the
// scoring matches (best first) separately from the non-matching remainder.
function rankByKeyword(
  candidates: ReadonlyArray<Save>,
  text: string,
): { matches: Save[]; rest: Save[] } {
  const tokens = keywordTokens(text);
  if (tokens.length === 0) return { matches: [], rest: [...candidates] };
  const scored: { save: Save; score: number; index: number }[] = [];
  const rest: Save[] = [];
  candidates.forEach((save, index) => {
    const score = keywordScore(save, tokens);
    if (score > 0) scored.push({ save, score, index });
    else rest.push(save);
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return { matches: scored.map((s) => s.save), rest };
}

// At most this many relaxations are offered for an empty result.
const SUGGESTION_CAP = 4;

// When a multi-predicate query matches nothing, offer to drop each predicate
// that, on its own removal, would surface something — ranked by how much it
// opens up. Single-predicate queries relax to the whole library, so we skip
// them (not a useful "did you mean").
function buildSuggestions(
  query: Query,
  live: ReadonlyArray<Save>,
): AskSuggestion[] {
  const preds = flattenPredicates(query);
  if (preds.length < 2) return [];
  const out: AskSuggestion[] = [];
  preds.forEach((pred, idx) => {
    const reduced: Query = {
      combinator: "and",
      rules: preds.filter((_, j) => j !== idx),
    };
    let count = 0;
    for (const save of live) if (matches(reduced, save)) count += 1;
    if (count === 0) return;
    const chip = describePredicate(pred);
    out.push({
      id: `drop-${idx}`,
      label: `Without ${FIELD_META[pred.field].label.toLowerCase()} · ${chip.label}`,
      query: reduced,
      count,
    });
  });
  out.sort((a, b) => b.count - a.count);
  return out.slice(0, SUGGESTION_CAP);
}

// Re-run a relaxation: filter by its (looser) query, order by recency, publish.
export function runAskSuggestion(suggestion: AskSuggestion): void {
  const ids = pool
    .snapshot()
    .filter((s) => !s.deletedAt && matches(suggestion.query, s))
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
    .map((s) => s.id);
  commitAskResult(suggestion.label, ids, suggestion.query);
}

// Per-turn options: refine within the previous result set, and/or attach a
// query image for image-to-image visual search.
export interface AskOptions {
  refine?: boolean;
  image?: { blob: Blob; meta: AskQueryImage };
  // The composed message as typed, so the transcript renders it back exactly.
  segments?: ReadonlyArray<AskSegment>;
}

// The "Ask anything" agent: turn a question into an ordered result set of save
// ids and append it to the ask-store transcript. Structured constraints (from
// the NL compiler) filter; a query embedding (text, anchor, or CLIP image)
// ranks by meaning. A refining turn searches within the previous turn's set.
export function useAsk(): (
  question: string,
  anchorIds?: readonly string[],
  opts?: AskOptions,
) => Promise<void> {
  const compile = useNlCompiler();
  const [ai] = usePrefs("ai");

  return useCallback(
    async (
      raw: string,
      anchorIds: readonly string[] = [],
      opts: AskOptions = {},
    ): Promise<void> => {
      const question = raw.trim();
      const image = opts.image ?? null;
      if (!question && anchorIds.length === 0 && !image) return;

      // Anchor-only runs ("@save" with no question) read as "find similar".
      const label =
        question || (image ? "Similar to this image" : "Similar items");

      // Refine within the previous turn's resolved set when asked and possible.
      const prev = askStore.state.turns[askStore.state.turns.length - 1];
      const refining =
        (opts.refine ?? false) &&
        prev != null &&
        prev.status === "done" &&
        prev.ids.length > 0;

      const nonce = startTurn({
        question: label,
        image: image?.meta ?? null,
        segments: opts.segments ?? [],
        refine: refining,
      });
      try {
        const live = pool.snapshot().filter((s) => !s.deletedAt);
        const basePool = refining
          ? prev.ids
              .map((id) => pool.get(id))
              .filter((s): s is Save => s != null && !s.deletedAt)
          : live;

        // Image-to-image visual search: rank the candidate pool by CLIP
        // similarity to the query image, skipping the NL compile entirely.
        if (image) {
          setAskStage(nonce, "ranking");
          const vec = await embedQueryImage(image.blob);
          let ordered = rankByClip(basePool, vec);
          ordered = pinAnchors(ordered, anchorIds);
          recordAsk(label);
          setAskResult(
            nonce,
            label,
            ordered.map((s) => s.id),
            EMPTY_QUERY,
            [],
          );
          if (ordered.length > 0 && ai?.nlCompiler) {
            void runAskSummary(nonce, label, ordered);
          }
          return;
        }

        const { query, queryVector, residual, sort, limit } = question
          ? await compile(question)
          : {
              query: EMPTY_QUERY,
              queryVector: null,
              residual: "",
              sort: null,
              limit: null,
            };
        // Query is compiled; narrate the search → rank stages next.
        setAskStage(nonce, "searching");
        const anchorVector = meanAnchorVector(anchorIds);
        const rankVector = blendVectors(queryVector, anchorVector);
        // Leftover words the compiler couldn't turn into a filter — what the
        // keyword floor ranks on. For a pure free-text query nothing is
        // consumed, so this equals the whole question.
        const residualText = (residual || "").trim();
        const freeText = residualText || question;

        const candidates = basePool.filter((s) => matches(query, s));

        setAskStage(nonce, "ranking");
        let ordered: Save[];
        if (rankVector) {
          ordered = hasPredicates(query)
            ? rankByVector(candidates, rankVector)
            : rankSemantic(candidates, rankVector);
          // Semantic ranking found nothing above the floor — fall back to
          // keyword so a real query never reads as "no matches".
          if (ordered.length === 0 && freeText) {
            ordered = rankByKeyword(candidates, freeText).matches;
          }
        } else if (hasPredicates(query) && residualText) {
          // Filtered set, no vector: surface residual keyword hits first, then
          // the rest of the filtered set so the structured constraint stands.
          const { matches: hits, rest } = rankByKeyword(
            candidates,
            residualText,
          );
          ordered = [...hits, ...rest];
        } else if (hasPredicates(query)) {
          // Structured-only query (e.g. "twitter videos"): keep recency order.
          ordered = [...candidates];
        } else if (freeText) {
          // Pure free text with no embeddings: deterministic keyword search.
          ordered = rankByKeyword(candidates, freeText).matches;
        } else {
          ordered = [];
        }

        // An explicit "newest/oldest/longest" overrides relevance ordering.
        if (sort) ordered = applySort(ordered, sort);

        ordered = pinAnchors(ordered, anchorIds);

        // "top N / first N" caps the result set after ordering + pinning.
        if (limit != null && limit > 0) ordered = ordered.slice(0, limit);

        // Nothing matched: offer one-tap relaxations instead of a dead end.
        // Relax against whatever pool this turn searched (the refined set or
        // the whole library).
        const suggestions =
          ordered.length === 0 ? buildSuggestions(query, basePool) : [];

        recordAsk(label);
        setAskResult(
          nonce,
          label,
          ordered.map((s) => s.id),
          query,
          suggestions,
        );

        // Behind a configured LLM (the nlCompiler toggle), describe the result
        // set in prose for the dock card. Fire-and-forget; never blocks the run.
        if (ordered.length > 0 && ai?.nlCompiler) {
          void runAskSummary(nonce, label, ordered);
        }
      } catch {
        setAskError(nonce, label);
      }
    },
    [compile, ai],
  );
}
