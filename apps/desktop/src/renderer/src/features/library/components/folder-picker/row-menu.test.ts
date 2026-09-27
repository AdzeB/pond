import { describe, expect, it, vi } from "vitest";
import { menuLabels } from "@/shared/test/menu-labels";
import { buildFolderPickerRowItems } from "./row-menu";

describe("folder picker row menu", () => {
  it("shows create commands and gates recent removal", () => {
    const actions = {
      onCreateBelow: vi.fn(),
      onCreateSubfolder: vi.fn(),
      onRemoveRecent: vi.fn(),
    };
    expect(
      menuLabels(buildFolderPickerRowItems({ recent: true, ...actions })),
    ).toEqual(["New Subfolder", "New Folder Below", "Remove from Recent"]);
    expect(
      menuLabels(buildFolderPickerRowItems({ recent: false, ...actions })),
    ).toEqual(["New Subfolder", "New Folder Below"]);
  });
});
