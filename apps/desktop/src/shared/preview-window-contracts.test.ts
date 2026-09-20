import { DEFAULT_PREFS } from "@pond/schema/db";
import { describe, expect, it } from "vitest";
import {
  PreviewNeighborRequestSchema,
  PreviewWindowConfigureSchema,
  PreviewWindowOpenSchema,
  PreviewWindowStateSchema,
} from "./preview-window-contracts";

describe("preview window contracts", () => {
  it("migrates older viewer preferences to parity defaults", () => {
    expect(DEFAULT_PREFS.viewer).toMatchObject({
      defaultImageSize: "fit",
      gifAutoplay: true,
      thumbnailBehavior: "scrub",
      thumbnailQuality: "balanced",
      hoverZoom: false,
      videoWheelBehavior: "progress",
      doubleClickAction: "open",
      middleClickAction: "open",
      spaceAction: "preview",
    });
  });

  it("accepts presentation and detached image requests", () => {
    expect(
      PreviewWindowOpenSchema.parse({
        saveId: "save",
        fileIndex: 2,
        kind: "detached",
      }),
    ).toEqual({ saveId: "save", fileIndex: 2, kind: "detached" });
  });

  it("bounds privileged window configuration", () => {
    expect(() =>
      PreviewWindowConfigureSchema.parse({ windowId: 4, opacity: 0.1 }),
    ).toThrow();
    expect(
      PreviewWindowConfigureSchema.parse({
        windowId: 4,
        opacity: 0.75,
        rotation: 270,
        mirrored: true,
        grayscale: true,
        size: "actual",
      }),
    ).toMatchObject({ opacity: 0.75, rotation: 270, size: "actual" });
  });

  it("limits neighbor requests to adjacent directions", () => {
    expect(
      PreviewNeighborRequestSchema.parse({
        windowId: 4,
        saveId: "save",
        delta: -1,
      }).delta,
    ).toBe(-1);
    expect(() =>
      PreviewNeighborRequestSchema.parse({
        windowId: 4,
        saveId: "save",
        delta: 2,
      }),
    ).toThrow();
  });

  it("requires the complete lifecycle state sent to auxiliary renderers", () => {
    expect(
      PreviewWindowStateSchema.safeParse({
        windowId: 4,
        saveId: "save",
        fileIndex: 0,
        kind: "presentation",
        title: "Reference",
        url: "pond://save/image.png",
        opacity: 1,
        alwaysOnTop: false,
        rotation: 0,
        mirrored: false,
        grayscale: false,
        size: "fit",
      }).success,
    ).toBe(true);
  });
});
