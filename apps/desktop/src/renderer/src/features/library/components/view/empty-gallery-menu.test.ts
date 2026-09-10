import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildEmptyGalleryMenu } from "./empty-gallery-menu";

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    const parsed = z.string().safeParse("label" in item ? item.label : null);
    return parsed.success ? [parsed.data] : [];
  });
}

describe("empty gallery menu", () => {
  it("creates, then imports Eagle-style sources, then Pond extras", () => {
    const menuLabels = labels(buildEmptyGalleryMenu());
    expect(menuLabels).toEqual([
      "New Folder",
      "New Smart Folder",
      "Import Files",
      "Import Folders",
      "Import from Links",
      "Import Pond Package",
      "Watched Folder",
      "Import Eagle Library",
      "Import from Clipboard",
      "Import Bookmarks",
      "Import Page Assets",
    ]);
    expect(menuLabels).not.toContain("Find Duplicates");
    expect(menuLabels.join(" ")).not.toContain("ArtStation");
    expect(menuLabels.join(" ")).not.toContain("Plugin");
    expect(menuLabels.join(" ")).not.toContain("Sketch");
    expect(menuLabels.join(" ")).not.toContain("…");
  });
});
