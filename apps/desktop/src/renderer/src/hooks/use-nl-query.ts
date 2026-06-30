import { modelContextLimit, type QueryPlan, type RankSpec } from "@pond/schema";
import { matches } from "@pond/schema/filters/match";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { encode } from "gpt-tokenizer";
import { useCallback, useMemo } from "react";
import { embedQuery, resolveFacets } from "@/lib/search/facet-resolver";
import { computeLiveFacets } from "@/lib/search/live-facets";
import {
  compileStageA,
  dedupePredicates,
  type NlFacets,
} from "@/lib/search/nl-query";
import { validatePlan } from "@/lib/search/nl-validate";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import { useSaves } from "./use-saves";

// The "find anything" orchestrator: runs the deterministic resolver (Stage A),
// the embedding facet resolver (Stage B), and the LLM compiler (Stage C) behind
// the validation gate (Stage D), then an agentic zero-result repair. Each stage
// degrades to the previous one, so it always returns something usable.

export interface NlCompileResult {
  // The executable query plan (filter + optional rank/group/limit/aggregate).
  // Today's deterministic path emits a one-step plan; capable providers emit a
  // richer one (see the LLM plan path below).
  plan: QueryPlan;
  // Leftover words that didn't resolve to a predicate, for keyword ranking.
  residual: string;
  // A query vector for semantic ranking of the residual, when available.
  queryVector: Float32Array | null;
}

// Token budget for the grounding facet lists fed to the model. The compile
// prompt enumerates the library's real sources/types/tags/creators so the model
// picks valid values; this caps that section so a huge library can't blow up the
// prompt (and cost/latency). Most important facets are allocated first.
const FACET_TOKEN_BUDGET = 1200;

function tokenLength(text: string): number {
  return encode(text).length;
}

// Size the grounding section to the model's context window when we know it:
// ~10% of context, clamped so a tiny local model isn't swamped and a huge
// frontier window doesn't bloat the prompt. Falls back to the fixed budget.
export function facetBudgetFor(context: number | undefined): number {
  if (!context) return FACET_TOKEN_BUDGET;
  return Math.max(400, Math.min(4000, Math.round(context * 0.1)));
}

// Keep the IPC payload bounded by an actual token budget (not a fixed count), so
// the grounding section stays within a predictable size regardless of value
// lengths. Hard per-facet caps still guard against pathological inputs.
export function capFacets(
  facets: NlFacets,
  budget: number = FACET_TOKEN_BUDGET,
): NlFacets {
  const take = (values: string[], hardCap: number): string[] => {
    const out: string[] = [];
    for (const value of values.slice(0, hardCap)) {
      const cost = tokenLength(`${value}, `);
      if (cost > budget) break;
      budget -= cost;
      out.push(value);
    }
    return out;
  };
  // Allocate to the smallest, most decisive facets first (types, sources), then
  // the long tail (tags, creators).
  const types = take(facets.types, 20);
  const sources = take(facets.sources, 50);
  const tags = take(facets.tags, 120);
  const creators = take(facets.creators, 80);
  return { sources, types, tags, creators };
}

function mergeModelQuery(model: Query, deterministic: Predicate[]): Query {
  const hasGroups = model.rules.some((r) => "rules" in r);
  // Preserve nested/or queries verbatim; only merge into a flat AND.
  if (model.combinator !== "and" || hasGroups) return model;
  const merged = dedupePredicates([
    ...(model.rules as Predicate[]),
    ...deterministic,
  ]);
  return { combinator: "and", rules: merged };
}

function countMatches(query: Query): number {
  let n = 0;
  for (const save of pool.snapshot()) {
    if (save.deletedAt) continue;
    if (matches(query, save)) n += 1;
    if (n > 0) break; // we only care whether it's empty
  }
  return n;
}

// If a compiled query matches nothing, relax it by dropping its last (most
// specific) predicate until something matches or it's empty.
function repairEmpty(query: Query): Query {
  if (query.rules.some((r) => "rules" in r)) return query; // skip nested
  const rules = [...(query.rules as Predicate[])];
  if (rules.length <= 1) return query;
  let current: Query = query;
  while (
    (current.rules as Predicate[]).length > 1 &&
    countMatches(current) === 0
  ) {
    const next = (current.rules as Predicate[]).slice(0, -1);
    current = { combinator: "and", rules: next };
  }
  return current;
}

export function useNlFacets(): NlFacets {
  const saves = useSaves();
  return useMemo(() => computeLiveFacets(saves), [saves]);
}

export function useNlCompiler(): (input: string) => Promise<NlCompileResult> {
  const facets = useNlFacets();
  const [ai] = usePrefs("ai");

  return useCallback(
    async (input: string): Promise<NlCompileResult> => {
      // Stage A: deterministic.
      const stageA = compileStageA(input, facets);
      let rules: Predicate[] = [...(stageA.query.rules as Predicate[])];
      let residual = stageA.residual;

      // Stage B: embedding facet resolution over the residual.
      if (ai?.semanticSearch && residual.trim()) {
        try {
          const b = await resolveFacets(residual, facets);
          rules = dedupePredicates([...rules, ...b.predicates]);
          residual = b.residual;
        } catch {
          // keep deterministic result
        }
      }

      let query: Query = { combinator: "and", rules };
      let modelPlan: QueryPlan | null = null;

      // Stage C + D: LLM compiler, validated. Every provider compiles to a
      // QueryPlan (filter + optional group/rank/aggregate) via ai.compilePlan;
      // the bundled model returns a filter-only plan. Deterministic predicates
      // merge into the (flat AND) filter. validatePlan clamps untrusted output.
      if (ai?.nlCompiler) {
        try {
          const budget = facetBudgetFor(
            modelContextLimit(ai.provider ?? "bundled", ai.modelId),
          );
          const res = (await window.pond.query("ai.compilePlan", {
            input,
            facets: capFacets(facets, budget),
          })) as { plan: unknown };
          const validated = validatePlan(res.plan);
          validated.filter = mergeModelQuery(validated.filter, rules);
          modelPlan = validated;
        } catch {
          // fall back to deterministic/embedding result
        }
      }

      // Embed the residual for semantic ranking, if enabled.
      const queryVector =
        ai?.semanticSearch && residual.trim()
          ? await embedQuery(residual)
          : null;

      // Stage A sort/limit fold into the plan as a fallback ordering/cap.
      const stageRank: RankSpec | undefined = stageA.sort
        ? { kind: "field", field: stageA.sort.key, dir: stageA.sort.dir }
        : undefined;

      let plan: QueryPlan;
      if (modelPlan) {
        // Backfill ordering/limit the model omitted from the deterministic pass.
        if (!modelPlan.rank && stageRank) modelPlan.rank = stageRank;
        if (modelPlan.limit == null && stageA.limit != null) {
          modelPlan.limit = stageA.limit;
        }
        // Relax empty filters so a real ask never reads as "no matches" — but
        // leave aggregate ("how many") filters exact so the count stays honest.
        if (!modelPlan.aggregate) {
          modelPlan.filter = repairEmpty(modelPlan.filter);
        }
        plan = modelPlan;
      } else {
        query = repairEmpty(query);
        plan = {
          filter: query,
          ...(stageRank ? { rank: stageRank } : {}),
          ...(stageA.limit != null ? { limit: stageA.limit } : {}),
        };
      }

      return { plan, residual, queryVector };
    },
    [facets, ai],
  );
}
