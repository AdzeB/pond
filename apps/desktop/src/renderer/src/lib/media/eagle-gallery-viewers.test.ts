import { describe, expect, it } from "vitest";
import type { SaveFile } from "@/lib/types";
import { viewerCapabilityFor } from "./viewer-capability";

function file(extension: string): SaveFile {
  return {
    kind: "file",
    path: `gallery.${extension}`,
    sha256: "gallery",
    size: 1,
  };
}

describe("Eagle Format Gallery viewers", () => {
  it.each([
    ["jpg", "media"],
    ["heic", "media"],
    ["psd", "native-preview"],
    ["dng", "native-preview"],
    ["mp4", "media"],
    ["wav", "audio"],
    ["pdf", "pdf"],
    ["docx", "native-preview"],
    ["xlsx", "native-preview"],
    ["pptx", "native-preview"],
    ["woff2", "font"],
    ["glb", "model"],
    ["epub", "epub"],
    ["zip", "archive"],
    ["html", "safe-web"],
    ["md", "text"],
  ])("routes .%s through %s", (extension, expected) => {
    expect(viewerCapabilityFor(file(extension)).kind).toBe(expected);
  });
});
