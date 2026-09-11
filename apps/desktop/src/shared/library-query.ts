import type { Query } from "@pond/schema/filters";

export interface LibraryQueryRequest {
  libraryId?: string;
  query: Query;
  keywords?: string;
  scope?: {
    deletedOnly?: boolean;
    source?: string;
    untagged?: boolean;
    folderIds?: string[];
    uncategorized?: boolean;
    tag?: string;
    saveIds?: string[];
  };
  randomSeed?: string;
  orderFolderId?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
  cursor?: {
    value: string | number | null;
    id: string;
    libraryId: string;
    revision: number;
    sortSignature?: string;
  } | null;
}

export interface LibraryQueryPage {
  ids: string[];
  total: number;
  nextCursor: LibraryQueryRequest["cursor"];
  libraryId: string;
  revision: number;
}

import { FIELD_META } from "@pond/schema/filters/meta";
import {
  COMPARATORS_BY_TYPE,
  type ComparatorId,
  EMPTY_QUERY,
  type FieldId,
  type Predicate,
} from "@pond/schema/filters/types";
import { z } from "zod";

const PredicateSchema: z.ZodType<Predicate> = z.object({
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
export const LibraryFilterSchema: z.ZodType<Query> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    combinator: z.enum(["and", "or"]),
    not: z.boolean().optional(),
    rules: z.array(z.union([PredicateSchema, LibraryFilterSchema])),
  }),
);
export const LibraryQueryRequestSchema = z.object({
  libraryId: z.string().optional(),
  query: LibraryFilterSchema.default(EMPTY_QUERY),
  keywords: z.string().max(4096).optional(),
  scope: z
    .object({
      deletedOnly: z.boolean().optional(),
      source: z.string().optional(),
      untagged: z.boolean().optional(),
      folderIds: z.array(z.string()).optional(),
      uncategorized: z.boolean().optional(),
      tag: z.string().optional(),
      saveIds: z.array(z.string()).optional(),
    })
    .optional(),
  randomSeed: z.string().max(128).optional(),
  orderFolderId: z.string().optional(),
  sortKey: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  cursor: z
    .object({
      value: z.union([z.string(), z.number(), z.null()]),
      id: z.string(),
      libraryId: z.string(),
      revision: z.number(),
      sortSignature: z.string().optional(),
    })
    .nullish(),
});
