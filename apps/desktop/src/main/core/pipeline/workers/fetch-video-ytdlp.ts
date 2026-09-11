import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { NewSave, Source } from "@pond/schema/db";
import type { CaptureMedia, RawJson, RawYtdlp } from "@pond/schema/raw";
import { storedAsRawJson } from "@pond/schema/raw-schema";
import { isVideoFile } from "@shared/media-index";
import log from "electron-log/main.js";
import type { TransferOptions } from "../../../lib/download-transfer";
import { probeImageDims } from "../../../lib/image-process";
import { buildFirstFramePoster } from "../../../lib/poster-from-frame";
import {
  type PosterWrite,
  posterFilename,
  usesPlatformPoster,
  videoFilename,
} from "../../../lib/poster-policy";
import { probeVideoDims } from "../../../lib/video-dims";
import { persistSave } from "../../persist-save";
import { type DownloadedVideoItem, downloadVideo } from "../../refresh/yt-dlp";
import { isAutoVideoBlockedByStorageGuard } from "../../storage-watcher";
import { TransientError } from "../extractors/errors";
import { expectedVideoDownloads, resolveYtDlpTarget } from "../specs";
import { readSave, type WriteFileArgs } from "./apply";

export async function runFetchVideoYtdlp(
  saveId: string,
  ctx?: TransferOptions,
): Promise<void> {
  const save = await readSave(saveId);
  if (!save) return;

  const expected = expectedVideoDownloads(save);
  const existingVideos = (save.files ?? []).filter(isVideoFile);
  if (expected > 0 && existingVideos.length >= expected) {
    log.debug(
      "[pond pipeline:fetch-video-ytdlp] video files already present, skipping",
      { saveId, existing: existingVideos.length, expected },
    );
    return;
  }

  const target = resolveYtDlpTarget(save);
  if (!target) return;

  const captureMedia = readCaptureMedia(save.rawJson);
  if (!captureMedia?.some((m) => m.type === "video")) {
    log.debug(
      "[pond pipeline:fetch-video-ytdlp] no video media in capture, skipping",
      { saveId, kinds: captureMedia?.map((m) => m.type) ?? null },
    );
    return;
  }

  if (isAutoVideoBlockedByStorageGuard()) {
    throw new TransientError(
      `fetch-video-ytdlp: storage guard blocking ${saveId}`,
    );
  }

  /** YouTube watch URLs share a playlist id; never expand those. Tweets with quoted/carousel clips must. */
  const allowPlaylist =
    expected > 1 && save.source !== "youtube" && save.source !== "pinterest";

  log.info("[pond pipeline:fetch-video-ytdlp] downloading", {
    saveId,
    target,
    source: save.source,
    expected,
    allowPlaylist,
  });
  const request: Parameters<typeof downloadVideo>[0] = {
    url: target,
    source: save.source,
    accountId: save.accountId,
    allowPlaylist,
    expectedCount: expected,
  };
  if (ctx?.signal) request.signal = ctx.signal;
  if (ctx?.reportActivity) request.reportActivity = ctx.reportActivity;
  const dl = await downloadVideo(request);
  if (!dl || dl.items.length === 0) {
    throw new TransientError(
      `fetch-video-ytdlp: no video produced for ${saveId}`,
    );
  }

  try {
    ctx?.signal?.throwIfAborted();
    ctx?.reportActivity?.({ phase: "processing" });
    const newFiles: WriteFileArgs[] = [];

    for (let i = 0; i < dl.items.length; i++) {
      const item = dl.items[i];
      if (!item) continue;
      const files = await filesForItem(item, i, save.source);
      if (!files) {
        throw new TransientError(
          `fetch-video-ytdlp: could not read produced file for ${saveId}`,
        );
      }
      newFiles.push(...files);
    }

    const primary = dl.items[0];
    const primaryDims = newFiles.find((f) => f.kind === "video");
    const patch: Partial<NewSave> = { mediaType: "video" };
    if (primaryDims?.width && primaryDims.height) {
      patch.width = primaryDims.width;
      patch.height = primaryDims.height;
    }
    if (primary?.infoJson) {
      patch.rawJson = mergeYtdlpInfo(save.rawJson, primary.infoJson);
    }
    ctx?.signal?.throwIfAborted();
    ctx?.reportActivity?.({ phase: "saving" });
    await persistSave(saveId, patch, {
      actorReason: "pipeline:fetch-video-ytdlp",
      replaceFilesWithKind: ["video", "poster"],
      newFiles,
    });
    log.info("[pond pipeline:fetch-video-ytdlp] wrote", {
      saveId,
      count: dl.items.length,
      bytes: dl.items.reduce((sum, item) => sum + item.size, 0),
    });
  } finally {
    await dl.cleanup();
  }
}

