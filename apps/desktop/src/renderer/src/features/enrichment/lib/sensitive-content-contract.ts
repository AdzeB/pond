const MODEL_ID = "Marqo/nsfw-image-detection-384";

export const SENSITIVE_CONTENT_MODEL_REVISION =
  "b2d8f0c3abe6e05062288460ecf58e42ea690e84" as const;
export const SENSITIVE_CONTENT_MODEL_SHA256 =
  "7b81155313d894bba3a3b9bace059a6da2a0c509d10cea43fcb0b3c5a4edd26d" as const;
export const SENSITIVE_CONTENT_MODEL_VERSION = `${MODEL_ID}@${SENSITIVE_CONTENT_MODEL_REVISION}:preprocess-1:sampling-1:max-1`;

export function sensitiveProbabilitiesFromLogits(
  logits: ArrayLike<number>,
): number[] {
  if (logits.length === 0 || logits.length % 2 !== 0) {
    throw new Error("Expected paired sensitive-content logits");
  }
  const probabilities: number[] = [];
  for (let i = 0; i < logits.length; i += 2) {
    const nsfw = logits[i];
    const sfw = logits[i + 1];
    if (!Number.isFinite(nsfw) || !Number.isFinite(sfw)) {
      throw new Error("Sensitive-content logits must be finite");
    }
    const offset = Math.max(nsfw ?? 0, sfw ?? 0);
    const nsfwExp = Math.exp((nsfw ?? 0) - offset);
    const sfwExp = Math.exp((sfw ?? 0) - offset);
    probabilities.push(nsfwExp / (nsfwExp + sfwExp));
  }
  return probabilities;
}

export function aggregateSensitiveScores(
  scores: readonly number[],
): number | null {
  const finite = scores.filter(Number.isFinite);
  return finite.length > 0 ? Math.max(...finite) : null;
}
