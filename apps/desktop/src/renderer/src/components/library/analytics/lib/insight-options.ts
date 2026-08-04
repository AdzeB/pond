import type {
  InsightConfig,
  InsightDisplay,
  InsightFilter,
  InsightSegment,
  InsightSlice,
} from "@pond/schema/db";

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

export const TYPE_META = {
  image: { label: "Image", color: "var(--ds-cyan-9)" },
  video: { label: "Video", color: "var(--ds-indigo-9)" },
  link: { label: "Website", color: "var(--ds-blue-9)" },
  other: { label: "Other", color: "var(--ds-gray-8)" },
} as const;

export const STATUS_META = {
  complete: { label: "Complete", color: "var(--ds-green-9)" },
  ingesting: { label: "Ingesting", color: "var(--ds-blue-9)" },
  failed: { label: "Failed", color: "var(--ds-red-9)" },
} as const;

function optionLabel<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
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

/** A custom name set in the editor wins over the auto-title. */
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

/** Headline/grid displays have no segments; rings, pies, and radars color by slice, so a segment would be invisible. */
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

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}
