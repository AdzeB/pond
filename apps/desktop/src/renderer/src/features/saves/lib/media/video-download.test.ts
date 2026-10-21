import { describe, expect, it } from "vitest";
import type { Save, SaveFile } from "@/features/saves/types";
import { needsVideoDownload } from "./video-download";

function file(kind: string, path: string, mimeType: string): SaveFile {
  return { kind, path, mimeType, sha256: "abcdef1234567890", size: 10 };
}

function makeSave(partial: Partial<Save>): Save {
  return {
    id: "video-save",
    source: "twitter",
    sourceId: "video-save",
    url: "https://x.com/pond/status/1",
    title: null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "video",
    files: [],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
    ...partial,
  };
}

describe("needsVideoDownload", () => {
  it("is true for a video save with only a poster", () => {
    const save = makeSave({
      files: [file("poster", "poster.jpg", "image/jpeg")],
    });
    expect(needsVideoDownload(save)).toBe(true);
  });

  it("is true for a video save with no files", () => {
    expect(needsVideoDownload(makeSave({}))).toBe(true);
  });

  it("is false once the video file is present", () => {
    const save = makeSave({
      files: [
        file("video", "clip.mp4", "video/mp4"),
        file("poster", "poster.jpg", "image/jpeg"),
      ],
    });
    expect(needsVideoDownload(save)).toBe(false);
  });

  it("is false for local saves", () => {
    const save = makeSave({
      source: "local",
      files: [file("poster", "poster.jpg", "image/jpeg")],
    });
    expect(needsVideoDownload(save)).toBe(false);
  });

  it("is false for saves that are not videos", () => {
    const image = makeSave({
      mediaType: "image",
      files: [file("image", "photo.jpg", "image/jpeg")],
    });
    const link = makeSave({ source: "web", mediaType: null });
    expect(needsVideoDownload(image)).toBe(false);
    expect(needsVideoDownload(link)).toBe(false);
  });
});
