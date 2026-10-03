import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import log from "electron-log/main.js";
import sharp, { type Metadata } from "sharp";
import { eagleFormatGroup } from "../../shared/eagle-formats";
import { canRequestNativeThumbnail } from "../../shared/file-format";
import {
  isThumbnailFileExtension,
  THUMBNAIL_CACHE_VERSION,
} from "../../shared/media-index";
import { thumbnailFilename } from "../../shared/save-file-names";
import { extractOfficePreview } from "../core/office-preview";
import { extractRawPreviewJpeg } from "../core/raw-preview";
import {
  isEncryptedLibraryMedia,
  libraryMediaMetadata,
  readLibraryMedia,
  readLibraryMediaRange,
  withDecryptedLibraryMediaPath,
  writeLibraryMedia,
} from "../core/storage/library-media-storage";
import { libraryRoot, thumbnailCacheRoot } from "../paths";
import { decodeHeicOnMac } from "./heic";

const LEGACY_THUMBS_DIRNAME = "_thumbs";
const MIN_WIDTH = 32;
const MAX_WIDTH = 2048;
const WEBP_QUALITY = 78;
const MAX_CONCURRENT = 4;

export type ThumbnailPriority = "foreground" | "background";

const NATIVE_RASTER_EXT = new Set([".heic", ".heif"]);

export function isThumbnailable(ext: string): boolean {
  return isThumbnailFileExtension(ext);
}

export function isIsoBaseMediaHeader(header: Uint8Array): boolean {
  return (
    header.byteLength >= 12 &&
    Buffer.from(header).toString("ascii", 4, 8) === "ftyp"
  );
}

export function isRasterImageHeader(header: Uint8Array): boolean {
  if (header.byteLength >= 2 && header[0] === 0xff && header[1] === 0xd8) {
    return true;
  }
  if (
    header.byteLength >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return true;
  }
  if (
    header.byteLength >= 12 &&
    Buffer.from(header).toString("ascii", 0, 4) === "RIFF" &&
    Buffer.from(header).toString("ascii", 8, 12) === "WEBP"
  ) {
    return true;
  }
  return isIsoBaseMediaHeader(header);
}

export function clampThumbWidth(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  const w = Math.round(raw);
  if (w <= 0) return null;
  return Math.min(Math.max(w, MIN_WIDTH), MAX_WIDTH);
}

const inflight = new Map<string, Promise<string | null>>();

export function createThumbnailScheduler(
  maxConcurrent: number,
  maxBackground = 2,
) {
  let active = 0;
  let backgroundActive = 0;
  const foreground: Array<() => void> = [];
  const background: Array<() => void> = [];

  function drain(): void {
    while (active < maxConcurrent) {
      const next =
        foreground.shift() ??
        (backgroundActive < maxBackground ? background.shift() : undefined);
      if (!next) return;
      next();
    }
  }

  async function run<T>(
    priority: ThumbnailPriority,
    task: () => Promise<T>,
  ): Promise<T> {
    await new Promise<void>((resolve) => {
      const start = () => {
        active += 1;
        if (priority === "background") backgroundActive += 1;
        resolve();
      };
      (priority === "foreground" ? foreground : background).push(start);
      drain();
    });
    try {
      return await task();
    } finally {
      active -= 1;
      if (priority === "background") backgroundActive -= 1;
      drain();
    }
  }

  return { run };
}

const scheduler = createThumbnailScheduler(MAX_CONCURRENT);

interface ThumbnailRequest {
  saveId: string;
  sourcePath: string;
  width: number;
  version: string | null;
  priority?: ThumbnailPriority;
}

export type ThumbnailKind = "sharp" | "native" | "sharp-or-native";
type ThumbnailOutput = { width: number; out: string };

export async function getOrCreateThumbnail(
  req: ThumbnailRequest,
): Promise<{ path: string } | null> {
  const exact = lookupExactCachedThumbnail(req);
  if (exact) return exact;

  const { saveId, sourcePath, width } = req;
  const version = await resolveVersion(sourcePath, req.version);
  if (!version) return null;
  const dir = join(thumbnailCacheRoot(), sanitizeSegment(saveId));
  const out = thumbnailOutput(dir, sourcePath, version, width);

  if (existsSync(out)) return { path: out };

  const existing = inflight.get(out);
  if (existing) {
    const done = await existing;
    return done ? { path: done } : null;
  }

  const legacyDir = join(
    libraryRoot(),
    LEGACY_THUMBS_DIRNAME,
    sanitizeSegment(saveId),
  );
  const legacyOut = thumbnailOutput(legacyDir, sourcePath, version, width);
  if (existsSync(legacyOut)) {
    const promotion = promoteLegacyThumbnail(legacyOut, out, dir);
    inflight.set(out, promotion);
    try {
      const done = await promotion;
      return done ? { path: done } : null;
    } finally {
      inflight.delete(out);
    }
  }

  const kind = await detectThumbnailKind(sourcePath);
  if (!kind) return null;
  const task = generate(
    out,
    dir,
    sourcePath,
    width,
    kind,
    req.priority ?? "foreground",
  );
  inflight.set(out, task);
  try {
    const done = await task;
    return done ? { path: done } : null;
  } finally {
    inflight.delete(out);
  }
}

