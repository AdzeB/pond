// @vitest-environment jsdom

import type { Folder } from "@pond/schema/db";
import type { MenuItemSpec } from "@pond/ui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { folders } from "@/features/library/state/folders";
import { selection } from "@/features/library/state/selection";
import { buildViewerMenu } from "@/features/saves/components/viewers/media-viewer/lib/menu";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { REVEAL_LABEL } from "@/shared/lib/platform";
import { buildSaveMenu, contextMenuSaves } from "./menu";

function visibleLabels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    if (item.type === "submenu" || item.type === "group") {
      const label =
        "label" in item ? z.string().array().catch([]).parse([item.label]) : [];
      return [...label, ...visibleLabels(item.items)];
    }
    if ("label" in item)
      return z.string().array().catch([]).parse([item.label]);
    return [];
  });
}

function topLevelLabels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    if ("label" in item)
      return z.string().array().catch([]).parse([item.label]);
    return [];
  });
}

function submenuItems(
  items: MenuItemSpec[],
  label: string,
): MenuItemSpec[] | null {
  for (const item of items) {
    if (item.type === "submenu" && item.label === label && !item.hidden) {
      return item.items;
    }
  }
  return null;
}

function fileSave(overrides: Partial<Save> = {}): Save {
  return {
    id: "file-save",
    source: "twitter",
    sourceId: "file-save",
    url: "https://example.test/file",
    title: "File",
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "file",
    files: [
      {
        kind: "file",
        path: "reference.psd",
        mimeType: "image/vnd.adobe.photoshop",
        sha256: "abc",
        size: 1,
      },
    ],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  selection.clear();
  pool.clear();
});

