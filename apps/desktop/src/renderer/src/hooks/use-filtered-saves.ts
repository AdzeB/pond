import { matches } from "@pond/schema/filters/match";
import { isEmptyQuery, type Query } from "@pond/schema/filters/types";
import { useMemo } from "react";
import type { Save } from "@/lib/types";

export type SortKey =
  | "savedAt"
  | "createdAt"
  | "title"
  | "fileSize"
  | "fileCount"
  | "dimensions"
  | "creator"
  | "source"
  | "type";
export type SortDir = "asc" | "desc";

export const SORT_KEYS: readonly SortKey[] = [
  "savedAt",
  "createdAt",
  "title",
  "fileSize",
  "fileCount",
  "dimensions",
  "creator",
  "source",
  "type",
];

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

interface FilterOptions {
  sortKey?: SortKey;
  sortDir?: SortDir;
}

export function useFilteredSaves(
  saves: ReadonlyArray<Save>,
  query: Query | null,
  opts?: FilterOptions,
): ReadonlyArray<Save> {
  const sortKey = opts?.sortKey ?? "savedAt";
  const sortDir = opts?.sortDir ?? "desc";
  return useMemo(() => {
    const filtered =
      !query || isEmptyQuery(query)
        ? saves
        : saves.filter((s) => matches(query, s));
    if (sortKey === "savedAt" && sortDir === "desc") return filtered;
    return sortSaves(filtered, sortKey, sortDir);
  }, [saves, query, sortKey, sortDir]);
}

function sortSaves(
  saves: ReadonlyArray<Save>,
  key: SortKey,
  dir: SortDir,
): Save[] {
  const sign = dir === "asc" ? 1 : -1;
  const out = saves.slice();
  out.sort((a, b) => sign * cmp(a, b, key));
  return out;
}

function cmp(a: Save, b: Save, key: SortKey): number {
  switch (key) {
    case "savedAt":
      return savedAtMs(a) - savedAtMs(b);
    case "createdAt":
      return createdAtMs(a) - createdAtMs(b);
    case "title":
      return titleFor(a).localeCompare(titleFor(b));
    case "fileSize":
      return nullableNumber(sizeFor(a), sizeFor(b));
    case "fileCount":
      return a.files.length - b.files.length;
    case "dimensions":
      return nullableNumber(areaFor(a), areaFor(b));
    case "creator":
      return textFor(a.author).localeCompare(textFor(b.author));
    case "source":
      return textFor(a.source).localeCompare(textFor(b.source));
    case "type":
      return typeFor(a).localeCompare(typeFor(b));
  }
}

// Missing values sort last regardless of direction's sign convention.
function nullableNumber(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function savedAtMs(s: Save): number {
  const t = new Date(s.savedAt).getTime();
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

function createdAtMs(s: Save): number {
  const t = new Date(s.createdAt).getTime();
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

function titleFor(s: Save): string {
  return (s.title ?? s.url ?? "").toLowerCase();
}

function textFor(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function typeFor(s: Save): string {
  return (s.mediaType ?? s.files[0]?.kind ?? "").toLowerCase();
}

function sizeFor(s: Save): number | null {
  const cover = s.files[s.coverIndex ?? 0];
  return cover?.size ?? s.fileSize ?? null;
}

function areaFor(s: Save): number | null {
  const cover = s.files[s.coverIndex ?? 0];
  const w = cover?.width ?? s.width ?? null;
  const h = cover?.height ?? s.height ?? null;
  if (w == null || h == null) return null;
  return w * h;
}
