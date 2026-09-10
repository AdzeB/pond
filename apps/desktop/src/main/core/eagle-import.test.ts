import { describe, expect, it } from "vitest";
import {
  collectLockedEagleFolders,
  flattenEagleFolders,
  partitionEagleItemFiles,
} from "./eagle-import";

describe("flattenEagleFolders", () => {
  it("keeps nested parent ids and skips password folders", () => {
    const flat = flattenEagleFolders([
      {
        id: "root",
        name: "Photos",
        color: "#ff5500",
        children: [
          { id: "kids", name: "Kids" },
          { id: "secret", name: "Secret", password: "x" },
        ],
      },
    ]);
    expect(flat).toEqual([
      {
        id: "root",
        name: "Photos",
        parentId: null,
        color: "#ff5500",
        sortOrder: 0,
      },
      {
        id: "kids",
        name: "Kids",
        parentId: "root",
        color: null,
        sortOrder: 0,
      },
    ]);
  });

  it("reports locked folders instead of silently dropping them", () => {
    const folders = [
      {
        id: "root",
        name: "Photos",
        children: [{ id: "secret", name: "Secret", password: "x" }],
      },
    ];
    expect(collectLockedEagleFolders(folders)).toEqual([
      { id: "secret", name: "Secret", reason: "password" },
    ]);
  });

  it("reports nested folders under a locked parent and keeps them out of flatten", () => {
    const folders = [
      {
        id: "vault",
        name: "Vault",
        password: "x",
        children: [{ id: "inner", name: "Inner" }],
      },
    ];
    expect(collectLockedEagleFolders(folders)).toEqual([
      { id: "vault", name: "Vault", reason: "password" },
      { id: "inner", name: "Inner", reason: "parent_locked" },
    ]);
    expect(flattenEagleFolders(folders)).toEqual([]);
  });

  it("preserves Eagle's sibling order", () => {
    expect(
      flattenEagleFolders([
        { id: "first", name: "First" },
        { id: "second", name: "Second" },
      ]),
    ).toEqual([
      {
        id: "first",
        name: "First",
        parentId: null,
        color: null,
        sortOrder: 0,
      },
      {
        id: "second",
        name: "Second",
        parentId: null,
        color: null,
        sortOrder: 1,
      },
    ]);
  });
});

describe("partitionEagleItemFiles", () => {
  it("keeps arbitrary originals and separates Eagle's generated thumbnail", () => {
    expect(
      partitionEagleItemFiles([
        "metadata.json",
        "paper.pdf",
        "attachment.usdz",
        "paper_thumbnail.png",
        ".DS_Store",
      ]),
    ).toEqual({
      mediaFiles: ["paper.pdf", "attachment.usdz"],
      thumbnail: "paper_thumbnail.png",
    });
  });

  it("does not mistake an original with thumbnail in its name for Eagle's preview", () => {
    expect(
      partitionEagleItemFiles([
        "metadata.json",
        "thumbnail-concept.psd",
        "thumbnail-concept.psd_thumbnail.png",
      ]),
    ).toEqual({
      mediaFiles: ["thumbnail-concept.psd"],
      thumbnail: "thumbnail-concept.psd_thumbnail.png",
    });
  });
});
