import { extname } from "node:path";
import type { ImageDownloadSettings, ImageFormat } from "@pond/schema/db";
import log from "electron-log/main.js";
import sharp from "sharp";

interface ProcessedImage {
  bytes: Buffer;
  mimeType: string;
  filename: string;
  width?: number;
  height?: number;
}

const TARGET_EXT: Record<Exclude<ImageFormat, "original">, string> = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
  avif: ".avif",
};

const TARGET_MIME: Record<Exclude<ImageFormat, "original">, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/** Resizes/transcodes a still image per download prefs; null on passthrough or non-still input. */
export async function processImage(
  bytes: Buffer,
  filename: string,
  mimeType: string | undefined,
  prefs: ImageDownloadSettings,
): Promise<ProcessedImage | null> {
  if (mimeType && !mimeType.startsWith("image/")) return null;

  const nothingToDo =
    prefs.maxLongEdge === null &&
    prefs.format === "original" &&
    !prefs.preserveMetadata;
  if (nothingToDo) return null;

  try {
    const pipeline = sharp(bytes, { failOn: "none" });
    const metadata = await pipeline.metadata();
    /** Animated images are left untouched. */
    if ((metadata.pages ?? 1) > 1) return null;

    if (prefs.maxLongEdge !== null) {
      pipeline.resize(prefs.maxLongEdge, prefs.maxLongEdge, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    if (prefs.format !== "original") {
      applyFormat(pipeline, prefs);
    }

    if (prefs.preserveMetadata) pipeline.withMetadata();

    const { data: outBytes, info } = await pipeline.toBuffer({
      resolveWithObject: true,
    });
    const dims = dimsFromMeta(info);

    if (prefs.format === "original") {
      return {
        bytes: outBytes,
        mimeType: mimeType ?? mimeFromSharp(metadata.format),
        filename,
        ...dims,
      };
    }

    const ext = TARGET_EXT[prefs.format];
    return {
      bytes: outBytes,
      mimeType: TARGET_MIME[prefs.format],
      filename: replaceExt(filename, ext),
      ...dims,
    };
  } catch (err) {
    log.warn("[pond image-process] failed, keeping original", filename, err);
    return null;
  }
}

/** Probe width/height for still image bytes; null when undecodable or incomplete. */
export async function probeImageDims(
  bytes: Buffer,
): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(bytes, { failOn: "none" }).metadata();
    const dims = dimsFromMeta(meta);
    return dims.width && dims.height
      ? { width: dims.width, height: dims.height }
      : null;
  } catch {
    /** Undecodable buffer: caller writes the file without dims. */
  }
  return null;
}

function dimsFromMeta(meta: { width?: number; height?: number }): {
  width?: number;
  height?: number;
} {
  if (
    meta.width &&
    meta.height &&
    Number.isFinite(meta.width) &&
    Number.isFinite(meta.height)
  ) {
    return { width: meta.width, height: meta.height };
  }
  return {};
}

function applyFormat(
  pipeline: sharp.Sharp,
  prefs: ImageDownloadSettings,
): void {
  switch (prefs.format) {
    case "jpeg":
      pipeline.jpeg({ quality: prefs.quality, progressive: prefs.progressive });
      break;
    case "png":
      pipeline.png({ progressive: prefs.progressive, compressionLevel: 6 });
      break;
    case "webp":
      pipeline.webp({ quality: prefs.quality, lossless: prefs.lossless });
      break;
    case "avif":
      pipeline.avif({ quality: prefs.quality, lossless: prefs.lossless });
      break;
    default:
      break;
  }
}

function replaceExt(filename: string, ext: string): string {
  const current = extname(filename);
  const base = current ? filename.slice(0, -current.length) : filename;
  return `${base}${ext}`;
}

function mimeFromSharp(format: string | undefined): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}
