import { DEFAULT_PREFS } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { folders } from "@/features/library/state/folders";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { FolderBrowser } from ".";

const folderRows = [
  {
    id: "child",
    parentId: "root",
    name: "Reference",
    color: null,
    sortOrder: 0,
    createdAt: new Date(0),
  },
  {
    id: "nested",
    parentId: "child",
    name: "Nested",
    color: null,
    sortOrder: 0,
    createdAt: new Date(0),
  },
];

describe("folder browser", () => {
  let host: HTMLDivElement;
  let root: Root;
  const query = vi.fn(async (name: string) => {
    if (name === "folders.list") return folderRows;
    if (name === "folders.memberships") return [];
    if (name === "settings.getPrefs") return DEFAULT_PREFS;
    if (name === "folders.summaries") {
      return [
        {
          id: "child",
          directSaveCount: 2,
          childFolderCount: 1,
          previewSaveIds: ["preview-a", "preview-b", "preview-c"],
        },
      ];
    }
    if (name === "saves.getMany") return [];
    return null;
  });

  beforeEach(async () => {
    vi.stubGlobal("pond", {
      query,
      onSyncAction: vi.fn(() => () => {}),
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await folders.refresh();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    query.mockClear();
    vi.unstubAllGlobals();
  });

  it("shows child folders separately from contents", async () => {
    await act(async () => {
      root.render(
        <FolderBrowser parentId="root" contentCount={3}>
          <div>Save grid</div>
        </FolderBrowser>,
      );
    });
    await vi.waitFor(() =>
      expect(host.textContent).toContain("2 items · 1 subfolder"),
    );
    expect(host.textContent).toContain("Subfolders (1)");
    expect(host.textContent).toContain("Contents (3)");
    expect(host.textContent).toContain("Save grid");
    expect(query).toHaveBeenCalledWith("saves.getMany", {
      ids: ["preview-a", "preview-b", "preview-c"],
    });
  });

  it("opens a child folder with the keyboard-accessible card button", async () => {
    await act(async () => {
      root.render(<FolderBrowser parentId="root" contentCount={0} />);
    });
    const button = await vi.waitFor(() => {
      const candidate = host.querySelector<HTMLButtonElement>(
        'button[aria-label^="Open Reference"]',
      );
      expect(candidate).not.toBeNull();
      return candidate;
    });
    if (!button) throw new Error("Missing folder card");
    await act(async () => button.click());
    expect(libraryChrome.getState().nav).toEqual({
      kind: "folder",
      id: "child",
    });
  });

  it("opens subfolder operations from a real context-menu event", async () => {
    await act(async () => {
      root.render(<FolderBrowser parentId="root" contentCount={0} />);
    });
    const button = await vi.waitFor(() => {
      const candidate = host.querySelector<HTMLButtonElement>(
        'button[aria-label^="Open Reference"]',
      );
      expect(candidate).not.toBeNull();
      return candidate;
    });
    if (!button) throw new Error("Missing folder card");
    await act(async () => {
      button.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      );
    });
    for (const label of [
      "Open Folder",
      "Quick Access",
      "Icon",
      "Color",
      "Sort By",
      "Customize Folder",
    ]) {
      expect(
        [...document.querySelectorAll('[role^="menuitem"]')].some(
          (item) => item.textContent?.trim() === label,
        ),
      ).toBe(true);
    }
  });
});
