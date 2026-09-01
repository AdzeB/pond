import type { Save } from "@pond/schema/db";
import { z } from "zod";

export const INFO_FILE = "info.json";
export const SOURCE_FILE = "source.json";
export const INFO_SCHEMA = 3 as const;

export interface InfoFile {
  kind: string;
  path: string;
  sha256: string;
  size: number;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface InfoDoc {
  schema: typeof INFO_SCHEMA;
  id: string;
  source: string;
  sourceId: string;
  url: string;
  title: string | null;
  description: string | null;
  author: string | null;
  lang: string | null;
  siteName: string | null;
  notes: string | null;
  tags: string[];
  folderIds: string[];
  mediaType: string | null;
  coverIndex: number;
  width: number | null;
  height: number | null;
  publishedAt: string | null;
  savedAt: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  files: InfoFile[];
}

const nullableText = z.string().nullable().catch(null);

export const StoredInfoDocSchema = z.object({
  id: z.string().catch(""),
  source: z.string().catch(""),
  sourceId: z.string().catch(""),
  url: z.string().catch(""),
  title: nullableText,
  description: nullableText,
  author: nullableText,
  lang: nullableText,
  siteName: nullableText,
  notes: nullableText,
  tags: z.array(z.string()).catch([]),
  folderIds: z.array(z.string()).catch([]),
  mediaType: nullableText,
  coverIndex: z.number().int().nonnegative().catch(0),
  width: z.number().nullable().catch(null),
  height: z.number().nullable().catch(null),
  publishedAt: nullableText,
  savedAt: nullableText,
  createdAt: nullableText,
  deletedAt: nullableText,
  files: z
    .array(
      z.object({
        kind: z.string().catch("other"),
        path: z.string().catch(""),
        sha256: z.string().catch(""),
        size: z.number().catch(0),
        mimeType: z.string().optional().catch(undefined),
        width: z.number().optional().catch(undefined),
        height: z.number().optional().catch(undefined),
      }),
    )
    .catch([]),
});

export type StoredInfoDoc = z.infer<typeof StoredInfoDocSchema>;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function infoDocFromSave(
  save: Save,
  files: InfoFile[],
  folderIds: string[] = [],
): InfoDoc {
  return {
    schema: INFO_SCHEMA,
    id: save.id,
    source: save.source,
    sourceId: save.sourceId,
    url: save.url,
    title: save.title ?? null,
    description: save.description ?? null,
    author: save.author ?? null,
    lang: save.lang ?? null,
    siteName: save.siteName ?? null,
    notes: save.notes ?? null,
    tags: save.tags ?? [],
    folderIds: folderIds ?? [],
    mediaType: save.mediaType ?? null,
    coverIndex: save.coverIndex ?? 0,
    width: save.width ?? null,
    height: save.height ?? null,
    publishedAt: toIso(save.publishedAt),
    savedAt: toIso(save.savedAt),
    createdAt: toIso(save.createdAt),
    deletedAt: toIso(save.deletedAt),
    files,
  };
}

const EXPORTED_SAVE_FIELDS = [
  "url",
  "title",
  "description",
  "author",
  "lang",
  "siteName",
  "notes",
  "tags",
  "folderIds",
  "mediaType",
  "coverIndex",
  "width",
  "height",
  "publishedAt",
  "deletedAt",
] as const;

const EXPORTED_FIELD_SET = new Set<string>(EXPORTED_SAVE_FIELDS);

export function patchTouchesInfo(patch: Partial<Save>): boolean {
  return Object.keys(patch).some((key) => EXPORTED_FIELD_SET.has(key));
}

export function applyPatchToInfo(
  info: StoredInfoDoc,
  patch: Partial<Save>,
): InfoDoc {
  const next: InfoDoc = { schema: INFO_SCHEMA, ...info };
  if (patch.url !== undefined) next.url = patch.url;
  if (patch.title !== undefined) next.title = patch.title ?? null;
  if (patch.description !== undefined)
    next.description = patch.description ?? null;
  if (patch.author !== undefined) next.author = patch.author ?? null;
  if (patch.lang !== undefined) next.lang = patch.lang ?? null;
  if (patch.siteName !== undefined) next.siteName = patch.siteName ?? null;
  if (patch.notes !== undefined) next.notes = patch.notes ?? null;
  if (patch.tags !== undefined) next.tags = patch.tags ?? [];
  if (
    "folderIds" in patch &&
    Array.isArray((patch as { folderIds?: string[] }).folderIds)
  ) {
    next.folderIds = (patch as { folderIds: string[] }).folderIds;
  }
  if (patch.mediaType !== undefined) next.mediaType = patch.mediaType ?? null;
  if (patch.coverIndex !== undefined) next.coverIndex = patch.coverIndex ?? 0;
  if (patch.width !== undefined) next.width = patch.width ?? null;
  if (patch.height !== undefined) next.height = patch.height ?? null;
  if (patch.publishedAt !== undefined)
    next.publishedAt = toIso(patch.publishedAt);
  if (patch.deletedAt !== undefined) next.deletedAt = toIso(patch.deletedAt);
  return next;
}
