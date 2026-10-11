import { describe, expect, it } from "vitest";
import {
  containImage,
  cropContains,
  imagePoint,
  inImage,
  lockCropAspect,
  nudgeCrop,
  resizeCrop,
  viewToImagePoint,
} from "./image-regions";

describe("original image coordinates", () => {
  it("excludes letterboxing from drawn image regions", () => {
    const bounds = containImage(
      { left: 10, top: 20, width: 400, height: 400 },
      2,
    );
    expect(bounds).toEqual({ left: 10, top: 120, width: 400, height: 200 });
    expect(imagePoint(bounds, 110, 170)).toEqual({ x: 0.25, y: 0.25 });
    expect(imagePoint(bounds, -10, 1000)).toEqual({ x: 0, y: 1 });
  });
  it("contains portrait images without moving original coordinates", () => {
    const bounds = containImage(
      { left: 0, top: 0, width: 400, height: 200 },
      0.5,
    );
    expect(bounds).toEqual({ left: 150, top: 0, width: 100, height: 200 });
    expect(imagePoint(bounds, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
  });
  it("maps a zoomed pointer onto the pixels under the cursor", () => {
    const frame = { left: 0, top: 0, width: 400, height: 400 };
    const pose = { zoom: 2, x: 0, y: 0 };
    expect(viewToImagePoint(frame, pose, 2, 200, 200)).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(viewToImagePoint(frame, pose, 2, 300, 250)).toEqual({
      x: 0.625,
      y: 0.625,
    });
    expect(
      inImage(viewToImagePoint(frame, { zoom: 1, x: 0, y: 0 }, 2, 200, 20)),
    ).toBe(false);
  });
});

describe("crop nudging", () => {
  it("moves a crop and clamps it to the image", () => {
    expect(nudgeCrop({ x: 0.1, y: 0.2, w: 0.4, h: 0.3 }, -0.2, 0.9)).toEqual({
      x: 0,
      y: 0.7,
      w: 0.4,
      h: 0.3,
    });
  });

  it("resizes a crop without leaving the image", () => {
    expect(nudgeCrop({ x: 0.5, y: 0.5, w: 0.2, h: 0.2 }, 0, 0, 1, 1)).toEqual({
      x: 0.5,
      y: 0.5,
      w: 0.5,
      h: 0.5,
    });
  });

  it("locks a free crop to the source aspect ratio", () => {
    expect(lockCropAspect({ x: 0.1, y: 0.1, w: 0.8, h: 0.2 }, 2)).toEqual({
      x: 0.1,
      y: 0.1,
      w: 0.4,
      h: 0.2,
    });
  });

  it("resizes from a handle and hits the image edge", () => {
    expect(
      resizeCrop({ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }, "se", {
        x: 0.9,
        y: 0.9,
      }),
    ).toEqual({ x: 0.2, y: 0.2, w: 0.7, h: 0.7 });
    expect(
      resizeCrop({ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }, "nw", {
        x: 0,
        y: 0,
      }),
    ).toEqual({ x: 0, y: 0, w: 0.5, h: 0.5 });
    expect(
      cropContains({ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }, { x: 0.3, y: 0.3 }),
    ).toBe(true);
    expect(
      cropContains({ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }, { x: 0.6, y: 0.3 }),
    ).toBe(false);
  });
});