async function filesForItem(
  item: DownloadedVideoItem,
  index: number,
  source: Source | null,
): Promise<WriteFileArgs[] | null> {
  const [videoBuf, platformPosterBuf, ...subtitleBufs] = await Promise.all([
    readPath(item.path),
    item.posterPath ? readPath(item.posterPath) : Promise.resolve(null),
    ...item.subtitles.map((sub) => readPath(sub.path)),
  ]);
  if (!videoBuf) return null;

  const videoExt = extname(item.path).toLowerCase() || ".mp4";
  const videoDims =
    dimsFromYtdlpInfo(item.infoJson) ?? (await probeVideoDims(item.path));
  const out: WriteFileArgs[] = [
    {
      kind: "video",
      filename: videoFilename(index, videoExt),
      bytes: videoBuf,
      mimeType: item.mimeType,
      ...videoDims,
    },
  ];

  const poster = await resolvePoster({
    source,
    index,
    videoPath: item.path,
    platformPath: item.posterPath,
    platformBytes: platformPosterBuf,
    platformMimeType: item.posterMimeType,
  });
  if (poster) out.push(poster);

  for (let i = 0; i < item.subtitles.length; i++) {
    const sub = item.subtitles[i];
    const subBuf = subtitleBufs[i];
    if (!sub || !subBuf) continue;
    out.push({
      kind: "subtitle",
      filename: sub.filename,
      bytes: subBuf,
      mimeType: sub.mimeType,
    });
  }

  return out;
}

async function resolvePoster(args: {
  source: Source | null;
  index: number;
  videoPath: string;
  platformPath: string | null;
  platformBytes: Buffer | null;
  platformMimeType: string | null;
}): Promise<PosterWrite | null> {
  if (
    usesPlatformPoster(args.source) &&
    args.platformBytes &&
    args.platformPath
  ) {
    const ext = extname(args.platformPath).toLowerCase() || ".jpg";
    const dims = await probeImageDims(args.platformBytes);
    return {
      kind: "poster",
      filename: posterFilename(args.index, ext),
      bytes: args.platformBytes,
      mimeType: args.platformMimeType ?? "image/jpeg",
      ...dims,
    };
  }
  return buildFirstFramePoster(
    args.videoPath,
    posterFilename(args.index, ".jpg"),
  );
}

function readCaptureMedia(rawJson: RawJson | null): CaptureMedia[] | null {
  const media = rawJson?.capture?.media;
  return Array.isArray(media) ? media : null;
}

const CAPTURELESS = storedAsRawJson({ capture: {} });

function mergeYtdlpInfo(
  rawJson: RawJson | null | undefined,
  info: RawYtdlp,
): RawJson {
  const base = rawJson ?? CAPTURELESS;
  return { ...base, capture: base.capture ?? CAPTURELESS.capture, ytdlp: info };
}

function dimsFromYtdlpInfo(
  info: RawYtdlp | null | undefined,
): { width: number; height: number } | null {
  if (!info) return null;
  const width = Number(info.width);
  const height = Number(info.height);
  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return { width, height };
  }
  return null;
}

async function readPath(p: string): Promise<Buffer | null> {
  try {
    return await readFile(p);
  } catch {
    return null;
  }
}
