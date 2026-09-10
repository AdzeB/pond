import { matches } from "@pond/schema/filters/match";
import { expect, it } from "vitest";

it("matches font family from the first file", () => {
  expect(
    matches(
      {
        combinator: "and",
        rules: [{ field: "fontFamily", operator: "contains", value: "inter" }],
      },
      {
        id: "s1",
        source: "file",
        url: "",
        mediaType: "font",
        files: [{ family: "Inter" }],
      },
    ),
  ).toBe(true);
});
