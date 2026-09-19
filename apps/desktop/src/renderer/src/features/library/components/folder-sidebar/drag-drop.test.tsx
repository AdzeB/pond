import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { folders } from "@/features/library/state/folders";
import { selection } from "@/features/saves/state/selection";
import {
  createFolderSidebarHarness,
  fireDrag,
  folder,
  folderList,
  folderTransfer,
  pondQuery,
} from "./test-harness";

describe("folder sidebar drag and drop", () => {
  const harness = createFolderSidebarHarness();

  beforeEach(() => harness.setup());
  afterEach(() => harness.cleanup());

  it("nests a dragged folder inside the drop target", async () => {
    folderList.current = [folder("Travel"), folder("Shots")];
    await folders.refresh();
    await harness.mount();
    const transfer = folderTransfer();
    await act(async () => {
      fireDrag(harness.button("Shots"), "dragstart", transfer);
      fireDrag(harness.button("Travel"), "drop", transfer);
    });
    expect(transfer.getData("application/x-pond-folder")).toBe("Shots");
    expect(pondQuery).toHaveBeenCalledWith("folders.move", {
      id: "Shots",
      parentId: "Travel",
    });
    expect(pondQuery).not.toHaveBeenCalledWith(
      "folders.addSaves",
      expect.anything(),
    );
  });

  it("does not move a folder into its descendant", async () => {
    folderList.current = [folder("Travel"), folder("Tickets", "Travel")];
    await folders.refresh();
    await harness.mount();
    const transfer = folderTransfer("Travel");
    await act(async () => {
      fireDrag(harness.button("Travel"), "dragstart", transfer);
      fireDrag(harness.button("Tickets"), "drop", transfer);
    });
    expect(
      pondQuery.mock.calls.filter((call) => call[0] === "folders.move"),
    ).toEqual([]);
  });

  it("still files selected saves onto a folder", async () => {
    folderList.current = [folder("Travel")];
    await folders.refresh();
    selection.set(["save-1"]);
    await harness.mount();
    await act(async () => {
      fireDrag(harness.button("Travel"), "drop", folderTransfer());
    });
    expect(pondQuery).toHaveBeenCalledWith("folders.addSaves", {
      folderId: "Travel",
      saveIds: ["save-1"],
    });
  });

  it("does not file selected saves while rearranging folders", async () => {
    folderList.current = [folder("Travel"), folder("Shots")];
    await folders.refresh();
    selection.set(["save-1"]);
    await harness.mount();
    await act(async () => {
      fireDrag(harness.button("Travel"), "drop", folderTransfer("Shots"));
    });
    expect(pondQuery).toHaveBeenCalledWith("folders.move", {
      id: "Shots",
      parentId: "Travel",
    });
    expect(pondQuery).not.toHaveBeenCalledWith(
      "folders.addSaves",
      expect.anything(),
    );
  });
});
