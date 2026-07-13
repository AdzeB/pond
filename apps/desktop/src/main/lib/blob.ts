import { extname } from "node:path";
import type { TxSaveFile } from "@pond/schema/tx";
import log from "electron-log/main.js";

/** 50 MiB. */
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
/** 2 MiB. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

interface FetchMediaOptions {
  imageMaxBytes?: number | null;
}

/** Transient misses retry; permanent means the URL will never succeed, so the worker settles it as done. */
type BlobMiss = "transient" | "permanent";

function classifyHttpStatus(status: number): BlobMiss {
  if (status === 408 || status === 425 || status === 429) return "transient";
  if (status >= 500) return "transient";
  return "permanent";
}

type MediaFetchOutcome = { file: TxSaveFile } | { miss: BlobMiss };

/** One downloaded media URL paired with its origin URL so callers can persist a URL->file mapping and tally transient vs permanent misses. */
interface MediaBatchEntry {
  url: string;
  file: TxSaveFile | null;
  miss?: BlobMiss;
}

function extensionFor(mimeType: string | null, url: string): string {
  const fromUrl = extname(new URL(url).pathname).toLowerCase();
  if (fromUrl) return fromUrl;
  if (!mimeType) return ".bin";
  if (mimeType.includes("jpeg")) return ".jpg";
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("gif")) return ".gif";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("avif")) return ".avif";
  if (mimeType.includes("mp4")) return ".mp4";
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("quicktime")) return ".mov";
  if (mimeType.includes("svg")) return ".svg";
  return ".bin";
}

function kindFor(mimeType: string | null): "cover" | "video" | "other" {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "cover";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
}

async function fetchMediaToTxFile(
  mediaUrl: string,
  index = 0,
  options: FetchMediaOptions = {},
): Promise<MediaFetchOutcome> {
  let res: Response;
  try {
    res = await fetch(mediaUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("[pond blob] fetch failed", mediaUrl, err);
    return { miss: "transient" };
  }
  if (!res.ok) {
    log.warn("[pond blob] non-2xx", res.status, mediaUrl);
    return { miss: classifyHttpStatus(res.status) };
  }

  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
  const isImage = (mime ?? "").startsWith("image/");
  const imageCap =
    isImage && options.imageMaxBytes && options.imageMaxBytes > 0
      ? options.imageMaxBytes
      : null;
  const hardCap = imageCap
    ? Math.min(imageCap, MAX_DOWNLOAD_BYTES)
    : MAX_DOWNLOAD_BYTES;

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > hardCap) {
    log.warn("[pond blob] too big, skipping", {
      url: mediaUrl,
      contentLength,
      cap: hardCap,
      reason: imageCap ? "image cap" : "absolute cap",
    });
    return { miss: "permanent" };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > hardCap) {
    log.warn("[pond blob] declared size mismatch, skipping", {
      url: mediaUrl,
      bytes: buf.byteLength,
      cap: hardCap,
      reason: imageCap ? "image cap" : "absolute cap",
    });
    return { miss: "permanent" };
  }

  const ext = extensionFor(mime, mediaUrl);
  const kind = kindFor(mime);
  const filename = nameFor(kind, ext, index);

  return {
    file: {
      filename,
      bytes: buf,
      mimeType: mime ?? undefined,
    },
  };
}

function nameFor(
  kind: "cover" | "video" | "other",
  ext: string,
  index: number,
): string {
  if (kind === "video") {
    return index === 0 ? `video${ext}` : `video-${index}${ext}`;
  }
  return index === 0 ? `cover${ext}` : `media-${index}${ext}`;
}

export async function fetchAvatarToTxFile(
  avatarUrl: string,
): Promise<MediaFetchOutcome> {
  let res: Response;
  try {
    res = await fetch(avatarUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("[pond blob] avatar fetch failed", avatarUrl, err);
    return { miss: "transient" };
  }
  if (!res.ok) {
    log.warn("[pond blob] avatar non-2xx", res.status, avatarUrl);
    return { miss: classifyHttpStatus(res.status) };
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_AVATAR_BYTES) {
    log.warn("[pond blob] avatar too big, skipping", contentLength, avatarUrl);
    return { miss: "permanent" };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_AVATAR_BYTES) {
    log.warn(
      "[pond blob] avatar declared size mismatch, skipping",
      buf.byteLength,
      avatarUrl,
    );
    return { miss: "permanent" };
  }

  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
  if (mime && !mime.startsWith("image/")) {
    log.warn("[pond blob] avatar not an image, skipping", mime, avatarUrl);
    return { miss: "permanent" };
  }

  const ext = extensionFor(mime, avatarUrl);
  return {
    file: {
      filename: `avatar${ext}`,
      bytes: buf,
      mimeType: mime ?? undefined,
    },
  };
}

export async function fetchMediaBatch(
  urls: string[],
  options: FetchMediaOptions = {},
): Promise<MediaBatchEntry[]> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
  }
  if (unique.length === 0) return [];

  const results: MediaBatchEntry[] = await Promise.all(
    unique.map(async (u, i): Promise<MediaBatchEntry> => {
      try {
        const outcome = await fetchMediaToTxFile(u, i, options);
        return "file" in outcome
          ? { url: u, file: outcome.file }
          : { url: u, file: null, miss: outcome.miss };
      } catch (err) {
        log.warn("[pond blob] batch fetch failed", u, err);
        return { url: u, file: null, miss: "transient" };
      }
    }),
  );

  return renumberCovers(results);
}

/** Reassigns cover/media filenames across the survivors while preserving each entry's origin url. */
function renumberCovers(entries: MediaBatchEntry[]): MediaBatchEntry[] {
  let coverAssigned = false;
  let mediaIndex = 1;
  return entries.map((entry) => {
    if (!entry.file) return entry;
    const f = entry.file;
    const ext = extname(f.filename).toLowerCase() || ".bin";
    if (f.filename.startsWith("video")) return entry;
    if (!coverAssigned) {
      coverAssigned = true;
      return { ...entry, file: { ...f, filename: `cover${ext}` } };
    }
    return {
      ...entry,
      file: { ...f, filename: `media-${mediaIndex++}${ext}` },
    };
  });
}
