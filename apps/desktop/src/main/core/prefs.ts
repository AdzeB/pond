import {
  DEFAULT_IMAGE_DOWNLOAD,
  DEFAULT_PREFS,
  DEFAULT_SKILLS,
  DEFAULT_VIDEO_DOWNLOAD,
  type ImageDownloadSettings,
  type Prefs,
  PrefsSchema,
  settings as settingsTable,
  type VideoDownloadSettings,
} from "@pond/schema/db";
import { eq } from "drizzle-orm";
import log from "electron-log/main.js";
import { getGlobalDb } from "../db";
import { createMemoCache } from "../lib/memo-cache";

interface SettingsCache {
  prefs: Prefs;
  videoDownload: VideoDownloadSettings;
  imageDownload: ImageDownloadSettings;
}

// Cache parsed settings until invalidate()/set(); a DB failure isn't cached, so it retries.
const settingsCache = createMemoCache<SettingsCache>(fetchSettings);

export function invalidatePrefs(): void {
  settingsCache.invalidate();
}

async function fetchSettings(): Promise<SettingsCache> {
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
  return {
    prefs: loadPrefs(row?.prefs),
    videoDownload: normalizeVideo(row?.videoDownload ?? DEFAULT_VIDEO_DOWNLOAD),
    imageDownload: normalizeImage(row?.imageDownload ?? DEFAULT_IMAGE_DOWNLOAD),
  };
}

async function loadSettings(): Promise<SettingsCache> {
  try {
    return await settingsCache.get();
  } catch (err) {
    log.warn("[pond prefs] failed to read settings, using defaults", err);
    return {
      prefs: DEFAULT_PREFS,
      videoDownload: DEFAULT_VIDEO_DOWNLOAD,
      imageDownload: DEFAULT_IMAGE_DOWNLOAD,
    };
  }
}

export async function getPrefs(): Promise<Prefs> {
  const prefs = (await loadSettings()).prefs;
  if (prefs.skills.seeded) return prefs;
  return seedDefaultSkills(prefs);
}

// Back-fill the starter skills exactly once. Defaults are prepended, skipping
// any slug the user already defined, then `seeded` flips true so this never
// runs again (so deleting a starter skill sticks). Persisted so it survives a
// reload even though it originates from a read.
async function seedDefaultSkills(prefs: Prefs): Promise<Prefs> {
  const existing = new Set(prefs.skills.custom.map((s) => s.name));
  const additions = DEFAULT_SKILLS.filter((s) => !existing.has(s.name));
  return setPrefs({
    skills: { custom: [...additions, ...prefs.skills.custom], seeded: true },
  });
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
  const cached = settingsCache.peek();
  if (cached) settingsCache.set({ ...cached, prefs: merged });
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

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

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

function normalizeVideo(value: VideoDownloadSettings): VideoDownloadSettings {
  return {
    enabled: bool(value.enabled, true),
    maxHeight: snapToSet(value.maxHeight, ALLOWED_HEIGHTS, 1080),
    maxFps: snapToSet(value.maxFps, ALLOWED_FPS, 60),
    videoCodec: oneOf(value.videoCodec, VIDEO_CODECS, "h264"),
    audioCodec: oneOf(value.audioCodec, AUDIO_CODECS, "aac"),
    container: oneOf(value.container, VIDEO_CONTAINERS, "auto"),
    maxFileSizeMb: clampFilesize(value.maxFileSizeMb, 10_000),
    subtitles: oneOf(value.subtitles, SUBTITLE_MODES, "off"),
    subtitleLang: sanitizeLang(value.subtitleLang),
    embedMetadata: bool(value.embedMetadata, true),
    embedThumbnail: bool(value.embedThumbnail, false),
    embedChapters: bool(value.embedChapters, false),
    sponsorblockRemove: bool(value.sponsorblockRemove, false),
  };
}

function normalizeImage(value: ImageDownloadSettings): ImageDownloadSettings {
  return {
    maxLongEdge: snapToSet(value.maxLongEdge, ALLOWED_LONG_EDGES, 2048),
    format: oneOf(value.format, IMAGE_FORMATS, "original"),
    quality: clampQuality(value.quality),
    lossless: bool(value.lossless, false),
    progressive: bool(value.progressive, false),
    preserveMetadata: bool(value.preserveMetadata, false),
    maxFileSizeMb: clampFilesize(value.maxFileSizeMb, 1_000),
  };
}

function clampQuality(q: number | null | undefined): number {
  const n = Math.floor(Number(q));
  if (!Number.isFinite(n)) return 80;
  return Math.min(100, Math.max(1, n));
}

function sanitizeLang(value: unknown): string {
  if (typeof value !== "string") return "en";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "en";
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

// Validate stored prefs; PrefsSchema fills missing/corrupt fields from defaults per slice.
function loadPrefs(stored: unknown): Prefs {
  const parsed = PrefsSchema.safeParse(stored);
  return (parsed.success ? parsed.data : DEFAULT_PREFS) as Prefs;
}

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
