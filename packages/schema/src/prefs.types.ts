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
  /** Most recent enqueued source id; gates full vs incremental walks. */
  highWaterMark: string | null;
  lastFullSyncAt: string | null;
  knownCount: number;
  /**
   * ISO timestamp while a run is in flight; still set at startup means the previous run was interrupted.
   * @see recoverInterruptedSyncs
   */
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

/**
 * @deprecated Superseded by `SyncAccounts`; kept so pre-multi-account prefs still parse and can be migrated.
 * @see migrateSyncAccounts in the desktop app
 */
export type SyncSources = Partial<Record<Source, SourceSyncPrefs>>;
export type SyncHandles = Partial<Record<Source, string>>;

/** A signed-in platform account; several may share one `source`, each owning an isolated cookie partition derived from `id` and its own sync cursor. */
export interface ConnectedAccount {
  /** ULID; stable across renames and also the cookie-partition suffix. */
  id: string;
  source: Source;
  /** Resolved username on the platform; null until first probed. */
  handle: string | null;
  /**
   * Stable platform user id from identity cookies (twitter `twid`, instagram/threads `ds_user_id`);
   * matches a pushed session to an account when the handle can't be probed. Null when the platform has no such cookie.
   */
  identityKey: string | null;
  /** Optional user nickname. */
  label: string | null;
  /** Best-effort profile picture URL resolved from the platform; null when the last attempt found nothing. */
  avatarUrl?: string | null;
  /** ISO timestamp of the last avatar resolution attempt. */
  avatarCheckedAt?: string | null;
  /** ISO timestamp of when the account was connected. */
  addedAt: string;
  /** Per-account watermark/cursor state (was per-source). */
  sync: SourceSyncPrefs;
}

export type SyncAccounts = Record<string, ConnectedAccount>;

/** What a watch points at; valid kinds depend on the source: Are.na channel/user/group, YouTube channel/playlist, Twitter user/list, Pinterest user/board, Cosmos user/cluster, TikTok/Instagram user. */
export type WatchKind =
  | "channel"
  | "user"
  | "group"
  | "playlist"
  | "board"
  | "cluster"
  | "list";

/**
 * A public account Pond polls for new posts, with no session or cookie partition of its own.
 * Harvested URLs feed the normal ingest pipeline stamped with the watch's id as accountId.
 */
export interface WatchedAccount {
  /** ULID; also the accountId stamped on saves harvested from this watch. */
  id: string;
  source: Source;
  /**
   * Identifying slug, shape depending on kind: a bare handle/slug, a playlist or list id,
   * `user/board` for Pinterest, `user/cluster` for Cosmos, or `handle/shorts` when a YouTube tab URL was pasted.
   */
  handle: string;
  /**
   * Resolved at add time so checks never guess; absent on watches created before kinds existed,
   * where runners fall back to the legacy per-source default.
   */
  kind?: WatchKind;
  /** Optional user nickname. */
  label: string | null;
  /** Same as ConnectedAccount: best-effort profile picture URL. */
  avatarUrl?: string | null;
  /** ISO timestamp of the last avatar resolution attempt. */
  avatarCheckedAt?: string | null;
  /** Connected account whose session the check rides on auth-walled sources; null for sources with public listings. */
  via: string | null;
  /** ISO timestamp of when the watch was added. */
  addedAt: string;
  /** Watermark/cursor state, same shape as connected accounts. */
  sync: SourceSyncPrefs;
}

export type SyncWatches = Record<string, WatchedAccount>;

/** Accent, surfaces, ink, and contrast spread for the gray/accent ramps. */
export interface ThemeDef {
  accent: string;
  background: string;
  foreground: string;
  contrast: number;
}

/** Which side drives the UI when not following the OS. */
export type ThemeAppearance = "system" | "light" | "dark";

/** Cover source for Twitter saves in the grid and preview pane. */
export type TweetCover = "media" | "screenshot";

/** Character of interface feedback sounds. */
export type SoundFeel =
  | "soft"
  | "crisp"
  | "thock"
  | "glass"
  | "metal"
  | "lofi"
  | "retro"
  | "organic"
  | "airy"
  | "punchy";

/** Contrast widens the separation between backgrounds, borders, and text. */
export const CONTRAST_MIN = 0;
export const CONTRAST_MAX = 100;
export const CONTRAST_DEFAULT = 50;

/** Default light side; presets live in theme-presets.ts. */
export const DEFAULT_LIGHT_THEME: ThemeDef = {
  accent: "#008FFF",
  background: "#ffffff",
  foreground: "#1B1B1B",
  contrast: CONTRAST_DEFAULT,
};

/** Default dark side; presets live in theme-presets.ts. */
export const DEFAULT_DARK_THEME: ThemeDef = {
  accent: "#008FFF",
  background: "#0A0A0A",
  foreground: "#EEEEEE",
  contrast: CONTRAST_DEFAULT,
};

export const DEFAULT_LIGHT_PRESET_ID = "light";
export const DEFAULT_DARK_PRESET_ID = "dark";

/** Dock / taskbar mark; matches a folder under packages/icons/brand/tints. */
export const DEFAULT_APP_ICON = "aqua";

/** Persisted so the window restores to its last position. */
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Metric ids are owned by the renderer's metric catalog; the schema stays generic so adding a metric never requires a migration. */
export type SourceMetricDisplay = "card" | "chip";

export const DEFAULT_SOURCE_METRICS: string[] = [
  "itemsSynced",
  "successRate",
  "runsToday",
  "avgRun",
];
