import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Source } from "@pond/schema/db";
import log from "electron-log/main.js";
import { getVideoDownloadPrefs } from "../prefs";
import { partitionForIngest } from "../sync/accounts";
import { binariesAvailable } from "./binaries";
import { writeNetscapeCookies } from "./cookies";
import { formatSelector, maxFilesizeArg } from "./yt-dlp-format";
import {
  pickProducedFiles,
  pickProducedPoster,
  pickSubtitleFiles,
  type SubtitleFile,
} from "./yt-dlp-output";
import { runWithTimeout } from "./yt-dlp-process";

interface DownloadVideoArgs {
  url: string;
  source: Source | null;
  /** Connected account that owns the save; picks whose cookies to export. */
  accountId?: string | null;
  /** Aborts the in-flight yt-dlp process. */
  signal?: AbortSignal;
  /** Quoted/carousel tweets are a yt-dlp playlist; YouTube watch URLs must never expand. */
  allowPlaylist?: boolean;
  /** Scales the hard timeout; capped so a long carousel cannot run unbounded. */
  expectedCount?: number;
}

export interface DownloadedVideoItem {
  path: string;
  mimeType: string;
  size: number;
  infoJson: Record<string, unknown> | null;
  posterPath: string | null;
  posterMimeType: string | null;
  subtitles: SubtitleFile[];
}

interface DownloadedVideos {
  items: DownloadedVideoItem[];
  cleanup: () => Promise<void>;
}

const HARD_TIMEOUT_MS = 90_000;
const MAX_PLAYLIST_TIMEOUT_FACTOR = 4;

export async function downloadVideo(
  args: DownloadVideoArgs,
): Promise<DownloadedVideos | null> {
  const { ytdlp, ffmpeg } = binariesAvailable();
  if (!ytdlp) {
    log.debug("[pond yt-dlp] binary unavailable, skipping", args.url);
    return null;
  }
  if (args.signal?.aborted) {
    log.info("[pond yt-dlp] aborted before start", args.url);
    return null;
  }

  let cookies: Awaited<ReturnType<typeof writeNetscapeCookies>> | null = null;
  let outputDir: string | null = null;
  let cleanupCalled = false;
  const cleanup = async () => {
    if (cleanupCalled) return;
    cleanupCalled = true;
    if (cookies) await cookies.cleanup();
    if (outputDir) {
      try {
        await rm(outputDir, { recursive: true, force: true });
      } catch (err) {
        log.warn("[pond yt-dlp] tmpdir cleanup failed", outputDir, err);
      }
    }
  };

  try {
    const prefs = await getVideoDownloadPrefs();
    const partition = args.source
      ? await partitionForIngest(args.source, args.accountId)
      : undefined;
    cookies = await writeNetscapeCookies(partition);
    outputDir = await mkdtemp(join(tmpdir(), "pond-ytdlp-out-"));

    const argv = [
      args.allowPlaylist ? "--yes-playlist" : "--no-playlist",
      "--no-warnings",
      "--no-progress",
      "--no-part",
      "--restrict-filenames",
      "--write-info-json",
      "--socket-timeout",
      "30",
      "--retries",
      "3",
      "-f",
      formatSelector(args.source, prefs),
      "--cookies",
      cookies.path,
      "-o",
      join(outputDir, "%(id)s.%(ext)s"),
    ];
    /** Platform thumbs are the resting poster for YouTube; embed-thumbnail also needs a downloaded still. */
    if (args.source === "youtube" || prefs.embedThumbnail) {
      argv.push("--write-thumbnail", "--convert-thumbnails", "jpg");
    }
    const filesize = maxFilesizeArg(prefs);
    if (filesize) argv.unshift("--max-filesize", filesize);

    /** Muxing/embedding/SponsorBlock need ffmpeg; without it, fall back to progressive mp4. */
    if (ffmpeg) {
      argv.push("--ffmpeg-location", ffmpeg);
      if (prefs.container !== "auto") {
        argv.push("--merge-output-format", prefs.container);
      }
      if (prefs.embedMetadata) argv.push("--embed-metadata");
      if (prefs.embedThumbnail) argv.push("--embed-thumbnail");
      if (prefs.embedChapters) argv.push("--embed-chapters");
      if (prefs.sponsorblockRemove) argv.push("--sponsorblock-remove", "all");
      if (prefs.subtitles === "embed") {
        argv.push("--embed-subs", "--sub-langs", prefs.subtitleLang);
      }
    } else {
      argv.push("-f", "b[ext=mp4]/b");
    }

    if (prefs.subtitles === "download") {
      argv.push(
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        prefs.subtitleLang,
      );
      if (ffmpeg) argv.push("--convert-subs", "srt");
    }

    argv.push(args.url);

    log.info(
      "[pond yt-dlp] downloading",
      args.url,
      `(cookies=${cookies.count})`,
    );
    const timeoutMs =
      HARD_TIMEOUT_MS *
      Math.min(
        MAX_PLAYLIST_TIMEOUT_FACTOR,
        Math.max(1, args.expectedCount ?? 1),
      );
    const { code, stderr } = await runWithTimeout(
      ytdlp,
      argv,
      timeoutMs,
      args.signal,
    );
    if (code !== 0) {
      log.warn(
        "[pond yt-dlp] non-zero exit",
        code,
        args.url,
        stderr.slice(-400),
      );
      await cleanup();
      return null;
    }

    const produced = await pickProducedFiles(outputDir);
    if (produced.length === 0) {
      log.warn("[pond yt-dlp] no output file produced", args.url);
      await cleanup();
      return null;
    }

    const wantPoster =
      args.source === "youtube" || Boolean(prefs.embedThumbnail);
    const subtitles =
      prefs.subtitles === "download" ? await pickSubtitleFiles(outputDir) : [];
    const items: DownloadedVideoItem[] = [];
    for (let i = 0; i < produced.length; i++) {
      const file = produced[i];
      if (!file) continue;
      const poster = wantPoster
        ? await pickProducedPoster(outputDir, file.path)
        : null;
      items.push({
        path: file.path,
        mimeType: file.mimeType,
        size: file.size,
        infoJson: file.infoJson,
        posterPath: poster?.path ?? null,
        posterMimeType: poster?.mimeType ?? null,
        subtitles: i === 0 ? subtitles : [],
      });
      log.info("[pond yt-dlp] wrote", file.path, `(${file.size} bytes)`);
    }
    if (items.length === 0) {
      await cleanup();
      return null;
    }
    return { items, cleanup };
  } catch (err) {
    log.warn("[pond yt-dlp] unexpected error", args.url, err);
    await cleanup();
    return null;
  }
}
