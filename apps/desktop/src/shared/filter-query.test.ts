import { describe, expect, it } from "vitest";
import { FilterQuery } from "./filter-query";

describe("agent filter event contract", () => {
  it("preserves nested groups, negation and query-builder metadata", () => {
    const query = {
      id: "root",
      combinator: "and",
      rules: [
        { field: "tags", operator: "some", value: ["design"], negate: true },
        {
          combinator: "or",
          rules: [
            {
              field: "color",
              operator: "near",
              value: { hex: "#123456", tolerance: 60 },
            },
          ],
        },
      ],
    };
    expect(FilterQuery.parse(query)).toBe(query);
  });

  it("accepts an empty group to clear the active filter", () => {
    expect(
      FilterQuery.safeParse({ combinator: "and", rules: [] }).success,
    ).toBe(true);
  });

  it.each([
    null,
    { combinator: "xor", rules: [] },
    {
      combinator: "and",
      rules: [{ field: "missing", operator: "eq", value: "x" }],
    },
    {
      combinator: "and",
      rules: [{ field: "tags", operator: "missing", value: [] }],
    },
    {
      combinator: "and",
      rules: [
        { field: "tags", operator: "some", value: { unsupported: true } },
      ],
    },
  ])("rejects malformed filter payloads", (value) => {
    expect(FilterQuery.safeParse(value).success).toBe(false);
  });
});
