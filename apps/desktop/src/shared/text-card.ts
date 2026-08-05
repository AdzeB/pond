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

/** Prose body for text covers and the text viewer: description, else title. */
export function textBodyFromFields(
  description: string | null | undefined,
  title: string | null | undefined,
): string {
  const body = description?.trim() ?? "";
  if (body) return body;
  return title?.trim() ?? "";
}

export function buildTextCardData(
  text: string | null | undefined,
): TextCardData | null {
  const body = text?.trim() ?? "";
  if (!body) return null;
  return { text: body };
}
