import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_PREFS,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadSettings,
  type Prefs,
  settings as settingsTable,
  type VideoDownloadSettings,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getGlobalDb } from "../db";

interface SettingsCache {
  prefs: Prefs;
  videoDownload: VideoDownloadSettings;
  imageDownload: ImageDownloadSettings;
}

let cache: SettingsCache | null = null;
let inflight: Promise<SettingsCache> | null = null;

function invalidate(): void {
  cache = null;
  inflight = null;
}

export function invalidatePrefs(): void {
  invalidate();
}

export function invalidateVideoDownloadPrefs(): void {
  invalidate();
}

export function invalidateImageDownloadPrefs(): void {
  invalidate();
}

async function loadSettings(): Promise<SettingsCache> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const db = await getGlobalDb();
      const rows = await db
        .select({
          prefs: settingsTable.prefs,
          videoDownload: settingsTable.videoDownload,
          imageDownload: settingsTable.imageDownload,
        })
        .from(settingsTable)
        .where(eq(settingsTable.id, "singleton"));
      const row = rows[0];
      cache = {
        prefs: mergePrefs(DEFAULT_PREFS, row?.prefs),
        videoDownload: normalizeVideo(
          row?.videoDownload ?? DEFAULT_VIDEO_DOWNLOAD,
        ),
        imageDownload: normalizeImage(
          row?.imageDownload ?? DEFAULT_IMAGE_DOWNLOAD,
        ),
      };
      return cache;
    } catch (err) {
      log.warn("[pond prefs] failed to read settings, using defaults", err);
      return {
        prefs: DEFAULT_PREFS,
        videoDownload: DEFAULT_VIDEO_DOWNLOAD,
        imageDownload: DEFAULT_IMAGE_DOWNLOAD,
      };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function getPrefs(): Promise<Prefs> {
  return (await loadSettings()).prefs;
}

export async function getVideoDownloadPrefs(): Promise<VideoDownloadSettings> {
  return (await loadSettings()).videoDownload;
}

export async function getImageDownloadPrefs(): Promise<ImageDownloadSettings> {
  return (await loadSettings()).imageDownload;
}

export async function setPrefs(patch: DeepPartial<Prefs>): Promise<Prefs> {
  const current = await loadSettings();
  const merged = mergePrefs(current.prefs, patch);
  const db = await getGlobalDb();
  await db
    .insert(settingsTable)
    .values({
      id: "singleton",
      prefs: merged,
    })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { prefs: merged, updatedAt: new Date() },
    })
    .run();
  if (cache) cache = { ...cache, prefs: merged };
  return merged;
}

export async function setVideoDownloadPrefs(
  next: Partial<VideoDownloadSettings>,
): Promise<VideoDownloadSettings> {
  const current = await loadSettings();
  const merged = normalizeVideo({ ...current.videoDownload, ...next });
  const db = await getGlobalDb();
  await db
    .insert(settingsTable)
    .values({
      id: "singleton",
      videoDownload: merged,
    })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { videoDownload: merged, updatedAt: new Date() },
    })
    .run();
  if (cache) cache = { ...cache, videoDownload: merged };
  return merged;
}

export async function setImageDownloadPrefs(
  next: Partial<ImageDownloadSettings>,
): Promise<ImageDownloadSettings> {
  const current = await loadSettings();
  const merged = normalizeImage({ ...current.imageDownload, ...next });
  const db = await getGlobalDb();
  await db
    .insert(settingsTable)
    .values({
      id: "singleton",
      imageDownload: merged,
    })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { imageDownload: merged, updatedAt: new Date() },
    })
    .run();
  if (cache) cache = { ...cache, imageDownload: merged };
  return merged;
}

const ALLOWED_HEIGHTS = new Set([480, 720, 1080, 1440, 2160]);

function normalizeVideo(value: VideoDownloadSettings): VideoDownloadSettings {
  return {
    enabled: Boolean(value.enabled),
    maxHeight: clampHeight(value.maxHeight),
    maxFileSizeMb: clampFilesize(value.maxFileSizeMb, 10_000),
  };
}

function clampHeight(h: VideoDownloadSettings["maxHeight"]): number | null {
  if (h === null || h === undefined) return null;
  const n = Math.floor(Number(h));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (ALLOWED_HEIGHTS.has(n)) return n;
  let best = 1080;
  let bestDelta = Math.abs(best - n);
  for (const bucket of ALLOWED_HEIGHTS) {
    const d = Math.abs(bucket - n);
    if (d < bestDelta) {
      best = bucket;
      bestDelta = d;
    }
  }
  return best;
}

const ALLOWED_LONG_EDGES = new Set([1024, 2048, 4096]);

function normalizeImage(value: ImageDownloadSettings): ImageDownloadSettings {
  return {
    maxLongEdge: clampLongEdge(value.maxLongEdge),
    maxFileSizeMb: clampFilesize(value.maxFileSizeMb, 1_000),
  };
}

function clampLongEdge(
  edge: ImageDownloadSettings["maxLongEdge"],
): number | null {
  if (edge === null || edge === undefined) return null;
  const n = Math.floor(Number(edge));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (ALLOWED_LONG_EDGES.has(n)) return n;
  let best = 2048;
  let bestDelta = Math.abs(best - n);
  for (const bucket of ALLOWED_LONG_EDGES) {
    const d = Math.abs(bucket - n);
    if (d < bestDelta) {
      best = bucket;
      bestDelta = d;
    }
  }
  return best;
}

function clampFilesize(
  mb: number | null | undefined,
  ceiling: number,
): number | null {
  if (mb === null || mb === undefined) return null;
  const n = Math.floor(Number(mb));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, ceiling);
}

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

function mergePrefs(
  base: Prefs,
  patch: DeepPartial<Prefs> | null | undefined,
): Prefs {
  if (!patch || typeof patch !== "object") return base;
  const baseRec = base as unknown as Record<string, unknown>;
  const patchRec = patch as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...baseRec };
  for (const key of Object.keys(baseRec)) {
    const baseVal = baseRec[key];
    const patchVal = patchRec[key];
    if (patchVal && typeof patchVal === "object" && !Array.isArray(patchVal)) {
      out[key] = { ...(baseVal as object), ...(patchVal as object) };
    } else if (patchVal !== undefined) {
      out[key] = patchVal;
    }
  }
  return out as unknown as Prefs;
}
