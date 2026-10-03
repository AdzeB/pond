import { describe, expect, it } from "vitest";
import {
  EAGLE_DETAIL_VIEW_EXTENSIONS,
  EAGLE_DETAIL_VIEW_FORMATS,
  eagleDetailViewFamily,
} from "./eagle-detail-view-formats";

describe("Eagle detail-view gallery", () => {
  it("freezes the 17 observed families and 141 unique extensions", () => {
    const entries = Object.values(EAGLE_DETAIL_VIEW_FORMATS).flat();
    expect(Object.keys(EAGLE_DETAIL_VIEW_FORMATS)).toHaveLength(17);
    expect(entries).toHaveLength(141);
    expect(new Set(entries).size).toBe(141);
    expect(EAGLE_DETAIL_VIEW_EXTENSIONS.size).toBe(141);
  });

  it.each([
    ["jpg", "standardVisualCanvas"],
    ["dng", "cameraRaw"],
    ["ts", "codeEditor"],
    ["json", "dotLottieJson"],
    ["pdf", "pdf"],
    ["m4v", "frameSteppingVideo"],
    ["usdz", "model"],
    ["url", "noPreview"],
  ] as const)("maps .%s to %s", (extension, family) => {
    expect(eagleDetailViewFamily(extension)).toBe(family);
    expect(eagleDetailViewFamily(extension.toUpperCase())).toBe(family);
  });

  it.each([...EAGLE_DETAIL_VIEW_EXTENSIONS])(
    "resolves every observed .%s extension to a detail-view family",
    (extension) => {
      const family = eagleDetailViewFamily(extension);
      expect(family).not.toBeNull();
      expect(family ? EAGLE_DETAIL_VIEW_FORMATS[family] : []).toContain(
        extension,
      );
    },
  );
});
