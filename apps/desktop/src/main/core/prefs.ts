import type { DeepPartial } from "@pond/schema/db";
import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_PREFS,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadSettings,
  type Prefs,
  PrefsSchema,
  settings as settingsTable,
  type VideoDownloadSettings,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { z } from "zod";
import { getGlobalDb } from "../db";
import { createMemoCache } from "../lib/memo-cache";
import { prepareGlobalShortcuts } from "./global-shortcuts";
import {
  currentLibraryId,
  isUnboundLibraryId,
  mergeAppSlice,
  mergePondSlice,
  mergePrefs,
  normalizeStoredPrefs,
  type PondPrefs,
  readBundlePondPrefs,
  type StoredPrefs,
  type StoredPrefsInput,
  splitPrefsPatch,
  writeBundlePondPrefs,
} from "./prefs-scope";

interface SettingsCache {
  libraryId: string;
  prefs: Prefs;
  videoDownload: VideoDownloadSettings;
  imageDownload: ImageDownloadSettings;
}

const settingsCache = createMemoCache<SettingsCache>(fetchSettings);
const prefsListeners = new Set<(prefs: Prefs) => void>();

export function subscribePrefs(listener: (prefs: Prefs) => void): () => void {
  prefsListeners.add(listener);
  return () => {
    prefsListeners.delete(listener);
  };
}

export function invalidatePrefs(): void {
  settingsCache.invalidate();
}

async function fetchSettings(): Promise<SettingsCache> {
  const libraryId = currentLibraryId();
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
  const stored = normalizeStoredPrefs(row?.prefs);
  if (!isSameStored(row?.prefs, stored)) {
    await persistStoredPrefs(stored);
  }
  const pond = await resolvePondSlice(stored, libraryId);
  return {
    libraryId,
    prefs: mergePrefs(stored.app, pond),
    videoDownload: normalizeVideo(row?.videoDownload ?? DEFAULT_VIDEO_DOWNLOAD),
    imageDownload: normalizeImage(row?.imageDownload ?? DEFAULT_IMAGE_DOWNLOAD),
  };
}

async function resolvePondSlice(
  stored: StoredPrefs,
  libraryId: string,
): Promise<DeepPartial<PondPrefs>> {
  if (isUnboundLibraryId(libraryId)) return stored.pending ?? {};

  let bundle: DeepPartial<PondPrefs> | null = null;
  try {
    bundle = readBundlePondPrefs();
  } catch (error) {
    log.debug("[pond prefs] Library preferences unavailable", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return stored.pending ?? {};
  }
  if (bundle) return bundle;

  const seed = mergePondSlice(stored.pending ?? {});
  try {
    writeBundlePondPrefs(seed);
  } catch (err) {
    log.warn("[pond prefs] seeding bundle settings.json failed", err);
    return seed;
  }
  if (stored.pending) {
    try {
      await persistStoredPrefs({ ...stored, pending: null });
    } catch (err) {
      log.warn("[pond prefs] clearing pending library prefs failed", err);
    }
  }
  return seed;
}

async function loadSettings(): Promise<SettingsCache> {
  try {
    const cached = settingsCache.peek();
    const libraryId = currentLibraryId();
    if (cached && cached.libraryId === libraryId) return cached;
    settingsCache.invalidate();
    return await settingsCache.get();
  } catch (err) {
    log.warn("[pond prefs] failed to read settings, using defaults", err);
    return {
      libraryId: currentLibraryId(),
      prefs: DEFAULT_PREFS,
      videoDownload: DEFAULT_VIDEO_DOWNLOAD,
      imageDownload: DEFAULT_IMAGE_DOWNLOAD,
    };
  }
}

function isSameStored(raw: StoredPrefsInput, stored: StoredPrefs): boolean {
  try {
    return JSON.stringify(raw) === JSON.stringify(stored);
  } catch {
    return false;
  }
}

async function persistStoredPrefs(stored: StoredPrefs): Promise<void> {
  const db = await getGlobalDb();
  await db
    .insert(settingsTable)
    .values({
      id: "singleton",
      prefs: stored,
    })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { prefs: stored, updatedAt: new Date() },
    })
    .run();
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

let prefsQueue = Promise.resolve();

export function setPrefs(patch: DeepPartial<Prefs>): Promise<Prefs> {
  const operation = prefsQueue.then(() => applyPrefs(patch));
  prefsQueue = operation.then(
    () => {},
    () => {},
  );
  return operation;
}

async function applyPrefs(patch: DeepPartial<Prefs>): Promise<Prefs> {
  const libraryId = currentLibraryId();
  const current = await loadSettings();
  const { app, pond } = splitPrefsPatch(patch);

  let stored = normalizeStoredPrefs(await readRawStoredPrefs());

  let pondSlice: PondPrefs;
  if (isUnboundLibraryId(libraryId)) {
    if (Object.keys(pond).length > 0) {
      stored = {
        ...stored,
        pending: mergePondSlice(stored.pending ?? {}, pond),
      };
    }
    pondSlice = mergePondSlice(stored.pending ?? {});
  } else {
    const base = readBundlePondPrefs() ?? mergePondSlice({});
    pondSlice = mergePondSlice(base, pond);
  }

  if (Object.keys(app).length > 0) {
    stored = { ...stored, app: mergeAppSlice(stored.app, app) };
  }
  const merged = mergePrefs(stored.app, pondSlice);
  const shortcutChange = patch.shortcuts
    ? prepareGlobalShortcuts(merged.shortcuts.overrides)
    : null;
  try {
    if (!isUnboundLibraryId(libraryId) && Object.keys(pond).length > 0)
      writeBundlePondPrefs(pondSlice);
    await persistStoredPrefs(stored);
    shortcutChange?.commit();
  } catch (error) {
    shortcutChange?.rollback();
    throw error;
  }
  settingsCache.set({
    libraryId,
    prefs: merged,
    videoDownload: current.videoDownload,
    imageDownload: current.imageDownload,
  });
  for (const listener of prefsListeners) {
    try {
      listener(merged);
    } catch (error) {
      log.warn("[pond prefs] listener failed", error);
    }
  }
  return merged;
}

