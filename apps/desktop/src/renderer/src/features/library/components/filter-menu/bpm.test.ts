import { matches } from "@pond/schema/filters/match";
import { expect, it } from "vitest";

it("matches bpm with gte", () => {
  expect(
    matches(
      {
        combinator: "and",
        rules: [{ field: "bpm", operator: "gte", value: 100 }],
      },
      {
        id: "s1",
        source: "file",
        url: "",
        mediaType: "audio",
        files: [{ bpm: 120 }],
      },
    ),
  ).toBe(true);
});
