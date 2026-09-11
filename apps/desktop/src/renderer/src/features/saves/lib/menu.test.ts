// @vitest-environment jsdom

import type { MenuItemSpec } from "@pond/ui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  closeFolderPicker,
  folderPickerStore,
} from "@/features/library/state/folder-picker";
import { folders } from "@/features/library/state/folders";
import { selection } from "@/features/library/state/selection";
import { buildViewerMenu } from "@/features/saves/components/viewers/media-viewer/lib/menu";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { REVEAL_LABEL } from "@/shared/lib/platform";
import {
  buildSaveMenu,
  contextMenuSaves,
  type OpenWithApp,
  openWithKind,
} from "./menu";

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

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  selection.clear();
  pool.clear();
  vi.stubGlobal("pond", {
    query: async () => [],
  });
  await folders.refresh();
});

function previewOpenWithApps(): OpenWithApp[] {
  return [
    {
      name: "Preview.app",
      path: "/System/Applications/Preview.app",
      icon: "data:image/png;base64,aaa",
      isDefault: true,
    },
    {
      name: "Photomator.app",
      path: "/Applications/Photomator.app",
      icon: null,
      isDefault: false,
    },
  ];
}

describe("buildSaveMenu", () => {
  it("groups open, organize, copy, search, and more like a Finder-style save menu", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: previewOpenWithApps(),
    });

    expect(topLevelLabels(items)).toEqual([
      "Open Save",
      "Pin Preview",
      "Open with Default App",
      "Open With",
      REVEAL_LABEL,
      "Share",
      "Open Original URL",
      "Run",
      "Add Tag",
      "Add to Folders",
      "Add to Other Library",
      "Export",
      "Copy",
      "Copy File Path",
      "Copy Pond Link",
      "Copy URL",
      "Copy Save ID",
      "Paste Tags",
      "Search by Image",
      "Enter Presentation Mode",
      "More",
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
    expect(visibleLabels(submenuItems(items, "Open With") ?? [])).toEqual([
      "Preview.app (Default)",
      "Photomator.app",
    ]);
    expect(visibleLabels(submenuItems(items, "Search by Image") ?? [])).toEqual(
      ["Google Lens", "Yandex", "Bing", "TinEye", "SauceNAO"],
    );
    expect(visibleLabels(submenuItems(items, "Export") ?? [])).toEqual([
      "Export Files",
      "Export Converted Files",
      "Export as WebP",
      "Export Pond Package",
      "Export to CSV",
    ]);
    expect(visibleLabels(submenuItems(items, "More") ?? [])).toEqual([
      "Actions",
      "Find Duplicates",
      "Merge Duplicates",
      "Set Custom Thumbnail",
      "Replace File",
      "Refresh Details",
      "Thumbnail Background",
      "None",
      "Black",
      "Gray",
      "White",
      "Grid",
    ]);
  });

  it("hides Open With until apps are listed", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: [],
    });
    expect(submenuItems(items, "Open With")).toBeNull();
  });

  it("keys Open With kind from mime type then extension", () => {
    expect(openWithKind(fileSave())).toBe("image/vnd.adobe.photoshop");
    expect(
      openWithKind(
        fileSave({
          files: [
            {
              kind: "file",
              path: "shot.PNG",
              mimeType: null,
              sha256: "abc",
              size: 1,
            },
          ],
        }),
      ),
    ).toBe(".png");
  });

  it("lists Open With apps with the default marked", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: previewOpenWithApps(),
    });
    expect(visibleLabels(submenuItems(items, "Open With") ?? [])).toEqual([
      "Preview.app (Default)",
      "Photomator.app",
    ]);
    const preview = submenuItems(items, "Open With")?.find(
      (item) => "label" in item && item.label === "Preview.app (Default)",
    );
    expect(preview && "icon" in preview ? preview.icon : null).toBeTruthy();
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
      visibleLabels(buildSaveMenu(save, { clipboardEmpty: true })),
    ).toEqual(
      expect.arrayContaining(["Copy Video", "Copy File Path", "Copy URL"]),
    );
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

  it("hides Open Save when the save is already open", () => {
    const labels = visibleLabels(
      buildSaveMenu(fileSave(), { clipboardEmpty: true, opened: true }),
    );
    expect(labels).not.toContain("Open Save");
    expect(labels).toContain("Pin Preview");
  });

  it("hides Open Save when several saves are selected", () => {
    const labels = visibleLabels(
      buildSaveMenu([fileSave(), fileSave({ id: "other" })], {
        clipboardEmpty: true,
      }),
    );
    expect(labels).not.toContain("Open Save");
    expect(labels).toContain("Open with Default App");
  });

  it("opens the folder picker for the full selection", () => {
    const items = buildSaveMenu([fileSave(), fileSave({ id: "other" })], {
      clipboardEmpty: true,
    });
    const assign = items.find(
      (item) => "label" in item && item.label === "Add to Folders",
    );
    if (!assign || !("onClick" in assign))
      throw new Error("Missing Add to Folders");
    assign.onClick?.();
    expect(folderPickerStore.state).toEqual(["file-save", "other"]);
    closeFolderPicker();
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

  it("puts All ahead of folder names under Open File Location", async () => {
    vi.stubGlobal("pond", {
      query: async (name: string) => {
        if (name === "folders.list")
          return [
            {
              id: "refs",
              name: "Refs",
              parentId: null,
              color: null,
              sortOrder: 0,
              createdAt: new Date(),
            },
          ];
        if (name === "folders.memberships")
          return [{ saveId: "file-save", folderId: "refs" }];
        return [];
      },
    });
    await folders.refresh();
    expect(
      visibleLabels(
        submenuItems(
          buildSaveMenu(fileSave(), { clipboardEmpty: true }),
          "Open File Location",
        ) ?? [],
      ),
    ).toEqual(["All", "Refs"]);
  });

  it("puts an icon on every visible top-level action", () => {
    const missing = topLevelLabels(
      buildSaveMenu(fileSave(), { clipboardEmpty: true }),
    ).filter((label) => {
      const item = buildSaveMenu(fileSave(), { clipboardEmpty: true }).find(
        (entry) => "label" in entry && entry.label === label,
      );
      return !item || !("icon" in item) || item.icon == null;
    });
    expect(missing).toEqual([]);
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
  it("hides Open Save because the save is already open", () => {
    const labels = visibleLabels(
      buildViewerMenu(fileSave(), {
        clipboardEmpty: true,
        video: null,
        fileIndex: 0,
      }),
    );
    expect(labels).not.toContain("Open Save");
    expect(labels[0]).toBe("Pin Preview");
  });

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
    expect(labels).toContain("Set Cover");
    expect(labels).toContain("Copy Current Frame");
    expect(labels).not.toContain("Copy Image");
    expect(labels).not.toContain("Open Save");
    expect(labels).toContain("Copy");
  });
});