function lookupExactCachedThumbnail(req: {
  saveId: string;
  sourcePath: string;
  width: number;
  version: string | null;
}): { path: string } | null {
  if (!req.version) return null;
  const segment = sanitizeSegment(req.saveId);
  const dir = join(thumbnailCacheRoot(), segment);
  const out = thumbnailOutput(dir, req.sourcePath, req.version, req.width);
  if (existsSync(out)) return { path: out };
  const legacyOut = thumbnailOutput(
    join(libraryRoot(), LEGACY_THUMBS_DIRNAME, segment),
    req.sourcePath,
    req.version,
    req.width,
  );
  if (existsSync(legacyOut)) return { path: legacyOut };
  return null;
}

/**
 * Sync cache probe for the protocol hot path. Never generates.
 * Exact width only: a different bucket must not stand in for the card thumb.
 */
export function lookupCachedThumbnail(req: {
  saveId: string;
  sourcePath: string;
  width: number;
  version: string | null;
}): { path: string } | null {
  return lookupExactCachedThumbnail(req);
}

export function ensureThumbnailInBackground(req: ThumbnailRequest): void {
  void getOrCreateThumbnail({
    ...req,
    priority: req.priority ?? "background",
  }).catch(() => {});
}

async function promoteLegacyThumbnail(
  legacyOut: string,
  out: string,
  dir: string,
): Promise<string | null> {
  if (existsSync(out)) return out;
  try {
    await mkdir(dir, { recursive: true });
    const bytes = await readLibraryMedia(legacyOut);
    try {
      await writeLibraryMedia(out, bytes);
    } finally {
      bytes.fill(0);
    }
    return out;
  } catch (err) {
    if (existsSync(legacyOut)) {
      log.warn("[pond thumbnail] local promotion failed", legacyOut, err);
      return legacyOut;
    }
    return null;
  }
}

async function generate(
  out: string,
  dir: string,
  sourcePath: string,
  width: number,
  kind: ThumbnailKind,
  priority: ThumbnailPriority,
): Promise<string | null> {
  const results = await generateMany(
    [{ out, width }],
    dir,
    sourcePath,
    kind,
    priority,
  );
  return results.get(out) ?? null;
}

