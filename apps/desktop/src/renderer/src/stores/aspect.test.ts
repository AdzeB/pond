import { describe, expect, it } from "vitest";
import type { Save } from "@/lib/types";
import { aspectDimsFor, clampRatio } from "./aspect";

function save(partial: Partial<Save> & { id: string }): Save {
  return {
    url: "https://example.com",
    title: null,
    notes: null,
    source: "web",
    accountId: null,
    mediaType: null,
    fileSize: null,
    width: null,
    height: null,
    savedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    coverIndex: 0,
    files: [],
    ...partial,
  } as Save;
}

describe("aspectDimsFor", () => {
  it("prefers video dims over poster dims", () => {
    const result = aspectDimsFor(
      save({
        id: "a",
        files: [
          {
            path: "video.mp4",
            kind: "video",
            mimeType: "video/mp4",
            width: 480,
            height: 854,
          },
          {
            path: "poster.jpg",
            kind: "poster",
            mimeType: "image/jpeg",
            width: 1280,
            height: 720,
          },
        ] as never,
      }),
    );
    expect(result).toEqual({ w: 480, h: 854 });
  });

  it("falls back to save dims when the video omits them, never the poster", () => {
    const result = aspectDimsFor(
      save({
        id: "b",
        width: 480,
        height: 854,
        files: [
          {
            path: "video.mp4",
            kind: "video",
            mimeType: "video/mp4",
            width: null,
            height: null,
          },
          {
            path: "poster.jpg",
            kind: "poster",
            mimeType: "image/jpeg",
            width: 1280,
            height: 720,
          },
        ] as never,
      }),
    );
    expect(result).toEqual({ w: 480, h: 854 });
  });

  it("does not use poster dims for video cards", () => {
    const result = aspectDimsFor(
      save({
        id: "c",
        files: [
          {
            path: "video.mp4",
            kind: "video",
            mimeType: "video/mp4",
            width: null,
            height: null,
          },
          {
            path: "poster.jpg",
            kind: "poster",
            mimeType: "image/jpeg",
            width: 720,
            height: 1280,
          },
        ] as never,
      }),
    );
    expect(result).toEqual({ w: null, h: null });
  });
});

describe("clampRatio", () => {
  it("clamps extreme panoramas and portraits", () => {
    expect(clampRatio(4000, 100)).toBeCloseTo(2.5);
    expect(clampRatio(100, 4000)).toBeCloseTo(0.4);
  });
});
