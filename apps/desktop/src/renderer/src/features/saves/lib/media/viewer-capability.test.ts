import { EAGLE_SUPPORTED_EXTENSIONS } from "@shared/eagle-formats";
import { describe, expect, it } from "vitest";
import type { SaveFile } from "@/features/saves/types";
import { viewerCapabilityFor } from "./viewer-capability";

function file(extension: string, mimeType?: string): SaveFile {
  return {
    kind: "file",
    path: `sample.${extension}`,
    mimeType,
    sha256: "sample",
    size: 1,
  };
}

describe("viewerCapabilityFor", () => {
  it.each(["jpg", "png", "webp", "avif"])(
    "treats .%s as an editable original raster",
    (extension) => {
      expect(viewerCapabilityFor(file(extension))).toMatchObject({
        kind: "media",
        surface: "raster",
        source: "original",
        edits: "full",
      });
    },
  );

  it.each(["heic", "tiff", "jxl", "dng", "cr3", "psd", "ai", "docx"])(
    "treats .%s as a generated raster without destructive edits",
    (extension) => {
      expect(viewerCapabilityFor(file(extension))).toMatchObject({
        surface: "raster",
        source: "generated",
        edits: "none",
      });
    },
  );

  it("gives video a temporal surface", () => {
    expect(viewerCapabilityFor(file("mp4"))).toMatchObject({
      kind: "media",
      surface: "temporal",
    });
  });

  it("uses a fallback surface for an unsupported file", () => {
    expect(viewerCapabilityFor(file("unknown"))).toMatchObject({
      kind: "generic",
      surface: "fallback",
    });
  });

  it.each([...EAGLE_SUPPORTED_EXTENSIONS])(
    "routes Eagle-compatible .%s to a detail viewer",
    (extension) => {
      const capability = viewerCapabilityFor(file(extension));
      expect(capability.kind).not.toBe("none");
      expect(capability.originalActions).toBe(true);
    },
  );

  it.each([
    ["psd", "native-preview"],
    ["dng", "native-preview"],
    ["docx", "native-preview"],
    ["xlsx", "native-preview"],
    ["pptx", "native-preview"],
    ["key", "native-preview"],
    ["pages", "native-preview"],
    ["glb", "model"],
    ["gltf", "model"],
    ["amf", "model"],
    ["usdc", "model"],
    ["usdz", "model"],
    ["vtk", "model"],
    ["epub", "epub"],
    ["zip", "archive"],
    ["lottie", "archive"],
    ["livp", "live-photo"],
    ["html", "safe-web"],
    ["mhtml", "safe-web"],
    ["json", "text"],
  ])("routes .%s through %s", (extension, expected) => {
    expect(viewerCapabilityFor(file(extension)).kind).toBe(expected);
  });

  it.each([
    ["jpg", "media"],
    ["heic", "media"],
    ["mp4", "media"],
    ["wav", "audio"],
    ["pdf", "pdf"],
    ["woff2", "font"],
    ["md", "text"],
    ["css", "text"],
    ["java", "text"],
    ["js", "text"],
    ["py", "text"],
    ["rs", "text"],
    ["sql", "text"],
    ["ts", "text"],
  ])("keeps existing .%s viewer behavior as %s", (extension, expected) => {
    expect(viewerCapabilityFor(file(extension)).kind).toBe(expected);
  });
});
