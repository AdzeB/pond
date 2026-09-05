import { matches } from "@pond/schema/filters/match";
import type { Query } from "@pond/schema/filters/types";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import { pool } from "@/features/saves/state/pool";
import { compileAsk } from "@/features/search/lib/compile-ask";
import { resolveFacets } from "@/features/search/lib/facet-resolver";
import { computeLiveFacets } from "@/features/search/lib/live-facets";
import type { NlFacets } from "@/features/search/lib/nl-query";
import { RawPlanSchema, validatePlan } from "@/features/search/lib/nl-validate";
import { usePrefs } from "@/features/settings/state/prefs";
import { useSaves } from "../../saves/hooks/use-saves";

const ReplySchema = z.object({ plan: RawPlanSchema });

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
              return validatePlan(ReplySchema.parse(res).plan);
            }
          : undefined,
        countMatches,
      }),
    [facets, ai],
  );
}
