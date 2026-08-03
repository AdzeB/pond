import {
  modelContextLimit,
  modelSupportsAgent,
  type QueryPlan,
} from "@pond/schema";
import { matches } from "@pond/schema/filters/match";
import { FIELD_META } from "@pond/schema/filters/meta";
import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useCallback } from "react";
import { embedQueryImage, rankByClip } from "@/lib/enrichment/clip-query";
import { runAgent } from "@/lib/search/agent";
import { embedQuery } from "@/lib/search/facet-resolver";
import { describePredicate } from "@/lib/search/fields";
import { flattenPredicates } from "@/lib/search/nl-query";
import { executePlan } from "@/lib/search/plan-exec";
import type { Save } from "@/lib/types";
import { recordAsk } from "@/stores/ask-history";
import {
  type AskQueryImage,
  type AskSegment,
  type AskSuggestion,
  askStore,
  commitAskResult,
  setAskAnswer,
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
import {
  capFacets,
  facetBudgetFor,
  useNlCompiler,
  useNlFacets,
} from "./use-nl-query";

/** Bounded to keep the summarizer prompt small and the round-trip quick. */
const SUMMARY_TOP_K = 12;

/** Fired after the result publishes so the grid never waits on it; failures leave the summary empty and the dock falls back to the count line. */
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

/** Blending question and anchor vectors keeps a question about referenced saves grounded in their meaning. */
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

const SUGGESTION_CAP = 4;

/** Offers to drop each predicate whose removal surfaces results; single-predicate queries relax to the whole library, so they get no suggestions. */
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

export function runAskSuggestion(suggestion: AskSuggestion): void {
  const ids = pool
    .snapshot()
    .filter((s) => !s.deletedAt && matches(suggestion.query, s))
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
    .map((s) => s.id);
  commitAskResult(suggestion.label, ids, suggestion.query);
}

interface AskOptions {
  refine?: boolean;
  image?: { blob: Blob; meta: AskQueryImage };
  /** The composed message as typed, so the transcript renders it back exactly. */
  segments?: ReadonlyArray<AskSegment>;
}

/** Compiled constraints filter, a query embedding (text, anchor, or CLIP image) ranks by meaning, and a refining turn searches within the previous turn's set. */
export function useAsk(): (
  question: string,
  anchorIds?: readonly string[],
  opts?: AskOptions,
) => Promise<void> {
  const compile = useNlCompiler();
  const facets = useNlFacets();
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

      /** Anchor-only runs ("@save" with no question) read as "find similar". */
      const label =
        question || (image ? "Similar to this image" : "Similar items");

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

        /** Image queries rank by CLIP similarity and skip the NL compile entirely. */
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

        /** Agent mode handles open-ended asks the single-shot compile can't; any failure falls through to the deterministic path. */
        const agentOn =
          question.length > 0 &&
          (ai?.agent ?? false) &&
          (ai?.nlCompiler ?? false) &&
          modelSupportsAgent(ai?.provider ?? "bundled", ai?.modelId);
        if (agentOn) {
          try {
            setAskStage(nonce, "planning");
            const outcome = await runAgent({
              question,
              pool: basePool,
              facets: capFacets(
                facets,
                facetBudgetFor(
                  modelContextLimit(ai?.provider ?? "bundled", ai?.modelId),
                ),
              ),
              maxSteps: ai?.agentMaxSteps ?? 5,
              embed: async (text) => {
                try {
                  return ai?.semanticSearch ? await embedQuery(text) : null;
                } catch {
                  return null;
                }
              },
              onStage: (stage) => setAskStage(nonce, stage),
            });
            let ordered: Save[] = outcome.ids
              .map((id) => pool.get(id))
              .filter((s): s is Save => s != null);
            ordered = pinAnchors(ordered, anchorIds);
            if (outcome.answer) setAskAnswer(nonce, outcome.answer);
            recordAsk(label);
            const suggestions =
              ordered.length === 0 && !outcome.answer
                ? buildSuggestions(outcome.query, basePool)
                : [];
            setAskResult(
              nonce,
              label,
              ordered.map((s) => s.id),
              outcome.query,
              suggestions,
            );
            if (ordered.length > 0 && ai?.nlCompiler) {
              void runAskSummary(nonce, label, ordered);
            }
            return;
          } catch {
            /** Fall through to the deterministic single-shot path. */
          }
        }

        const compiled = question ? await compile(question) : null;
        const plan: QueryPlan = compiled?.plan ?? { filter: EMPTY_QUERY };
        const query = plan.filter;
        const residual = compiled?.residual ?? "";
        const queryVector = compiled?.queryVector ?? null;

        setAskStage(nonce, "searching");
        const anchorVector = meanAnchorVector(anchorIds);
        const rankVector = blendVectors(queryVector, anchorVector);

        setAskStage(nonce, "ranking");
        const result = await executePlan(plan, {
          pool: basePool,
          rankVector,
          residualText: residual.trim(),
          question,
        });
        let ordered: Save[] = result.ids
          .map((id) => pool.get(id))
          .filter((s): s is Save => s != null);

        ordered = pinAnchors(ordered, anchorIds);

        /** "top N" caps after ordering and pinning so pinned anchors survive the cap. */
        if (plan.limit != null && plan.limit > 0) {
          ordered = ordered.slice(0, plan.limit);
        }

        /** Empty results offer one-tap relaxations against whatever pool this turn searched. */
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

        /** Summaries need the configured LLM (nlCompiler toggle); fire-and-forget so the run never blocks. */
        if (ordered.length > 0 && ai?.nlCompiler) {
          void runAskSummary(nonce, label, ordered);
        }
      } catch {
        setAskError(nonce, label);
      }
    },
    [compile, ai, facets],
  );
}
