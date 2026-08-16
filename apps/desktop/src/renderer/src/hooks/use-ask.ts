import {
  modelContextLimit,
  modelSupportsAgent,
  type QueryPlan,
} from "@pond/schema";
import { matches } from "@pond/schema/filters/match";
import { FIELD_META } from "@pond/schema/filters/meta";
import { EMPTY_QUERY, type Query } from "@pond/schema/filters/types";
import { useCallback } from "react";
import { runAgent } from "@/lib/search/agent";
import { embedQuery } from "@/lib/search/facet-resolver";
import { describePredicate } from "@/lib/search/fields";
import { flattenPredicates } from "@/lib/search/nl-query";
import { executePlan } from "@/lib/search/plan-exec";
import type { Save } from "@/lib/types";
import {
  type AskSuggestion,
  commitAskResult,
  setAskError,
  setAskResult,
  setAskStage,
  startAskRun,
} from "@/stores/ask-store";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import {
  capFacets,
  facetBudgetFor,
  useNlCompiler,
  useNlFacets,
} from "./use-nl-query";

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

/** Compiled constraints filter; a query embedding ranks by meaning when semantic search is on. */
export function useNlSearch(): (question: string) => Promise<void> {
  const compile = useNlCompiler();
  const facets = useNlFacets();
  const [ai] = usePrefs("ai");

  return useCallback(
    async (raw: string): Promise<void> => {
      const question = raw.trim();
      if (!question) return;

      const nonce = startAskRun(question);
      try {
        const live = pool.snapshot().filter((s) => !s.deletedAt);

        /** Agent mode handles open-ended asks the single-shot compile can't; any failure falls through to the deterministic path. */
        const agentOn =
          (ai?.agent ?? false) &&
          (ai?.nlCompiler ?? false) &&
          modelSupportsAgent(ai?.provider ?? "bundled", ai?.modelId);
        if (agentOn) {
          try {
            setAskStage(nonce, "planning");
            const outcome = await runAgent({
              question,
              pool: live,
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
            const ordered: Save[] = outcome.ids
              .map((id) => pool.get(id))
              .filter((s): s is Save => s != null);
            const suggestions =
              ordered.length === 0 ? buildSuggestions(outcome.query, live) : [];
            setAskResult(
              nonce,
              question,
              ordered.map((s) => s.id),
              outcome.query,
              suggestions,
            );
            return;
          } catch {
            /** Fall through to the deterministic single-shot path. */
          }
        }

        const compiled = await compile(question);
        const plan: QueryPlan = compiled?.plan ?? { filter: EMPTY_QUERY };
        const query = plan.filter;
        const residual = compiled?.residual ?? "";
        const queryVector = compiled?.queryVector ?? null;

        setAskStage(nonce, "searching");
        setAskStage(nonce, "ranking");
        const result = await executePlan(plan, {
          pool: live,
          rankVector: queryVector,
          residualText: residual.trim(),
          question,
        });
        let ordered: Save[] = result.ids
          .map((id) => pool.get(id))
          .filter((s): s is Save => s != null);

        if (plan.limit != null && plan.limit > 0) {
          ordered = ordered.slice(0, plan.limit);
        }

        const suggestions =
          ordered.length === 0 ? buildSuggestions(query, live) : [];

        setAskResult(
          nonce,
          question,
          ordered.map((s) => s.id),
          query,
          suggestions,
        );
      } catch {
        setAskError(nonce, question);
      }
    },
    [compile, ai, facets],
  );
}
