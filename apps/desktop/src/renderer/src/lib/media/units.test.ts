import { describe, expect, it } from "vitest";
import type { Save, SaveFile } from "@/lib/types";
import {
  buildMediaUnits,
  deriveTypeKind,
  deriveTypeLabel,
  pickPrimaryUnit,
} from "./units";

function file(kind: string, path: string, mimeType: string): SaveFile {
  return { kind, path, mimeType, sha256: "abcdef1234567890", size: 10 };
}

function makeSave(partial: Partial<Save> & { id: string }): Save {
  return {
    source: "web",
    sourceId: partial.id,
    url: "",
    title: null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: null,
    files: [],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
    ...partial,
  };
}

describe("buildMediaUnits video posters", () => {
  it("uses a generic cover as the resting poster for every video", () => {
    const save = makeSave({
      id: "multi-video",
      source: "instagram",
      files: [
        file("video", "video-1.mp4", "video/mp4"),
        file("cover", "cover.jpg", "image/jpeg"),
        file("video", "video-2.mp4", "video/mp4"),
      ],
    });

    const units = buildMediaUnits(save);

    expect(units).toHaveLength(2);
    expect(units.map((unit) => unit.key)).toEqual([
      "video-1.mp4",
      "video-2.mp4",
    ]);
    expect(units.map((unit) => unit.posterUrl)).toEqual([
      "pond://multi-video/cover.jpg?v=abcdef123456",
      "pond://multi-video/cover.jpg?v=abcdef123456",
    ]);
    expect(units.map((unit) => unit.posterKey)).toEqual([
      "cover.jpg",
      "cover.jpg",
    ]);
  });

  it("uses the first poster for every video until the sweep fills missing slots", () => {
    const save = makeSave({
      id: "multi-video",
      source: "twitter",
      files: [
        file("video", "video-1.mp4", "video/mp4"),
        file("video", "video-2.mp4", "video/mp4"),
        file("poster", "poster.jpg", "image/jpeg"),
      ],
    });

    expect(buildMediaUnits(save).map((unit) => unit.posterUrl)).toEqual([
      "pond://multi-video/poster.jpg?v=abcdef123456",
      "pond://multi-video/poster.jpg?v=abcdef123456",
    ]);
  });

  it("keeps a cover as the visible unit for an image-only save", () => {
    const save = makeSave({
      id: "image-cover",
      source: "instagram",
      files: [
        file("cover", "cover.jpg", "image/jpeg"),
        file("avatar", "avatar.jpg", "image/jpeg"),
      ],
    });

    expect(buildMediaUnits(save)).toEqual([
      {
        key: "cover.jpg",
        url: "pond://image-cover/cover.jpg?v=abcdef123456",
        isVideo: false,
      },
    ]);
  });

  it("keeps a legacy extensionless cover as visible image media", () => {
    const save = makeSave({
      id: "legacy-cover",
      source: "cosmos",
      files: [file("cover", "cover.", "")],
    });

    expect(buildMediaUnits(save)).toEqual([
      {
        key: "cover.",
        url: "pond://legacy-cover/cover.?v=abcdef123456",
        isVideo: false,
      },
    ]);
  });
});

describe("pickPrimaryUnit Threads post cover", () => {
  const threadsSave = makeSave({
    id: "thread-1",
    source: "threads",
    files: [
      file("image", "photo.jpg", "image/jpeg"),
      file("tweet_screenshot_light", "tweet-light.png", "image/png"),
      file("tweet_screenshot_dark", "tweet-dark.png", "image/png"),
    ],
  });

  it("uses extracted media when tweetCover is media", () => {
    const unit = pickPrimaryUnit(threadsSave, {
      theme: "light",
      tweetCover: "media",
    });
    expect(unit?.key).toBe("photo.jpg");
  });

  it("uses the theme-matched card PNG when tweetCover is screenshot", () => {
    const unit = pickPrimaryUnit(threadsSave, {
      theme: "dark",
      tweetCover: "screenshot",
    });
    expect(unit?.key).toBe("tweet-dark.png");
  });

  it("falls back to the card PNG for a text-only Threads post", () => {
    const textOnly = makeSave({
      id: "thread-text",
      source: "threads",
      files: [
        file("tweet_screenshot_light", "tweet-light.png", "image/png"),
        file("avatar", "avatar.jpg", "image/jpeg"),
      ],
    });
    const unit = pickPrimaryUnit(textOnly, {
      theme: "light",
      tweetCover: "media",
    });
    expect(unit?.key).toBe("tweet-light.png");
  });
});

describe("deriveTypeLabel web pages", () => {
  it("labels a web save as Web even when the cover is a PNG", () => {
    const save = makeSave({
      id: "page-1",
      source: "web",
      mediaType: "image",
      files: [file("cover", "cover.png", "image/png")],
    });
    const cover = save.files[0] ?? null;
    expect(deriveTypeLabel(cover, save)).toBe("Web");
    expect(deriveTypeKind(cover, save)).toBe("link");
  });

  it("still uses the file extension for non-web image saves", () => {
    const save = makeSave({
      id: "photo-1",
      source: "instagram",
      mediaType: "image",
      files: [file("image", "photo.png", "image/png")],
    });
    const image = save.files[0] ?? null;
    expect(deriveTypeLabel(image, save)).toBe("PNG");
    expect(deriveTypeKind(image, save)).toBe("image");
  });
});
