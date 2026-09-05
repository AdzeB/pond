import { FIELD_META } from "@pond/schema/filters/meta";
import { COMPARATORS_BY_TYPE, type Query } from "@pond/schema/filters/types";
import { z } from "zod";

const fields = new Set(Object.keys(FIELD_META));
const comparators = new Set<string>(Object.values(COMPARATORS_BY_TYPE).flat());
const predicate = z.looseObject({
  field: z.string().refine((id) => fields.has(id)),
  operator: z.string().refine((id) => comparators.has(id)),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string(), z.number()])),
    z.object({ hex: z.string(), tolerance: z.number() }),
  ]),
  negate: z.boolean().optional(),
});
const group: z.ZodType = z.looseObject({
  combinator: z.enum(["and", "or"]),
  rules: z.array(z.union([predicate, z.lazy(() => group)])),
});

export const FilterQuery = z.custom<Query>(
  (value) => group.safeParse(value).success,
);
