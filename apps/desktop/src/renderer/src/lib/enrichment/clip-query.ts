import { clipImageEmbedding } from "@/lib/enrichment/clip";
import { clipAnnNearest } from "@/lib/search/clip-ann-index";
import type { Save } from "@/lib/types";
import { cosine } from "@/lib/util/vector";
import { clipEmbeddingStore } from "@/stores/clip-embedding-store";

/** Per-save CLIP vectors come from the clip enricher via `clip-embedding-store`; here an arbitrary query image is embedded the same way and the library ranked against it. */

export async function embedQueryImage(blob: Blob): Promise<Float32Array> {
  const { RawImage } = await import("@huggingface/transformers");
  const image = await RawImage.fromBlob(blob);
  return clipImageEmbedding(image);
}

/** Candidates without a CLIP vector are dropped; visual similarity is undefined for them and would only dilute the result. */
export function rankByClip(
  candidates: ReadonlyArray<Save>,
  vector: Float32Array,
): Save[] {
  const byId = new Map(candidates.map((s) => [s.id, s]));
  const ann = clipAnnNearest(
    vector,
    Math.min(1_000, Math.max(candidates.length, 1)),
  );
  if (ann) {
    const out: Save[] = [];
    for (const { id } of ann) {
      const save = byId.get(id);
      if (save) out.push(save);
    }
    if (out.length > 0) return out;
  }
  const scored: { save: Save; score: number }[] = [];
  for (const save of candidates) {
    const entry = clipEmbeddingStore.state.byId.get(save.id);
    if (!entry) continue;
    scored.push({ save, score: cosine(vector, entry.vec) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.save);
}
