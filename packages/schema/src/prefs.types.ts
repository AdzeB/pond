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
}

export const DEFAULT_SOURCE_SYNC_PREFS: SourceSyncPrefs = {
  lastSyncedAt: null,
  lastError: null,
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
  base: "#fcfcfd",
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

export type SourceVisibility = "always" | "when-count" | "hidden";

export interface SidebarSourceEntry {
  source: Source;
  visibility: SourceVisibility;
}

export type SidebarSourcesConfig = SidebarSourceEntry[];

export const DEFAULT_SIDEBAR_SOURCES: SidebarSourceEntry[] = [
  { source: "twitter", visibility: "always" },
  { source: "pinterest", visibility: "always" },
  { source: "arena", visibility: "always" },
  { source: "instagram", visibility: "always" },
  { source: "cosmos", visibility: "hidden" },
  { source: "tiktok", visibility: "hidden" },
  { source: "youtube", visibility: "hidden" },
  { source: "reddit", visibility: "when-count" },
  { source: "threads", visibility: "when-count" },
  { source: "local", visibility: "hidden" },
];
