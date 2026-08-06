export interface TextCardData {
  text: string;
}

/** Bump when capture output changes so stale covers are regenerated. */
export const RENDER_TEXT_COVER_VERSION = 2;

export const TEXT_COVER_LIGHT_KIND = "text_cover_light";
export const TEXT_COVER_DARK_KIND = "text_cover_dark";

export const TEXT_COVER_KINDS: ReadonlySet<string> = new Set([
  TEXT_COVER_LIGHT_KIND,
  TEXT_COVER_DARK_KIND,
]);

export function textBodyFromFields(
  description: string | null | undefined,
  title: string | null | undefined,
): string {
  const body = description?.trim() ?? "";
  if (body) return body;
  return title?.trim() ?? "";
}

export function arenaBlockClassFromRawJson(rawJson: unknown): string | null {
  if (!rawJson || typeof rawJson !== "object") return null;
  const cls = (rawJson as { capture?: { extras?: { blockClass?: unknown } } })
    .capture?.extras?.blockClass;
  return typeof cls === "string" ? cls.toLowerCase() : null;
}

export function textCoverVersionFromRawJson(rawJson: unknown): number {
  if (!rawJson || typeof rawJson !== "object") return 0;
  const v = (
    rawJson as { capture?: { extras?: { renderTextCoverVersion?: unknown } } }
  ).capture?.extras?.renderTextCoverVersion;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function buildTextCardData(
  text: string | null | undefined,
): TextCardData | null {
  const body = text?.trim() ?? "";
  if (!body) return null;
  return { text: body };
}
