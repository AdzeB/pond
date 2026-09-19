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
    ["epub", "epub"],
    ["zip", "archive"],
    ["html", "safe-web"],
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
  ])("keeps existing .%s viewer behavior as %s", (extension, expected) => {
    expect(viewerCapabilityFor(file(extension)).kind).toBe(expected);
  });
});
