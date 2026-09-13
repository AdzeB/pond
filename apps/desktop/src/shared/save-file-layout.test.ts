import { describe, expect, it } from "vitest";
import {
  needsSaveFileLayoutBackfill,
  needsSaveFileLayoutMigration,
  planSaveFileLayout,
} from "./save-file-layout";

describe("planSaveFileLayout", () => {
  it("shifts cover.jpg ahead of existing media files", () => {
    const plan = planSaveFileLayout([
      { kind: "cover", path: "cover.jpg" },
      { kind: "media", path: "media-1.jpg" },
    ]);
    expect(plan.files).toEqual([
      { kind: "image", path: "media-1.jpg" },
      { kind: "image", path: "media-2.jpg" },
    ]);
    expect(plan.renames).toEqual([
      { from: "media-1.jpg", to: "media-2.jpg" },
      { from: "cover.jpg", to: "media-1.jpg" },
    ]);
    expect(plan.needsGeneratedThumbnail).toBe(true);
  });

  it("does not rename imported originals that only had kind cover", () => {
    const plan = planSaveFileLayout([{ kind: "cover", path: "holiday.heic" }]);
    expect(plan.files).toEqual([{ kind: "image", path: "holiday.heic" }]);
    expect(plan.renames).toEqual([]);
    expect(plan.needsGeneratedThumbnail).toBe(true);
  });

  it("promotes a custom thumbnail onto the Eagle suffix", () => {
    const plan = planSaveFileLayout([
      { kind: "file", path: "layout.psd" },
      { kind: "custom_thumbnail", path: "chosen.png" },
    ]);
    expect(plan.files).toEqual([
      { kind: "file", path: "layout.psd" },
      { kind: "thumbnail", path: "layout.psd_thumbnail.png" },
    ]);
    expect(plan.needsGeneratedThumbnail).toBe(false);
  });

  it("keeps an Eagle thumbnail filename", () => {
    const plan = planSaveFileLayout([
      { kind: "file", path: "layout.psd" },
      { kind: "custom_thumbnail", path: "layout.psd_thumbnail.png" },
    ]);
    expect(plan.files[1]).toEqual({
      kind: "thumbnail",
      path: "layout.psd_thumbnail.png",
    });
    expect(plan.renames).toEqual([]);
  });

  it("renames text covers onto the thumbnail pair", () => {
    const plan = planSaveFileLayout([
      { kind: "text_cover_light", path: "text-cover-light.png" },
      { kind: "text_cover_dark", path: "text-cover-dark.png" },
    ]);
    expect(plan.files).toEqual([
      { kind: "thumbnail", path: "thumbnail.png" },
      { kind: "thumbnail_dark", path: "thumbnail-dark.png" },
    ]);
    expect(plan.needsGeneratedThumbnail).toBe(false);
  });

  it("numbers a leftover bare video beside video-1", () => {
    const plan = planSaveFileLayout([
      { kind: "video", path: "video.mp4" },
      { kind: "video", path: "video-1.mp4" },
      { kind: "poster", path: "poster.jpg" },
      { kind: "poster", path: "poster-1.jpg" },
      { kind: "thumbnail", path: "tweet-light.png_thumbnail.png" },
    ]);
    expect(plan.files.map((file) => file.path)).toEqual([
      "video-2.mp4",
      "video-1.mp4",
      "poster-2.jpg",
      "poster-1.jpg",
      "tweet-light.png_thumbnail.png",
    ]);
  });

  it("still needs a media sidecar when only a text card exists", () => {
    const plan = planSaveFileLayout([
      { kind: "thumbnail", path: "thumbnail.png" },
      { kind: "thumbnail_dark", path: "thumbnail-dark.png" },
      { kind: "video", path: "video-1.mp4" },
      { kind: "poster", path: "poster-1.jpg" },
    ]);
    expect(plan.needsGeneratedThumbnail).toBe(true);
  });
});

describe("needsSaveFileLayoutMigration", () => {
  it("detects legacy cover files", () => {
    expect(
      needsSaveFileLayoutMigration([{ kind: "cover", path: "cover.jpg" }]),
    ).toBe(true);
    expect(
      needsSaveFileLayoutMigration([{ kind: "image", path: "media-1.jpg" }], 3),
    ).toBe(true);
    expect(
      needsSaveFileLayoutMigration([{ kind: "image", path: "media-1.jpg" }], 4),
    ).toBe(false);
  });
});

describe("needsSaveFileLayoutBackfill", () => {
  it("includes missing generated thumbnails after schema 4", () => {
    expect(
      needsSaveFileLayoutBackfill([{ kind: "image", path: "media-1.jpg" }], 4),
    ).toBe(true);
    expect(
      needsSaveFileLayoutBackfill(
        [
          { kind: "image", path: "media-1.jpg" },
          { kind: "thumbnail", path: "media-1.jpg_thumbnail.png" },
        ],
        4,
      ),
    ).toBe(false);
  });
});
