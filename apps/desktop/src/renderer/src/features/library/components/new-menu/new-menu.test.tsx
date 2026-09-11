// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import { NewMenu, NewMenuDialogHost } from "./new-menu";

const newFolder = vi.fn();

const labels = [
  "New Folder",
  "New Tag",
  "New Tag Group",
  "New Note",
  "Import Files",
  "Import Folders",
  "Import from Links",
  "Import from Clipboard",
  "Import Bookmarks",
  "Import Page Assets",
  "Import Eagle Library",
  "Connect a Source",
  "Watch Account",
  "Watched Folder",
];

describe("new menu", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    newMenuDialog.close();
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  async function openMenu() {
    await act(async () => root.render(<NewMenu onNewFolder={newFolder} />));
    const trigger = document.querySelector('[aria-label="New"]');
    if (!(trigger instanceof HTMLElement)) throw new Error("Missing New");
    await act(async () => trigger.click());
  }

  it("lists every creation and import action", async () => {
    await openMenu();
    const text = document.body.textContent ?? "";
    for (const label of labels) expect(text).toContain(label);
    expect(text).toContain("Create");
    expect(text).toContain("Import");
    expect(text).toContain("Sources");
    expect(text).not.toContain("Tabs");
    expect(text).not.toContain("New Tab");
  });

  it("uses outline icons for source actions", async () => {
    await openMenu();
    for (const label of ["Connect a Source", "Watch Account"]) {
      const item = [...document.querySelectorAll('[role="menuitem"]')].find(
        (el) => el.textContent?.includes(label),
      );
      const icon = item?.querySelector("svg");
      expect(icon).toBeTruthy();
      expect(icon?.querySelector('[stroke="currentColor"]')).toBeTruthy();
      expect(icon?.querySelector('[fill="currentColor"]')).toBeNull();
    }
  });

  it("filters by search and reports no matches", async () => {
    await openMenu();
    const search = document.querySelector('[aria-label="Search Actions"]');
    if (!(search instanceof HTMLInputElement))
      throw new Error("Missing search");
    await act(async () => {
      search.focus();
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(search, "eagle");
      search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("Import Eagle Library");
    expect(document.body.textContent).not.toContain("New Folder");

    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(search, "photoshop");
      search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("No matches");
  });

  it("creates a folder without importing", async () => {
    await openMenu();
    const item = [...document.querySelectorAll('[role="menuitem"]')].find(
      (el) => el.textContent?.includes("New Folder"),
    );
    if (!(item instanceof HTMLElement)) throw new Error("Missing New Folder");
    await act(async () => item.click());
    expect(newFolder).toHaveBeenCalledOnce();
  });

  it("hosts note and link dialogs from the shared store", async () => {
    await act(async () => root.render(<NewMenuDialogHost />));
    await act(async () => newMenuDialog.open("note"));
    expect(document.body.textContent).toContain("New Note");
    await act(async () => newMenuDialog.open("links"));
    expect(document.body.textContent).toContain("Import from Links");
  });
});
