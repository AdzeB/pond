import type { QueryPlan } from "@pond/schema";
import { matches } from "@pond/schema/filters/match";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { encode } from "gpt-tokenizer";
import { useCallback, useMemo } from "react";
import { resolveFacets } from "@/lib/search/facet-resolver";
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

/** Deterministic resolver, then optional embedding facets and LLM compile, each stage degrading to the previous. */

interface NlCompileResult {
  plan: QueryPlan;
  /** Leftover words that didn't resolve to a predicate, for keyword search. */
  residual: string;
}

/** Caps the grounding facet section of the compile prompt so a huge library can't blow up prompt size and latency. */
const FACET_TOKEN_BUDGET = 1200;

function tokenLength(text: string): number {
  return encode(text).length;
}

/** Bounded by a token budget rather than a fixed count so the grounding section stays a predictable size; hard per-facet caps guard against pathological inputs. */
function capFacets(
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
  /** Allocate to the smallest, most decisive facets first, then the long tail. */
  const types = take(facets.types, 20);
  const sources = take(facets.sources, 50);
  const tags = take(facets.tags, 120);
  const creators = take(facets.creators, 80);
  return { sources, types, tags, creators };
}

function mergeModelQuery(model: Query, deterministic: Predicate[]): Query {
  const hasGroups = model.rules.some((r) => "rules" in r);
  /** Preserve nested/or queries verbatim; only merge into a flat AND. */
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
    /** Only emptiness matters; stop at the first match. */
    if (n > 0) break;
  }
  return n;
}

/** Relaxes an empty-matching query by dropping its last (most specific) predicate until something matches. */
function repairEmpty(query: Query): Query {
  if (query.rules.some((r) => "rules" in r)) return query;
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
      const stageA = compileStageA(input, facets);
      let rules: Predicate[] = [...(stageA.query.rules as Predicate[])];
      let residual = stageA.residual;

      const stageB =
        ai?.semanticSearch && residual.trim()
          ? resolveFacets(residual, facets).catch(() => null)
          : Promise.resolve(null);

      const compiled = ai?.nlCompiler
        ? window.pond
            .query("ai.compilePlan", {
              input,
              facets: capFacets(facets),
            })
            .then((res) => validatePlan((res as { plan: unknown }).plan))
            .catch(() => null)
        : Promise.resolve(null);

      const [b, modelPlan] = await Promise.all([stageB, compiled]);
      if (b) {
        rules = dedupePredicates([...rules, ...b.predicates]);
        residual = b.residual;
      }

      const query: Query = { combinator: "and", rules };
      if (modelPlan) {
        modelPlan.filter = mergeModelQuery(modelPlan.filter, rules);
        modelPlan.filter = repairEmpty(modelPlan.filter);
        return { plan: modelPlan, residual };
      }

      return { plan: { filter: repairEmpty(query) }, residual };
    },
    [facets, ai],
  );
}
