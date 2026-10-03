import { describe, expect, it } from "vitest";
import { FIT_POSE } from "@/features/saves/lib/viewer-memory";
import {
  poseFromNavigatorPoint,
  viewportFraction,
  viewportOverflows,
} from "./navigator-geometry";

const stage = { width: 800, height: 600 };
const bounds = { width: 800, height: 600 };

describe("viewportFraction", () => {
  it("covers the full image at fit", () => {
    expect(viewportFraction(FIT_POSE, stage, bounds)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it("shrinks the viewport when zoomed in", () => {
    const box = viewportFraction({ zoom: 2, x: 0, y: 0 }, stage, bounds);
    expect(box.width).toBeCloseTo(0.5);
    expect(box.height).toBeCloseTo(0.5);
    expect(box.x).toBeCloseTo(0.25);
    expect(box.y).toBeCloseTo(0.25);
  });

  it("shows only horizontal overflow for a fitted landscape image", () => {
    const box = viewportFraction(
      { zoom: 2, x: 0, y: 0 },
      { width: 1000, height: 1000 },
      { width: 1000, height: 500 },
    );
    expect(box.width).toBeCloseTo(0.5);
    expect(box.height).toBe(1);
    expect(viewportOverflows(box)).toBe(true);
  });

  it("shows only vertical overflow for a fitted portrait image", () => {
    const box = viewportFraction(
      { zoom: 2, x: 0, y: 0 },
      { width: 1000, height: 1000 },
      { width: 500, height: 1000 },
    );
    expect(box.width).toBe(1);
    expect(box.height).toBeCloseTo(0.5);
    expect(viewportOverflows(box)).toBe(true);
  });

  it("hides the navigator when the complete fitted image is visible", () => {
    const box = viewportFraction(
      FIT_POSE,
      { width: 1000, height: 1000 },
      { width: 1000, height: 500 },
    );
    expect(box.width).toBe(1);
    expect(box.height).toBe(1);
    expect(viewportOverflows(box)).toBe(false);
  });
});

describe("poseFromNavigatorPoint", () => {
  it("recenters the zoomed pose on the clicked point", () => {
    const pose = poseFromNavigatorPoint(0.75, 0.25, 2, bounds);
    const box = viewportFraction(pose, stage, bounds);
    expect(box.x + box.width / 2).toBeCloseTo(0.75);
    expect(box.y + box.height / 2).toBeCloseTo(0.25);
  });
});
