/** JSON Schema cannot represent QuerySchema's custom field and operator checks. */

import { FIELD_IDS } from "@pond/schema/filters/meta";
import {
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  EMPTY_QUERY,
  type Query,
} from "@pond/schema/filters/types";
import { z } from "zod";
import {
  type LibraryQueryRequest,
  LibraryQueryRequestSchema,
} from "../../../shared/library-query";

/** SAFETY: COMPARATORS_BY_TYPE declares at least one comparator. */
const operatorIds = [...new Set(Object.values(COMPARATORS_BY_TYPE).flat())] as [
  ComparatorId,
  ...ComparatorId[],
];

const predicate = z.object({
  id: z.string().optional(),
  field: z.enum(FIELD_IDS),
  operator: z.enum(operatorIds),
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

export const McpQuerySchema: z.ZodType<Query> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    combinator: z.enum(["and", "or"]),
    not: z.boolean().optional(),
    rules: z.array(z.union([predicate, McpQuerySchema])),
  }),
);

export const McpLibraryQueryRequestSchema = LibraryQueryRequestSchema.omit({
  query: true,
}).extend({
  query: McpQuerySchema.default(EMPTY_QUERY),
});

export function parseMcpLibraryQuery(input: unknown): LibraryQueryRequest {
  return LibraryQueryRequestSchema.parse(
    McpLibraryQueryRequestSchema.parse(input),
  );
}
