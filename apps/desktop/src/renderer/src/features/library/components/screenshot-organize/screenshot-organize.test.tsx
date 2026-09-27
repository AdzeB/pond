import type { Folder } from "@pond/schema/db";
import type { ScreenshotDraft } from "@shared/screenshot-capture";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { registerSaveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { ScreenshotOrganizeDialog } from ".";

function folder(
  id: string,
  name: string,
  parentId: string | null = null,
): Folder {
  return {
    id,
    name,
    parentId,
    sortOrder: 0,
    color: null,
    createdAt: new Date(0),
  };
}
const draft: ScreenshotDraft = {
  token: "draft-1",
  preview: "data:image/png;base64,AA==",
  width: 800,
  height: 600,
  title: "Original title",
  tags: ["Screenshot", "Reference"],
};
let host: HTMLDivElement;
let root: Root;
let folderRows: Folder[];
let folderFailure = false;
let saveFailure = false;
let createFailure = false;
const closed = vi.fn();
const opened = vi.fn();
const query = vi.fn(async (name: string) => {
  if (name === "folders.list") {
    if (folderFailure) throw new Error("Folder read failed");
    return folderRows;
  }
  if (name === "folders.memberships") return [];
  if (name === "tags.list" || name === "tagGroups.list") return [];
  if (name === "screenshots.finish") {
    if (saveFailure) throw new Error("Save failed. Try again.");
    return { id: "saved-1" };
  }
  if (name === "folders.create") {
    if (createFailure) throw new Error("Folder creation failed. Try again.");
    const created = folder("created", "New Folder");
    folderRows.push(created);
    return created;
  }
  return { ok: true };
});

beforeEach(async () => {
  query.mockClear();
  closed.mockClear();
  opened.mockClear();
  folderFailure = false;
  saveFailure = false;
  createFailure = false;
  folderRows = [
    folder("inspiration", "Inspiration"),
    folder("interfaces", "Interfaces", "inspiration"),
    folder("photos", "Photography"),
  ];
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("pond", { query, onSyncAction: () => () => {} });
  registerSaveLibraryBridge({
    getNav: () => ({ kind: "all" }),
    inspectSave: () => {},
    openSaveDetails: opened,
    setInspectorSaveId: () => {},
    setNav: () => {},
    setAgentOpen: () => {},
    closeRightPane: () => {},
    resetFilters: () => {},
    openFolderPicker: () => {},
    openRename: () => {},
    openConversion: () => {},
    openDuplicateReview: () => {},
    findSimilarColor: () => {},
    setVisualProbe: () => {},
    foldersForSave: () => [],
    foldersSnapshot: () => [],
    lastUsedFolderId: () => null,
    rememberFolderDestinations: () => {},
    refreshFolders: async () => {},
    saveFolderPresentation: async () => {},
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () =>
    root.render(
      <ScreenshotOrganizeDialog draft={draft} open onClose={closed} />,
    ),
  );
}
function control(label: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  if (!node) throw new Error(`Missing control: ${label}`);
  return node;
}
function button(text: string): HTMLButtonElement {
  const node = [...document.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === text,
  );
  if (!node) throw new Error(`Missing button: ${text}`);
  return node;
}
async function click(element: HTMLElement) {
  await act(async () => element.click());
}
async function fill(label: string, value: string) {
  const element = control(label);
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  await act(async () => {
    setter?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function key(label: string, value: string) {
  await act(async () =>
    control(label).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
}

it("stages metadata and a nested destination until Save, then closes for main to restore focus", async () => {
  await mount();
  await fill("Screenshot Title", "Design reference");
  await fill("Screenshot Notes", "First line\nSecond line");
  await click(control("4 Stars"));
  await click(control("Remove tag Reference"));
  await click(control("Inspiration / Interfaces"));
  expect(query.mock.calls.some(([name]) => name === "screenshots.finish")).toBe(
    false,
  );
  await click(button("Save Screenshot"));
  expect(query).toHaveBeenCalledWith("screenshots.finish", {
    token: "draft-1",
    title: "Design reference",
    notes: "First line\nSecond line",
    tags: ["Screenshot"],
    rating: 4,
    folderId: "interfaces",
  });
  expect(opened).not.toHaveBeenCalled();
  expect(closed).toHaveBeenCalledOnce();
  expect(localStorage.getItem("pond:recent-folder-destinations")).toBe(
    "interfaces",
  );
});
it("searches collapsed descendants and navigates destinations without saving", async () => {
  await mount();
  await click(control("Collapse Inspiration"));
  expect(
    document.querySelector('[aria-label="Inspiration / Interfaces"]'),
  ).toBeNull();
  await fill("Search screenshot folders", "Interfaces");
  expect(control("Inspiration / Interfaces")).toBeTruthy();
  await key("Search screenshot folders", "ArrowDown");
  expect(document.activeElement).toBe(control("Inspiration / Interfaces"));
  await key("Inspiration / Interfaces", "ArrowUp");
  expect(document.activeElement).toBe(control("Search screenshot folders"));
  await key("Search screenshot folders", "Enter");
  expect(control("Inspiration / Interfaces").getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(query.mock.calls.some(([name]) => name === "screenshots.finish")).toBe(
    false,
  );
});
it("preserves edited details after a save failure and retries the same draft", async () => {
  await mount();
  saveFailure = true;
  await fill("Screenshot Notes", "Keep this note");
  await click(control("3 Stars"));
  await click(control("3 Stars"));
  await click(button("Save Screenshot"));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Save failed",
  );
  expect(closed).not.toHaveBeenCalled();
  saveFailure = false;
  await click(button("Save Screenshot"));
  expect(query).toHaveBeenLastCalledWith(
    "screenshots.finish",
    expect.objectContaining({
      token: "draft-1",
      notes: "Keep this note",
      rating: 0,
    }),
  );
  expect(closed).toHaveBeenCalledOnce();
});
it("keeps the destination browser visible on a load failure and offers retry", async () => {
  folderFailure = true;
  await mount();
  expect(button("Save Screenshot").disabled).toBe(true);
  expect(control("Search screenshot folders")).toBeTruthy();
  folderFailure = false;
  await click(button("Try Again"));
  expect(control("Inspiration / Interfaces")).toBeTruthy();
  expect(button("Save Screenshot").disabled).toBe(false);
  await click(control("Close"));
  expect(query).toHaveBeenLastCalledWith("screenshots.discard", {
    token: "draft-1",
  });
});
it("retains a failed folder name, then creates and selects a destination without saving", async () => {
  await mount();
  createFailure = true;
  await fill("Search screenshot folders", "New Folder");
  await click(button('Create "New Folder"'));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Folder creation failed",
  );
  expect(button('Create "New Folder"')).toBeTruthy();
  createFailure = false;
  await click(button('Create "New Folder"'));
  expect(control("New Folder").getAttribute("aria-pressed")).toBe("true");
  expect(query.mock.calls.some(([name]) => name === "screenshots.finish")).toBe(
    false,
  );
});
