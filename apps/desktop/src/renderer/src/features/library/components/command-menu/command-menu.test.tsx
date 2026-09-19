import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commandMenu } from "@/features/library/state/command-menu";
import { normalise } from "@/features/saves/lib/reconcile";
import { selection } from "@/features/saves/state/selection";
import { CommandMenuHost } from "./";

const openSave = vi.fn();
function useResults(query: string) {
  const save = normalise({
    id: "save-1",
    source: "local",
    title: "Design systems field notes",
    url: "pond://save-1",
    author: "Pond",
    mediaType: "text",
  });
  if (!save) throw new Error("Invalid search fixture");
  return { results: query ? [save] : null, searching: false };
}

describe("command menu", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("pond", { query: async () => PrefsSchema.parse({}) });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    openSave.mockClear();
    commandMenu.close();
    selection.clear();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    commandMenu.close();
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  async function open() {
    await act(async () =>
      root.render(
        <CommandMenuHost useResults={useResults} onOpenSave={openSave} />,
      ),
    );
    await act(async () => commandMenu.open());
    return document.querySelector<HTMLInputElement>(
      'input[aria-label="Search Pond"]',
    );
  }

  it("opens with navigation and actions", async () => {
    const input = await open();
    expect(input).not.toBeNull();
    expect(document.body.textContent).toContain("Create");
    expect(document.body.textContent).toContain("Import Files");
    expect(document.body.textContent).toContain("Navigate");
    expect(document.body.textContent).toContain("Library");
    expect(document.body.textContent).toContain("Open Settings");
    expect(document.body.textContent).toContain("Navigate");
  });

  it("prioritizes actions for the current selection", async () => {
    selection.set(["save-1"]);
    await open();

    expect(document.body.textContent).toContain("1 Selected");
    expect(document.body.textContent).toContain("Add to Chat");
    expect(document.body.textContent).toContain("Export Selection");
    expect(document.body.textContent).toContain("Move to Trash");
  });

  it("searches saves and opens the highlighted result with the keyboard", async () => {
    const input = await open();
    if (!input) throw new Error("Missing command input");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "design");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("Design systems field notes");
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(openSave).toHaveBeenCalledWith("save-1");
    expect(document.querySelector('[role="dialog"][data-open]')).toBeNull();
  });

  it("resets the query and selection after an external close", async () => {
    const input = await open();
    if (!input) throw new Error("Missing command input");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "design");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    await act(async () => commandMenu.toggle());
    await act(async () => commandMenu.open());

    const reopenedInput = document.querySelector<HTMLInputElement>(
      'input[aria-label="Search Pond"]',
    );
    expect(reopenedInput?.value).toBe("");
    expect(reopenedInput?.getAttribute("aria-activedescendant")).toBe(
      "command:new-folder",
    );
  });

  it("sizes the results list to its content height", async () => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 240;
      },
    });
    await open();
    const results = document.getElementById("pond-command-menu-results");
    expect(results?.style.getPropertyValue("--results-height")).toBe("240px");
    expect(results?.getAttribute("data-sized")).toBe("true");
  });
});
