import type { Source } from "./db";

export type VideoCodec = "h264" | "hevc" | "av1" | "vp9" | "any";
export type AudioCodec = "aac" | "opus" | "any";
export type VideoContainer = "auto" | "mp4" | "mkv" | "webm" | "mov";
export type SubtitleMode = "off" | "download" | "embed";

export interface VideoDownloadSettings {
  enabled: boolean;
  maxHeight: number | null;
  maxFps: number | null;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  container: VideoContainer;
  maxFileSizeMb: number | null;
  subtitles: SubtitleMode;
  subtitleLang: string;
  embedMetadata: boolean;
  embedThumbnail: boolean;
  embedChapters: boolean;
  sponsorblockRemove: boolean;
}

export const DEFAULT_VIDEO_DOWNLOAD: VideoDownloadSettings = {
  enabled: true,
  maxHeight: 1080,
  maxFps: null,
  videoCodec: "h264",
  audioCodec: "aac",
  container: "auto",
  maxFileSizeMb: 500,
  subtitles: "off",
  subtitleLang: "en",
  embedMetadata: true,
  embedThumbnail: false,
  embedChapters: false,
  sponsorblockRemove: false,
};

export type ImageFormat = "original" | "jpeg" | "png" | "webp" | "avif";

export interface ImageDownloadSettings {
  maxLongEdge: number | null;
  format: ImageFormat;
  quality: number;
  lossless: boolean;
  progressive: boolean;
  preserveMetadata: boolean;
  maxFileSizeMb: number | null;
}

export const DEFAULT_IMAGE_DOWNLOAD: ImageDownloadSettings = {
  maxLongEdge: 2048,
  format: "original",
  quality: 80,
  lossless: false,
  progressive: false,
  preserveMetadata: false,
  maxFileSizeMb: 10,
};

export interface SourceSyncPrefs {
  lastSyncedAt: string | null;
  lastError: string | null;
  // Incremental sync cursor: most recent enqueued source id, the gate for
  // full vs incremental walks, and the library size at last sync.
  highWaterMark: string | null;
  lastFullSyncAt: string | null;
  knownCount: number;
  // ISO timestamp while a run is in flight, cleared on finish. Still set at
  // startup means the previous run was interrupted (see recoverInterruptedSyncs).
  runningSince: string | null;
}

export const DEFAULT_SOURCE_SYNC_PREFS: SourceSyncPrefs = {
  lastSyncedAt: null,
  lastError: null,
  highWaterMark: null,
  lastFullSyncAt: null,
  knownCount: 0,
  runningSince: null,
};

export type SyncSources = Partial<Record<Source, SourceSyncPrefs>>;
export type SyncHandles = Partial<Record<Source, string>>;

// Base color (its lightness picks light/dark), accent, and contrast spread for the ramp.
export interface ThemeDef {
  base: string;
  accent: string;
  contrast: number;
}

export type ThemeMode = "preset" | "system" | "custom";

// Cover source for Twitter saves in the grid / preview pane.
export type TweetCover = "media" | "screenshot";

// Contrast widens the separation between backgrounds, borders, and text.
export const CONTRAST_MIN = 0;
export const CONTRAST_MAX = 100;
export const CONTRAST_DEFAULT = 30;

// Fallback custom theme and default preset ids (presets in theme-presets.ts).
export const CUSTOM_THEME_DEFAULT: ThemeDef = {
  base: "#ffffff",
  accent: "#3b82f6",
  contrast: CONTRAST_DEFAULT,
};
export const DEFAULT_PRESET_ID = "light";
export const DEFAULT_SYSTEM_LIGHT_ID = "light";
export const DEFAULT_SYSTEM_DARK_ID = "dark";

// Window bounds persisted for restore-position.
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Sources page (KPI strip) ──────────────────────────────────────────────
// Which aggregate metrics the user pins to the Sources header and whether each
// renders as a full card or a compact chip. Metric ids are owned by the
// renderer's metric catalog; the schema stays generic so adding a metric never
// requires a migration.
export type SourceMetricDisplay = "card" | "chip";

export const DEFAULT_SOURCE_METRICS: string[] = [
  "itemsSynced",
  "successRate",
  "runsToday",
  "avgRun",
];

