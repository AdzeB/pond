import type { QueryPlan } from "@pond/schema";
import {
  isPredicate,
  type Predicate,
  type Query,
} from "@pond/schema/filters/types";
import {
  compileStageA,
  dedupePredicates,
  type NlFacets,
} from "@/features/search/lib/nl-query";

export interface AskPorts {
  resolveFacets?(
    residual: string,
    facets: NlFacets,
  ): Promise<{ predicates: Predicate[]; residual: string } | null>;
  countMatches(query: Query): number;
}

export interface CompileAskResult {
  plan: QueryPlan;
  residual: string;
}

function repairEmpty(
  query: Query,
  countMatches: (query: Query) => number,
): Query {
  const predicates = query.rules.filter(isPredicate);
  if (predicates.length !== query.rules.length || predicates.length <= 1) {
    return query;
  }
  let current: Query = query;
  let rules = predicates;
  while (rules.length > 1 && countMatches(current) === 0) {
    rules = rules.slice(0, -1);
    current = { combinator: "and", rules };
  }
  return current;
}

export async function compileAsk(
  input: string,
  facets: NlFacets,
  ports: AskPorts,
): Promise<CompileAskResult> {
  const stageA = compileStageA(input, facets);
  let rules: Predicate[] = [...stageA.query.rules];
  let residual = stageA.residual;

  const resolved =
    ports.resolveFacets && residual.trim()
      ? await ports.resolveFacets(residual, facets).catch(() => null)
      : null;

  if (resolved) {
    rules = dedupePredicates([...rules, ...resolved.predicates]);
    residual = resolved.residual;
  }

  const query: Query = { combinator: "and", rules };
  return { plan: { filter: repairEmpty(query, ports.countMatches) }, residual };
}
