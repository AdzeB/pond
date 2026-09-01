import { FIELD_DESCRIPTORS } from "@pond/schema/filters/fields";
import { describe, expect, it } from "vitest";

describe("folder field", () => {
  it("projects folder ids lowercase for matching", () => {
    const folder = FIELD_DESCRIPTORS.folder;
    expect(
      folder.project({
        id: "1",
        source: "web",
        url: "https://x",
        folderIds: ["AbC", "de"],
      }),
    ).toEqual(["abc", "de"]);
    expect(
      folder.project({ id: "1", source: "web", url: "https://x" }),
    ).toEqual([]);
  });
});
