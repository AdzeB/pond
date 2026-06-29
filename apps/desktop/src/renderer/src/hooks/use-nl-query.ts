import { matches } from "@pond/schema/filters/match";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { useCallback, useMemo } from "react";
import { embedQuery, resolveFacets } from "@/lib/search/facet-resolver";
import { computeLiveFacets } from "@/lib/search/live-facets";
import {
  compileStageA,
  dedupePredicates,
  type NlFacets,
  type NlResult,
} from "@/lib/search/nl-query";
import { validateQuery } from "@/lib/search/nl-validate";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import { useSaves } from "./use-saves";

// The "find anything" orchestrator: runs the deterministic resolver (Stage A),
// the embedding facet resolver (Stage B), and the LLM compiler (Stage C) behind
// the validation gate (Stage D), then an agentic zero-result repair. Each stage
// degrades to the previous one, so it always returns something usable.

export interface NlCompileResult extends NlResult {
  // A query vector for semantic ranking of the residual, when available.
  queryVector: Float32Array | null;
}

// Keep the IPC payload bounded; the model only needs representative values.
function capFacets(facets: NlFacets): NlFacets {
  return {
    sources: facets.sources.slice(0, 50),
    types: facets.types.slice(0, 20),
    tags: facets.tags.slice(0, 120),
    creators: facets.creators.slice(0, 80),
  };
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

      // Stage C + D: LLM compiler, validated. Model output is authoritative but
      // merged with deterministic predicates for flat AND queries.
      if (ai?.nlCompiler) {
        try {
          const res = (await window.pond.query("ai.compileQuery", {
            input,
            facets: capFacets(facets),
          })) as { query: unknown };
          const validated = validateQuery(res.query);
          if (validated.rules.length > 0) {
            query = mergeModelQuery(validated, rules);
          }
        } catch {
          // fall back to deterministic/embedding result
        }
      }

      // Agentic repair: never hand back an empty result set if we can relax.
      query = repairEmpty(query);

      // Embed the residual for semantic ranking, if enabled.
      const queryVector =
        ai?.semanticSearch && residual.trim()
          ? await embedQuery(residual)
          : null;

      return {
        query,
        residual,
        queryVector,
        sort: stageA.sort,
        limit: stageA.limit,
      };
    },
    [facets, ai],
  );
}
