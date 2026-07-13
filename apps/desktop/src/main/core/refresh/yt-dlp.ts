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
  pickProducedFile,
  pickProducedPoster,
  pickSubtitleFiles,
  readInfoJson,
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
}

interface DownloadedVideo {
  path: string;
  mimeType: string;
  size: number;
  infoJson: Record<string, unknown> | null;
  posterPath: string | null;
  posterMimeType: string | null;
  subtitles: SubtitleFile[];
  cleanup: () => Promise<void>;
}

const HARD_TIMEOUT_MS = 90_000;

export async function downloadVideo(
  args: DownloadVideoArgs,
): Promise<DownloadedVideo | null> {
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
      "--no-playlist",
      "--no-warnings",
      "--no-progress",
      "--no-part",
      "--restrict-filenames",
      "--write-info-json",
      "--write-thumbnail",
      "--convert-thumbnails",
      "jpg",
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
    const { code, stderr } = await runWithTimeout(
      ytdlp,
      argv,
      HARD_TIMEOUT_MS,
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

    const produced = await pickProducedFile(outputDir);
    if (!produced) {
      log.warn("[pond yt-dlp] no output file produced", args.url);
      await cleanup();
      return null;
    }

    const infoJson = await readInfoJson(outputDir, produced.path);
    const poster = await pickProducedPoster(outputDir, produced.path);
    const subtitles =
      prefs.subtitles === "download" ? await pickSubtitleFiles(outputDir) : [];
    log.info("[pond yt-dlp] wrote", produced.path, `(${produced.size} bytes)`);
    return {
      path: produced.path,
      mimeType: produced.mimeType,
      size: produced.size,
      infoJson,
      posterPath: poster?.path ?? null,
      posterMimeType: poster?.mimeType ?? null,
      subtitles,
      cleanup,
    };
  } catch (err) {
    log.warn("[pond yt-dlp] unexpected error", args.url, err);
    await cleanup();
    return null;
  }
}
