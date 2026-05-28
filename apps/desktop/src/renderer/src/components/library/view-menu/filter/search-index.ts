import type { SaveLike } from "@pond/schema/filters/match";
import { matches } from "@pond/schema/filters/match";
import { FIELD_IDS, FIELD_META } from "@pond/schema/filters/meta";
import type {
  ComparatorId,
  FieldId,
  Predicate,
  Query,
} from "@pond/schema/filters/types";
import {
  Calendar,
  File as FileIcon,
  Link as LinkIcon,
  Pencil,
  Ruler,
  Scale,
  Shapes,
  Tag,
  Timer,
  Upload,
  User,
} from "lucide-react";
import { type ComponentType, useMemo, useRef } from "react";
import { DATE_PRESETS } from "./date-presets";
import { predicateKey } from "./score";

type IconType = ComponentType<{
  width?: string | number;
  height?: string | number;
}>;

export const FIELD_ICONS: Record<FieldId, IconType> = {
  tags: Tag,
  source: LinkIcon,
  type: FileIcon,
  shape: Shapes,
  size: Scale,
  duration: Timer,
  dimensions: Ruler,
  creator: User,
  url: LinkIcon,
  note: Pencil,
  savedAt: Upload,
  publishedAt: Calendar,
  modifiedAt: Calendar,
};

export type FieldGroupId = "content" | "media" | "people" | "time";

export interface FieldGroup {
  id: FieldGroupId;
  label: string;
  display?: "submenu";
  icon?: IconType;
}

export const FIELD_GROUPS: readonly FieldGroup[] = [
  { id: "content", label: "Content" },
  { id: "media", label: "Media" },
  { id: "people", label: "People" },
  { id: "time", label: "Dates", icon: Calendar },
];

export function fieldsByGroup(): Record<FieldGroupId, FieldId[]> {
  const out: Record<FieldGroupId, FieldId[]> = {
    content: [],
    media: [],
    people: [],
    time: [],
  };
  for (const id of FIELD_IDS) {
    out[FIELD_META[id].group].push(id);
  }
  return out;
}

export const COMPARATOR_LABELS: Record<ComparatorId, string> = {
  eq: "is",
  neq: "is not",
  in: "is any of",
  nin: "is none of",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  between: "is between",
  some: "include any",
  every: "include all",
  none: "exclude all",
  exists: "is set",
};

const DATE_FIELDS: FieldId[] = ["savedAt", "publishedAt", "modifiedAt"];

export type SearchEntry =
  | {
      kind: "field";
      field: FieldId;
      label: string;
      breadcrumb: string;
    }
  | {
      kind: "group";
      group: FieldGroup;
      label: string;
      breadcrumb: string;
    }
  | {
      kind: "field-in-group";
      field: FieldId;
      group: FieldGroup;
      label: string;
      breadcrumb: string;
    }
  | {
      kind: "value";
      predicate: Predicate;
      label: string;
      breadcrumb: string;
      swatchHex?: string;
    };

const TAG_CAP = 50;
const CREATOR_CAP = 50;
const HOST_CAP = 50;

export const RESULT_CAP = 50;

export function buildSearchIndex(saves: readonly SaveLike[]): SearchEntry[] {
  const groups = fieldsByGroup();
  const out: SearchEntry[] = [];
  for (const group of FIELD_GROUPS) {
    for (const field of groups[group.id]) {
      out.push({
        kind: "field",
        field,
        label: FIELD_META[field].label,
        breadcrumb: "",
      });
    }
  }
  for (const id of FIELD_IDS) {
    const meta = FIELD_META[id];
    if (!meta.presets) continue;

    if (meta.type === "enum") {
      for (const preset of meta.presets) {
        out.push({
          kind: "value",
          predicate: { kind: "p", field: id, cmp: "eq", value: preset.value },
          label: preset.label,
          breadcrumb: meta.label,
        });
      }
    } else if (meta.type === "number") {
      for (const preset of meta.presets) {
        const value =
          typeof preset.value === "number"
            ? preset.value
            : Number(preset.value);
        if (!Number.isFinite(value)) continue;
        out.push({
          kind: "value",
          predicate: { kind: "p", field: id, cmp: "lte", value },
          label: preset.label,
          breadcrumb: meta.label,
        });
      }
    }
  }
  for (const field of DATE_FIELDS) {
    const meta = FIELD_META[field];
    for (const preset of DATE_PRESETS) {
      out.push({
        kind: "value",
        predicate: { kind: "p", field, cmp: "gte", value: preset.iso },
        label: preset.label,
        breadcrumb: meta.label,
      });
    }
  }

  out.push({
    kind: "value",
    predicate: { kind: "p", field: "note", cmp: "exists", value: true },
    label: "With note",
    breadcrumb: FIELD_META.note.label,
  });
  out.push({
    kind: "value",
    predicate: { kind: "p", field: "note", cmp: "exists", value: false },
    label: "Without note",
    breadcrumb: FIELD_META.note.label,
  });
  appendTagEntries(out, saves);
  appendCreatorEntries(out, saves);
  appendHostEntries(out, saves);

  return out;
}

