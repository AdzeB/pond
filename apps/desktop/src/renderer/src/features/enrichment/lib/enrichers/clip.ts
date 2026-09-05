import { setClipEmbedding } from "@/features/enrichment/state/clip-embedding-store";
import type { Save } from "@/features/saves/types";
import { clipImageEmbedding, clipModelVersion } from "../clip";
import { loadImage, representativeImageUrl } from "../image";
import type { Enricher } from "../types";

export const clipEnricher: Enricher = {
  id: "clip",
  enabled: (prefs) => prefs?.ai?.enableClip === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!representativeImageUrl(save)) return false;
    return save.clipModel !== clipModelVersion();
  },
  async run(save: Save) {
    const url = representativeImageUrl(save);
    if (!url) return null;
    const image = await loadImage(url);
    const vec = await clipImageEmbedding(image);
    const model = clipModelVersion();
    setClipEmbedding(save.id, vec, model);
    return { optimistic: { clipModel: model } };
  },
};
