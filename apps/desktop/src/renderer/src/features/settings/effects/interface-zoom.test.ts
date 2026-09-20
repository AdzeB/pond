// @vitest-environment jsdom

import { afterEach, expect, it } from "vitest";
import {
  FIT_POSE,
  wheelZoomFactor,
  zoomImageAt,
} from "@/features/saves/lib/viewer-memory";
import { applyInterfaceZoom, clampInterfaceZoom } from "./interface-zoom";

afterEach(() => {
  document.documentElement.style.removeProperty("zoom");
});

it("clamps interface zoom from 50 to 200 percent", () => {
  expect(clampInterfaceZoom(25)).toBe(50);
  expect(clampInterfaceZoom(125.4)).toBe(125);
  expect(clampInterfaceZoom(250)).toBe(200);
  expect(clampInterfaceZoom(Number.NaN)).toBe(100);
});

it("applies interface scale through the document zoom property", () => {
  applyInterfaceZoom(150);

  expect(document.documentElement.style.getPropertyValue("zoom")).toBe("1.5");
});

it("keeps pointer media zoom independent from interface zoom", () => {
  applyInterfaceZoom(150);
  const mediaPose = zoomImageAt(
    FIT_POSE,
    FIT_POSE.zoom * wheelZoomFactor(-120, 0, true),
    { x: 40, y: 20 },
  );

  expect(mediaPose.zoom).toBeGreaterThan(FIT_POSE.zoom);
  expect(document.documentElement.style.getPropertyValue("zoom")).toBe("1.5");

  applyInterfaceZoom(75);

  expect(document.documentElement.style.getPropertyValue("zoom")).toBe("0.75");
  expect(mediaPose.zoom).toBeGreaterThan(FIT_POSE.zoom);
});
