import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { regionBetween, viewportRegion } from "./geometry";

describe("overlay geometry", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 600);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("clips an element to the viewport", () => {
    expect(viewportRegion({ x: -20, y: 500, width: 200, height: 400 })).toEqual(
      {
        x: 0,
        y: 500,
        width: 180,
        height: 100,
        viewportWidth: 800,
        viewportHeight: 600,
      },
    );
  });

  it("drops an element outside the viewport", () => {
    expect(viewportRegion({ x: 900, y: 0, width: 50, height: 50 })).toBeNull();
  });

  it("normalizes a drag in any direction", () => {
    expect(regionBetween({ x: 300, y: 200 }, { x: 100, y: 50 })).toMatchObject({
      x: 100,
      y: 50,
      width: 200,
      height: 150,
    });
    expect(regionBetween({ x: 10, y: 10 }, { x: 11, y: 40 })).toBeNull();
  });
});
