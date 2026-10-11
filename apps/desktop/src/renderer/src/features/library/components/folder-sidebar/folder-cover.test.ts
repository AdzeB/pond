import { describe, expect, it } from "vitest";
import { folderCoverUrl } from "@/features/library/lib/folder-cover";
import type { Save } from "@/features/saves/types";

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

  it("requests a generated preview for a file the browser cannot draw", () => {
    const save = coverSave();
    save.id = "style-save";
    save.mediaType = "file";
    save.files = [
      {
        kind: "file",
        path: "metadata.plist",
        mimeType: "application/octet-stream",
        sha256: "abcdef1234567890",
        size: 391,
      },
    ];
    const url = folderCoverUrl(save, 360);
    expect(url).toMatch(/^pond:\/\/style-save\/metadata\.plist/);
    expect(url).toContain("preview=");
    expect(url).not.toContain("tw=");
  });

  it("uses the text thumbnail a code file keeps beside its source", () => {
    document.documentElement.dataset.theme = "light";
    const save = coverSave();
    save.id = "code-save";
    save.mediaType = "text";
    save.files = [
      {
        kind: "text_file",
        path: "sample.ts",
        mimeType: "text/typescript",
        sha256: "abcdef1234567890",
        size: 69,
      },
      {
        kind: "thumbnail",
        path: "thumbnail.png",
        mimeType: "image/png",
        sha256: "abcdef1234567890",
        size: 22951,
      },
      {
        kind: "thumbnail_dark",
        path: "thumbnail-dark.png",
        mimeType: "image/png",
        sha256: "abcdef1234567890",
        size: 20623,
      },
    ];
    expect(folderCoverUrl(save, 360)).toMatch(
      /^pond:\/\/code-save\/thumbnail\.png/,
    );
    document.documentElement.dataset.theme = "dark";
    expect(folderCoverUrl(save, 360)).toMatch(
      /^pond:\/\/code-save\/thumbnail-dark\.png/,
    );
    delete document.documentElement.dataset.theme;
  });
});
