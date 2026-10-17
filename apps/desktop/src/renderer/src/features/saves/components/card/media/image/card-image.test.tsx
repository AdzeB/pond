import { PrefsSchema } from "@pond/schema";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cardThumbnailFor } from "@/features/saves/state/card-thumbnails";
import type { Save } from "@/features/saves/types";
import { CardImage } from ".";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("pond", {
    query: async () => PrefsSchema.parse({}),
    tx: async () => ({ ok: true }),
  });
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
    100,
  );
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(
    80,
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("lends its thumbnail to the media the viewer opens first", async () => {
  const save: Save = {
    id: "thumbnailed",
    source: "local",
    sourceId: "thumbnailed",
    url: "https://example.test/thumbnailed",
    title: "Thumbnailed",
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "image",
    files: [],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
  const thumbnail = "pond://thumbnailed/photo.png_thumbnail.webp";
  const original = "pond://thumbnailed/photo.png";

  await act(async () =>
    root.render(
      <CardImage
        save={save}
        unit={{
          key: "photo.png_thumbnail.webp",
          url: thumbnail,
          isVideo: false,
        }}
        pickOptions={{}}
        opens={original}
        onBroken={() => {}}
      />,
    ),
  );
  await act(async () =>
    host.querySelector("img")?.dispatchEvent(new Event("load")),
  );

  expect(cardThumbnailFor(original)).toBe(host.querySelector("img")?.src);
  expect(cardThumbnailFor(thumbnail)).toBe(host.querySelector("img")?.src);
});
