import type { Save } from "@/lib/types";
import { florenceModelVersion, runFlorence } from "../florence";
import { loadImage, representativeImageUrl } from "../image";
import type { Enricher } from "../types";

// Vision caption / alt-text for image (and video-poster) saves via Florence-2.
export const captionEnricher: Enricher = {
  id: "caption",
  enabled: (prefs) => prefs?.ai?.enableCaption === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!representativeImageUrl(save)) return false;
    return save.captionModel !== florenceModelVersion();
  },
  async run(save: Save) {
    const url = representativeImageUrl(save);
    if (!url) return null;
    const image = await loadImage(url);
    const caption = await runFlorence(image, "<CAPTION>");
    const model = florenceModelVersion();
    const fields = { caption: caption || null, captionModel: model };
    return { derived: fields, optimistic: fields };
  },
};
