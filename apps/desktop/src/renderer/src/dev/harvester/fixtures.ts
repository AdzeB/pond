import type { Source } from "@pond/schema/db";

export type SourceKind = "Account" | "Watch";
export type SourceStatus = "active" | "syncing" | "error" | "paused";
export type DownloadStatus = "downloading" | "completed" | "error" | "paused";

export interface HarvesterSource {
  id: string;
  name: string;
  kind: SourceKind;
  source: Source;
  status: SourceStatus;
  detail: string;
  items: number;
}

export interface HarvesterDownload {
  id: string;
  name: string;
  source: Source;
  status: DownloadStatus;
  received: number;
  total: number;
  speed: number;
  error: string;
}

export const INITIAL_SOURCES: HarvesterSource[] = [
  {
    id: "instagram-studio",
    name: "Studio",
    kind: "Account",
    source: "instagram",
    status: "syncing",
    detail: "Checking for new posts.",
    items: 1284,
  },
  {
    id: "arena-references",
    name: "References",
    kind: "Account",
    source: "arena",
    status: "active",
    detail: "Last checked 14 minutes ago.",
    items: 86,
  },
  {
    id: "twitter-bookmarks",
    name: "Bookmarks",
    kind: "Account",
    source: "twitter",
    status: "error",
    detail: "Session expired. Sign back in to resume syncing.",
    items: 412,
  },
  {
    id: "footage-inbox",
    name: "Footage inbox",
    kind: "Watch",
    source: "local",
    status: "active",
    detail: "Last checked 1 minute ago.",
    items: 24,
  },
  {
    id: "channel-uploads",
    name: "Channel uploads",
    kind: "Watch",
    source: "youtube",
    status: "paused",
    detail: "Paused until you resume it.",
    items: 9,
  },
];

export const INITIAL_DOWNLOADS: HarvesterDownload[] = [
  {
    id: "stills",
    name: "Editorial stills.zip",
    source: "instagram",
    status: "downloading",
    received: 72 * 1024 * 1024,
    total: 180 * 1024 * 1024,
    speed: 6 * 1024 * 1024,
    error: "",
  },
  {
    id: "lecture",
    name: "Lecture 04.mp4",
    source: "youtube",
    status: "downloading",
    received: 110 * 1024 * 1024,
    total: 890 * 1024 * 1024,
    speed: 4 * 1024 * 1024,
    error: "",
  },
  {
    id: "street",
    name: "Street study.jpg",
    source: "pinterest",
    status: "downloading",
    received: 8 * 1024 * 1024,
    total: 22 * 1024 * 1024,
    speed: 1.5 * 1024 * 1024,
    error: "",
  },
  {
    id: "guidelines",
    name: "Brand guidelines.pdf",
    source: "local",
    status: "completed",
    received: 18 * 1024 * 1024,
    total: 18 * 1024 * 1024,
    speed: 0,
    error: "",
  },
  {
    id: "board",
    name: "Reference board",
    source: "arena",
    status: "completed",
    received: 4 * 1024 * 1024,
    total: 4 * 1024 * 1024,
    speed: 0,
    error: "",
  },
  {
    id: "reel",
    name: "Missing reel.mp4",
    source: "instagram",
    status: "error",
    received: 0,
    total: 0,
    speed: 0,
    error: "Resource not found. The link no longer works.",
  },
];
