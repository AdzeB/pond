import type { Save, SaveFile } from "./types";

export function buildPondUrl(saveId: string, file: SaveFile): string {
  const base = `pond://${saveId}/${file.path}`;
  const bust = cacheBuster(file);
  return bust ? `${base}?v=${bust}` : base;
}

// Ask the pond:// protocol for a downscaled raster preview instead of
// the full-resolution original. `width` is in device pixels; the main
// process generates and caches a WebP under `_thumbs/`, and falls back
// to the original for vector/animated sources. Use this for grid cards;
// the detail view should keep loading the original via `buildPondUrl`.
export function withThumbWidth(url: string, width: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}w=${Math.round(width)}`;
}

export function pickAuthorAvatarUrl(save: Save): string | null {
  const local = (save.files ?? []).find((f) => f.kind === "avatar");
  if (local) return buildPondUrl(save.id, local);

  const url = save.rawJson?.capture?.author?.avatarUrl;
  if (typeof url === "string" && url.trim().length > 0) return url;
  return null;
}

function cacheBuster(file: SaveFile): string | null {
  if (file.sha256 && file.sha256.length >= 8) {
    return file.sha256.slice(0, 12);
  }
  return null;
}
