import { extname } from "node:path";
import type { ImageDownloadSettings, ImageFormat } from "@pond/schema/db";
import log from "electron-log/main.js";
import sharp from "sharp";

export interface ProcessedImage {
  bytes: Buffer;
  mimeType: string;
  filename: string;
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

// Resize and/or transcode a still image per the user's download prefs.
// Returns null when there is nothing to do (passthrough) or the input is not a
// processable still image (non-image, or an animated GIF/WebP we leave intact
// so the animation survives).
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
    if ((metadata.pages ?? 1) > 1) return null; // animated; leave untouched

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

    const outBytes = await pipeline.toBuffer();

    if (prefs.format === "original") {
      return {
        bytes: outBytes,
        mimeType: mimeType ?? mimeFromSharp(metadata.format),
        filename,
      };
    }

    const ext = TARGET_EXT[prefs.format];
    return {
      bytes: outBytes,
      mimeType: TARGET_MIME[prefs.format],
      filename: replaceExt(filename, ext),
    };
  } catch (err) {
    log.warn("[pond image-process] failed, keeping original", filename, err);
    return null;
  }
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
      pipeline.png({ progressive: prefs.progressive, compressionLevel: 9 });
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
