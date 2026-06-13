import type { Save } from "@pond/schema/db";

// A saved item is one `items/<id>.info/` folder. The clean, human-facing
// content lives in `info.json`; the verbose raw capture payload lives in
// `source.json`. Pipeline machinery (tasks, capture reports, ingest
// status) stays in SQLite and never touches disk. `metadata.json` is the
// legacy name we still read for back-compat and migrate away from.
export const INFO_FILE = "info.json";
export const SOURCE_FILE = "source.json";
export const LEGACY_METADATA_FILE = "metadata.json";
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

export function toIso(
  value: Date | string | number | null | undefined,
): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    return Number.isFinite(value) ? new Date(value).toISOString() : null;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : value;
  }
  return null;
}

export function infoDocFromSave(save: Save, files: InfoFile[]): InfoDoc {
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

// The Save columns that surface in info.json. DB-only columns (phash,
// videoNotes, dominantColors, status, ingest timestamps, fileSize, mediaUrl,
// rawJson) are excluded by construction, so they never leak to disk.
// `deletedAt` is intentionally included: trash is an in-place flag, so the
// item folder stays in `items/` and the deleted state is recorded here so
// it survives an index rebuild. This list is the single source of truth for
// the export whitelist; `infoDocFromSave` and `applyPatchToInfo` both
// project exactly these.
const EXPORTED_SAVE_FIELDS = [
  "url",
  "title",
  "description",
  "author",
  "lang",
  "siteName",
  "notes",
  "tags",
  "mediaType",
  "coverIndex",
  "width",
  "height",
  "publishedAt",
  "deletedAt",
] as const;

const EXPORTED_FIELD_SET = new Set<string>(EXPORTED_SAVE_FIELDS);

export function patchTouchesInfo(patch: object): boolean {
  return Object.keys(patch).some((key) => EXPORTED_FIELD_SET.has(key));
}

// Merge a Save patch onto an existing on-disk InfoDoc, honoring the export
// whitelist. Used by the disk-edit path where the full DB row is not in hand;
// `infoDocFromSave` is the equivalent projection from a full row.
export function applyPatchToInfo(info: InfoDoc, patch: Partial<Save>): InfoDoc {
  const next: InfoDoc = { ...info };
  if (patch.url !== undefined) next.url = patch.url;
  if (patch.title !== undefined) next.title = patch.title ?? null;
  if (patch.description !== undefined)
    next.description = patch.description ?? null;
  if (patch.author !== undefined) next.author = patch.author ?? null;
  if (patch.lang !== undefined) next.lang = patch.lang ?? null;
  if (patch.siteName !== undefined) next.siteName = patch.siteName ?? null;
  if (patch.notes !== undefined) next.notes = patch.notes ?? null;
  if (patch.tags !== undefined) next.tags = patch.tags ?? [];
  if (patch.mediaType !== undefined) next.mediaType = patch.mediaType ?? null;
  if (patch.coverIndex !== undefined) next.coverIndex = patch.coverIndex ?? 0;
  if (patch.width !== undefined) next.width = patch.width ?? null;
  if (patch.height !== undefined) next.height = patch.height ?? null;
  if (patch.publishedAt !== undefined)
    next.publishedAt = toIso(patch.publishedAt);
  if (patch.deletedAt !== undefined) next.deletedAt = toIso(patch.deletedAt);
  return next;
}
