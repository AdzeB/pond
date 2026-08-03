import type {
  InsightConfig,
  InsightDisplay,
  InsightSegment,
  InsightSlice,
  Source,
} from "@pond/schema/db";
import { sourceLabel } from "@pond/schema/sources";
import type { Save } from "@/lib/types";
import {
  CYCLE_COLORS,
  FALLBACK_COLOR,
  OTHER_COLOR,
  SOURCE_COLORS,
} from "./insight-colors";
import { creatorOf, domainOf, mediaTypeOf, statusOf } from "./insight-filters";
import {
  effectiveSegment,
  formatCount,
  STATUS_META,
  TYPE_META,
} from "./insight-options";

interface SegmentDef {
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
interface HeatmapData {
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

/** Day charts need a finite axis; "All time" (0) clamps to 90 days. */
function windowDays(days: number): number {
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

/** Tag is absent here: it's multi-valued and handled in the bucketing loop. */
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

interface Bucket {
  dim: Dim;
  rows: Save[];
}

/** Open-ended slices get capped with the remainder rolled into "Other" so charts stay readable. */
const CAPPED_SLICES: InsightSlice[] = ["creator", "tag", "domain"];

function capFor(display: InsightDisplay, slice: InsightSlice): number {
  if (display === "ring" || display === "pie" || display === "sunburst")
    return 6;
  /** Radar needs 3+ spokes to make a shape and gets unreadable past 8. */
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

/** Monday-first weekday × hour counts. */
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

/** Rolls everything past the cap into one "Other" bucket; day slices are never capped. */
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

  /** Day slices pre-seed every day so quiet days render as gaps instead of vanishing; tag slices land a save in every tag bucket it carries. */
  const buckets: Map<string, Bucket> =
    config.slice === "day"
      ? seedDayBuckets(axisDays)
      : new Map<string, Bucket>();

  const push = (dim: Dim, save: Save) => {
    let bucket = buckets.get(dim.key);
    if (!bucket) {
      /** The saves window is rolling (N×24h) but day charts show calendar days; drop the sliver older than the earliest seeded day. */
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

  /** Legend is ordered by total desc so stack order matches visual weight. */
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
  /** Day slices stay chronological; everything else sorts by count. */
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
