import { describe, expect, it, vi } from "vitest";
import { topLevelMenuLabels as labels } from "@/shared/test/menu-labels";
import {
  buildTagGroupMenuItems,
  type TagGroupMenuActions,
} from "./group-context-menu";

function actions(
  overrides: Partial<TagGroupMenuActions> = {},
): TagGroupMenuActions {
  return {
    color: null,
    tagCount: 2,
    onFilter: vi.fn(),
    onRename: vi.fn(),
    onChangeColor: vi.fn(),
    onRequestDelete: vi.fn(),
    ...overrides,
  };
}

describe("tag group context menu", () => {
  it("filters first, then rename, then remove last", () => {
    expect(labels(buildTagGroupMenuItems(actions()))).toEqual([
      "Filter Items with the Tag(s)",
      "Rename",
      "Remove",
    ]);
  });

  it("disables filter when the group has no tags", () => {
    const items = buildTagGroupMenuItems(actions({ tagCount: 0 }));
    expect(items[0]).toMatchObject({
      label: "Filter Items with the Tag(s)",
      disabled: true,
    });
  });
});
