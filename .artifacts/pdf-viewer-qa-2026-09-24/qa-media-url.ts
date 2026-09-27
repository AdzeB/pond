import type { SaveFile } from "@/features/saves/types";

export function buildPondUrl(_saveId: string, file: SaveFile): string {
  if (file.mimeType?.startsWith("video/")) {
    return "/@fs/Users/raphaelsalaja/Developer/pond/.tmp/linear-thinking/linear-thinking-detail.mp4";
  }
  return "/document.pdf";
}

export function previewUrlFor(url: string): string {
  return url;
}
