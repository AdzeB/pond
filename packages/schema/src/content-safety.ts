export const SENSITIVE_CONTENT_BANDS = [
  "not-sensitive",
  "possible-sensitive",
  "likely-sensitive",
  "not-checked",
] as const;

export type SensitiveContentBand = (typeof SENSITIVE_CONTENT_BANDS)[number];

export const POSSIBLE_SENSITIVE_THRESHOLD = 0.5;
export const LIKELY_SENSITIVE_THRESHOLD = 0.8;

export function sensitiveContentBand(
  score: number | null | undefined,
): SensitiveContentBand {
  if (score == null || !Number.isFinite(score) || score < 0 || score > 1) {
    return "not-checked";
  }
  if (score >= LIKELY_SENSITIVE_THRESHOLD) return "likely-sensitive";
  if (score >= POSSIBLE_SENSITIVE_THRESHOLD) return "possible-sensitive";
  return "not-sensitive";
}
