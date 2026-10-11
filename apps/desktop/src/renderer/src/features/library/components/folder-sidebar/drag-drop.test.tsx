import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { folders } from "@/features/library/state/folders";
import {
  beginSaveDrag,
  draggingSaveIds,
  SAVE_DRAG_TYPE,
} from "@/features/saves/lib/start-drag";
import { selection } from "@/features/saves/navigation";
import { toastManager } from "@/shared/lib/toast";
import {
  createFolderSidebarHarness,
  fireDrag,
  folder,
  folderList,
  folderTransfer,
  pondQuery,
} from "./test-harness";

function pointer(type: string, clientY: number): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 20,
    clientY,
  });
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: 1 },
    pointerType: { value: "mouse" },
  });
  return event;
}

function toastText(): string {
  return document.body.querySelector("[data-slot='toasts']")?.textContent ?? "";
}

describe("folder sidebar drag and drop", () => {
  const harness = createFolderSidebarHarness();

  beforeEach(() => harness.setup());
  afterEach(async () => {
    toastManager.close();
    vi.restoreAllMocks();
    await harness.cleanup();
  });

  it("nests a folder with the dnd-kit organization path", async () => {
    folderList.current = [folder("Travel"), folder("Shots")];
    await folders.refresh();
    await harness.mount();
    const rows = [
      ...harness.host.querySelectorAll<HTMLElement>("[data-folder-sortable]"),
    ];
    rows.forEach((row, index) => {
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue(
        DOMRect.fromRect({ x: 0, y: index * 40, width: 220, height: 40 }),
      );
    });
    await act(async () => {
      harness.button("Shots").dispatchEvent(pointer("pointerdown", 60));
    });
    await act(async () => {
      document.dispatchEvent(pointer("pointermove", 50));
    });
    await act(async () => {
      document.dispatchEvent(pointer("pointermove", 20));
    });
    await act(async () => {
      document.dispatchEvent(pointer("pointerup", 20));
    });
    await vi.waitFor(() =>
      expect(pondQuery).toHaveBeenCalledWith("folders.move", {
        id: "Shots",
        parentId: "Travel",
      }),
    );
    expect(pondQuery).not.toHaveBeenCalledWith(
      "folders.addSaves",
      expect.anything(),
    );
  });

  it("ignores legacy native folder payloads", async () => {
    folderList.current = [folder("Travel"), folder("Tickets", "Travel")];
    await folders.refresh();
    await harness.mount();
    const transfer = folderTransfer("Travel");
    await act(async () => {
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
    const transfer = folderTransfer();
    transfer.setData(SAVE_DRAG_TYPE, "save-1");
    await harness.mount();
    await act(async () => {
      fireDrag(harness.button("Travel"), "drop", transfer);
    });
    expect(pondQuery).toHaveBeenCalledWith("folders.addSaves", {
      folderId: "Travel",
      saveIds: ["save-1"],
    });
  });

  it("uses the immutable drag payload and shows the destination action", async () => {
    folderList.current = [folder("Travel")];
    await folders.refresh();
    selection.set(["drag-a", "drag-b"]);
    const transfer = folderTransfer();
    beginSaveDrag("drag-a", { dataTransfer: transfer, preventDefault() {} });
    selection.set(["changed-after-start"]);
    await harness.mount();
    const target = harness.button("Travel");

    await act(async () => {
      fireDrag(target, "dragover", transfer);
    });
    expect(target.textContent).toContain("Add 2 Saves");
    expect(transfer.dropEffect).toBe("copy");

    await act(async () => {
      fireDrag(target, "drop", transfer);
    });
    await vi.waitFor(() =>
      expect(pondQuery).toHaveBeenCalledWith("folders.addSaves", {
        folderId: "Travel",
        saveIds: ["drag-a", "drag-b"],
      }),
    );
    await vi.waitFor(() =>
      expect(toastText()).toContain('Added 2 Saves to "Travel"'),
    );
    expect(draggingSaveIds()).toEqual([]);
  });

  it("reports a failed Save assignment", async () => {
    folderList.current = [folder("Travel")];
    await folders.refresh();
    const transfer = folderTransfer();
    transfer.setData(SAVE_DRAG_TYPE, "save-1");
    await harness.mount();
    pondQuery.mockRejectedValueOnce(new Error("Disk unavailable"));

    await act(async () => {
      fireDrag(harness.button("Travel"), "drop", transfer);
    });

    await vi.waitFor(() =>
      expect(toastText()).toContain("Couldn't add Save to folder"),
    );
    expect(toastText()).toContain("Try again.");
  });

  it("does not mistake a legacy folder payload for a Save drop", async () => {
    folderList.current = [folder("Travel"), folder("Shots")];
    await folders.refresh();
    selection.set(["save-1"]);
    await harness.mount();
    await act(async () => {
      fireDrag(harness.button("Travel"), "drop", folderTransfer("Shots"));
    });
    expect(
      pondQuery.mock.calls.filter((call) => call[0] === "folders.move"),
    ).toEqual([]);
    expect(pondQuery).not.toHaveBeenCalledWith(
      "folders.addSaves",
      expect.anything(),
    );
  });
});
