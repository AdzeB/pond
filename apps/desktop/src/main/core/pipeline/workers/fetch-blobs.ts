import { extname } from "node:path";
import type { SaveFile } from "@pond/schema/db";
import log from "electron-log/main.js";
import { fetchMediaBatch } from "../../../lib/blob";
import { processImage } from "../../../lib/image-process";
import { persistSave } from "../../persist-save";
import { getImageDownloadPrefs } from "../../prefs";
import { readSave } from "./apply";

export async function runFetchBlobs(saveId: string): Promise<void> {
  const save = await readSave(saveId);
  if (!save) return;

  const urls = collectMediaUrls(save.rawJson);
  if (urls.length === 0) {
    log.debug("[pond pipeline:fetch-blobs] no media urls, skipping", saveId);
    return;
  }

  // Self-gate: every URL already mapped to a file => skip.
  const existingFiles = save.files ?? [];
  const haveAllCovers = mediaUrlsCovered(urls, existingFiles);
  if (haveAllCovers) {
    log.debug(
      "[pond pipeline:fetch-blobs] all media already on disk, skipping",
      saveId,
    );
    return;
  }

  const imagePrefs = await getImageDownloadPrefs();
  const imageMaxBytes = imagePrefs.maxFileSizeMb
    ? imagePrefs.maxFileSizeMb * 1024 * 1024
    : null;

  const fetched = await fetchMediaBatch(urls, { imageMaxBytes });
  if (fetched.length === 0) {
    log.warn("[pond pipeline:fetch-blobs] all fetches failed", saveId, urls);
    return;
  }

  const newFiles = await Promise.all(
    fetched.map(async (tx) => {
      const kind: SaveFile["kind"] = tx.filename.startsWith("video")
        ? "video"
        : tx.filename.startsWith("cover")
          ? "cover"
          : "media";
      let bytes: Buffer = Buffer.from(tx.bytes);
      let filename = tx.filename;
      let mimeType = tx.mimeType;
      if (kind !== "video") {
        const processed = await processImage(
          bytes,
          filename,
          mimeType ?? undefined,
          imagePrefs,
        );
        if (processed) {
          bytes = processed.bytes;
          filename = processed.filename;
          mimeType = processed.mimeType;
        }
      }
      return {
        kind,
        filename,
        bytes,
        ...(mimeType ? { mimeType } : {}),
      };
    }),
  );

  await persistSave(
    saveId,
    { fileSize: newFiles[0]?.bytes.byteLength ?? null },
    {
      actorReason: "pipeline:fetch-blobs",
      newFiles,
    },
  );
  log.info("[pond pipeline:fetch-blobs] wrote", {
    saveId,
    count: newFiles.length,
  });
}

// URLs fetchable with a plain GET; non-direct video page URLs stay for fetch_video_ytdlp.
function collectMediaUrls(rawJson: unknown): string[] {
  if (!rawJson || typeof rawJson !== "object") return [];
  const v = rawJson as {
    capture?: { media?: Array<{ url?: string; type?: string }> };
  };
  const media = v.capture?.media ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of media) {
    if (typeof m.url !== "string") continue;
    if (m.type === "video" && !hasDirectVideoExtension(m.url)) continue;
    if (seen.has(m.url)) continue;
    seen.add(m.url);
    out.push(m.url);
  }
  return out;
}

const DIRECT_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

function hasDirectVideoExtension(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    const dot = path.lastIndexOf(".");
    if (dot === -1) return false;
    return DIRECT_VIDEO_EXTENSIONS.has(path.slice(dot));
  } catch {
    return false;
  }
}

function mediaUrlsCovered(
  urls: string[],
  files: ReadonlyArray<SaveFile>,
): boolean {
  if (urls.length === 0) return true;
  // No URL→file mapping kept; use file count as a coarse "covered" signal.
  const coverCount = files.filter(
    (f) => f.kind === "cover" || f.kind === "media",
  ).length;
  return coverCount >= urls.length;
}

void extname;
