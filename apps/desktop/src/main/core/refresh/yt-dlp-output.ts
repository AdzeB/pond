import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

export interface SubtitleFile {
  path: string;
  filename: string;
  mimeType: string;
}

const YTDLP_KEEP_KEYS = [
  "id",
  "title",
  "description",
  "thumbnail",
  "webpage_url",
  "original_url",
  "extractor",
  "extractor_key",

  "view_count",
  "like_count",
  "dislike_count",
  "comment_count",
  "repost_count",
  "concurrent_view_count",
  "average_rating",

  "duration",
  "uploader",
  "uploader_id",
  "uploader_url",
  "channel",
  "channel_id",
  "channel_url",

  "upload_date",
  "release_date",
  "release_timestamp",
  "timestamp",
  "live_status",
  "was_live",
  "availability",
  "age_limit",

  "width",
  "height",
  "fps",
  "format_note",
  "vcodec",
  "acodec",
  "filesize",
  "filesize_approx",
  "tbr",

  "track",
  "artist",
  "album",
  "genre",
  "release_year",

  "language",
  "tags",
  "categories",
  "chapters",

  "playlist",
  "playlist_id",
  "playlist_title",
  "playlist_index",
  "n_entries",
] as const;

export async function readInfoJson(
  dir: string,
  videoPath: string,
): Promise<Record<string, unknown> | null> {
  const stem = basename(videoPath, extname(videoPath));
  const sidecar = join(dir, `${stem}.info.json`);
  try {
    const raw = await readFile(sidecar, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of YTDLP_KEEP_KEYS) {
      const v = parsed[k];
      if (v !== undefined && v !== null) out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export async function pickProducedFile(
  dir: string,
): Promise<{ path: string; size: number; mimeType: string } | null> {
  const entries = await readdir(dir);
  if (entries.length === 0) return null;

  const sized = await Promise.all(
    entries
      .filter((name) => !/\.info\.json$/i.test(name))
      .filter((name) => !isThumbnail(name))
      .filter((name) => !isSubtitle(name))
      .map(async (name) => {
        const full = join(dir, name);
        try {
          const s = await stat(full);
          return { path: full, size: s.size };
        } catch {
          return null;
        }
      }),
  );
  const valid = sized.filter(
    (e): e is { path: string; size: number } => e !== null && e.size > 0,
  );
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.size - a.size);
  const winner = valid[0];
  if (!winner) return null;
  return { ...winner, mimeType: mimeFor(winner.path) };
}

function isThumbnail(name: string): boolean {
  const ext = extname(name).toLowerCase();
  return (
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".png" ||
    ext === ".webp" ||
    ext === ".avif"
  );
}

function isSubtitle(name: string): boolean {
  const ext = extname(name).toLowerCase();
  return ext === ".srt" || ext === ".vtt";
}

// Collect subtitles, deriving a stable `subtitle.<lang>.<ext>` filename.
export async function pickSubtitleFiles(dir: string): Promise<SubtitleFile[]> {
  const entries = await readdir(dir);
  const out: SubtitleFile[] = [];
  for (const name of entries) {
    if (!isSubtitle(name)) continue;
    const full = join(dir, name);
    try {
      const s = await stat(full);
      if (s.size === 0) continue;
    } catch {
      continue;
    }
    const ext = extname(name).toLowerCase();
    const stem = basename(name, ext);
    const dot = stem.lastIndexOf(".");
    const lang = dot >= 0 ? stem.slice(dot + 1) : "";
    out.push({
      path: full,
      filename: lang ? `subtitle.${lang}${ext}` : `subtitle${ext}`,
      mimeType: ext === ".vtt" ? "text/vtt" : "application/x-subrip",
    });
  }
  return out;
}

export async function pickProducedPoster(
  dir: string,
  videoPath: string,
): Promise<{ path: string; mimeType: string } | null> {
  const stem = basename(videoPath, extname(videoPath));
  const entries = await readdir(dir);
  for (const name of entries) {
    if (!name.startsWith(stem)) continue;
    if (!isThumbnail(name)) continue;
    const full = join(dir, name);
    try {
      const s = await stat(full);
      if (s.size === 0) continue;
    } catch {
      continue;
    }
    return { path: full, mimeType: imageMimeFor(name) };
  }
  return null;
}

function imageMimeFor(name: string): string {
  const ext = extname(name).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    default:
      return "image/jpeg";
  }
}

function mimeFor(path: string): string {
  const ext = extname(path).toLowerCase();
  switch (ext) {
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    default:
      return "video/mp4";
  }
}
