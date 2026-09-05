import type { Predicate } from "@pond/schema/filters/types";
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
  it("A: deterministic predicates and leftover words", async () => {
    const result = await compileAsk("sunset photos", facets, ports());
    expect(result.plan.filter.rules).toContainEqual({
      field: "type",
      operator: "eq",
      value: "image",
    });
    expect(result.residual).toBe("sunset");
  });

  it("A+B: embedding facets consume residual", async () => {
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

  it("A+C: a compiled plan merges Stage A rules", async () => {
    const compilePlan = vi.fn(async () => ({
      filter: {
        combinator: "and" as const,
        rules: [
          {
            field: "source",
            operator: "eq",
            value: "twitter",
          } satisfies Predicate,
        ],
      },
    }));
    const result = await compileAsk("photos", facets, ports({ compilePlan }));
    expect(result.plan.filter.rules).toEqual(
      expect.arrayContaining([
        { field: "type", operator: "eq", value: "image" },
        { field: "source", operator: "eq", value: "twitter" },
      ]),
    );
    expect(compilePlan).toHaveBeenCalled();
  });

  it("repairEmpty drops the last predicate until something matches", async () => {
    const compilePlan = vi.fn(async () => ({
      filter: {
        combinator: "and" as const,
        rules: [
          { field: "type", operator: "eq", value: "image" } satisfies Predicate,
          {
            field: "source",
            operator: "eq",
            value: "twitter",
          } satisfies Predicate,
        ],
      },
    }));
    const countMatches = vi.fn((query: { rules: unknown[] }) =>
      query.rules.length === 1 ? 1 : 0,
    );
    const result = await compileAsk(
      "photos",
      facets,
      ports({ compilePlan, countMatches }),
    );
    expect(result.plan.filter.rules).toEqual([
      { field: "type", operator: "eq", value: "image" },
    ]);
  });

  it("a missing or failing B/C port degrades to Stage A", async () => {
    const result = await compileAsk(
      "photos",
      facets,
      ports({
        resolveFacets: async () => {
          throw new Error("embed failed");
        },
        compilePlan: async () => {
          throw new Error("model failed");
        },
      }),
    );
    expect(result.plan.filter.rules).toContainEqual({
      field: "type",
      operator: "eq",
      value: "image",
    });
  });
});
