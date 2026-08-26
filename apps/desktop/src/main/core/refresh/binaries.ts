import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { app } from "electron";
import log from "electron-log/main.js";
import which from "which";

interface ResolvedBinaries {
  ytdlp: string | null;
  ffmpeg: string | null;
}

export const YTDLP_FILENAME =
  process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const FFMPEG_FILENAME = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

export function userBinDir(): string {
  return join(app.getPath("userData"), "bin");
}

let cached: ResolvedBinaries | null = null;

export function binariesAvailable(): ResolvedBinaries {
  if (cached) return cached;
  cached = { ytdlp: resolveYtDlp(), ffmpeg: resolveFfmpeg() };
  log.info("[pond binaries] resolved", {
    ytdlp: cached.ytdlp,
    ffmpeg: cached.ffmpeg,
  });
  return cached;
}

export function invalidateBinariesCache(): void {
  cached = null;
}

function resolveYtDlp(): string | null {
  const managed = join(userBinDir(), YTDLP_FILENAME);
  if (existsSync(managed)) return managed;
  return lookupOnPath(YTDLP_FILENAME);
}

function resolveFfmpeg(): string | null {
  const candidates: string[] = [];
  if (app.isPackaged) {
    candidates.push(join(process.resourcesPath, "bin", FFMPEG_FILENAME));
  }
  candidates.push(
    resolve(__dirname, "../../../node_modules/ffmpeg-static/ffmpeg"),
  );
  candidates.push(
    resolve(process.cwd(), "apps/desktop/node_modules/ffmpeg-static/ffmpeg"),
  );
  candidates.push(resolve(process.cwd(), "node_modules/ffmpeg-static/ffmpeg"));

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return lookupOnPath(FFMPEG_FILENAME);
}

function lookupOnPath(name: string): string | null {
  return which.sync(name, { nothrow: true });
}
