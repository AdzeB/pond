import { z } from "zod";
import { QuerySchema } from "./filters/schema";
import { EMPTY_QUERY } from "./filters/types";

export const LocalApiErrorSchema = z.object({
  status: z.literal("error"),
  error: z.unknown(),
});

export const LocalApiJsonSchema = z.json();

export function localApiSuccessSchema<Schema extends z.ZodType>(
  schema: Schema,
) {
  return z.object({
    status: z.literal("success"),
    data: schema,
    meta: z.record(z.string(), z.unknown()).optional(),
  });
}

export const LocalApiAppInfoSchema = z.object({
  name: z.literal("pond"),
  version: z.string(),
  platform: z.string(),
  arch: z.string(),
});

export const LocalApiCursorSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  id: z.string(),
  libraryId: z.string(),
  revision: z.number(),
  sortSignature: z.string().optional(),
});

export const KeywordSearchScopeSchema = z.enum([
  "title",
  "description",
  "creator",
  "tags",
  "notes",
  "url",
  "folder",
  "folder-description",
  "extension",
  "annotation",
]);
export type KeywordSearchScope = z.infer<typeof KeywordSearchScopeSchema>;

export const LocalApiLibraryQueryRequestSchema = z.object({
  libraryId: z.string().optional(),
  query: QuerySchema.default(EMPTY_QUERY),
  keywords: z.string().max(4096).optional(),
  keywordScopes: z.array(KeywordSearchScopeSchema).min(1).optional(),
  scope: z
    .object({
      deletedOnly: z.boolean().optional(),
      source: z.string().optional(),
      untagged: z.boolean().optional(),
      folderIds: z.array(z.string()).optional(),
      uncategorized: z.boolean().optional(),
      tag: z.string().optional(),
      saveIds: z.array(z.string()).optional(),
      savedSince: z.number().int().nonnegative().optional(),
    })
    .optional(),
  randomSeed: z.string().max(128).optional(),
  orderFolderId: z.string().optional(),
  sortKey: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  cursor: LocalApiCursorSchema.nullish(),
});

export const LocalApiQueryPageSchema = z.object({
  ids: z.array(z.string()),
  total: z.number(),
  nextCursor: LocalApiCursorSchema.nullable(),
  libraryId: z.string(),
  revision: z.number(),
});

export const LocalApiSavesGetParamsSchema = z
  .object({
    limit: z.union([z.string(), z.number()]).optional().catch(undefined),
    offset: z.union([z.string(), z.number()]).optional().catch(undefined),
    includeDeleted: z
      .union([z.string(), z.boolean()])
      .optional()
      .catch(undefined),
    ids: z
      .union([z.array(z.coerce.string()), z.string()])
      .optional()
      .catch(undefined),
    source: z.string().optional().catch(undefined),
  })
  .catch({});

export const LocalApiSaveSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    url: z.string().url(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    author: z.string().nullable(),
    tags: z.array(z.string()),
    savedAt: z.union([z.string(), z.number()]),
  })
  .passthrough();

export const LocalApiLibrarySchema = z.object({
  path: z.string(),
  name: z.string(),
  active: z.boolean(),
  available: z.boolean(),
  lastOpened: z.number(),
  icon: z.string().nullable(),
  accent: z.string().nullable(),
});

export const LocalApiEnqueueResultSchema = z.object({
  id: z.string(),
  created: z.boolean(),
});

export const LocalApiSwitchResultSchema = z.object({
  ok: z.literal(true),
  path: z.string(),
});

export const LocalApiSwitchLibraryRequestSchema = z.object({
  path: z.string().trim().min(1),
});

export const LocalApiOperationSchema = z.object({
  name: z.string(),
  description: z.string(),
  access: z.enum(["read", "review"]),
  inputSchema: z.json(),
});

export const LocalApiOperationRequestSchema = z.object({
  operation: z.string().min(1),
  arguments: z.record(z.string(), z.json()).default({}),
});

export const LocalApiOperationPreviewSchema = z.object({
  token: z.string(),
  operation: z.string(),
  libraryId: z.string(),
  expiresAt: z.number(),
});

export const LocalApiOperationRunSchema = LocalApiOperationRequestSchema.extend(
  {
    token: z.string().optional(),
  },
);

export type LocalApiAppInfo = z.infer<typeof LocalApiAppInfoSchema>;
export type LocalApiCursor = z.infer<typeof LocalApiCursorSchema>;
export type LocalApiLibraryQueryRequest = z.infer<
  typeof LocalApiLibraryQueryRequestSchema
>;
export type LocalApiQueryPage = z.infer<typeof LocalApiQueryPageSchema>;
export type LocalApiSavesGetParams = z.input<
  typeof LocalApiSavesGetParamsSchema
>;
export type LocalApiSave = z.infer<typeof LocalApiSaveSchema>;
export type LocalApiLibrary = z.infer<typeof LocalApiLibrarySchema>;
