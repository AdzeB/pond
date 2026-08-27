import type { Save, SaveFile } from "@/lib/types";

export function buildPondUrl(saveId: string, file: SaveFile): string {
  const base = `pond://${saveId}/${file.path}`;
  const bust = cacheBuster(file);
  return bust ? `${base}?v=${bust}` : base;
}

export function withThumbWidth(url: string, width: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tw=${Math.round(width)}`;
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
