import { RawImage } from "@huggingface/transformers";
import { clipImageEmbedding } from "@/lib/enrichment/clip";
import type { Save } from "@/lib/types";
import { cosine } from "@/lib/util/vector";
import { clipEmbeddingStore } from "@/stores/clip-embedding-store";

// Image-to-image visual search helpers. Per-save CLIP vectors are produced by
// the clip enricher and held in `clip-embedding-store`; here we embed an
// arbitrary query image (pasted / dropped / picked) the same way and rank the
// library against it.

// Embed a query image blob into a CLIP vector via the inference worker.
export async function embedQueryImage(blob: Blob): Promise<Float32Array> {
  const image = await RawImage.fromBlob(blob);
  return clipImageEmbedding(image);
}

// Rank candidates by CLIP similarity to the query vector, best first.
// Candidates without a CLIP vector are dropped — visual similarity is undefined
// for them, so surfacing them would only dilute the result.
export function rankByClip(
  candidates: ReadonlyArray<Save>,
  vector: Float32Array,
): Save[] {
  const scored: { save: Save; score: number }[] = [];
  for (const save of candidates) {
    const entry = clipEmbeddingStore.state.byId.get(save.id);
    if (!entry) continue;
    scored.push({ save, score: cosine(vector, entry.vec) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.save);
}
