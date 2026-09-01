import type { Save, SaveFile } from "@/lib/types";

export function buildPondUrl(saveId: string, file: SaveFile): string {
  const base = `pond://${saveId}/${file.path}`;
  const bust = cacheBuster(file);
  return bust ? `${base}?v=${bust}` : base;
}

/** Buckets hold the thumbnail cache to a few sizes per file rather than one per zoom step. */
const THUMB_BUCKETS = [256, 384, 512, 768, 1024] as const;
const THUMB_MAX = 1536;

export function thumbUrlFor(url: string, cssWidth: number | undefined): string {
  if (!cssWidth || cssWidth <= 0) return url;
  const wanted = cssWidth * (globalThis.devicePixelRatio || 1);
  const width = THUMB_BUCKETS.find((b) => b >= wanted) ?? THUMB_MAX;
  return `${url}${url.includes("?") ? "&" : "?"}tw=${width}`;
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
