// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commandMenu } from "@/stores/command-menu";
import { selection } from "@/stores/selection";
import { CommandMenuHost } from ".";

const { openSave } = vi.hoisted(() => ({ openSave: vi.fn() }));

vi.mock("@/hooks/use-search-results", () => ({
  useSearchResults: (query: string) => ({
    results: query
      ? [
          {
            id: "save-1",
            source: "local",
            title: "Design systems field notes",
            description: null,
            notes: null,
            url: "pond://save-1",
            author: "Pond",
            mediaType: "text",
          },
        ]
      : null,
  }),
}));

vi.mock("@/lib/ui/save-nav", () => ({ openSave }));
vi.mock("@/components/library/new-menu/actions", () => ({
  importClipboard: vi.fn(),
  importEagle: vi.fn(),
  importPaths: vi.fn(),
  newFolder: vi.fn(),
  newSource: vi.fn(),
  newTag: vi.fn(),
  runNewAction: vi.fn(),
}));
vi.mock("@/lib/save/selection", () => ({
  exportSelectionFiles: vi.fn(),
  restoreSelection: vi.fn(),
  trashSelection: vi.fn(),
}));
vi.mock("@/components/shared/shortcuts-sheet", () => ({
  openShortcutsSheet: vi.fn(),
}));
vi.mock("@/stores/prefs", () => ({
  usePrefs: () => [{ semanticSearch: false, enableClip: false }],
}));
vi.mock("@/stores/view-store", () => ({
  resetFilters: vi.fn(),
  setSearchInput: vi.fn(),
}));

describe("command menu", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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
    await act(async () => root.render(<CommandMenuHost />));
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
    expect(document.body.textContent).toContain("Keyboard Shortcuts");
    expect(document.body.textContent).toContain("Navigate");
  });

  it("prioritizes actions for the current selection", async () => {
    selection.set(["save-1"]);
    await open();

    expect(document.body.textContent).toContain("1 Selected");
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
