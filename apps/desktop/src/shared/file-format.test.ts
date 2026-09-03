import { describe, expect, it } from "vitest";
import { EAGLE_SUPPORTED_EXTENSIONS } from "./eagle-formats";
import {
  canRequestNativeThumbnail,
  classifyLibraryFile,
  libraryFilename,
  typeLabelForPath,
} from "./file-format";

describe("classifyLibraryFile", () => {
  it.each([
    ["photo.jpg", "image", "direct-image", "image/jpeg"],
    ["photo.jfif", "image", "direct-image", "image/jpeg"],
    ["photo.HEIC", "image", "native-image", "image/heic"],
    ["photo.jxl", "image", "native-image", "image/jxl"],
    ["scan.tiff", "image", "native-image", "image/tiff"],
    ["movie.mp4", "video", "video", "video/mp4"],
    ["recording.mp3", "audio", "audio", "audio/mpeg"],
    ["recording.wav", "audio", "audio", "audio/wav"],
    ["recording.m4a", "audio", "audio", "audio/mp4"],
    ["paper.pdf", "document", "pdf", "application/pdf"],
    ["family.otf", "font", "font", "font/otf"],
    ["family.woff2", "font", "font", "font/woff2"],
    ["family.ttc", "font", "font", "font/collection"],
    ["notes.md", "text", "text", "text/markdown"],
    ["layout.psd", "image", "generic", "image/vnd.adobe.photoshop"],
    ["negative.cr3", "image", "generic", "image/x-canon-cr3"],
    [
      "report.docx",
      "document",
      "generic",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["scene.glb", "file", "generic", "model/gltf-binary"],
    ["movie.mpeg", "video", "generic", "video/mpeg"],
    ["book.epub", "document", "generic", "application/epub+zip"],
    ["offline.webarchive", "file", "generic", "application/x-webarchive"],
    ["model.usdz", "file", "generic", "model/vnd.usdz+zip"],
    ["archive.unknown", "file", "generic", "application/octet-stream"],
  ] as const)("classifies %s as %s with a %s preview", (path, mediaType, previewKind, mimeType) => {
    expect(classifyLibraryFile(path)).toMatchObject({
      mediaType,
      previewKind,
      mimeType,
    });
  });

  it("uses a trustworthy supplied MIME type for an unknown extension", () => {
    expect(classifyLibraryFile("asset.bin", "audio/flac")).toMatchObject({
      mediaType: "audio",
      previewKind: "audio",
      mimeType: "audio/flac",
    });
  });

  it.each([
    ...EAGLE_SUPPORTED_EXTENSIONS,
  ])("classifies Eagle-compatible .%s without an opaque MIME fallback", (extension) => {
    const result = classifyLibraryFile(`asset.${extension}`);
    expect(result.extension).toBe(extension);
    expect(result.mimeType).not.toBe("application/octet-stream");
  });
});

describe("libraryFilename", () => {
  it("preserves a useful original filename", () => {
    expect(libraryFilename("/Inbox/My typeface.woff2")).toBe(
      "My typeface.woff2",
    );
  });

  it("removes control characters and filesystem separators", () => {
    expect(libraryFilename("unsafe\u0000/name\\part.pdf")).toBe("part.pdf");
  });

  it("falls back for an unusable filename", () => {
    expect(libraryFilename("...", "file.bin")).toBe("file.bin");
  });
});

describe("typeLabelForPath", () => {
  it("supports five-character extensions", () => {
    expect(typeLabelForPath("font.woff2")).toBe("WOFF2");
  });
});

describe("native thumbnails", () => {
  it.each([
    "recording.mp3",
    "paper.pdf",
    "family.woff2",
    "model.usdz",
  ])("allows %s to request an OS thumbnail", (path) => {
    expect(canRequestNativeThumbnail(path)).toBe(true);
  });
});
