import { describe, expect, it } from "vitest";
import { parseSearchInput, serializePredicate } from "./syntax";

describe("sensitive search syntax", () => {
  it("parses and serializes confidence bands", () => {
    const parsed = parseSearchInput("sensitive:likely-sensitive");
    expect(parsed).toEqual({
      predicates: [
        {
          field: "sensitiveContent",
          operator: "eq",
          value: "likely-sensitive",
        },
      ],
      text: "",
    });
    const predicate = parsed.predicates[0];
    if (!predicate) throw new Error("Expected a sensitive predicate");
    expect(serializePredicate(predicate)).toBe("sensitive:likely-sensitive");
  });
});
