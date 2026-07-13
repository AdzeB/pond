import type { Save } from "@/lib/types";
import { clipAesthetic, clipModelVersion } from "../clip";
import { loadImage, representativeImageUrl } from "../image";
import type { Enricher } from "../types";

export const aestheticEnricher: Enricher = {
  id: "aesthetic",
  enabled: (prefs) => prefs?.ai?.enableAesthetic === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!representativeImageUrl(save)) return false;
    return save.aestheticModel !== clipModelVersion();
  },
  async run(save: Save) {
    const url = representativeImageUrl(save);
    if (!url) return null;
    const image = await loadImage(url);
    const labels = await clipAesthetic(image);
    const model = clipModelVersion();
    const fields = { aesthetic: labels, aestheticModel: model };
    return { derived: fields, optimistic: fields };
  },
};
