import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SaveFile, Source } from "@pond/schema/db";
import { isVideoFile } from "@shared/media-index";
import log from "electron-log/main.js";
import { fetchAvatarToTxFile } from "../../../lib/blob";
import { probeImageDims } from "../../../lib/image-process";
import { buildFirstFramePoster } from "../../../lib/poster-from-frame";
import {
  hasMediaDims,
  needsPosterRepair,
  type PosterWrite,
  posterFilename,
  posterRepairIndexes,
  usesPlatformPoster,
  videoPosterSlots,
  youtubeThumbnailUrl,
} from "../../../lib/poster-policy";
import { probeVideoDims } from "../../../lib/video-dims";
import { itemDir } from "../../../paths";
import { persistSave } from "../../persist-save";
import { TransientError } from "../extractors/errors";
import { readSave } from "./apply";

const posterInflight = new Map<string, Promise<void>>();

export function runEnsurePoster(
  saveId: string,
  opts: { forcePlatform?: boolean } = {},
): Promise<void> {
  const existing = posterInflight.get(saveId);
  if (existing) return existing;
  const task = ensurePoster(saveId, opts).finally(() =>
    posterInflight.delete(saveId),
  );
  posterInflight.set(saveId, task);
  return task;
}

async function ensurePoster(
  saveId: string,
  opts: { forcePlatform?: boolean } = {},
): Promise<void> {
  const save = await readSave(saveId);
  if (!save) return;

  let files = save.files ?? [];
  const slotted = videoPosterSlots(files);
  if (slotted.videos.length === 0) return;

  const hydrated = await hydrateVideoDims(saveId, files);
  files = hydrated.files;
  if (hydrated.changed) {
    const primary = videoPosterSlots(files).videos[0];
    await persistSave(
      saveId,
      {
        files,
        ...(primary && hasMediaDims(primary)
          ? { width: primary.width, height: primary.height }
          : {}),
      },
      { actorReason: "pipeline:ensure-poster:dims", writeInfo: true },
    );
  }

  const forcePlatform =
    Boolean(opts.forcePlatform) &&
    usesPlatformPoster(save.source) &&
    youtubeThumbnailUrl(save.rawJson) != null;
  if (!forcePlatform && !needsPosterRepair(files)) {
    log.debug(
      "[pond pipeline:ensure-poster] posters already satisfy policy",
      saveId,
    );
    return;
  }

  const { videos, posters } = videoPosterSlots(files);
  const repairIndexes = new Set(
    forcePlatform
      ? videos.map((_, index) => index)
      : posterRepairIndexes(files),
  );
  const replacing = [...repairIndexes].some((index) => posters[index] != null);
  const targets = replacing
    ? videos.map((video, index) => ({ video, index }))
    : [...repairIndexes].map((index) => ({
        video: videos[index],
        index,
      }));

  const newFiles: PosterWrite[] = [];
  for (const { video, index } of targets) {
    if (!video) continue;
    if (replacing && !repairIndexes.has(index)) {
      const kept = await readExistingPoster(saveId, posters[index], index);
      if (kept) {
        newFiles.push(kept);
        continue;
      }
    }

    const produced = await producePoster({
      saveId,
      video,
      index,
      source: save.source,
      rawJson: save.rawJson,
    });
    if (!produced) {
      throw new TransientError(
        `ensure-poster: no poster produced for ${saveId}/${video.path}`,
      );
    }
    newFiles.push(produced);
  }

  if (newFiles.length === 0) return;

  await persistSave(
    saveId,
    {},
    {
      actorReason: "pipeline:ensure-poster",
      newFiles,
      ...(replacing ? { replaceFilesWithKind: "poster" as const } : {}),
    },
  );
  log.info(
    "[pond pipeline:ensure-poster] wrote posters",
    saveId,
    newFiles.length,
  );
}

async function hydrateVideoDims(
  saveId: string,
  files: SaveFile[],
): Promise<{ files: SaveFile[]; changed: boolean }> {
  const probed = await Promise.all(
    files.map(async (file) => {
      if (!isVideoFile(file) || hasMediaDims(file)) {
        return { file, changed: false };
      }
      const dims = await probeVideoDims(join(itemDir(saveId), file.path));
      if (!dims) return { file, changed: false };
      return { file: { ...file, ...dims }, changed: true };
    }),
  );
  return {
    files: probed.map((entry) => entry.file),
    changed: probed.some((entry) => entry.changed),
  };
}

async function producePoster(args: {
  saveId: string;
  video: SaveFile;
  index: number;
  source: Source | null;
  rawJson: unknown;
}): Promise<PosterWrite | null> {
  if (usesPlatformPoster(args.source)) {
    const platform = await platformPosterFromSave(args.rawJson, args.index);
    if (platform) return platform;
  }
  const videoPath = join(itemDir(args.saveId), args.video.path);
  return buildFirstFramePoster(videoPath, posterFilename(args.index, ".jpg"));
}

async function platformPosterFromSave(
  rawJson: unknown,
  index: number,
): Promise<PosterWrite | null> {
  const url = youtubeThumbnailUrl(rawJson);
  if (!url) return null;
  const outcome = await fetchAvatarToTxFile(url);
  if (!("file" in outcome) || !outcome.file) return null;
  const bytes = Buffer.from(outcome.file.bytes);
  if (bytes.byteLength === 0) return null;
  const dims = await probeImageDims(bytes);
  const name = outcome.file.filename;
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : ".jpg";
  return {
    kind: "poster",
    filename: posterFilename(index, ext),
    bytes,
    mimeType: outcome.file.mimeType ?? "image/jpeg",
    ...(dims ?? {}),
  };
}

async function readExistingPoster(
  saveId: string,
  poster: SaveFile | undefined,
  index: number,
): Promise<PosterWrite | null> {
  if (!poster) return null;
  try {
    const bytes = await readFile(join(itemDir(saveId), poster.path));
    if (bytes.byteLength === 0) return null;
    const ext = poster.path.includes(".")
      ? `.${poster.path.split(".").pop()}`
      : ".jpg";
    return {
      kind: "poster",
      filename: posterFilename(index, ext),
      bytes,
      mimeType: poster.mimeType ?? "image/jpeg",
      ...(poster.width && poster.height
        ? { width: poster.width, height: poster.height }
        : {}),
    };
  } catch {
    return null;
  }
}
