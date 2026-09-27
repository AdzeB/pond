import type { Predicate, Query } from "@pond/schema/filters/types";
import { describe, expect, it, vi } from "vitest";
import { type AskPorts, compileAsk } from "@/features/search/lib/compile-ask";
import { EMPTY_FACETS, type NlFacets } from "@/features/search/lib/nl-query";

const facets: NlFacets = {
  ...EMPTY_FACETS,
  types: ["video", "image"],
  sources: ["twitter"],
};

function ports(overrides: Partial<AskPorts> = {}): AskPorts {
  return {
    countMatches: () => 1,
    ...overrides,
  };
}

describe("compileAsk", () => {
  it("extracts local filters and leaves keywords", async () => {
    const result = await compileAsk("sunset photos", facets, ports());
    expect(result.plan.filter.rules).toContainEqual({
      field: "type",
      operator: "eq",
      value: "image",
    });
    expect(result.residual).toBe("sunset");
  });

  it("resolves remaining keywords to semantic facets", async () => {
    const resolveFacets = vi.fn(async () => ({
      predicates: [
        {
          field: "source",
          operator: "eq",
          value: "twitter",
        } satisfies Predicate,
      ],
      residual: "",
    }));
    const result = await compileAsk(
      "sunset photos",
      facets,
      ports({ resolveFacets }),
    );
    expect(result.residual).toBe("");
    expect(result.plan.filter.rules).toEqual(
      expect.arrayContaining([
        { field: "type", operator: "eq", value: "image" },
        { field: "source", operator: "eq", value: "twitter" },
      ]),
    );
    expect(resolveFacets).toHaveBeenCalledWith("sunset", facets);
  });

  it("repairEmpty drops the last predicate until something matches", async () => {
    const countMatches = vi.fn((query: Query) =>
      query.rules.length === 1 ? 1 : 0,
    );
    const result = await compileAsk(
      "photos from twitter",
      facets,
      ports({ countMatches }),
    );
    expect(result.plan.filter.rules).toEqual([
      { field: "source", operator: "eq", value: "x.com" },
    ]);
  });

  it("a failing embedding resolver preserves local filters", async () => {
    const resolveFacets = vi.fn(async () => {
      throw new Error("embed failed");
    });
    const result = await compileAsk(
      "sunset photos",
      facets,
      ports({ resolveFacets }),
    );
    expect(result.plan.filter.rules).toContainEqual({
      field: "type",
      operator: "eq",
      value: "image",
    });
    expect(result.residual).toBe("sunset");
    expect(resolveFacets).toHaveBeenCalledWith("sunset", facets);
  });
});
