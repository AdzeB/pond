// @vitest-environment jsdom

import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { Save } from "@/features/saves/types";
import { buildEmptyTagFieldMenu, buildTagPillMenu } from "./preview";

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    const parsed = z.string().safeParse("label" in item ? item.label : null);
    return parsed.success ? [parsed.data] : [];
  });
}

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
    expect(labels(buildEmptyTagFieldMenu(save))).toEqual([
      "Copy Tags",
      "Paste Tags",
      "Clear All Tags",
    ]);
  });
});
