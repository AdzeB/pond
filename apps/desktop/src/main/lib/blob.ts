import { extname } from "node:path";
import type { TxSaveFile } from "@pond/schema/tx";
import log from "electron-log/main.js";

const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024; // 50 MiB
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MiB -- avatars are tiny
const DOWNLOAD_TIMEOUT_MS = 30_000;

export interface FetchMediaOptions {
  imageMaxBytes?: number | null;
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
): Promise<TxSaveFile | null> {
  let res: Response;
  try {
    res = await fetch(mediaUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("[pond blob] fetch failed", mediaUrl, err);
    return null;
  }
  if (!res.ok) {
    log.warn("[pond blob] non-2xx", res.status, mediaUrl);
    return null;
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
    return null;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > hardCap) {
    log.warn("[pond blob] declared size mismatch, skipping", {
      url: mediaUrl,
      bytes: buf.byteLength,
      cap: hardCap,
      reason: imageCap ? "image cap" : "absolute cap",
    });
    return null;
  }

  const ext = extensionFor(mime, mediaUrl);
  const kind = kindFor(mime);
  const filename = nameFor(kind, ext, index);

  return {
    filename,
    bytes: buf,
    mimeType: mime ?? undefined,
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
): Promise<TxSaveFile | null> {
  let res: Response;
  try {
    res = await fetch(avatarUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("[pond blob] avatar fetch failed", avatarUrl, err);
    return null;
  }
  if (!res.ok) {
    log.warn("[pond blob] avatar non-2xx", res.status, avatarUrl);
    return null;
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_AVATAR_BYTES) {
    log.warn("[pond blob] avatar too big, skipping", contentLength, avatarUrl);
    return null;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_AVATAR_BYTES) {
    log.warn(
      "[pond blob] avatar declared size mismatch, skipping",
      buf.byteLength,
      avatarUrl,
    );
    return null;
  }

  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
  if (mime && !mime.startsWith("image/")) {
    log.warn("[pond blob] avatar not an image, skipping", mime, avatarUrl);
    return null;
  }

  const ext = extensionFor(mime, avatarUrl);
  return {
    filename: `avatar${ext}`,
    bytes: buf,
    mimeType: mime ?? undefined,
  };
}

export async function fetchMediaBatch(
  urls: string[],
  options: FetchMediaOptions = {},
): Promise<TxSaveFile[]> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
  }
  if (unique.length === 0) return [];

  const results = await Promise.all(
    unique.map((u, i) =>
      fetchMediaToTxFile(u, i, options).catch((err) => {
        log.warn("[pond blob] batch fetch failed", u, err);
        return null;
      }),
    ),
  );

  const survivors = results.filter((r): r is TxSaveFile => r !== null);
  return renumberCovers(survivors);
}

function renumberCovers(files: TxSaveFile[]): TxSaveFile[] {
  let coverAssigned = false;
  let mediaIndex = 1;
  return files.map((f) => {
    const ext = extname(f.filename).toLowerCase() || ".bin";
    if (f.filename.startsWith("video")) return f;
    if (!coverAssigned) {
      coverAssigned = true;
      return { ...f, filename: `cover${ext}` };
    }
    return { ...f, filename: `media-${mediaIndex++}${ext}` };
  });
}
