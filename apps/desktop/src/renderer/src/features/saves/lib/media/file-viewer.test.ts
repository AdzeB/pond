import { describe, expect, it } from "vitest";
import type { SaveFile } from "@/features/saves/types";
import { storedFileViewerKind } from "./file-viewer";

function file(path: string, mimeType?: string): SaveFile {
  return { kind: "file", path, mimeType, sha256: "hash", size: 10 };
}

describe("storedFileViewerKind", () => {
  it.each([
    ["paper.pdf", "application/pdf", "pdf"],
    ["song.mp3", "audio/mpeg", "audio"],
    ["voice.m4a", "audio/mp4", "audio"],
    ["family.woff2", "font/woff2", "font"],
    ["archive.zip", "application/zip", "archive"],
    ["layout.psd", "image/vnd.adobe.photoshop", "native-preview"],
    ["negative.cr3", "image/x-canon-cr3", "native-preview"],
    [
      "report.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "native-preview",
    ],
    ["scene.glb", "model/gltf-binary", "model"],
    ["movie.mpeg", "video/mpeg", null],
    ["photo.heic", "image/heic", null],
    ["movie.mp4", "video/mp4", null],
  ])("routes %s to %s", (path, mimeType, expected) => {
    expect(storedFileViewerKind(file(path, mimeType))).toBe(expected);
  });
});
