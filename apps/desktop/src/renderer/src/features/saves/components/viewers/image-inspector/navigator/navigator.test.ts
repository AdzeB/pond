import { describe, expect, it } from "vitest";
import { FIT_POSE } from "@/features/saves/lib/viewer-memory";
import { poseFromNavigatorPoint, viewportFraction } from "./navigator-geometry";

const stage = { width: 800, height: 600 };

describe("viewportFraction", () => {
  it("covers the full image at fit", () => {
    expect(viewportFraction(FIT_POSE, stage)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("shrinks the viewport when zoomed in", () => {
    const box = viewportFraction({ zoom: 2, x: 0, y: 0 }, stage);
    expect(box.width).toBeCloseTo(0.5);
    expect(box.height).toBeCloseTo(0.5);
    expect(box.x).toBeCloseTo(0.25);
    expect(box.y).toBeCloseTo(0.25);
  });
});

describe("poseFromNavigatorPoint", () => {
  it("recenters the zoomed pose on the clicked point", () => {
    const pose = poseFromNavigatorPoint(0.75, 0.25, 2, stage);
    const box = viewportFraction(pose, stage);
    expect(box.x + box.width / 2).toBeCloseTo(0.75);
    expect(box.y + box.height / 2).toBeCloseTo(0.25);
  });
});
