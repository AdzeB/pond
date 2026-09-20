import type { MenuItemSpec } from "@pond/ui";
import { isValidElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/app/effects/save-library-bridge";
import {
  closeFolderPicker,
  folderPickerStore,
} from "@/features/library/state/folder-picker";
import { folders } from "@/features/library/state/folders";
import { buildViewerMenu } from "@/features/saves/components/viewers/media-viewer/lib/menu";
import { pool } from "@/features/saves/state/pool";
import { selection } from "@/features/saves/state/selection";
import type { Save } from "@/features/saves/types";
import { REVEAL_LABEL } from "@/shared/lib/platform";
import {
  topLevelMenuLabels as topLevelLabels,
  menuLabels as visibleLabels,
} from "@/shared/test/menu-labels";
import {
  buildSaveMenu,
  contextMenuSaves,
  type OpenWithApp,
  openWithKind,
} from "./menu";

function sectionItems(
  items: MenuItemSpec[],
  label: string,
): MenuItemSpec[] | null {
  for (const item of items) {
    if (
      (item.type === "submenu" || item.type === "group") &&
      item.label === label &&
      !item.hidden
    ) {
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
  it("offers lossless and quality compression for supported images", () => {
    const save = fileSave({
      mediaType: "image",
      files: [
        {
          kind: "image",
          path: "image.png",
          mimeType: "image/png",
          sha256: "png",
          size: 100,
        },
      ],
    });
    const items = buildSaveMenu(save, { clipboardEmpty: true });
    const exports = sectionItems(items, "Export") ?? [];
    const compression = sectionItems(exports, "Compress Images");
    expect(topLevelLabels(exports)).toContain("Compress Images");
    expect(topLevelLabels(compression ?? [])).toEqual([
      "Lossless",
      "Quality 85",
    ]);
  });

  it("groups save actions into compact single-word submenus", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: previewOpenWithApps(),
    });

    expect(topLevelLabels(items)).toEqual([
      "Open",
      "Organise",
      "Copy",
      "Share",
      "Export",
      "Search by Image",
      "Agent",
      "Advanced",
      "Move to Trash",
    ]);
    expect(visibleLabels(sectionItems(items, "Agent") ?? [])).toEqual([
      "Add to Chat",
      "Apply Suggested Tags",
      "Caption Images",
      "Extract Text",
      "Transcribe Media",
      "Check Sensitive Content",
    ]);
    expect(topLevelLabels(sectionItems(items, "Open") ?? [])).toEqual([
      "Preview.app (Default)",
      "Photomator.app",
      "Open Save",
      "Open with Default App",
      REVEAL_LABEL,
      "Open Original URL",
    ]);
    const reverseSearchItems = sectionItems(items, "Search by Image") ?? [];
    expect(visibleLabels(reverseSearchItems)).toEqual([
      "Google Lens",
      "Yandex",
      "Bing",
      "TinEye",
      "SauceNAO",
    ]);
    expect(
      reverseSearchItems.every(
        (item) =>
          "icon" in item &&
          isValidElement(item.icon) &&
          item.icon.type === "img",
      ),
    ).toBe(true);
    expect(visibleLabels(sectionItems(items, "Export") ?? [])).toEqual([
      "Export Files",
      "Export Converted Files",
      "Export as WebP",
      "Export Eagle Package",
      "Export Pond Package",
      "Export to CSV",
    ]);
    expect(visibleLabels(sectionItems(items, "Advanced") ?? [])).toEqual([
      "Copy Save ID",
      "Rebuild Search Index",
      "Rebuild Visual Index",
      "Change File Extension",
      "Actions",
      "Find Duplicates",
      "Merge Duplicates",
      "Set Thumbnail",
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

  it("keeps opening actions available before apps are listed", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: [],
    });
    expect(visibleLabels(sectionItems(items, "Open") ?? [])).toContain(
      "Open with Default App",
    );
    expect(visibleLabels(items)).not.toContain("Open With");
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

  it("lists apps directly in Open with the default marked", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: previewOpenWithApps(),
    });
    expect(topLevelLabels(sectionItems(items, "Open") ?? [])).toEqual([
      "Preview.app (Default)",
      "Photomator.app",
      "Open Save",
      "Open with Default App",
      REVEAL_LABEL,
      "Open Original URL",
    ]);
    const preview = sectionItems(items, "Open")?.find(
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

  it("marks trash actions as destructive", () => {
    const liveItems = buildSaveMenu(fileSave(), { clipboardEmpty: true });
    expect(
      liveItems.find(
        (item) => "label" in item && item.label === "Move to Trash",
      ),
    ).toMatchObject({ variant: "destructive" });

    const trashedItems = buildSaveMenu(fileSave({ deletedAt: 1 }), {
      clipboardEmpty: true,
    });
    expect(
      trashedItems.find(
        (item) => "label" in item && item.label === "Delete Forever",
      ),
    ).toMatchObject({ variant: "destructive" });
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
    const items = buildSaveMenu(save, { clipboardEmpty: true });
    expect(visibleLabels(items)).toContain("Remove Thumbnail");
    expect(
      sectionItems(items, "Advanced")?.find(
        (item) => "label" in item && item.label === "Remove Thumbnail",
      ),
    ).toMatchObject({ variant: "destructive" });
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
    expect(labels).not.toContain("Remove Thumbnail");
    expect(labels).toContain("Rename");
  });

  it("hides Open Save when the save is already open", () => {
    const labels = visibleLabels(
      buildSaveMenu(fileSave(), { clipboardEmpty: true, opened: true }),
    );
    expect(labels).not.toContain("Open Save");
    expect(labels).not.toContain("Pin Preview");
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
    const assign = sectionItems(items, "Organise")?.find(
      (item) => "label" in item && item.label === "Add to Folders",
    );
    if (!assign || !("onClick" in assign))
      throw new Error("Missing Add to Folders");
    assign.onClick?.();
    expect(folderPickerStore.state).toEqual(["file-save", "other"]);
    closeFolderPicker();
  });

  it("hides Agent for trashed saves", () => {
    expect(
      topLevelLabels(
        buildSaveMenu(fileSave({ deletedAt: 1 }), { clipboardEmpty: true }),
      ),
    ).not.toContain("Agent");
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
        sectionItems(
          sectionItems(
            buildSaveMenu(fileSave(), { clipboardEmpty: true }),
            "Open",
          ) ?? [],
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
      return (
        item?.type !== "group" &&
        (!item || !("icon" in item) || item.icon == null)
      );
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
    expect(labels[0]).toBe("Open");
    expect(labels).not.toContain("Pin Preview");
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
    expect(labels).toContain("Set Thumbnail");
    expect(labels).toContain("Copy Current Frame");
    expect(labels).not.toContain("Copy Image");
    expect(labels).not.toContain("Open Save");
    expect(labels).toContain("Copy");
  });

  it("converts the WebP file selected in the viewer", () => {
    const query = vi.fn(async () => ({ id: "job" }));
    vi.stubGlobal("pond", { query });
    const save = fileSave({
      mediaType: "image",
      files: [
        {
          kind: "image",
          path: "cover.png",
          mimeType: "image/png",
          sha256: "png",
          size: 1,
        },
        {
          kind: "image",
          path: "alternate.webp",
          mimeType: "image/webp",
          sha256: "webp",
          size: 1,
        },
      ],
    });
    const exports =
      sectionItems(
        buildViewerMenu(save, {
          clipboardEmpty: true,
          video: null,
          fileIndex: 1,
        }),
        "Export",
      ) ?? [];
    for (const label of ["Convert to PNG", "Convert to JPG"]) {
      const action = exports.find(
        (item) => "label" in item && item.label === label,
      );
      if (!action || !("onClick" in action))
        throw new Error(`Missing ${label}`);
      action.onClick?.();
    }
    expect(query).toHaveBeenNthCalledWith(
      1,
      "conversion.start",
      expect.objectContaining({
        fileIndex: 1,
        preset: expect.objectContaining({ format: "png" }),
      }),
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      "conversion.start",
      expect.objectContaining({
        fileIndex: 1,
        preset: expect.objectContaining({ format: "jpeg" }),
      }),
    );
  });
});
