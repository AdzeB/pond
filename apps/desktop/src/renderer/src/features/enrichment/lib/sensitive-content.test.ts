import { describe, expect, it } from "vitest";
import {
  aggregateSensitiveScores,
  sensitiveProbabilitiesFromLogits,
} from "./sensitive-content";

describe("sensitive content scores", () => {
  it("converts paired NSFW and SFW logits into stable probabilities", () => {
    expect(sensitiveProbabilitiesFromLogits([2, 0, -1000, -1000])).toEqual([
      0.8807970779778823, 0.5,
    ]);
  });

  it("rejects malformed model output", () => {
    expect(() => sensitiveProbabilitiesFromLogits([1])).toThrow(
      "Expected paired sensitive-content logits",
    );
    expect(() => sensitiveProbabilitiesFromLogits([Number.NaN, 1])).toThrow(
      "Sensitive-content logits must be finite",
    );
  });

  it("uses the strongest finite visual result for a Save", () => {
    expect(aggregateSensitiveScores([0.2, 0.91, 0.7])).toBe(0.91);
    expect(aggregateSensitiveScores([])).toBeNull();
    expect(aggregateSensitiveScores([Number.NaN])).toBeNull();
  });
});
