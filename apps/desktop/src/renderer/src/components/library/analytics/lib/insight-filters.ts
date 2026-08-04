import type { InsightConfig, InsightFilter, Source } from "@pond/schema/db";
import { sourceIdentity } from "@pond/schema/domain";
import type { Save } from "@/lib/types";
import {
  DISPLAY_OPTIONS,
  SLICE_OPTIONS,
  STATUS_META,
  TYPE_META,
} from "./insight-options";

const DAY_MS = 86_400_000;

/** Stored cards with a `measure` other than "saves" can't be computed by the save-count engine and get dropped when the dashboard loads. */
export function isSavesInsight(config: InsightConfig): boolean {
  const legacyMeasure = (config as { measure?: string }).measure;
  return (
    (legacyMeasure === undefined || legacyMeasure === "saves") &&
    SLICE_OPTIONS.some((o) => o.value === config.slice) &&
    DISPLAY_OPTIONS.some((o) => o.value === config.display)
  );
}

export function mediaTypeOf(save: Save): keyof typeof TYPE_META {
  const t = save.mediaType ?? "link";
  return t in TYPE_META ? (t as keyof typeof TYPE_META) : "other";
}

export function creatorOf(save: Save): string {
  return save.author?.trim() || "Unknown";
}

export function domainOf(save: Save): string {
  const identity = sourceIdentity(save);
  if (identity === "local") return "Local files";
  return identity || "unknown";
}

export function statusOf(save: Save): keyof typeof STATUS_META {
  const s = save.status ?? "complete";
  return s in STATUS_META ? (s as keyof typeof STATUS_META) : "complete";
}

export function filtersFingerprint(filters: readonly InsightFilter[]): string {
  const active = filters.filter((f) => f.values.length > 0);
  if (active.length === 0) return "";
  return JSON.stringify(
    active.map((f) => [f.field, f.op, [...f.values].sort()]),
  );
}

/** A filter with no values is a no-op because it's still being edited. */
export function applyFilters(
  saves: readonly Save[],
  filters: readonly InsightFilter[],
): Save[] {
  const active = filters.filter((f) => f.values.length > 0);
  if (active.length === 0) {
    for (const s of saves) {
      if (s.deletedAt != null) {
        return saves.filter((row) => row.deletedAt == null);
      }
    }
    return saves as Save[];
  }
  return saves.filter((save) => {
    if (save.deletedAt != null) return false;
    return active.every((f) => {
      let hit: boolean;
      if (f.field === "tag") {
        hit = save.tags.some((t) => f.values.includes(t.toLowerCase()));
      } else {
        const value =
          f.field === "source"
            ? sourceIdentity(save)
            : f.field === "type"
              ? mediaTypeOf(save)
              : f.field === "creator"
                ? creatorOf(save).toLowerCase()
                : statusOf(save);
        hit = f.values.includes(value);
      }
      return f.op === "include" ? hit : !hit;
    });
  });
}

const filterResultCache = new WeakMap<readonly Save[], Map<string, Save[]>>();

/** Shares identical filter results across insight cards on the same windowed save array. */
export function applyFiltersCached(
  saves: readonly Save[],
  filters: readonly InsightFilter[],
): Save[] {
  const key = filtersFingerprint(filters);
  let byKey = filterResultCache.get(saves);
  if (!byKey) {
    byKey = new Map();
    filterResultCache.set(saves, byKey);
  }
  const hit = byKey.get(key);
  if (hit) return hit;
  const next = applyFilters(saves, filters);
  byKey.set(key, next);
  return next;
}

/** Non-trashed saves inside the rolling window (0 = all time). */
export function savesInWindow(saves: readonly Save[], days: number): Save[] {
  const cutoff = days > 0 ? Date.now() - days * DAY_MS : 0;
  return saves.filter(
    (s) => s.deletedAt == null && (cutoff === 0 || s.savedAt >= cutoff),
  );
}

/** Static catalogs where possible; open-ended fields offer whatever exists in the current data. */
export function filterValueOptions(
  field: InsightFilter["field"],
  saves: readonly Save[] = [],
): { value: string; label: string; source: Source | null }[] {
  switch (field) {
    case "source": {
      const counts = new Map<string, number>();
      for (const save of saves) {
        if (save.deletedAt != null) continue;
        const value = sourceIdentity(save);
        if (!value) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 40)
        .map(([value]) => ({
          value,
          label: value === "local" ? "Local" : value,
          source: null,
        }));
    }
    case "type":
      return Object.entries(TYPE_META)
        .filter(([value]) => value !== "other")
        .map(([value, meta]) => ({
          value,
          label: meta.label,
          source: null,
        }));
    case "status":
      return Object.entries(STATUS_META).map(([value, meta]) => ({
        value,
        label: meta.label,
        source: null,
      }));
    case "tag": {
      const seen = new Map<string, string>();
      for (const save of saves) {
        if (save.deletedAt != null) continue;
        for (const tag of save.tags) seen.set(tag.toLowerCase(), tag);
      }
      return [...seen.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .slice(0, 40)
        .map(([value, label]) => ({ value, label, source: null }));
    }
    case "creator": {
      const counts = new Map<string, { label: string; n: number }>();
      for (const save of saves) {
        if (save.deletedAt != null) continue;
        const label = creatorOf(save);
        const key = label.toLowerCase();
        const entry = counts.get(key) ?? { label, n: 0 };
        entry.n += 1;
        counts.set(key, entry);
      }
      return [...counts.entries()]
        .sort((a, b) => b[1].n - a[1].n)
        .slice(0, 40)
        .map(([value, entry]) => ({
          value,
          label: entry.label,
          source: null,
        }));
    }
  }
}

export function filterValueLabel(
  field: InsightFilter["field"],
  value: string,
): string {
  if (field === "source") {
    return value === "local" ? "Local" : value;
  }
  if (field === "type" && value in TYPE_META) {
    return TYPE_META[value as keyof typeof TYPE_META].label;
  }
  if (field === "status" && value in STATUS_META) {
    return STATUS_META[value as keyof typeof STATUS_META].label;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
