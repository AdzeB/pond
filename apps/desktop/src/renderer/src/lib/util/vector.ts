// Vector similarity helpers shared by the text-embedding and CLIP search paths.

// Dot product. For unit-length vectors (our mean-pooled + normalized text
// embeddings) this equals cosine similarity, so callers ranking normalized
// vectors use this directly to skip the redundant magnitude division.
export function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1)
    sum += (a[i] as number) * (b[i] as number);
  return sum;
}

// Cosine similarity that normalizes both operands. Use when the vectors aren't
// guaranteed unit-length (e.g. CLIP image vectors, unlike our text embeddings).
export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let d = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    d += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return d / Math.sqrt(na * nb);
}
