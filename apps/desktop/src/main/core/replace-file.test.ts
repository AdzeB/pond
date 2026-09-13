import { expect, it } from "vitest";
import { replacementKind } from "./replace-file";

it("replaces the first non-auxiliary file kind", () => {
  expect(
    replacementKind([
      { kind: "thumbnail", path: "photo.jpg_thumbnail.png" },
      { kind: "image", path: "photo.jpg" },
      { kind: "image", path: "extra.png" },
    ]),
  ).toBe("image");
});

it("returns null when there is no original file", () => {
  expect(replacementKind([{ kind: "thumbnail", path: "thumb.png" }])).toBe(
    null,
  );
});
