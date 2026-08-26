import { matches } from "@pond/schema/filters/match";
import type { Query } from "@pond/schema/filters/types";
import { useCallback, useMemo } from "react";
import { compileAsk } from "@/lib/search/compile-ask";
import { resolveFacets } from "@/lib/search/facet-resolver";
import { computeLiveFacets } from "@/lib/search/live-facets";
import type { NlFacets } from "@/lib/search/nl-query";
import { validatePlan } from "@/lib/search/nl-validate";
import { pool } from "@/stores/pool";
import { usePrefs } from "@/stores/prefs";
import { useSaves } from "./use-saves";

function countMatches(query: Query): number {
  let n = 0;
  for (const save of pool.snapshot()) {
    if (save.deletedAt) continue;
    if (matches(query, save)) n += 1;
    if (n > 0) break;
  }
  return n;
}

export function useNlFacets(): NlFacets {
  const saves = useSaves();
  return useMemo(() => computeLiveFacets(saves), [saves]);
}

export function useNlCompiler(): (
  input: string,
) => Promise<{ plan: { filter: Query }; residual: string }> {
  const facets = useNlFacets();
  const [ai] = usePrefs("ai");

  return useCallback(
    (input: string) =>
      compileAsk(input, facets, {
        resolveFacets: ai?.semanticSearch
          ? (residual, next) => resolveFacets(residual, next)
          : undefined,
        compilePlan: ai?.nlCompiler
          ? async (nextInput, nextFacets) => {
              const res = await window.pond.query("ai.compilePlan", {
                input: nextInput,
                facets: nextFacets,
              });
              return validatePlan((res as { plan: unknown }).plan);
            }
          : undefined,
        countMatches,
      }),
    [facets, ai],
  );
}
