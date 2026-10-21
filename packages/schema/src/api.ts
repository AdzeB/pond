import { z } from "zod";
import { QuerySchema } from "./filters/schema";
import { EMPTY_QUERY } from "./filters/types";

/** Bumped on every change to the HTTP contract: minor for additions, major for breaks. */
export const API_VERSION = "2.1.0";

export const API_ERROR_CODES = [
  "invalid_json",
  "invalid_request",
  "unauthorized",
  "rate_limited",
  "not_found",
  "save_not_found",
  "no_thumbnail",
  "operation_not_found",
  "operation_failed",
  "unsupported_url",
  "stale_cursor",
  "library_mismatch",
  "stale_preview",
  "library_unavailable",
  "internal",
] as const;
export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

/** `code` parses as any string so clients built against this version still read codes added later. */
export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});

/** `error` stays loose so clients can still read the bare strings Pond sent before 2.1. */
export const ApiErrorSchema = z.object({
  status: z.literal("error"),
  error: z.unknown(),
});

export const ApiJsonSchema = z.json();

export function apiSuccessSchema<Schema extends z.ZodType>(
  schema: Schema,
) {
  return z.object({
    status: z.literal("success"),
    data: schema,
    meta: z.record(z.string(), z.unknown()).optional(),
  });
}

export const ApiAppInfoSchema = z.object({
  name: z.literal("pond"),
  version: z.string(),
  platform: z.string(),
  arch: z.string(),
  /** Absent before 2.1. */
  apiVersion: z.string().optional(),
  /** Only sent to loopback callers, since the path can reveal the account name. */
  mcp: z.object({ command: z.string(), args: z.array(z.string()) }).optional(),
});

export const ApiCursorSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  id: z.string(),
  /** Pin position of the last row. Absent when it isn't pinned. */
  rank: z.number().int().nonnegative().optional(),
  libraryId: z.string(),
  /** Ignored. Cursors are keyset positions, so writes between pages do not invalidate them. */
  revision: z.number().optional(),
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

export const ApiLibraryQueryRequestSchema = z.object({
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
  cursor: ApiCursorSchema.nullish(),
});

export const ApiQueryPageSchema = z.object({
  ids: z.array(z.string()),
  total: z.number(),
  nextCursor: ApiCursorSchema.nullable(),
  libraryId: z.string(),
  revision: z.number(),
});

export const ApiSavesGetParamsSchema = z
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

export const ApiSaveSchema = z
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

export const ApiLibrarySchema = z.object({
  path: z.string(),
  name: z.string(),
  active: z.boolean(),
  available: z.boolean(),
  lastOpened: z.number(),
  icon: z.string().nullable(),
  accent: z.string().nullable(),
});

export const ApiEnqueueResultSchema = z.object({
  id: z.string(),
  created: z.boolean(),
});

export const ApiSwitchResultSchema = z.object({
  ok: z.literal(true),
  path: z.string(),
});

export const ApiSwitchLibraryRequestSchema = z.object({
  path: z.string().trim().min(1),
});

export const ApiOperationSchema = z.object({
  name: z.string(),
  description: z.string(),
  access: z.enum(["read", "review"]),
  inputSchema: z.json(),
});

export const ApiOperationRequestSchema = z.object({
  operation: z.string().min(1),
  arguments: z.record(z.string(), z.json()).default({}),
});

export const ApiOperationPreviewSchema = z.object({
  token: z.string(),
  operation: z.string(),
  libraryId: z.string(),
  expiresAt: z.number(),
});

export const ApiOperationRunSchema = ApiOperationRequestSchema.extend(
  {
    token: z.string().optional(),
  },
);

export type ApiAppInfo = z.infer<typeof ApiAppInfoSchema>;
export type ApiCursor = z.infer<typeof ApiCursorSchema>;
export type ApiLibraryQueryRequest = z.infer<
  typeof ApiLibraryQueryRequestSchema
>;
export type ApiQueryPage = z.infer<typeof ApiQueryPageSchema>;
export type ApiSavesGetParams = z.input<
  typeof ApiSavesGetParamsSchema
>;
export type ApiSave = z.infer<typeof ApiSaveSchema>;
export type ApiLibrary = z.infer<typeof ApiLibrarySchema>;