async function readRawStoredPrefs(): Promise<StoredPrefsInput> {
  const db = await getGlobalDb();
  const rows = await db
    .select({ prefs: settingsTable.prefs })
    .from(settingsTable)
    .where(eq(settingsTable.id, "singleton"));
  return rows[0]?.prefs;
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
  const cached = settingsCache.peek();
  if (cached) settingsCache.set({ ...cached, videoDownload: merged });
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
  const cached = settingsCache.peek();
  if (cached) settingsCache.set({ ...cached, imageDownload: merged });
  return merged;
}

const ALLOWED_HEIGHTS = new Set([
  144, 240, 360, 480, 720, 1080, 1440, 2160, 4320,
]);
const ALLOWED_FPS = new Set([24, 30, 60]);
const ALLOWED_LONG_EDGES = new Set([1024, 2048, 4096, 8192]);

const VIDEO_CODECS = ["h264", "hevc", "av1", "vp9", "any"] as const;
const AUDIO_CODECS = ["aac", "opus", "any"] as const;
const VIDEO_CONTAINERS = ["auto", "mp4", "mkv", "webm", "mov"] as const;
const SUBTITLE_MODES = ["off", "download", "embed"] as const;
const IMAGE_FORMATS = ["original", "jpeg", "png", "webp", "avif"] as const;

const StoredVideoSettingsSchema = z.object({
  enabled: z.boolean().optional().catch(undefined),
  maxHeight: z.number().nullish().catch(undefined),
  maxFps: z.number().nullish().catch(undefined),
  videoCodec: z.enum(VIDEO_CODECS).optional().catch(undefined),
  audioCodec: z.enum(AUDIO_CODECS).optional().catch(undefined),
  container: z.enum(VIDEO_CONTAINERS).optional().catch(undefined),
  maxFileSizeMb: z.number().nullish().catch(undefined),
  subtitles: z.enum(SUBTITLE_MODES).optional().catch(undefined),
  subtitleLang: z.string().trim().min(1).optional().catch(undefined),
  embedMetadata: z.boolean().optional().catch(undefined),
  embedThumbnail: z.boolean().optional().catch(undefined),
  embedChapters: z.boolean().optional().catch(undefined),
  sponsorblockRemove: z.boolean().optional().catch(undefined),
});

const StoredImageSettingsSchema = z.object({
  maxLongEdge: z.number().nullish().catch(undefined),
  format: z.enum(IMAGE_FORMATS).optional().catch(undefined),
  quality: z.number().optional().catch(undefined),
  lossless: z.boolean().optional().catch(undefined),
  progressive: z.boolean().optional().catch(undefined),
  preserveMetadata: z.boolean().optional().catch(undefined),
  maxFileSizeMb: z.number().nullish().catch(undefined),
});

function snapToSet(
  value: number | null | undefined,
  set: Set<number>,
  fallback: number,
): number | null {
  if (value === null || value === undefined) return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (set.has(n)) return n;
  let best = fallback;
  let bestDelta = Math.abs(best - n);
  for (const bucket of set) {
    const d = Math.abs(bucket - n);
    if (d < bestDelta) {
      best = bucket;
      bestDelta = d;
    }
  }
  return best;
}

function normalizeVideo(
  input: z.input<typeof StoredVideoSettingsSchema>,
): VideoDownloadSettings {
  const stored = StoredVideoSettingsSchema.catch({}).parse(input);
  return {
    enabled: stored.enabled ?? true,
    maxHeight: snapToSet(stored.maxHeight, ALLOWED_HEIGHTS, 1080),
    maxFps: snapToSet(stored.maxFps, ALLOWED_FPS, 60),
    videoCodec: stored.videoCodec ?? "h264",
    audioCodec: stored.audioCodec ?? "aac",
    container: stored.container ?? "auto",
    maxFileSizeMb: clampFilesize(stored.maxFileSizeMb, 10_000),
    subtitles: stored.subtitles ?? "off",
    subtitleLang: stored.subtitleLang ?? "en",
    embedMetadata: stored.embedMetadata ?? true,
    embedThumbnail: stored.embedThumbnail ?? false,
    embedChapters: stored.embedChapters ?? false,
    sponsorblockRemove: stored.sponsorblockRemove ?? false,
  };
}

function normalizeImage(
  input: z.input<typeof StoredImageSettingsSchema>,
): ImageDownloadSettings {
  const stored = StoredImageSettingsSchema.catch({}).parse(input);
  return {
    maxLongEdge: snapToSet(stored.maxLongEdge, ALLOWED_LONG_EDGES, 2048),
    format: stored.format ?? "original",
    quality: clampQuality(stored.quality),
    lossless: stored.lossless ?? false,
    progressive: stored.progressive ?? false,
    preserveMetadata: stored.preserveMetadata ?? false,
    maxFileSizeMb: clampFilesize(stored.maxFileSizeMb, 1_000),
  };
}

function clampQuality(q: number | null | undefined): number {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n)) return 80;
  return Math.min(100, Math.max(1, n));
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

void PrefsSchema;
