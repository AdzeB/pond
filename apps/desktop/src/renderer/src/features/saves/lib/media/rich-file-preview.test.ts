import { describe, expect, it } from "vitest";
import type { SaveFile } from "@/features/saves/types";
import { richFilePreviewKind } from "./rich-file-preview";

function file(extension: string): SaveFile {
  return {
    kind: "file",
    path: `sample.${extension}`,
    sha256: "sample",
    size: 1,
  };
}

describe("richFilePreviewKind", () => {
  it.each([
    ["glb", "model"],
    ["obj", "model"],
    ["epub", "epub"],
    ["woff2", "font"],
    ["ttf", "font"],
    ["zip", "archive"],
    ["rar", "archive"],
  ])("uses a rich card preview for .%s", (extension, expected) => {
    expect(richFilePreviewKind(file(extension))).toBe(expected);
  });

  it.each(["docx", "pdf", "html", "psd"])(
    "keeps .%s on its existing card renderer",
    (extension) => {
      expect(richFilePreviewKind(file(extension))).toBeNull();
    },
  );
});
