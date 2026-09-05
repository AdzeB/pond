import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { ASSISTANT_MODELS } from "../../../shared/assistant";
import { resolveSaveFilePath } from "../../ipc/helpers";

const MIME = new Map<string, string>(
  Object.entries({
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  }),
);

export function visionEnabled(
  provider: string,
  visionModel: string | undefined,
): boolean {
  const id = visionModel || provider;
  return ASSISTANT_MODELS.some(
    (model) => model.id === id && model.capabilities.vision,
  );
}

export async function imagesForSaves(
  ids: string[],
): Promise<Array<{ mimeType: string; data: string }>> {
  const images: Array<{ mimeType: string; data: string }> = [];
  for (const id of ids.slice(0, 24)) {
    const target = await resolveSaveFilePath(id, 0);
    if (!target.ok) continue;
    const mime = MIME.get(extname(target.path).toLowerCase());
    if (!mime) continue;
    try {
      images.push({
        mimeType: mime,
        data: (await readFile(target.path)).toString("base64"),
      });
    } catch {}
  }
  return images;
}
