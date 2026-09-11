// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getViewState,
  restoreDefaults,
  setSort,
} from "@/features/library/state/view-store";
import { SortSection } from "./sort";

describe("sort section", () => {
  let root: Root;
  let host: HTMLDivElement;

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
    await act(async () => root.render(<SortSection />));
  }

  function control(label: string) {
    const match = [
      ...document.querySelectorAll<HTMLElement>(
        "button, label, [role='combobox'], [role='option']",
      ),
    ].find((node) => {
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      return node.getAttribute("aria-label") === label || text === label;
    });
    if (!match) throw new Error(`Missing control ${label}`);
    return match;
  }

  it("picks a sort key from the grouped select", async () => {
    await render();
    await act(async () => {
      const trigger = document.querySelector<HTMLElement>("[role='combobox']");
      if (!trigger) throw new Error(document.body.innerHTML);
      trigger.click();
    });
    await act(async () => control("Title").click());
    expect(getViewState().sortKey).toBe("title");
    expect(getViewState().sortDir).toBe("desc");
  });

  it("changes sort direction without resetting the key", async () => {
    setSort({ key: "title", dir: "desc" });
    await render();
    await act(async () => control("Ascending").click());
    expect(getViewState().sortKey).toBe("title");
    expect(getViewState().sortDir).toBe("asc");
  });
});
