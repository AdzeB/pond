import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { newMenuDialog } from "@/features/library/state/new-menu-dialog";
import { NewMenu, NewMenuDialogHost } from "./";

const labels = [
  "New Folder",
  "New Smart Folder",
  "New Tag",
  "New Tag Group",
  "New Note",
  "Capture Screenshot",
  "Import Files",
  "Import Folders",
  "Import from Links",
  "Import from Clipboard",
  "Import Bookmarks",
  "Import Page Assets",
  "Import Eagle Package",
  "Import Eagle Library",
  "Import Pond Package",
  "New Source",
  "New Watch",
  "Find Duplicates",
  "Auto Import",
  "Rescan Library",
  "Verify Integrity",
];

describe("new menu", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("pond", {
      query: vi.fn(async (name: string) =>
        name === "saves.desktopScreenshotSources"
          ? { sources: [] }
          : { kinds: [] },
      ),
    });
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
    await act(async () => root.render(<NewMenu />));
    const trigger = document.querySelector('[aria-label="New"]');
    if (!(trigger instanceof HTMLElement)) throw new Error("Missing New");
    await act(async () => trigger.click());
  }

  it("lists Eagle create and import actions", async () => {
    await openMenu();
    const text = document.body.textContent ?? "";
    for (const label of labels) expect(text).toContain(label);
    expect(text).toContain("Import Legacy Library");
    expect(text).not.toContain("New Tab");
    expect(text).not.toContain("Create");
    expect(text).not.toContain("Connect");
    expect(text).not.toContain("Tools");
  });

  it("uses outline icons for source actions", async () => {
    await openMenu();
    for (const label of ["New Source", "New Watch"]) {
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
      )?.set?.call(search, "zzzz");
      search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("No matches");
  });

  it("hosts the links dialog from the shared store", async () => {
    await act(async () => root.render(<NewMenuDialogHost />));
    await act(async () => newMenuDialog.open({ kind: "links" }));
    expect(document.body.textContent).toContain("Import from Links");
    const links = document.querySelector("textarea");
    if (!links) throw new Error("Missing links field");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(links, "https://example.test");
      links.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    await act(async () => newMenuDialog.close());
    await act(async () => newMenuDialog.open({ kind: "links" }));
    expect(document.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "https://example.test",
    );
  });

  it("hosts the screenshot source picker from the shared store", async () => {
    await act(async () => root.render(<NewMenuDialogHost />));
    await act(async () => newMenuDialog.open({ kind: "screenshot" }));
    expect(document.body.textContent).toContain("Capture Screenshot");
    expect(document.body.textContent).toContain(
      "Choose a screen or window to save as an image.",
    );
  });
});
