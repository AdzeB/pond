import { z } from "zod";
import { type CompileFacets, compilePlan } from "../../core/ai";
import { type QueryHandlerMap, query, StringParam } from "./params";

const facetList = (cap: number) =>
  z
    .array(z.string().nullable().catch(null))
    .catch([])
    .transform((names) => names.filter((name) => name !== null).slice(0, cap));

const FacetsSchema: z.ZodType<CompileFacets, unknown> = z
  .object({
    sources: facetList(50),
    types: facetList(20),
    tags: facetList(120),
    creators: facetList(80),
  })
  .catch({ sources: [], types: [], tags: [], creators: [] });

export const aiQueries = {
  "ai.compilePlan": query(
    z.object({
      input: StringParam,
      facets: FacetsSchema,
    }),
    async (params) => {
      const input = params.input.slice(0, 500);
      if (!input.trim()) return { plan: null };
      const plan = await compilePlan(input, { facets: params.facets });
      return { plan };
    },
  ),
} satisfies QueryHandlerMap;
