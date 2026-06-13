import type { Source } from "./db";

// Raw shapes written into `saves.rawJson`. `RawYtdlp` mirrors yt-dlp's JSON dump 1:1.
export interface RawYtdlp {
  id?: string;
  title?: string;
  description?: string;
  thumbnail?: string;

  webpage_url?: string;
  original_url?: string;
  extractor?: string;
  extractor_key?: string;

  view_count?: number;
  like_count?: number;
  dislike_count?: number;
  comment_count?: number;
  repost_count?: number;
  concurrent_view_count?: number;
  average_rating?: number;

  duration?: number;

  uploader?: string;
  uploader_id?: string;
  uploader_url?: string;
  channel?: string;
  channel_id?: string;
  channel_url?: string;

  upload_date?: string;
  release_date?: string;
  release_timestamp?: number;
  timestamp?: number;

  live_status?: string;
  was_live?: boolean;
  availability?: string;
  age_limit?: number;

  width?: number;
  height?: number;
  fps?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;

  track?: string;
  artist?: string;
  album?: string;
  genre?: string;
  release_year?: number;

  language?: string;
  tags?: string[];
  categories?: string[];
  chapters?: Array<{
    start_time?: number;
    end_time?: number;
    title?: string;
  }>;

  playlist?: string;
  playlist_id?: string;
  playlist_title?: string;
  playlist_index?: number;
  n_entries?: number;
}

// v1 capture schema; mirrors the main-process `Capture` so the renderer can read it.
export interface CaptureAuthor {
  name?: string;
  handle?: string;
  avatarUrl?: string;
  profileUrl?: string;
  verified?: boolean;
}

export interface CaptureMedia {
  url: string;
  type: "image" | "video" | "link";
  width?: number;
  height?: number;
  durationSec?: number;
  posterUrl?: string;
  mimeType?: string;
}

// Superset of public per-item metrics; each extractor fills the subset its source exposes.
export interface CaptureMetrics {
  likes?: number;
  views?: number;
  plays?: number;
  comments?: number;
  replies?: number;
  retweets?: number;
  quotes?: number;
  bookmarks?: number;
  shares?: number;
  saves?: number;
  repins?: number;
  reactions?: number;
  connections?: number;
  downloads?: number;
}

export interface CaptureUpstream {
  url: string;
  host: string;
}

export interface Capture {
  id: string;
  source: Source;
  url: string;
  title?: string;
  description?: string;
  author?: CaptureAuthor;
  publishedAt?: string;
  lang?: string;
  media: CaptureMedia[];
  metrics?: CaptureMetrics;
  duration?: number;
  upstream?: CaptureUpstream;
  extras?: Record<string, unknown>;
}

export interface RawJson {
  capture: Capture;
  extractorId: string;
  extractedAt: string;
  ytdlp?: RawYtdlp;
}
