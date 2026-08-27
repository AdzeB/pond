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

/** 2.4 MB of BPE tables, only reachable from the model path: keep it off the startup graph. */
let encoderPromise: Promise<(text: string) => number[]> | null = null;

function loadEncoder(): Promise<(text: string) => number[]> {
  encoderPromise ??= import("gpt-tokenizer").then((m) => m.encode);
  return encoderPromise;
}

async function capFacets(
  facets: NlFacets,
  budget: number = FACET_TOKEN_BUDGET,
): Promise<NlFacets> {
  const encode = await loadEncoder();
  const take = (values: string[], hardCap: number): string[] => {
    const out: string[] = [];
    for (const value of values.slice(0, hardCap)) {
      const cost = encode(`${value}, `).length;
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
  const predicates = model.rules.filter(isPredicate);
  if (model.combinator !== "and" || predicates.length !== model.rules.length) {
    return model;
  }
  return {
    combinator: "and",
    rules: dedupePredicates([...predicates, ...deterministic]),
  };
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

  const stageB =
    ports.resolveFacets && residual.trim()
      ? ports.resolveFacets(residual, facets).catch(() => null)
      : Promise.resolve(null);

  const compilePlan = ports.compilePlan;
  const compiled = compilePlan
    ? capFacets(facets)
        .then((capped) => compilePlan(input, capped))
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
    modelPlan.filter = repairEmpty(modelPlan.filter, ports.countMatches);
    return { plan: modelPlan, residual };
  }

  return { plan: { filter: repairEmpty(query, ports.countMatches) }, residual };
}
