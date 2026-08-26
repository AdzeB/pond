import { type CompileFacets, compilePlan } from "../../core/ai";
import type { QueryHandlerMap } from "../helpers";

function asStringArray(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").slice(0, cap);
}

function asFacets(raw: unknown): CompileFacets {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    sources: asStringArray(obj.sources, 50),
    types: asStringArray(obj.types, 20),
    tags: asStringArray(obj.tags, 120),
    creators: asStringArray(obj.creators, 80),
  };
}

export const aiQueries: QueryHandlerMap = {
  async "ai.compilePlan"(params) {
    const input = String(params.input ?? "").slice(0, 500);
    if (!input.trim()) return { plan: null };
    const facets = asFacets(params.facets);
    const plan = await compilePlan(input, { facets });
    return { plan };
  },
};