// ── Analytics page (insight dashboards) ───────────────────────────────────
// Named dashboards of user-composed insight cards over the library's saves,
// Linear Dashboards style: every card counts saves, picking a slice (x-axis)
// × optional segment (color split), rendered as one of several chart shapes,
// a single metric, or a table — optionally narrowed by filters. Option ids are owned by the renderer's insight catalog; the
// schema stays loose so new slices never require a migration.
export type InsightSlice =
  | "source"
  | "day"
  | "type"
  | "creator"
  | "tag"
  | "domain"
  | "status";

export type InsightSegment = "source" | "type" | "status";

export type InsightDisplay =
  | "chart" // stacked bars
  | "area"
  | "line"
  | "ring"
  | "pie"
  | "sunburst" // two-level ring: slice inside, segment outside
  | "radar"
  | "heatmap" // weekday × hour activity; slice/segment do not apply
  | "metric"
  | "table";

export type InsightWidth = "quarter" | "third" | "half" | "full";

// Style knobs for the chart displays. All optional — stored cards render
// exactly as before when absent.
export interface InsightVizOptions {
  /** Interpolation between points: smooth monotone, straight, or stepped. */
  curve?: "smooth" | "linear" | "step";
  /** Area fill: gradient wash (default), dot texture, or none. */
  fill?: "gradient" | "dotted" | "none";
  /** Mark every data point with a dot. */
  points?: boolean;
  /** Hidden layer ids for the display (e.g. "grid", "legend", "center"). */
  hidden?: string[];
  /** Area/line stroke width (1–4, default 1.75). */
  lineWidth?: number;
  /** Ring/pie/sunburst band thickness in px. */
  thickness?: number;
  /** Area fill / radar polygon fill opacity (0–1). */
  fillOpacity?: number;
  /** Bar end caps: rounded (default) or square. */
  barCap?: "round" | "square";
  /** Radar grid ring count (default 4). */
  gridLevels?: number;
}

// Narrow the window by dimension values, e.g. "source include [twitter]" or
// "tag exclude [inbox]". Dashboard-level filters apply to every card;
// insight-level filters stack on top.
export interface InsightFilter {
  field: "source" | "type" | "tag" | "creator" | "status";
  op: "include" | "exclude";
  values: string[];
}

export interface InsightConfig {
  id: string;
  /** Custom title; null falls back to the auto-generated one. */
  name: string | null;
  slice: InsightSlice;
  segment: InsightSegment | null;
  display: InsightDisplay;
  /** Column span on the 4-column grid (1-4); missing falls back to `width`. */
  w?: number;
  /** Row span (1-4); missing falls back to the display's default height. */
  h?: number;
  /** Legacy pre-grid width; superseded by `w`/`h`. */
  width?: InsightWidth;
  /** Chart style options; only meaningful for chart/area/line displays. */
  viz?: InsightVizOptions;
  filters: InsightFilter[];
}

export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  /** Rolling window (days) every card on this dashboard aggregates over. */
  days: number;
  filters: InsightFilter[];
  insights: InsightConfig[];
}

// First-open dashboard: a library overview on the 3-column grid — a daily
// activity hero, a headline count, then composition breakdowns.
export const DEFAULT_INSIGHTS: InsightConfig[] = [
  {
    id: "default-saves-by-day",
    name: null,
    slice: "day",
    segment: "source",
    display: "area",
    w: 3,
    h: 2,
    filters: [],
  },
  {
    id: "default-saves-count",
    name: null,
    slice: "source",
    segment: null,
    display: "metric",
    w: 3,
    h: 1,
    filters: [],
  },
  {
    id: "default-saves-by-type",
    name: null,
    slice: "type",
    segment: null,
    display: "ring",
    w: 3,
    h: 2,
    filters: [],
  },
  {
    id: "default-top-creators",
    name: null,
    slice: "creator",
    segment: null,
    display: "table",
    w: 3,
    h: 2,
    filters: [],
  },
];

export const DEFAULT_DASHBOARDS: DashboardConfig[] = [
  {
    id: "default-overview",
    name: "Overview",
    description: "What you've been saving across your sources",
    days: 7,
    filters: [],
    insights: DEFAULT_INSIGHTS,
  },
];
