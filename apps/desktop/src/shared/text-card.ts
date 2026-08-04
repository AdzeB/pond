export interface TextCardData {
  text: string;
}

export function buildTextCardData(
  text: string | null | undefined,
): TextCardData | null {
  const body = text?.trim() ?? "";
  if (!body) return null;
  return { text: body };
}
