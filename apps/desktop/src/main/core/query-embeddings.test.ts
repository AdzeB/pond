import { describe, expect, it } from "vitest";
import { cosineSimilarity, reciprocalRankFusion } from "./query-embeddings";

describe("hybrid retrieval ranking", () => {
  it("scores compatible normalized vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 0], [1])).toBeNull();
  });

  it("uses reciprocal-rank fusion across independent channels", () => {
    const fused = reciprocalRankFusion([
      ["exact", "shared"],
      ["visual", "shared"],
    ]);
    expect(fused[0]?.id).toBe("shared");
    expect(new Set(fused.map((entry) => entry.id))).toEqual(
      new Set(["exact", "shared", "visual"]),
    );
  });

  it("deduplicates repeated IDs within a single rank list", () => {
    const fused = reciprocalRankFusion([["one", "one"]]);
    expect(fused).toHaveLength(1);
  });
});
