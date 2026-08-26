import type { Save } from "@/lib/types";
import {
  clipEmbeddingStore,
  loadClipEmbeddings,
  setClipEmbedding,
} from "@/stores/clip-embedding-store";
import { clipImageEmbedding, clipModelVersion } from "../clip";
import { loadImage, representativeImageUrl } from "../image";
import type { Enricher } from "../types";

export const clipEnricher: Enricher = {
  id: "clip",
  hydrate: loadClipEmbeddings,
  enabled: (prefs) => prefs?.ai?.enableClip === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (!representativeImageUrl(save)) return false;
    const entry = clipEmbeddingStore.state.byId.get(save.id);
    return !entry || entry.model !== clipModelVersion();
  },
  async run(save: Save) {
    const url = representativeImageUrl(save);
    if (!url) return null;
    const image = await loadImage(url);
    const vec = await clipImageEmbedding(image);
    setClipEmbedding(save.id, vec, clipModelVersion());
    return {};
  },
};
