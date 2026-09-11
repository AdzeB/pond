// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import { folderCoverUrl } from "./folder-cover";

function coverSave(): Save {
  return {
    id: "cover-save",
    source: "local",
    sourceId: "cover-save",
    url: "pond:local/cover-save",
    title: "Cover",
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "image",
    files: [
      {
        kind: "cover",
        path: "photo.png",
        mimeType: "image/png",
        sha256: "abcdef1234567890",
        size: 1,
      },
    ],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
  };
}

describe("folder cover url", () => {
  it("points at the cover file", () => {
    expect(folderCoverUrl(coverSave())).toMatch(
      /^pond:\/\/cover-save\/photo\.png/,
    );
  });
});
