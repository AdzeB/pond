import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import log from "electron-log/main.js";
import sharp from "sharp";
import { libraryRoot } from "../paths";

const THUMBS_DIRNAME = "_thumbs";
const MIN_WIDTH = 64;
const MAX_WIDTH = 2048;
const WEBP_QUALITY = 78;
// Cap concurrent sharp jobs so a fast grid scroll can't peg every core
// at once. libvips already parallelizes a single resize internally.
const MAX_CONCURRENT = 4;

// Still raster formats we can safely downscale. Animated (multi-page)
// inputs are detected per-file via metadata; vector (svg) and unknown
// types are excluded so the protocol serves the original untouched.
const THUMBNAILABLE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export function isThumbnailable(ext: string): boolean {
  return THUMBNAILABLE_EXT.has(ext.toLowerCase());
}

// Clamp a requested width into a sane range. Returns null for garbage
// input so the caller falls back to the original file.
export function clampThumbWidth(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  const w = Math.round(raw);
  if (w <= 0) return null;
  return Math.min(Math.max(w, MIN_WIDTH), MAX_WIDTH);
}

// Per-output in-flight dedupe: concurrent requests for the same thumb
// (common on first grid paint) share one generation.
const inflight = new Map<string, Promise<string | null>>();

// Tiny FIFO semaphore. `active` stays pinned at the cap while work is
// queued because release() hands the slot directly to the next waiter.
let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function release(): void {
  const next = waiters.shift();
  if (next) {
    next();
  } else {
    active -= 1;
  }
}

interface ThumbnailRequest {
  // The save id is the protocol host; used only to partition the cache
  // on disk so a deleted save's thumbs can be dropped as a unit.
  saveId: string;
  // Absolute path to the source file, already validated to live inside
  // the library's items directory by the caller.
  sourcePath: string;
  // Target width in device pixels, already clamped.
  width: number;
  // Content version (file sha256 prefix) when known; null falls back to
  // mtime+size so the thumb regenerates if the source changes.
  version: string | null;
}

// Resolve a cached thumbnail for the request, generating it on demand.
// Returns the absolute path to a WebP under `_thumbs/`, or null when the
// source is animated/unreadable and the caller should serve the original.
export async function getOrCreateThumbnail(
  req: ThumbnailRequest,
): Promise<{ path: string } | null> {
  const { saveId, sourcePath, width } = req;

  let version = req.version;
  if (!version) {
    try {
      const s = await stat(sourcePath);
      version = `${Math.round(s.mtimeMs)}-${s.size}`;
    } catch {
      return null;
    }
  }

  const dir = join(libraryRoot(), THUMBS_DIRNAME, sanitizeSegment(saveId));
  const key = createHash("sha1")
    .update(`${sourcePath}|${version}|${width}|webp`)
    .digest("hex")
    .slice(0, 20);
  const out = join(dir, `${key}.webp`);

  if (existsSync(out)) return { path: out };

  const existing = inflight.get(out);
  if (existing) {
    const done = await existing;
    return done ? { path: done } : null;
  }

  const task = generate(out, dir, sourcePath, width);
  inflight.set(out, task);
  try {
    const done = await task;
    return done ? { path: done } : null;
  } finally {
    inflight.delete(out);
  }
}

async function generate(
  out: string,
  dir: string,
  sourcePath: string,
  width: number,
): Promise<string | null> {
  await acquire();
  try {
    // Re-check: another request may have produced it while we queued.
    if (existsSync(out)) return out;

    const pipeline = sharp(sourcePath, { failOn: "none" });
    const meta = await pipeline.metadata();
    // Multi-page = animated GIF/WebP. Resizing would flatten to one
    // frame, so leave it to the caller to serve the original.
    if ((meta.pages ?? 1) > 1) return null;

    await mkdir(dir, { recursive: true });
    // Write to a unique temp path then rename so a crash mid-encode can
    // never leave a truncated file that looks like a valid cache hit.
    const tmp = `${out}.${process.pid}.${Date.now()}.tmp`;
    await pipeline
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(tmp);
    await rename(tmp, out);
    return out;
  } catch (err) {
    log.warn("[pond thumbnail] generate failed", sourcePath, err);
    return null;
  } finally {
    release();
  }
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
