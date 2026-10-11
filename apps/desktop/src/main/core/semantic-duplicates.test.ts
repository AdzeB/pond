import { describe, expect, it } from "vitest";
import {
  classifyDuplicateEvidence,
  findSemanticDuplicateGroups,
  semanticDuplicateGroups,
} from "./semantic-duplicates";

function validVector(): number[] {
  const vector = Array.from({ length: 768 }, () => 0);
  vector[0] = 1;
  return vector;
}

describe("classifyDuplicateEvidence", () => {
  it("keeps file hashes as the only exact-duplicate signal", () => {
    expect(classifyDuplicateEvidence({ sha256Equal: true })).toBe("exact");
    expect(classifyDuplicateEvidence({ phashDistance: 3 })).toBe("visual-near");
    expect(classifyDuplicateEvidence({ semanticDistance: 0.04 })).toBe(
      "semantic-near",
    );
    expect(classifyDuplicateEvidence({ semanticDistance: 0.04 })).not.toBe(
      "exact",
    );
  });
});

describe("semanticDuplicateGroups", () => {
  it("returns stable current-model pairs with typed distance evidence", () => {
    expect(
      semanticDuplicateGroups(
        [
          {
            sourceId: "zebra",
            targetId: "alpha",
            distance: 0.04,
            model: "current-model",
          },
          {
            sourceId: "alpha",
            targetId: "zebra",
            distance: 0.04,
            model: "current-model",
          },
          {
            sourceId: "alpha",
            targetId: "nearer",
            distance: 0.02,
            model: "current-model",
          },
        ],
        { model: "current-model" },
      ),
    ).toEqual([
      {
        kind: "semantic-near",
        ids: ["alpha", "nearer"],
        evidence: { model: "current-model", distance: 0.02 },
      },
      {
        kind: "semantic-near",
        ids: ["alpha", "zebra"],
        evidence: { model: "current-model", distance: 0.04 },
      },
    ]);
  });

  it("rejects stale, malformed, distant, self, and already-classified pairs", () => {
    expect(
      semanticDuplicateGroups(
        [
          {
            sourceId: "a",
            targetId: "b",
            distance: 0.01,
            model: "stale-model",
          },
          {
            sourceId: "a",
            targetId: "c",
            distance: Number.NaN,
            model: "current-model",
          },
          {
            sourceId: "a",
            targetId: "d",
            distance: 0.041,
            model: "current-model",
          },
          {
            sourceId: "a",
            targetId: "a",
            distance: 0,
            model: "current-model",
          },
          {
            sourceId: "a",
            targetId: "exact-partner",
            distance: 0.01,
            model: "current-model",
          },
        ],
        {
          model: "current-model",
          excludedPairs: [["a", "exact-partner"]],
        },
      ),
    ).toEqual([]);
  });
});

describe("findSemanticDuplicateGroups", () => {
  it("searches only complete finite 768d vectors from the current model", () => {
    const searched: number[][] = [];
    const vectors = new Map<string, number[]>();
    for (const id of ["alpha", "bravo"]) {
      const vector = validVector();
      vector[1] = id === "alpha" ? 0.1 : 0.2;
      vectors.set(id, vector);
    }
    const nonFinite = validVector();
    nonFinite[1] = Number.NaN;

    expect(
      findSemanticDuplicateGroups(
        [
          {
            id: "alpha",
            vector: vectors.get("alpha") ?? [],
            model: "current-model",
            status: "complete",
          },
          {
            id: "bravo",
            vector: vectors.get("bravo") ?? [],
            model: "current-model",
            status: "complete",
          },
          {
            id: "stale",
            vector: validVector(),
            model: "stale-model",
            status: "complete",
          },
          {
            id: "failed",
            vector: validVector(),
            model: "current-model",
            status: "failed",
          },
          {
            id: "short",
            vector: [1, 0],
            model: "current-model",
            status: "complete",
          },
          {
            id: "non-finite",
            vector: nonFinite,
            model: "current-model",
            status: "complete",
          },
        ],
        {
          neighbors(vector) {
            searched.push(vector);
            return vector[1] && vector[1] < 0.15
              ? [{ id: "bravo", distance: 0.03 }]
              : [{ id: "alpha", distance: 0.03 }];
          },
        },
        { model: "current-model" },
      ),
    ).toEqual([
      {
        kind: "semantic-near",
        ids: ["alpha", "bravo"],
        evidence: { model: "current-model", distance: 0.03 },
      },
    ]);
    expect(searched).toHaveLength(2);
  });
});
