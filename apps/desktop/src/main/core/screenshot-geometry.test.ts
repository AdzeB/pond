import { describe, expect, it } from "vitest";
import { cropRectangle } from "./screenshot-geometry";

describe("screenshot geometry", () => {
  it("uses actual pixels for Retina and scaled displays", () => {
    expect(
      cropRectangle(
        { x: 100, y: 50, width: 200, height: 100 },
        { width: 1000, height: 800 },
        { width: 2000, height: 1600 },
      ),
    ).toEqual({ left: 200, top: 100, width: 400, height: 200 });
    expect(
      cropRectangle(
        { x: 100, y: 50, width: 200, height: 100 },
        { width: 1000, height: 800 },
        { width: 1500, height: 1200 },
      ),
    ).toEqual({ left: 150, top: 75, width: 300, height: 150 });
  });
  it("clamps overshooting edges to the actual source image", () => {
    expect(
      cropRectangle(
        { x: -10, y: 790, width: 1100, height: 20 },
        { width: 1000, height: 800 },
        { width: 2000, height: 1600 },
      ),
    ).toEqual({ left: 0, top: 1580, width: 2000, height: 20 });
  });
});
