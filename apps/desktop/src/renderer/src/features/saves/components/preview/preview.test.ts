import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import { topLevelMenuLabels as labels } from "@/shared/test/menu-labels";
import { buildEmptyTagFieldMenu, buildTagPillMenu } from "./";

const save: Save = {
  id: "save",
  source: "local",
  sourceId: "save",
  url: "pond:local/save",
  title: "Save",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "image",
  files: [],
  tags: ["design"],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
};

describe("inspector tag menus", () => {
  it("filters, renames, copies, then removes from the save last", () => {
    expect(labels(buildTagPillMenu(save, "design", async () => {}))).toEqual([
      "Filter Items with the Tag(s)",
      "Rename Tag",
      "Copy Tags",
      "Paste Tags",
      "Remove from Save",
    ]);
  });

  it("clears tags from the empty field menu", () => {
    const items = buildEmptyTagFieldMenu(save);
    expect(labels(items)).toEqual([
      "Copy Tags",
      "Paste Tags",
      "Clear All Tags",
    ]);
    expect(items.at(-1)).toMatchObject({ variant: "destructive" });
  });
});
