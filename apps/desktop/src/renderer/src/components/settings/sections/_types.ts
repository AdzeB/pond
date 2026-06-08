export const AUTH_WALLED_SOURCES = [
  { id: "twitter", label: "X (Twitter)" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "pinterest", label: "Pinterest" },
  { id: "youtube", label: "YouTube" },
  { id: "cosmos", label: "Cosmos" },
  { id: "arena", label: "Are.na" },
] as const;

export const ALL_SOURCES = AUTH_WALLED_SOURCES.map(
  (s) => ({ ...s, kind: "auth-walled" }) as const,
);
export type AnySource = (typeof ALL_SOURCES)[number]["id"];

export const SOURCE_DESCRIPTIONS: Record<AnySource, string> = {
  twitter: "Your trusted digital town square.",
  instagram: "Capture and share the world's moments.",
  cosmos: "Curate clusters and visual references.",
  tiktok: "Short videos worth coming back to.",
  pinterest: "Pin ideas worth keeping.",
  arena: "Connect blocks across channels.",
  youtube: "Videos, playlists, and watch-later.",
};

export type VideoCodec = "h264" | "hevc" | "av1" | "vp9" | "any";
export type AudioCodec = "aac" | "opus" | "any";
export type VideoContainer = "auto" | "mp4" | "mkv" | "webm" | "mov";
export type SubtitleMode = "off" | "download" | "embed";

export interface VideoDownloadPrefs {
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

export const DEFAULT_VIDEO_DOWNLOAD: VideoDownloadPrefs = {
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

export interface ImageDownloadPrefs {
  maxLongEdge: number | null;
  format: ImageFormat;
  quality: number;
  lossless: boolean;
  progressive: boolean;
  preserveMetadata: boolean;
  maxFileSizeMb: number | null;
}

export const DEFAULT_IMAGE_DOWNLOAD: ImageDownloadPrefs = {
  maxLongEdge: 2048,
  format: "original",
  quality: 80,
  lossless: false,
  progressive: false,
  preserveMetadata: false,
  maxFileSizeMb: 10,
};

export interface SettingsRow {
  id: string;
  videoDownload: VideoDownloadPrefs;
  imageDownload: ImageDownloadPrefs;
  libraryRoot: string | null;
}
