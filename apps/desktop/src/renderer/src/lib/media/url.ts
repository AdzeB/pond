import type { Save, SaveFile } from "@/lib/types";

export function buildPondUrl(saveId: string, file: SaveFile): string {
  const base = `pond://${saveId}/${file.path}`;
  const bust = cacheBuster(file);
  return bust ? `${base}?v=${bust}` : base;
}

/** Buckets keep the on-disk thumbnail cache to a handful of sizes per file instead of one per zoom step. */
const THUMB_BUCKETS = [256, 384, 512, 768, 1024, 1536] as const;

export function withThumbWidth(url: string, width: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tw=${Math.round(width)}`;
}

/** Cards paint at a few hundred CSS pixels; decoding the multi-megapixel original for them costs ~10MB each. */
export function thumbUrlFor(url: string, cssWidth: number | undefined): string {
  if (!cssWidth || cssWidth <= 0) return url;
  const dpr = globalThis.devicePixelRatio || 1;
  const wanted = cssWidth * dpr;
  const bucket = THUMB_BUCKETS.find((b) => b >= wanted) ?? THUMB_BUCKETS.at(-1);
  return bucket ? withThumbWidth(url, bucket) : url;
}

export function pickAuthorAvatarUrl(save: Save): string | null {
  const local = (save.files ?? []).find((f) => f.kind === "avatar");
  if (local) return buildPondUrl(save.id, local);

  const url = save.rawJson?.capture?.author?.avatarUrl;
  return url && url.trim().length > 0 ? url : null;
}

export function pickSourceIconUrl(save: Save): string | null {
  const local = (save.files ?? []).find((f) => f.kind === "source_icon");
  if (local) return buildPondUrl(save.id, local);

  const url = save.rawJson?.capture?.extras?.faviconUrl;
  return url && url.trim().length > 0 ? url : null;
}

function cacheBuster(file: SaveFile): string | null {
  if (file.sha256 && file.sha256.length >= 8) {
    return file.sha256.slice(0, 12);
  }
  return null;
}
