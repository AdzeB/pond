import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { libraryHeader } from "@/features/library/state/library-header";
import { setDisplayPref } from "@/features/saves";
import { ViewMenu } from "./";

describe("view menu", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    libraryHeader.closePopover();
    setDisplayPref("source", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    libraryHeader.closePopover();
    setDisplayPref("source", true);
    vi.unstubAllGlobals();
  });

  it("opens layout, sort, and display as separate menus", async () => {
    await act(async () => root.render(<ViewMenu />));

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Layout"]')
        ?.click();
    });
    expect(document.body.textContent).toContain("Waterfall");
    expect(document.body.textContent).toContain("Size");
    expect(document.body.textContent).not.toContain("Use Everywhere");
    expect(document.body.textContent).toContain("Gap");
    expect(document.body.textContent).toContain("Thumbnail Quality");
    expect(document.body.textContent).toContain("Thumbnail Fit");
    expect(document.body.textContent).toContain("Item Info");
    expect(document.body.textContent).not.toContain("%");
    expect(document.body.textContent).not.toContain("pt");
    expect(document.body.textContent).not.toContain("Show Sidebar");

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Sort"]')?.click();
    });
    expect(document.body.textContent).toContain("Direction");
    expect(document.body.textContent).toContain("Descending");
    expect(document.body.textContent).toContain("Sort");
    expect(document.body.textContent).toContain("Date Saved");
    expect(document.body.textContent).not.toContain("Refresh");
    expect(document.body.textContent).not.toContain("Use Everywhere");

    expect(document.querySelector('[aria-label="Thumbnail"]')).toBeNull();

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Display"]')
        ?.click();
    });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Show Name");
    expect(text).toContain("Show Item Info");
    expect(text).not.toContain("Thumbnail Quality");
    expect(text).not.toContain("Thumbnail Fit");
    expect(text).not.toContain("Date Saved");
    expect(text).toContain("Show Sidebar");
    expect(text).toContain("Show Inspector");
    expect(text).toContain("Show Source Tag");
    expect(text).not.toContain("Show Tags");
    expect(text).not.toContain("Show Annotation");
    expect(text).not.toContain("Show Notes");
    expect(text).not.toContain("Start Presentation");
    expect(text).not.toContain("Use Everywhere");
  });

  it("lets people hide source tags from display options", async () => {
    await act(async () => root.render(<ViewMenu />));

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[aria-label="Display"]')
        ?.click();
    });

    const label = Array.from(document.querySelectorAll("label")).find((node) =>
      node.textContent?.includes("Show Source Tag"),
    );
    const toggle = label?.querySelector<HTMLButtonElement>('[role="switch"]');
    expect(toggle?.getAttribute("aria-checked")).toBe("true");

    await act(async () => toggle?.click());

    expect(toggle?.getAttribute("aria-checked")).toBe("false");
    expect(window.localStorage.getItem("pond.display.source")).toBe("0");
  });
});
