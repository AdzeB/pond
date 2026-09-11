import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { buildTagMenuItems, type TagMenuActions } from "./context-menu";

function actions(overrides: Partial<TagMenuActions> = {}): TagMenuActions {
  return {
    groups: ["Design", "Reference"],
    inGroup: "Design",
    starred: false,
    onFilter: vi.fn(),
    onSetStarred: vi.fn(),
    onAddToGroup: vi.fn(),
    onMoveToGroup: vi.fn(),
    onRemoveFromGroup: vi.fn(),
    onRename: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
}

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    const parsed = z.string().safeParse(item.label);
    const label = parsed.success ? [parsed.data] : [];
    if (item.type === "group" || item.type === "submenu") {
      return [...label, ...labels(item.items)];
    }
    return label;
  });
}

describe("tag context menu", () => {
  it("matches the Eagle tag operations without merge or conversion", () => {
    const menuLabels = labels(buildTagMenuItems(actions()));

    expect(menuLabels).toEqual([
      "Filter Items with the Tag(s)",
      "Add to Starred",
      "Remove from Starred",
      "Rename Tag",
      "Add to Group",
      "Reference",
      "Move to Group",
      "Reference",
      "Remove from this Group",
      "Remove Tag",
    ]);
    expect(menuLabels).not.toContain("Merge Into");
    expect(menuLabels).not.toContain("Convert to Group");
  });

  it("shows both starred actions and disables the inapplicable one", () => {
    const unstarred = buildTagMenuItems(actions());
    const starred = buildTagMenuItems(actions({ starred: true }));

    expect(unstarred[2]).toMatchObject({
      label: "Add to Starred",
      disabled: false,
    });
    expect(unstarred[3]).toMatchObject({
      label: "Remove from Starred",
      disabled: true,
    });
    expect(starred[2]).toMatchObject({ disabled: true });
    expect(starred[3]).toMatchObject({ disabled: false });
  });

  it("disables move and removal when the tag is not in a group", () => {
    const items = buildTagMenuItems(actions({ inGroup: null }));

    expect(items[7]).toMatchObject({ label: "Move to Group", disabled: true });
    expect(items[8]).toMatchObject({
      label: "Remove from this Group",
      disabled: true,
    });
  });
});