function appendTagEntries(
  out: SearchEntry[],
  saves: readonly SaveLike[],
): void {
  const counts = new Map<string, number>();
  for (const save of saves) {
    if ((save as { deletedAt?: unknown }).deletedAt) continue;
    for (const tag of save.tags ?? []) {
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TAG_CAP);
  for (const [tag] of top) {
    out.push({
      kind: "value",
      predicate: { kind: "p", field: "tags", cmp: "some", value: [tag] },
      label: tag,
      breadcrumb: FIELD_META.tags.label,
    });
  }
}

function appendCreatorEntries(
  out: SearchEntry[],
  saves: readonly SaveLike[],
): void {
  const counts = new Map<string, number>();
  for (const save of saves) {
    if ((save as { deletedAt?: unknown }).deletedAt) continue;
    const author = (save.author ?? "").trim();
    if (!author) continue;
    counts.set(author, (counts.get(author) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, CREATOR_CAP);
  for (const [author] of top) {
    out.push({
      kind: "value",
      predicate: { kind: "p", field: "creator", cmp: "eq", value: author },
      label: author,
      breadcrumb: FIELD_META.creator.label,
    });
  }
}

function appendHostEntries(
  out: SearchEntry[],
  saves: readonly SaveLike[],
): void {
  const counts = new Map<string, number>();
  for (const save of saves) {
    if ((save as { deletedAt?: unknown }).deletedAt) continue;
    const host = parseHost(save.url);
    if (!host) continue;
    counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, HOST_CAP);
  for (const [host] of top) {
    out.push({
      kind: "value",
      predicate: { kind: "p", field: "url", cmp: "contains", value: host },
      label: host,
      breadcrumb: FIELD_META.url.label,
    });
  }
}

function parseHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname) return null;
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function useEntryCounts(
  saves: readonly SaveLike[],
  entries: SearchEntry[] | null,
): Map<string, number> {
  const cacheRef = useRef<{
    saves: readonly SaveLike[] | null;
    map: Map<string, number>;
  }>({ saves: null, map: new Map() });

  return useMemo(() => {
    if (!entries) return new Map();
    if (cacheRef.current.saves !== saves) {
      cacheRef.current = { saves, map: new Map() };
    }
    const cache = cacheRef.current.map;
    const out = new Map<string, number>();
    for (const entry of entries) {
      if (entry.kind !== "value") continue;
      const key = predicateKey(entry.predicate);
      if (out.has(key)) continue;
      let count = cache.get(key);
      if (count == null) {
        count = 0;
        const query: Query = { kind: "and", clauses: [entry.predicate] };
        for (const save of saves) {
          if ((save as { deletedAt?: unknown }).deletedAt) continue;
          if (matches(query, save)) count++;
        }
        cache.set(key, count);
      }
      out.set(key, count);
    }
    return out;
  }, [saves, entries]);
}

export function entryKey(entry: SearchEntry): string {
  switch (entry.kind) {
    case "group":
      return `group:${entry.group.id}`;
    case "field":
      return `field:${entry.field}`;
    case "field-in-group":
      return `field-in-group:${entry.group.id}:${entry.field}`;
    case "value":
      return `value:${predicateKey(entry.predicate)}`;
  }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
