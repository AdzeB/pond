import { extname } from "node:path";
import type { ImageDownloadSettings, ImageFormat } from "@pond/schema/db";
import log from "electron-log/main.js";
import sharp, { type Sharp } from "sharp";

interface ProcessedImage {
  bytes: Buffer;
  mimeType: string;
  filename: string;
  width?: number;
  height?: number;
}

const TARGET_EXT = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
  avif: ".avif",
} satisfies Record<Exclude<ImageFormat, "original">, string>;

const TARGET_MIME = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} satisfies Record<Exclude<ImageFormat, "original">, string>;

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

/** Resolves null when the image decodes without dimensions; rejects when the bytes are not a readable image. */
export async function probeImageDims(
  bytes: Buffer,
): Promise<{ width: number; height: number } | null> {
  const meta = await sharp(bytes, { failOn: "none" }).metadata();
  const dims = dimsFromMeta(meta);
  return dims.width && dims.height
    ? { width: dims.width, height: dims.height }
    : null;
}

interface ImageDims {
  width?: number;
  height?: number;
}

function dimsFromMeta(meta: ImageDims): ImageDims {
  const { width, height } = meta;
  if (!width || !height) return {};
  if (!Number.isFinite(width) || !Number.isFinite(height)) return {};
  return { width, height };
}

function applyFormat(pipeline: Sharp, prefs: ImageDownloadSettings): void {
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
