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
    files,
  };
}