describe("buildSaveMenu", () => {
  it("nests file actions under Open, Run, Copy, Add, Search, and Export", () => {
    const items = buildSaveMenu(fileSave(), { clipboardEmpty: true });

    expect(topLevelLabels(items)).toEqual([
      "Open",
      "Run",
      "Copy",
      "Paste Tags",
      "Add",
      "Find Duplicates",
      "Merge Duplicates",
      "Search",
      "Export",
      "Set Custom Thumbnail",
      "Refresh Details",
      "Move to Trash",
    ]);
    expect(visibleLabels(submenuItems(items, "Run") ?? [])).toEqual([
      "Apply Suggested Tags",
      "Caption Images",
      "Extract Text",
      "Transcribe Media",
      "Rebuild Search Index",
      "Rebuild Visual Index",
    ]);
    expect(visibleLabels(submenuItems(items, "Open") ?? [])).toEqual([
      "Open Save",
      "Pin Preview",
      "Open with Default App",
      REVEAL_LABEL,
      "Open Original URL",
    ]);
    expect(visibleLabels(submenuItems(items, "Copy") ?? [])).toEqual([
      "Copy File",
      "Copy URL",
      "Copy File Path",
      "Copy Save ID",
    ]);
    expect(visibleLabels(submenuItems(items, "Add") ?? [])).toEqual([
      "Add Tag",
    ]);
    expect(visibleLabels(submenuItems(items, "Search") ?? [])).toEqual([
      "Google Lens",
      "Yandex",
      "Bing",
      "TinEye",
    ]);
    expect(visibleLabels(submenuItems(items, "Export") ?? [])).toEqual([
      "Export Files",
      "Export as WebP",
      "Export to CSV",
    ]);
    expect(topLevelLabels(items)).not.toContain("More");
  });

  it("builds the nested save menu for a video", () => {
    const save = fileSave({
      id: "video-save",
      sourceId: "video-save",
      url: "https://example.test/video",
      title: null,
      mediaType: "video",
      files: [
        {
          kind: "video",
          path: "clip.mp4",
          mimeType: "video/mp4",
          sha256: "abc",
          size: 1,
        },
      ],
    });

    expect(
      visibleLabels(
        submenuItems(buildSaveMenu(save, { clipboardEmpty: true }), "Copy") ??
          [],
      ),
    ).toEqual(["Copy Video", "Copy URL", "Copy File Path", "Copy Save ID"]);
  });

  it("offers removal only when a custom thumbnail exists", () => {
    const save = fileSave({
      source: "local",
      url: "pond:local/file-save",
      files: [
        { kind: "file", path: "asset.zip", sha256: "a", size: 1 },
        {
          kind: "custom_thumbnail",
          path: "thumb.png",
          mimeType: "image/png",
          sha256: "b",
          size: 1,
        },
      ],
    });
    expect(
      visibleLabels(buildSaveMenu(save, { clipboardEmpty: true })),
    ).toContain("Remove Custom Thumbnail");
  });

  it("does not expose a card-only thumbnail as an original file", () => {
    const save = fileSave({
      id: "thumbnail-only",
      source: "local",
      sourceId: "thumbnail-only",
      url: "pond:local/thumbnail-only",
      title: "Thumbnail",
      mediaType: "link",
      files: [
        {
          kind: "custom_thumbnail",
          path: "thumb.png",
          mimeType: "image/png",
          sha256: "b",
          size: 1,
        },
      ],
    });
    const labels = visibleLabels(buildSaveMenu(save, { clipboardEmpty: true }));
    expect(labels).not.toContain("Open with Default App");
    expect(labels).not.toContain("Export Files");
    expect(labels).toContain("Export to CSV");
    expect(labels).toContain("Remove Custom Thumbnail");
    expect(labels).toContain("Rename");
  });

  it("hides Open Save when several saves are selected", () => {
    const labels = visibleLabels(
      buildSaveMenu([fileSave(), fileSave({ id: "other" })], {
        clipboardEmpty: true,
      }),
    );
    expect(labels).toContain("Open");
    expect(labels).not.toContain("Open Save");
    expect(labels).toContain("Open with Default App");
  });

  it("hides Add to Folder when the library has no folders", () => {
    vi.spyOn(folders, "snapshot").mockReturnValue([]);
    const labels = visibleLabels(
      buildSaveMenu(fileSave(), { clipboardEmpty: true }),
    );
    expect(labels).toContain("Add");
    expect(labels).toContain("Add Tag");
    expect(labels).not.toContain("Add to Folder");
  });

  it("lists folders under Add to Folder", () => {
    const folder = {
      id: "folder-a",
      name: "Inspiration",
      parentId: null,
      color: null,
      sortOrder: 0,
      createdAt: new Date(0),
    } satisfies Folder;
    vi.spyOn(folders, "snapshot").mockReturnValue([folder]);
    expect(
      visibleLabels(buildSaveMenu(fileSave(), { clipboardEmpty: true })),
    ).toEqual(expect.arrayContaining(["Add to Folder", "Inspiration"]));
  });

  it("hides Run for trashed saves", () => {
    expect(
      topLevelLabels(
        buildSaveMenu(fileSave({ deletedAt: 1 }), { clipboardEmpty: true }),
      ),
    ).not.toContain("Run");
  });

  it("shows Rename only for a local save", () => {
    expect(
      visibleLabels(buildSaveMenu(fileSave(), { clipboardEmpty: true })),
    ).not.toContain("Rename");
    expect(
      visibleLabels(
        buildSaveMenu(fileSave({ source: "local" }), { clipboardEmpty: true }),
      ),
    ).toContain("Rename");
  });
});

describe("contextMenuSaves", () => {
  it("uses the whole selection when the clicked save is already selected", () => {
    const first = fileSave({ id: "first" });
    const second = fileSave({ id: "second" });
    pool.bulkUpsert([first, second]);
    selection.set(["first", "second"]);
    expect(contextMenuSaves(first).map((save) => save.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("uses only the clicked save when it is not in the selection", () => {
    const first = fileSave({ id: "first" });
    const second = fileSave({ id: "second" });
    pool.bulkUpsert([first, second]);
    selection.set(["second"]);
    expect(contextMenuSaves(first).map((save) => save.id)).toEqual(["first"]);
  });
});

describe("buildViewerMenu", () => {
  it("drops Copy Image from the Copy submenu when a video frame is available", () => {
    const save = fileSave({
      mediaType: "image",
      files: [
        {
          kind: "image",
          path: "still.png",
          mimeType: "image/png",
          sha256: "abc",
          size: 1,
        },
      ],
    });
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { value: 1920 });
    const labels = visibleLabels(
      buildViewerMenu(save, { clipboardEmpty: true, video, fileIndex: 0 }),
    );
    expect(labels).toContain("Copy Current Frame");
    expect(labels).not.toContain("Copy Image");
    expect(labels).toContain("Copy File");
  });
});
