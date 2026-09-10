import { parseCaptureTags, regionFromElement } from "@pond/schema/capture";
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

describe("regionFromElement", () => {
  it("clamps a DOM rect to the viewport", () => {
    expect(
      regionFromElement(
        { x: -20, y: 10, width: 400, height: 50 },
        { width: 200, height: 100 },
      ),
    ).toEqual({
      x: 0,
      y: 10,
      width: 200,
      height: 50,
      viewportWidth: 200,
      viewportHeight: 100,
    });
  });

  it("rejects an empty hit", () => {
    expect(
      regionFromElement(
        { x: 10, y: 10, width: 0, height: 10 },
        { width: 200, height: 100 },
      ),
    ).toBeNull();
  });
});