async function generateMany(
  outputs: readonly ThumbnailOutput[],
  dir: string,
  sourcePath: string,
  kind: ThumbnailKind,
  priority: ThumbnailPriority,
): Promise<Map<string, string>> {
  return scheduler.run(priority, async () => {
    const results = new Map<string, string>();
    try {
      const missing = outputs.filter(({ out }) => {
        if (!existsSync(out)) return true;
        results.set(out, out);
        return false;
      });
      if (missing.length === 0) return results;

      const maxWidth = Math.max(...missing.map(({ width }) => width));
      const source = await thumbnailPipeline(sourcePath, maxWidth, kind);
      if (!source) return results;
      const { pipeline } = source;

      await mkdir(dir, { recursive: true });
      for (const { out, width } of missing) {
        try {
          const bytes = await pipeline
            .clone()
            .resize({ width, fit: "inside", withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
          try {
            await writeLibraryMedia(out, bytes);
          } finally {
            bytes.fill(0);
          }
          results.set(out, out);
        } catch (err) {
          log.warn("[pond thumbnail] width failed", sourcePath, width, err);
        }
      }
      return results;
    } catch (err) {
      log.warn("[pond thumbnail] generate failed", sourcePath, err);
      return results;
    }
  });
}

async function thumbnailPipeline(
  sourcePath: string,
  width: number,
  kind: ThumbnailKind,
): Promise<{
  pipeline: ReturnType<typeof sharp>;
  metadata: Metadata;
} | null> {
  if (kind === "native") {
    const imported = await importedThumbnailSidecarPipeline(sourcePath);
    if (imported) return imported;
  }
  if (await isEncryptedLibraryMedia(sourcePath)) {
    return withDecryptedLibraryMediaPath(sourcePath, async (path) => {
      const decoded = await thumbnailPipeline(path, width, kind);
      if (!decoded) return null;
      const bytes = await decoded.pipeline.toBuffer();
      const pipeline = sharp(bytes, { failOn: "none" });
      return { pipeline, metadata: await pipeline.metadata() };
    });
  }
  if (kind === "native") {
    return nativeThumbnailPipeline(sourcePath, width);
  }
  try {
    const pipeline = sharp(sourcePath, { failOn: "none", pages: 1 });
    return { pipeline, metadata: await pipeline.metadata() };
  } catch {
    return kind === "sharp-or-native"
      ? nativeThumbnailPipeline(sourcePath, width)
      : null;
  }
}

export function thumbnailKindForExtension(ext: string): ThumbnailKind | null {
  const lower = ext.toLowerCase();
  if (NATIVE_RASTER_EXT.has(lower)) return "native";
  if (lower === ".jxl" || lower === ".tif" || lower === ".tiff") {
    return "sharp-or-native";
  }
  if (isThumbnailable(lower)) return "sharp";
  if (canRequestNativeThumbnail(`preview${lower}`)) return "native";
  return null;
}

async function detectThumbnailKind(
  sourcePath: string,
): Promise<ThumbnailKind | null> {
  const ext = extname(sourcePath).toLowerCase();
  const extensionKind = thumbnailKindForExtension(ext);
  if (extensionKind && extensionKind !== "native") return extensionKind;
  try {
    const header = await readFileHeader(sourcePath);
    if (!isRasterImageHeader(header)) return extensionKind;
    return isIsoBaseMediaHeader(header) ? "native" : "sharp";
  } catch {
    return extensionKind;
  }
}

async function resolveVersion(
  sourcePath: string,
  version: string | null,
): Promise<string | null> {
  if (version) return version;
  try {
    const [source, media] = await Promise.all([
      stat(sourcePath),
      libraryMediaMetadata(sourcePath),
    ]);
    return `${Math.round(source.mtimeMs)}-${media.originalSize}`;
  } catch {
    return null;
  }
}

function thumbnailOutput(
  dir: string,
  sourcePath: string,
  version: string,
  width: number,
): string {
  const key = createHash("sha1")
    .update(`${sourcePath}|${version}|${width}|webp|${THUMBNAIL_CACHE_VERSION}`)
    .digest("hex")
    .slice(0, 20);
  return join(dir, `${key}.webp`);
}

async function nativeThumbnailPipeline(
  sourcePath: string,
  width: number,
): Promise<{
  pipeline: ReturnType<typeof sharp>;
  metadata: Metadata;
} | null> {
  const imported = await importedThumbnailSidecarPipeline(sourcePath);
  if (imported) return imported;
  if (
    process.platform === "darwin" &&
    NATIVE_RASTER_EXT.has(extname(sourcePath).toLowerCase())
  ) {
    const pipeline = sharp(await decodeHeicOnMac(sourcePath, width));
    return { pipeline, metadata: await pipeline.metadata() };
  }
  const raw = await rawThumbnailPipeline(sourcePath);
  if (raw) return raw;
  const native = await osNativeThumbnail(sourcePath, width);
  if (native) return native;
  return officeThumbnailPipeline(sourcePath);
}

async function importedThumbnailSidecarPipeline(sourcePath: string): Promise<{
  pipeline: ReturnType<typeof sharp>;
  metadata: Metadata;
} | null> {
  const sidecarPath = join(dirname(sourcePath), thumbnailFilename(sourcePath));
  if (!existsSync(sidecarPath)) return null;
  try {
    const pipeline = sharp(await readLibraryMedia(sidecarPath), {
      failOn: "none",
    });
    return { pipeline, metadata: await pipeline.metadata() };
  } catch {
    return null;
  }
}

async function rawThumbnailPipeline(sourcePath: string): Promise<{
  pipeline: ReturnType<typeof sharp>;
  metadata: Metadata;
} | null> {
  const extension = extname(sourcePath).toLowerCase().replace(/^\./, "");
  if (eagleFormatGroup(extension) !== "rawImage") return null;
  try {
    const jpeg = extractRawPreviewJpeg(await readLibraryMedia(sourcePath));
    if (!jpeg) return null;
    const pipeline = sharp(jpeg, { failOn: "none" });
    return { pipeline, metadata: await pipeline.metadata() };
  } catch {
    return null;
  }
}

async function officeThumbnailPipeline(sourcePath: string): Promise<{
  pipeline: ReturnType<typeof sharp>;
  metadata: Metadata;
} | null> {
  const preview = await extractOfficePreview(sourcePath);
  if (!preview) return null;
  try {
    const pipeline = sharp(preview, { failOn: "none" });
    return { pipeline, metadata: await pipeline.metadata() };
  } catch {
    return null;
  }
}

async function osNativeThumbnail(
  sourcePath: string,
  width: number,
): Promise<{
  pipeline: ReturnType<typeof sharp>;
  metadata: Metadata;
} | null> {
  if (process.platform !== "darwin" && process.platform !== "win32") {
    return null;
  }
  const { nativeImage } = await import("electron");
  const image = await nativeImage.createThumbnailFromPath(sourcePath, {
    width,
    height: width,
  });
  if (image.isEmpty()) return null;
  const nativePipeline = sharp(image.toPNG(), { failOn: "none" });
  return {
    pipeline: nativePipeline,
    metadata: await nativePipeline.metadata(),
  };
}

async function readFileHeader(sourcePath: string): Promise<Buffer> {
  const { originalSize } = await libraryMediaMetadata(sourcePath);
  const chunks: Buffer[] = [];
  for await (const chunk of readLibraryMediaRange({
    path: sourcePath,
    start: 0,
    endExclusive: Math.min(originalSize, 12),
  })) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
