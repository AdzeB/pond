import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  buildFolderMenuItems,
  type FolderMenuActions,
} from "./folder-context-menu";

function actions(
  overrides: Partial<FolderMenuActions> = {},
): FolderMenuActions {
  return {
    hasChildren: true,
    sameLevelHasChildren: true,
    includeSubfolders: true,
    color: null,
    sortKey: "savedAt",
    creating: false,
    onNewFolder: vi.fn(),
    onNewSubfolder: vi.fn(),
    onMove: vi.fn(),
    onRename: vi.fn(),
    onAutoTag: vi.fn(),
    onSort: vi.fn(),
    onToggleFolder: vi.fn(),
    onToggleSameLevel: vi.fn(),
    onToggleAll: vi.fn(),
    onDuplicate: vi.fn(),
    onExportFiles: vi.fn(),
    onExportCsv: vi.fn(),
    onExportPackage: vi.fn(),
    onCopyToLibrary: vi.fn(),
    onToggleSubfolders: vi.fn(),
    onChangeIcon: vi.fn(),
    onChangeColor: vi.fn(),
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

describe("folder context menu", () => {
  it("matches Eagle folder operations Pond supports", () => {
    const menuLabels = labels(buildFolderMenuItems(actions()));

    expect(menuLabels).toEqual([
      "New Folder",
      "New Subfolder",
      "Move Folder",
      "Rename",
      "Set Auto-Tag",
      "Sort By",
      "Date Saved",
      "Date Added",
      "Date Published",
      "Title",
      "Type",
      "Creator",
      "Rating",
      "Manual",
      "Random",
      "Expand/Collapse Folder",
      "Expand/Collapse Same Level Folders",
      "Expand/Collapse All Folders",
      "Duplicate",
      "Export",
      "Export Files",
      "Export to CSV",
      "Export Pond Package",
      "Add to Other Library",
      "Show Subfolder Content",
      "Change Icon",
      "Folder",
      "Bookmark",
      "Album",
      "Tag",
      "Download",
      "Code",
      "Remove Folder",
    ]);
    expect(menuLabels).not.toContain("Password");
    expect(menuLabels).not.toContain("Copy Link");
    expect(menuLabels).not.toContain("Add to Quick Access");
    expect(menuLabels.join(" ")).not.toContain("Plugin");
    expect(menuLabels.join(" ")).not.toContain("ArtStation");
    expect(menuLabels.join(" ")).not.toContain("Huaban");
    expect(menuLabels.join(" ")).not.toContain("Sketch");
  });

  it("disables expand actions when the folder has no children", () => {
    const items = buildFolderMenuItems(
      actions({ hasChildren: false, sameLevelHasChildren: false }),
    );
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Expand/Collapse Folder",
          disabled: true,
        }),
        expect.objectContaining({
          label: "Expand/Collapse Same Level Folders",
          disabled: true,
        }),
      ]),
    );
  });

  it("marks show subfolder content from the folder setting", () => {
    const hidden = buildFolderMenuItems(actions({ includeSubfolders: false }));
    const shown = buildFolderMenuItems(actions({ includeSubfolders: true }));
    expect(hidden).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Show Subfolder Content",
          checked: false,
        }),
      ]),
    );
    expect(shown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Show Subfolder Content",
          checked: true,
        }),
      ]),
    );
  });
});
