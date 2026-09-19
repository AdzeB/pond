import { describe, expect, it } from "vitest";
import { pageAssetsDraft, pickPageImages } from "./page-extract";

const huge = { src: "https://cdn.example/a.jpg", width: 800, height: 600 };
const tiny = { src: "https://cdn.example/b.jpg", width: 40, height: 40 };
const data = { src: "data:image/png;base64,xx", width: 800, height: 600 };

describe("pickPageImages", () => {
  it("keeps http images at or above the minimum edge", () => {
    expect(pickPageImages([tiny, huge, data])).toEqual([huge]);
  });

  it("caps the review set", () => {
    const images = Array.from({ length: 50 }, (_, index) => ({
      src: `https://cdn.example/${index}.jpg`,
      width: 400,
      height: 400,
    }));
    expect(pickPageImages(images)).toHaveLength(40);
  });
});

describe("pageAssetsDraft", () => {
  it("queues asset items with the page-asset tag", () => {
    expect(
      pageAssetsDraft({
        id: "draft-1",
        originUrl: "https://example.test/gallery",
        images: [huge],
      }),
    ).toEqual({
      id: "draft-1",
      originUrl: "https://example.test/gallery",
      metadata: { tags: ["page-asset"], folderIds: [] },
      items: [{ kind: "asset", url: huge.src }],
    });
  });
});
