import { EAGLE_SUPPORTED_EXTENSIONS } from "@shared/eagle-formats";
import { classifyLibraryFile } from "@shared/file-format";
import { describe, expect, it } from "vitest";
import {
  mediaTypeForImportedFiles,
  storageKindForImport,
} from "./manual-import";

describe("storageKindForImport", () => {
  it("keeps the first image as the cover and preserves other file roles", () => {
    expect(storageKindForImport(classifyLibraryFile("a.heic"), 0)).toBe(
      "cover",
    );
    expect(storageKindForImport(classifyLibraryFile("b.tiff"), 1)).toBe(
      "media",
    );
    expect(storageKindForImport(classifyLibraryFile("song.m4a"), 0)).toBe(
      "audio",
    );
    expect(storageKindForImport(classifyLibraryFile("paper.pdf"), 0)).toBe(
      "document",
    );
    expect(storageKindForImport(classifyLibraryFile("face.woff2"), 0)).toBe(
      "font",
    );
    expect(storageKindForImport(classifyLibraryFile("model.usdz"), 0)).toBe(
      "file",
    );
    expect(storageKindForImport(classifyLibraryFile("layout.psd"), 0)).toBe(
      "file",
    );
    expect(storageKindForImport(classifyLibraryFile("negative.cr3"), 0)).toBe(
      "file",
    );
  });

  it.each([
    ...EAGLE_SUPPORTED_EXTENSIONS,
  ])("assigns a persistent storage role to Eagle-compatible .%s", (extension) => {
    expect(
      storageKindForImport(classifyLibraryFile(`asset.${extension}`), 0),
    ).toBeTruthy();
  });
});

describe("mediaTypeForImportedFiles", () => {
  it("uses the majority type", () => {
    expect(
      mediaTypeForImportedFiles([
        classifyLibraryFile("one.mp3"),
        classifyLibraryFile("two.wav"),
        classifyLibraryFile("cover.jpg"),
      ]),
    ).toBe("audio");
  });

  it("uses a stable visual-first tie break for mixed Eagle items", () => {
    expect(
      mediaTypeForImportedFiles([
        classifyLibraryFile("paper.pdf"),
        classifyLibraryFile("cover.tiff"),
      ]),
    ).toBe("image");
  });
});
