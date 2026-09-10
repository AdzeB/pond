import { expect, it } from "vitest";
import { replacementKind } from "./replace-file";

it("replaces the first non-auxiliary file kind", () => {
  expect(
    replacementKind([
      { kind: "custom_thumbnail", path: "thumb.png" },
      { kind: "cover", path: "photo.jpg" },
      { kind: "media", path: "extra.png" },
    ]),
  ).toBe("cover");
});

it("returns null when there is no original file", () => {
  expect(
    replacementKind([{ kind: "custom_thumbnail", path: "thumb.png" }]),
  ).toBe(null);
});
