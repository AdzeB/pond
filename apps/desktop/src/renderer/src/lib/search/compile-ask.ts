import type { QueryPlan } from "@pond/schema";
import type { Predicate, Query } from "@pond/schema/filters/types";
import { encode } from "gpt-tokenizer";
import {
  compileStageA,
  dedupePredicates,
  type NlFacets,
} from "@/lib/search/nl-query";

export interface AskPorts {
  resolveFacets?(
    residual: string,
    facets: NlFacets,
  ): Promise<{ predicates: Predicate[]; residual: string } | null>;
  compilePlan?(input: string, facets: NlFacets): Promise<QueryPlan | null>;
  countMatches(query: Query): number;
}

export interface CompileAskResult {
  plan: QueryPlan;
  residual: string;
}

const FACET_TOKEN_BUDGET = 1200;

function tokenLength(text: string): number {
  return encode(text).length;
}

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
  const types = take(facets.types, 20);
  const sources = take(facets.sources, 50);
  const tags = take(facets.tags, 120);
  const creators = take(facets.creators, 80);
  return { sources, types, tags, creators };
}

function mergeModelQuery(model: Query, deterministic: Predicate[]): Query {
  const hasGroups = model.rules.some((r) => "rules" in r);
  if (model.combinator !== "and" || hasGroups) return model;
  const merged = dedupePredicates([
    ...(model.rules as Predicate[]),
    ...deterministic,
  ]);
  return { combinator: "and", rules: merged };
}

function repairEmpty(
  query: Query,
  countMatches: (query: Query) => number,
): Query {
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

export async function compileAsk(
  input: string,
  facets: NlFacets,
  ports: AskPorts,
): Promise<CompileAskResult> {
  const stageA = compileStageA(input, facets);
  let rules: Predicate[] = [...(stageA.query.rules as Predicate[])];
  let residual = stageA.residual;

  const stageB =
    ports.resolveFacets && residual.trim()
      ? ports.resolveFacets(residual, facets).catch(() => null)
      : Promise.resolve(null);

  const compiled = ports.compilePlan
    ? ports.compilePlan(input, capFacets(facets)).catch(() => null)
    : Promise.resolve(null);

  const [b, modelPlan] = await Promise.all([stageB, compiled]);
  if (b) {
    rules = dedupePredicates([...rules, ...b.predicates]);
    residual = b.residual;
  }

  const query: Query = { combinator: "and", rules };
  if (modelPlan) {
    modelPlan.filter = mergeModelQuery(modelPlan.filter, rules);
    modelPlan.filter = repairEmpty(modelPlan.filter, ports.countMatches);
    return { plan: modelPlan, residual };
  }

  return { plan: { filter: repairEmpty(query, ports.countMatches) }, residual };
}
