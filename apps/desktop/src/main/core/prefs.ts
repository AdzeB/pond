import type { DeepPartial } from "@pond/schema/db";
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
import { app } from "electron";
import log from "electron-log/main.js";
import { getGlobalDb } from "../db";
import { createMemoCache } from "../lib/memo-cache";
import { normalizeImage, normalizeVideo } from "./download-prefs";
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
import { withInstalledChannel } from "./update-channel";

function resolvedPrefs(prefs: Prefs): Prefs {
  return withInstalledChannel(prefs, app.getVersion());
}

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
    prefs: resolvedPrefs(mergePrefs(stored.app, pond)),
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
      prefs: resolvedPrefs(DEFAULT_PREFS),
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
  const merged = resolvedPrefs(mergePrefs(stored.app, pondSlice));
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
