// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Save, SaveFile } from "@/features/saves/types";
import { heldImageUrls, preloadImage, viewerImageUrl } from "./preload";

function file(path: string, mimeType: string): SaveFile {
  return {
    path,
    kind: "media",
    mimeType,
    width: 1200,
    height: 800,
    size: 1,
    sha256: "",
  };
}

function saveWith(files: SaveFile[]): Save {
  return {
    id: "s",
    source: "web",
    sourceId: "s",
    url: "https://example.test",
    title: null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "image",
    files,
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

describe("viewerImageUrl", () => {
  it("returns the first original image the viewer opens", () => {
    expect(
      viewerImageUrl(saveWith([file("a.jpg", "image/jpeg")]), "light"),
    ).toBe("pond://s/a.jpg");
  });

  it("skips videos, which the viewer streams instead of decoding", () => {
    expect(
      viewerImageUrl(saveWith([file("a.mp4", "video/mp4")]), "light"),
    ).toBeNull();
  });
});

describe("preloadImage", () => {
  /** jsdom never decodes, so pending decodes model originals still loading. */
  beforeEach(() => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: () => new Promise<void>(() => {}),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
  });

  it("holds the most recent originals and drops the oldest", () => {
    for (const name of ["1", "2", "3", "4"]) preloadImage(`pond://p/${name}`);
    preloadImage("pond://p/2");
    preloadImage("pond://p/5");

    expect(heldImageUrls()).toEqual(["pond://p/4", "pond://p/2", "pond://p/5"]);
  });
});
