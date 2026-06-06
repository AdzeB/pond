import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { app } from "electron";
import log from "electron-log/main.js";

export interface ResolvedBinaries {
  ytdlp: string | null;
  ffmpeg: string | null;
}

export const YTDLP_FILENAME =
  process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const FFMPEG_FILENAME = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

// Writable home for the runtime-managed yt-dlp. Lives outside the (signed,
// read-only) app bundle so the updater can swap it without breaking the
// code signature.
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

// yt-dlp is not bundled: it's fetched at runtime into userBinDir by the
// updater. Fall back to a system yt-dlp on PATH (handy in dev and for
// power users) when the managed copy isn't there yet.
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
  const path = process.env.PATH;
  if (!path) return null;
  const sep = process.platform === "win32" ? ";" : ":";
  for (const dir of path.split(sep)) {
    if (!dir) continue;
    const candidate = resolve(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
