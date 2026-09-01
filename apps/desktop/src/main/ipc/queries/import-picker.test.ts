import { beforeEach, describe, expect, it, vi } from "vitest";

const { showOpenDialog, getFocusedWindow } = vi.hoisted(() => ({
  showOpenDialog: vi.fn(),
  getFocusedWindow: vi.fn(),
}));

vi.mock("electron", () => ({
  BrowserWindow: { getFocusedWindow },
  dialog: { showOpenDialog },
}));

import { pickImportPaths } from "./import-picker";

describe("native import picker", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ["/tmp/photo.png"],
    });
  });

  it("picks multiple files", async () => {
    expect(await pickImportPaths("files")).toEqual({
      paths: ["/tmp/photo.png"],
    });
    expect(showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: ["openFile", "multiSelections"],
      }),
    );
  });

  it("picks multiple folders attached to the focused window", async () => {
    const win = { id: 1 };
    getFocusedWindow.mockReturnValue(win);
    await pickImportPaths("folders");
    expect(showOpenDialog).toHaveBeenCalledWith(
      win,
      expect.objectContaining({
        properties: ["openDirectory", "multiSelections"],
      }),
    );
  });

  it("treats cancellation as no selection", async () => {
    showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: ["/tmp/photo.png"],
    });
    expect(await pickImportPaths("files")).toEqual({ paths: [] });
  });

  it("rejects unknown modes without opening a dialog", async () => {
    await expect(pickImportPaths("anything")).rejects.toThrow(
      "Invalid import kind",
    );
    expect(showOpenDialog).not.toHaveBeenCalled();
  });
});
