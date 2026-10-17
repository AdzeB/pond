import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLibrarySaveGap } from "@/features/library/components/layouts/save-gap";
import { libraryHeader } from "@/features/library/state/library-header";
import {
  getViewState,
  setLayout,
  setSort,
  setZoom,
} from "@/features/library/state/view-store";
import { setDisplayPref } from "@/features/saves";
import { ViewMenu } from "./";

function query<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

function typeInto(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("view menu", () => {
  let root: Root;
  let host: HTMLDivElement;

  function reset() {
    libraryHeader.closePopover();
    setLayout("justified");
    setZoom(130);
    setLibrarySaveGap(16);
    setSort({ key: "savedAt", dir: "desc" });
    setDisplayPref("source", true);
  }

  async function open() {
    await act(async () => root.render(<ViewMenu />));
    await act(async () =>
      query<HTMLButtonElement>('[aria-label="View Options"]').click(),
    );
  }

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    reset();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    reset();
    vi.unstubAllGlobals();
  });

  it("shows layout, display, sorting, and thumbnail in one popup", async () => {
    await act(async () => root.render(<ViewMenu />));
    expect(document.querySelectorAll("button[aria-haspopup]").length).toBe(1);

    await open();

    const popup = query<HTMLElement>(
      '[role="dialog"][aria-label="View Options"]',
    );
    const titles = Array.from(popup.querySelectorAll("section > h3")).map(
      (node) => node.textContent,
    );
    expect(titles).toEqual(["Layout", "Display", "Sorting", "Thumbnail"]);
    for (const section of popup.querySelectorAll("section")) {
      const title = section.querySelector("h3");
      expect(section.getAttribute("aria-labelledby")).toBe(title?.id);
    }

    expect(
      query<HTMLInputElement>('input[aria-label="Size value"]').value,
    ).toBe("130");
    expect(query<HTMLInputElement>('input[aria-label="Gap value"]').value).toBe(
      "16",
    );
    expect(popup.textContent).toContain("Quality");
    expect(popup.textContent).toContain("Item Info");
    expect(popup.textContent).toContain("Date Saved");
    expect(
      query('button[aria-label="Descending"]').getAttribute("aria-pressed"),
    ).toBe("true");
    expect(query('button[aria-label="Show Sidebar"]')).not.toBeNull();
  });

  it("switches layouts from the view control", async () => {
    await open();

    const justified = query<HTMLButtonElement>(
      'button[aria-label="Justified"]',
    );
    const grid = query<HTMLButtonElement>('button[aria-label="Grid"]');
    expect(justified.getAttribute("aria-pressed")).toBe("true");
    expect(grid.getAttribute("aria-pressed")).toBe("false");

    await act(async () => grid.click());

    expect(getViewState().layout).toBe("grid");
    expect(justified.getAttribute("aria-pressed")).toBe("false");
    expect(grid.getAttribute("aria-pressed")).toBe("true");
  });

  it("commits exact size and gap values on blur without a range", async () => {
    await open();

    const size = query<HTMLInputElement>('input[aria-label="Size value"]');
    const gap = query<HTMLInputElement>('input[aria-label="Gap value"]');

    await act(async () => {
      typeInto(size, "520");
      typeInto(gap, "120");
    });
    await act(async () => {
      size.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      gap.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(window.localStorage.getItem("pond.gridZoom")).toBe("520");
    expect(window.localStorage.getItem("pond.itemGap")).toBe("120");
    expect(size.value).toBe("520");
    expect(gap.value).toBe("120");
  });

  it("floors negative values at zero", async () => {
    await open();

    const gap = query<HTMLInputElement>('input[aria-label="Gap value"]');
    await act(async () => typeInto(gap, "-8"));
    await act(async () => {
      gap.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(window.localStorage.getItem("pond.itemGap")).toBe("0");
    expect(gap.value).toBe("0");
  });

  it("restores the current value when Escape is pressed", async () => {
    await open();

    const size = query<HTMLInputElement>('input[aria-label="Size value"]');
    await act(async () => typeInto(size, "200"));
    await act(async () => {
      size.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(size.value).toBe("130");

    await act(async () => {
      size.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(getViewState().zoom).toBe(130);
  });

  it("changes sort direction without resetting the key", async () => {
    setSort({ key: "title", dir: "desc" });
    await open();

    await act(async () =>
      query<HTMLButtonElement>('button[aria-label="Ascending"]').click(),
    );

    expect(getViewState().sortKey).toBe("title");
    expect(getViewState().sortDir).toBe("asc");
  });

  it("toggles card details independently", async () => {
    await open();

    const source = query<HTMLButtonElement>(
      'button[aria-label="Show Source Tag"]',
    );
    const name = query<HTMLButtonElement>('button[aria-label="Show Name"]');
    const nameBefore = name.getAttribute("aria-pressed");
    expect(source.getAttribute("aria-pressed")).toBe("true");

    await act(async () => source.click());

    expect(source.getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem("pond.display.source")).toBe("0");
    expect(name.getAttribute("aria-pressed")).toBe(nameBefore);
  });
});
