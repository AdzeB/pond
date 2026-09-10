import { parseCaptureTags } from "@pond/schema/capture";
import { describe, expect, it } from "vitest";

describe("parseCaptureTags", () => {
  it("splits, trims, and drops blanks", () => {
    expect(parseCaptureTags(" design, reference , ,print ")).toEqual([
      "design",
      "reference",
      "print",
    ]);
  });

  it("caps at 200 tags", () => {
    const input = Array.from(
      { length: 201 },
      (_, index) => `tag-${index}`,
    ).join(",");
    expect(parseCaptureTags(input)).toHaveLength(200);
  });
});
