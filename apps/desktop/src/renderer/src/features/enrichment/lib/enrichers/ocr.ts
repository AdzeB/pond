import type { Save } from "@/features/saves/types";
import { florenceModelVersion, runFlorence } from "../florence";
import { loadImage, representativeImageUrl } from "../image";
import type { Enricher } from "../types";

export const ocrEnricher: Enricher = {
  id: "ocr",
  enabled: (prefs) => prefs?.ai?.enableOcr === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!representativeImageUrl(save)) return false;
    return save.ocrModel !== florenceModelVersion();
  },
  async run(save: Save) {
    const url = representativeImageUrl(save);
    if (!url) return null;
    const image = await loadImage(url);
    const text = await runFlorence(image, "<OCR>");
    const model = florenceModelVersion();
    const fields = { ocrText: text || null, ocrModel: model };
    return { derived: fields, optimistic: fields };
  },
};
