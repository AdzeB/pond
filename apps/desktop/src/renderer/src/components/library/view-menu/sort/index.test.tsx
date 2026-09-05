// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getViewState, restoreDefaults, setSort } from "@/stores/view-store";
import { SortMenu } from ".";

vi.mock("@/hooks/use-scroll-fade", () => ({ useScrollFade: () => ({}) }));

describe("sort menu", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    restoreDefaults();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    restoreDefaults();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () => root.render(<SortMenu />));
  }

  function button(label: string) {
    const match = [
      ...document.querySelectorAll<HTMLElement>(
        "button, [role='menuitem'], [role='menuitemradio']",
      ),
    ].find(
      (node) =>
        node.getAttribute("aria-label") === label || node.textContent === label,
    );
    if (!match) throw new Error(`Missing button ${label}`);
    return match;
  }

  it("picks a sort key from a category submenu", async () => {
    await render();
    await act(async () => button("Sort").click());
    await act(async () => button("Content").click());
    await act(async () => button("Title").click());
    expect(getViewState().sortKey).toBe("title");
    expect(getViewState().sortDir).toBe("desc");
  });

  it("changes sort direction without resetting the key", async () => {
    setSort({ key: "title", dir: "desc" });
    await render();
    await act(async () => button("Sort").click());
    await act(async () => button("Ascending").click());
    expect(getViewState().sortKey).toBe("title");
    expect(getViewState().sortDir).toBe("asc");
  });
});
