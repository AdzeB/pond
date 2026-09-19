import { z } from "zod";
import { FIELD_META } from "./meta";
import {
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  type FieldId,
  type Predicate,
  type Query,
} from "./types";

export const PredicateSchema: z.ZodType<Predicate> = z.object({
  id: z.string().optional(),
  field: z.custom<FieldId>(
    (value) => z.enum(Object.keys(FIELD_META)).safeParse(value).success,
  ),
  operator: z.custom<ComparatorId>(
    (value) =>
      z.enum(Object.values(COMPARATORS_BY_TYPE).flat()).safeParse(value)
        .success,
  ),
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

export const QuerySchema: z.ZodType<Query> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    combinator: z.enum(["and", "or"]),
    not: z.boolean().optional(),
    rules: z.array(z.union([PredicateSchema, QuerySchema])),
  }),
);
