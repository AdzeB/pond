// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginLibraryLayoutTransition,
  completeLibraryLayoutTransition,
} from "./library-layout-transition";

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    x: left,
    y: top,
    top,
    right: left + width,
    bottom: top + height,
    left,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("library layout transition", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("FLIPs only mounted cards that intersected the viewport", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })) as unknown as typeof matchMedia,
    );

    const root = document.createElement("div");
    root.dataset.slot = "window";
    const viewport = document.createElement("main");
    viewport.dataset.libraryGridViewport = "";
    const grid = document.createElement("ul");
    const visible = document.createElement("li");
    visible.dataset.libraryCard = "";
    visible.dataset.saveId = "visible";
    const offscreen = document.createElement("li");
    offscreen.dataset.libraryCard = "";
    offscreen.dataset.saveId = "offscreen";
    grid.append(visible, offscreen);
    viewport.append(grid);
    root.append(viewport);
    document.body.append(root);

    viewport.getBoundingClientRect = () => rect(0, 0, 500, 500);
    let visibleRect = rect(20, 30, 100, 120);
    visible.getBoundingClientRect = () => visibleRect;
    offscreen.getBoundingClientRect = () => rect(20, 700, 100, 120);
    const visibleAnimate = vi.fn(() => ({
      id: "",
      cancel: vi.fn(),
    })) as unknown as typeof visible.animate;
    visible.animate = visibleAnimate;
    offscreen.animate = vi.fn() as unknown as typeof offscreen.animate;
    visible.getAnimations = () => [];
    offscreen.getAnimations = () => [];

    beginLibraryLayoutTransition();
    expect(root.hasAttribute("data-layout-transition")).toBe(true);
    visibleRect = rect(70, 80, 200, 240);
    completeLibraryLayoutTransition(grid);

    expect(root.hasAttribute("data-layout-transition")).toBe(false);
    expect(visibleAnimate).toHaveBeenCalledTimes(1);
    expect(offscreen.animate).not.toHaveBeenCalled();
    expect(visibleAnimate).toHaveBeenCalledWith(
      [
        {
          scale: "0.5 0.5",
          transformOrigin: "top left",
          translate: "-50px -50px",
        },
        {
          scale: "1 1",
          transformOrigin: "top left",
          translate: "0px 0px",
        },
      ],
      expect.objectContaining({ composite: "add", duration: 200 }),
    );
  });
});
