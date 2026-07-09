import {
  type InsightConfig,
  type InsightDisplay,
  type InsightFilter,
  type InsightSegment,
  type InsightSlice,
  type InsightWidth,
  SOURCES,
  type Source,
} from "@pond/schema/db";
import { sourceLabel } from "@pond/schema/sources";
import type { Save } from "@/lib/types";

// ── Pure insight engine ─────────────────────────────────────────────────────
// Turns a window of library saves plus a user config (slice × segment) into
// chart-ready save counts, Linear Insights style. No React, no IO: the page
// reads the in-memory saves pool once and every card derives from the same
// array.

export interface SegmentDef {
  key: string;
  label: string;
  color: string;
}

export interface InsightGroup {
  key: string;
  label: string;
  /** Set when slicing by source, so rows can render the brand icon. */
  source: Source | null;
  /** Save count for the whole group (stack total). */
  value: number;
  display: string;
  /** Slice color (canonical hue or rank-cycled); rings and dots use it. */
  color: string;
  /** Stacked contributions, in legend order. Empty when unsegmented. */
  segments: { key: string; label: string; color: string; value: number }[];
}

/** Weekday × hour activity grid; rows are Monday-first. */
export interface HeatmapData {
  cells: number[][];
  max: number;
}

export interface InsightResult {
  groups: InsightGroup[];
  legend: SegmentDef[];
  /** Weekday × hour grid; heatmap display only. */
  heatmap: HeatmapData | null;
  /** Headline count across the whole window (metric display). */
  total: number;
  totalDisplay: string;
  saveCount: number;
}

// ── Catalogs (editor options + labels) ──────────────────────────────────────

export const SLICE_OPTIONS: { value: InsightSlice; label: string }[] = [
  { value: "source", label: "Source" },
  { value: "day", label: "Day" },
  { value: "type", label: "Media type" },
  { value: "creator", label: "Creator" },
  { value: "tag", label: "Tag" },
  { value: "domain", label: "Domain" },
  { value: "status", label: "Status" },
];

export const SEGMENT_OPTIONS: { value: InsightSegment; label: string }[] = [
  { value: "source", label: "Source" },
  { value: "type", label: "Media type" },
  { value: "status", label: "Status" },
];

export const DISPLAY_OPTIONS: { value: InsightDisplay; label: string }[] = [
  { value: "chart", label: "Bars" },
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "ring", label: "Ring" },
  { value: "pie", label: "Pie" },
  { value: "sunburst", label: "Sunburst" },
  { value: "radar", label: "Radar" },
  { value: "heatmap", label: "Heatmap" },
  { value: "metric", label: "Metric" },
  { value: "table", label: "Table" },
];

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** A stored card the current (save-count) engine can compute. Cards from
 * retired configurations — the runs dataset ("Items synced by outcome"…) or
 * the storage/avgSize measures — carry a `measure` other than "saves" and
 * get dropped when the dashboard loads. */
export function isSavesInsight(config: InsightConfig): boolean {
  const legacyMeasure = (config as { measure?: string }).measure;
  return (
    (legacyMeasure === undefined || legacyMeasure === "saves") &&
    SLICE_OPTIONS.some((o) => o.value === config.slice) &&
    DISPLAY_OPTIONS.some((o) => o.value === config.display)
  );
}

export function newInsight(): InsightConfig {
  return {
    id: crypto.randomUUID(),
    name: null,
    slice: "day",
    segment: "source",
    display: "area",
    w: 2,
    h: 2,
    filters: [],
  };
}

// ── Grid sizing ─────────────────────────────────────────────────────────────
// Cards live on a 3-column grid with fixed-height rows; each card spans
// `w` columns × `h` rows. Pre-grid cards only stored a fractional `width`.

export const GRID_COLS = 3;
export const GRID_MAX_ROWS = 3;

export interface InsightSize {
  w: number;
  h: number;
}

const LEGACY_WIDTH_COLS: Record<InsightWidth, number> = {
  quarter: 1,
  third: 1,
  half: 2,
  full: 3,
};

// Default row spans per display: headline numbers read fine short; charts
// need the taller cell.
function defaultRows(display: InsightDisplay): number {
  if (display === "metric") return 1;
  return 2;
}

function clampSpan(value: number, max: number): number {
  return Math.max(1, Math.min(max, Math.round(value)));
}

export function sizeOf(config: InsightConfig): InsightSize {
  const legacy = config.width ? LEGACY_WIDTH_COLS[config.width] : null;
  return {
    w: clampSpan(config.w ?? legacy ?? 2, GRID_COLS),
    h: clampSpan(config.h ?? defaultRows(config.display), GRID_MAX_ROWS),
  };
}

// Sizes an insight picks up when its display changes in the editor; only
// applied to drafts that haven't been placed on the grid yet.
export function defaultSize(display: InsightDisplay): InsightSize {
  if (display === "metric") return { w: 1, h: 1 };
  return { w: 2, h: 2 };
}

// Auto-title, Linear style: "Saves by day, split by source". A custom name
// set in the editor wins.
export function insightTitle(config: InsightConfig): string {
  if (config.name?.trim()) return config.name.trim();
  return autoTitle(config);
}

export function autoTitle(config: InsightConfig): string {
  if (config.display === "heatmap") return "Saves by day and hour";
  if (config.display === "metric") return "Saves";
  const slice = optionLabel(SLICE_OPTIONS, config.slice).toLowerCase();
  const base = `Saves by ${slice}`;
  const segment = effectiveSegment(config);
  if (!segment) return base;
  const segmentLabel = optionLabel(SEGMENT_OPTIONS, segment).toLowerCase();
  if (config.display === "sunburst") return `${base} and ${segmentLabel}`;
  return `${base}, split by ${segmentLabel}`;
}

// Headline and grid displays have no segments, and a segment equal to the
// slice adds nothing. Rings, pies, and radars color by slice, so a segment
// would be invisible; sunburst is the segmented circular shape.
export function effectiveSegment(config: InsightConfig): InsightSegment | null {
  if (
    config.display === "metric" ||
    config.display === "heatmap" ||
    config.display === "ring" ||
    config.display === "pie" ||
    config.display === "radar"
  ) {
    return null;
  }
  if (config.segment === config.slice) return null;
  return config.segment;
}

// ── Colors ──────────────────────────────────────────────────────────────────
// Series colors come from the theme's chromatic ramps so they track the
// user's palette. Sources get a fixed hue each; open-ended dimensions
// (creators, tags, domains) cycle in rank order.

const SOURCE_COLORS: Record<Source, string> = {
  twitter: "var(--ds-cyan-9)",
  instagram: "var(--ds-magenta-9)",
  pinterest: "var(--ds-red-9)",
  arena: "var(--ds-gray-9)",
  cosmos: "var(--ds-indigo-9)",
  tiktok: "var(--ds-teal-9)",
  youtube: "var(--ds-ruby-9)",
  reddit: "var(--ds-orange-9)",
  threads: "var(--ds-purple-9)",
  web: "var(--ds-blue-9)",
  local: "var(--ds-gold-9)",
};

const TYPE_META = {
  image: { label: "Image", color: "var(--ds-cyan-9)" },
  video: { label: "Video", color: "var(--ds-indigo-9)" },
  mixed: { label: "Mixed", color: "var(--ds-magenta-9)" },
  link: { label: "Link", color: "var(--ds-blue-9)" },
  other: { label: "Other", color: "var(--ds-gray-8)" },
} as const;

const STATUS_META = {
  complete: { label: "Complete", color: "var(--ds-green-9)" },
  ingesting: { label: "Ingesting", color: "var(--ds-blue-9)" },
  failed: { label: "Failed", color: "var(--ds-red-9)" },
} as const;

const CYCLE_COLORS = [
  "var(--ds-indigo-9)",
  "var(--ds-orange-9)",
  "var(--ds-teal-9)",
  "var(--ds-magenta-9)",
  "var(--ds-gold-9)",
  "var(--ds-cyan-9)",
  "var(--ds-purple-9)",
];

const FALLBACK_COLOR = "var(--ds-accent-9)";
const OTHER_COLOR = "var(--ds-gray-7)";

// ── Dimension extraction ────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(dayStart: number, days: number): string {
  const today = startOfDay(Date.now());
  if (dayStart === today) return "Today";
  const d = new Date(dayStart);
  if (days <= 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Day charts need a finite axis; "All time" (0) clamps to 90 days.
export function windowDays(days: number): number {
  return days > 0 ? days : 90;
}

interface Dim {
  key: string;
  label: string;
  color: string;
  source: Source | null;
}

function sourceDim(source: string): Dim {
  return {
    key: source,
    label: sourceLabel(source as Source),
    color: SOURCE_COLORS[source as Source] ?? FALLBACK_COLOR,
    source: source as Source,
  };
}

function dayDim(ts: number, days: number): Dim {
  const day = startOfDay(ts);
  return {
    key: String(day),
    label: dayLabel(day, days),
    color: "",
    source: null,
  };
}

function mediaTypeOf(save: Save): keyof typeof TYPE_META {
  const t = save.mediaType ?? "link";
  return t in TYPE_META ? (t as keyof typeof TYPE_META) : "other";
}

function creatorOf(save: Save): string {
  return save.author?.trim() || "Unknown";
}

function domainOf(save: Save): string {
  try {
    const host = new URL(save.url).hostname.replace(/^www\./, "");
    return host || "unknown";
  } catch {
    return save.source === "local" ? "Local files" : "unknown";
  }
}

function statusOf(save: Save): keyof typeof STATUS_META {
  const s = save.status ?? "complete";
  return s in STATUS_META ? (s as keyof typeof STATUS_META) : "complete";
}

// Tag is intentionally absent here: it's multi-valued and handled in the
// bucketing loop (a save lands in every tag bucket it carries).
function dimOf(
  save: Save,
  by: Exclude<InsightSlice, "tag"> | InsightSegment,
  days: number,
): Dim {
  switch (by) {
    case "source":
      return sourceDim(save.source);
    case "type": {
      const key = mediaTypeOf(save);
      const meta = TYPE_META[key];
      return { key, label: meta.label, color: meta.color, source: null };
    }
    case "creator": {
      const label = creatorOf(save);
      return { key: label.toLowerCase(), label, color: "", source: null };
    }
    case "domain": {
      const label = domainOf(save);
      return { key: label.toLowerCase(), label, color: "", source: null };
    }
    case "status": {
      const key = statusOf(save);
      const meta = STATUS_META[key];
      return { key, label: meta.label, color: meta.color, source: null };
    }
    default:
      return dayDim(save.savedAt, days);
  }
}

// ── Filters ─────────────────────────────────────────────────────────────────
// Dashboard-level filters narrow every card; insight-level filters stack on
// top. A filter with no values is a no-op (still being edited).

export function applyFilters(
  saves: readonly Save[],
  filters: InsightFilter[],
): Save[] {
  const active = filters.filter((f) => f.values.length > 0);
  const list = saves.filter((s) => s.deletedAt == null);
  if (active.length === 0) return list;
  return list.filter((save) =>
    active.every((f) => {
      let hit: boolean;
      if (f.field === "tag") {
        hit = save.tags.some((t) => f.values.includes(t.toLowerCase()));
      } else {
        const value =
          f.field === "source"
            ? save.source
            : f.field === "type"
              ? mediaTypeOf(save)
              : f.field === "creator"
                ? creatorOf(save).toLowerCase()
                : statusOf(save);
        hit = f.values.includes(value);
      }
      return f.op === "include" ? hit : !hit;
    }),
  );
}

/** Non-trashed saves inside the rolling window (0 = all time). */
export function savesInWindow(saves: readonly Save[], days: number): Save[] {
  const cutoff = days > 0 ? Date.now() - days * DAY_MS : 0;
  return saves.filter(
    (s) => s.deletedAt == null && (cutoff === 0 || s.savedAt >= cutoff),
  );
}

export const FILTER_FIELD_OPTIONS: {
  value: InsightFilter["field"];
  label: string;
}[] = [
  { value: "source", label: "Source" },
  { value: "type", label: "Media type" },
  { value: "tag", label: "Tag" },
  { value: "creator", label: "Creator" },
  { value: "status", label: "Status" },
];

// Value choices for the filter menus. Static catalogs where possible;
// open-ended fields (tag, creator) offer whatever exists in the current data.
export function filterValueOptions(
  field: InsightFilter["field"],
  saves: readonly Save[] = [],
): { value: string; label: string; source: Source | null }[] {
  switch (field) {
    case "source":
      return SOURCES.map((s) => ({
        value: s,
        label: sourceLabel(s),
        source: s,
      }));
    case "type":
      return Object.entries(TYPE_META).map(([value, meta]) => ({
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
  if (field === "source" && (SOURCES as readonly string[]).includes(value)) {
    return sourceLabel(value as Source);
  }
  if (field === "type" && value in TYPE_META) {
    return TYPE_META[value as keyof typeof TYPE_META].label;
  }
  if (field === "status" && value in STATUS_META) {
    return STATUS_META[value as keyof typeof STATUS_META].label;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

// ── Compute ─────────────────────────────────────────────────────────────────

interface Bucket {
  dim: Dim;
  rows: Save[];
}

// Open-ended slices get capped with the remainder rolled into "Other" so
// charts stay readable; circular shapes cap harder, tables show more.
const CAPPED_SLICES: InsightSlice[] = ["creator", "tag", "domain"];

function capFor(display: InsightDisplay, slice: InsightSlice): number {
  if (display === "ring" || display === "pie" || display === "sunburst")
    return 6;
  // Radar needs 3+ spokes to make a shape and gets unreadable past 8.
  if (display === "radar") return 8;
  if (!CAPPED_SLICES.includes(slice)) return Number.POSITIVE_INFINITY;
  return display === "table" ? 12 : 8;
}

function seedDayBuckets(days: number): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  const today = startOfDay(Date.now());
  for (let i = days - 1; i >= 0; i--) {
    const day = today - i * DAY_MS;
    buckets.set(String(day), {
      dim: {
        key: String(day),
        label: dayLabel(day, days),
        color: "",
        source: null,
      },
      rows: [],
    });
  }
  return buckets;
}

// Monday-first weekday × hour counts from raw timestamps.
function buildHeatmap(rows: Save[]): HeatmapData {
  const cells: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  let max = 0;
  for (const row of rows) {
    const d = new Date(row.savedAt);
    const hours = cells[(d.getDay() + 6) % 7];
    if (!hours) continue;
    const v = (hours[d.getHours()] ?? 0) + 1;
    hours[d.getHours()] = v;
    if (v > max) max = v;
  }
  return { cells, max };
}

// Roll everything past the cap into a single "Other" bucket (already sorted
// by value desc; day slices are never capped).
function capBuckets(buckets: Bucket[], config: InsightConfig): Bucket[] {
  if (config.slice === "day") return buckets;
  const cap = capFor(config.display, config.slice);
  if (buckets.length <= cap) return buckets;
  const kept = buckets.slice(0, cap - 1);
  const rest = buckets.slice(cap - 1);
  kept.push({
    dim: {
      key: "__other__",
      label: `Other (${rest.length})`,
      color: OTHER_COLOR,
      source: null,
    },
    rows: rest.flatMap((b) => b.rows),
  });
  return kept;
}

export function computeInsight(
  config: InsightConfig,
  saves: Save[],
  days: number,
): InsightResult {
  const segment = effectiveSegment(config);
  const axisDays = windowDays(days);

  // Bucket saves by slice value. Day slices pre-seed every day in the window
  // so quiet days render as gaps instead of vanishing. Tag slices are
  // multi-valued: a save lands in every tag bucket it carries (untagged
  // saves get their own bucket).
  const buckets: Map<string, Bucket> =
    config.slice === "day"
      ? seedDayBuckets(axisDays)
      : new Map<string, Bucket>();

  const push = (dim: Dim, save: Save) => {
    let bucket = buckets.get(dim.key);
    if (!bucket) {
      // The saves window is rolling (N×24h) but day charts show calendar
      // days; drop the sliver older than the earliest seeded day.
      if (config.slice === "day") return;
      bucket = { dim, rows: [] };
      buckets.set(dim.key, bucket);
    }
    bucket.rows.push(save);
  };

  for (const save of saves) {
    if (config.slice === "tag") {
      if (save.tags.length === 0) {
        push(
          { key: "__untagged__", label: "Untagged", color: "", source: null },
          save,
        );
      } else {
        for (const tag of save.tags) {
          push(
            { key: tag.toLowerCase(), label: tag, color: "", source: null },
            save,
          );
        }
      }
    } else {
      push(
        dimOf(save, config.slice as Exclude<InsightSlice, "tag">, axisDays),
        save,
      );
    }
  }

  // Legend over the effective segment (source / type / status), ordered by
  // total desc so stack order matches visual weight.
  const legend: SegmentDef[] = [];
  if (segment) {
    const totals = new Map<string, { dim: Dim; total: number }>();
    for (const save of saves) {
      const dim = dimOf(save, segment, axisDays);
      const entry = totals.get(dim.key) ?? { dim, total: 0 };
      entry.total += 1;
      totals.set(dim.key, entry);
    }
    const entries = [...totals.values()].sort((a, b) => b.total - a.total);
    entries.forEach((entry, i) => {
      legend.push({
        key: entry.dim.key,
        label: entry.dim.label,
        color:
          entry.dim.color ||
          (CYCLE_COLORS[i % CYCLE_COLORS.length] ?? FALLBACK_COLOR),
      });
    });
  }

  const makeGroup = (dim: Dim, rows: Save[], i: number): InsightGroup => {
    const value = rows.length;
    const color =
      dim.color || (CYCLE_COLORS[i % CYCLE_COLORS.length] ?? FALLBACK_COLOR);

    let segments: InsightGroup["segments"] = [];
    if (segment) {
      const counts = new Map<string, number>();
      for (const save of rows) {
        const key = dimOf(save, segment, axisDays).key;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      segments = legend
        .map((def) => ({
          key: def.key,
          label: def.label,
          color: def.color,
          value: counts.get(def.key) ?? 0,
        }))
        .filter((s) => s.value > 0);
    }

    return {
      key: dim.key,
      label: dim.label,
      source: dim.source,
      value,
      display: formatCount(value),
      color,
      segments,
    };
  };

  let orderedBuckets = [...buckets.values()];
  // Day slices stay chronological; everything else sorts by count.
  if (config.slice !== "day") {
    orderedBuckets.sort((a, b) => b.rows.length - a.rows.length);
  }
  orderedBuckets = capBuckets(orderedBuckets, config);

  const groups = orderedBuckets.map((bucket, i) =>
    makeGroup(bucket.dim, bucket.rows, i),
  );

  const heatmap = config.display === "heatmap" ? buildHeatmap(saves) : null;

  const total = saves.length;
  return {
    groups,
    legend,
    heatmap,
    total,
    totalDisplay: formatCount(total),
    saveCount: total,
  };
}
