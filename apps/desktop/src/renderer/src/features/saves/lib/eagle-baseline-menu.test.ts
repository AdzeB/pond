import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it } from "vitest";
import "@/app/effects/save-library-bridge";
import type { Save } from "@/features/saves/types";
import { menuLabels as labels } from "@/shared/test/menu-labels";
import { buildSaveMenu } from "./menu";

function fileSave(): Save {
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
  };
}

function imageSave(id: string): Save {
  return {
    ...fileSave(),
    id,
    sourceId: id,
    mediaType: "image",
    files: [
      {
        kind: "cover",
        path: `${id}.png`,
        mimeType: "image/png",
        sha256: id,
        size: 1,
      },
    ],
  };
}

function gifSave(): Save {
  return {
    ...fileSave(),
    id: "gif-save",
    sourceId: "gif-save",
    mediaType: "image",
    files: [
      {
        kind: "image",
        path: "loop.gif",
        mimeType: "image/gif",
        sha256: "gif",
        size: 1,
      },
    ],
  };
}

function videoSave(): Save {
  return {
    ...fileSave(),
    id: "video-save",
    sourceId: "video-save",
    mediaType: "video",
    files: [
      {
        kind: "video",
        path: "clip.mp4",
        mimeType: "video/mp4",
        sha256: "vid",
        size: 1,
      },
    ],
  };
}

function webpSave(): Save {
  return {
    ...fileSave(),
    id: "webp-save",
    sourceId: "webp-save",
    mediaType: "image",
    files: [
      {
        kind: "image",
        path: "shot.webp",
        mimeType: "image/webp",
        sha256: "webp",
        size: 1,
      },
    ],
  };
}

function fontSave(): Save {
  return {
    ...fileSave(),
    id: "font-save",
    sourceId: "font-save",
    mediaType: "font",
    files: [
      {
        kind: "font",
        path: "Family.ttf",
        mimeType: "font/ttf",
        sha256: "font",
        size: 1,
      },
    ],
  };
}

function findSubmenu(
  items: MenuItemSpec[],
  label: string,
): Extract<MenuItemSpec, { type: "submenu" }> | undefined {
  for (const item of items) {
    if ("hidden" in item && item.hidden) continue;
    if (item.type === "submenu" && item.label === label) return item;
    if ((item.type === "submenu" || item.type === "group") && "items" in item) {
      const nested = findSubmenu(item.items, label);
      if (nested) return nested;
    }
  }
}

describe("Eagle baseline save menu", () => {
  it("does not expose plugin or picker rows", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: [
        {
          name: "Preview.app",
          path: "/System/Applications/Preview.app",
          icon: null,
          isDefault: true,
        },
      ],
    });
    const top = labels(items);
    expect(top).not.toContain("Other");
    expect(top).not.toContain("Plugin");
  });

  it("lists apps alongside the other opening actions", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      openWithApps: [
        {
          name: "Preview.app",
          path: "/System/Applications/Preview.app",
          icon: null,
          isDefault: true,
        },
      ],
    });
    const openWith = items.find(
      (item) => item.type === "submenu" && item.label === "Open",
    );
    expect(
      openWith && "items" in openWith ? labels(openWith.items) : [],
    ).toEqual(
      expect.arrayContaining([
        "Preview.app (Default)",
        "Open with Default App",
        "Open Original URL",
      ]),
    );
    expect(labels(items)).not.toContain("Open With");
  });

  it("shows Combine Images when two PNG saves are selected", () => {
    const items = buildSaveMenu([imageSave("one"), imageSave("two")], {
      clipboardEmpty: true,
    });
    expect(labels(items)).toContain("Combine Images");
  });

  it("hides Combine Images for a single file save", () => {
    const items = buildSaveMenu(fileSave(), { clipboardEmpty: true });
    expect(labels(items)).not.toContain("Combine Images");
  });

  it("exposes Replace File on a single file save", () => {
    const items = buildSaveMenu(fileSave(), { clipboardEmpty: true });
    expect(labels(items)).toContain("Replace File");
  });

  it("exposes Share when the save has a file", () => {
    expect(
      labels(buildSaveMenu(fileSave(), { clipboardEmpty: true })),
    ).toContain("Share");
  });

  it("hides pin and cover outside a folder", () => {
    const items = buildSaveMenu(fileSave(), { clipboardEmpty: true });
    expect(labels(items)).not.toContain("Pin to Top");
    expect(labels(items)).not.toContain("Set as Folder Cover");
  });

  it("shows Pin to Top and Set as Folder Cover inside a folder", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      folderId: "landscapes",
      pinnedIds: [],
      coverSaveId: null,
    });
    expect(labels(items)).toContain("Pin to Top");
    expect(labels(items)).toContain("Set as Folder Cover");
  });

  it("toggles pin and cover labels for the active save", () => {
    const items = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      folderId: "landscapes",
      pinnedIds: ["file-save"],
      coverSaveId: "file-save",
    });
    expect(labels(items)).toContain("Unpin from Top");
    expect(labels(items)).toContain("Remove Folder Cover");
    expect(labels(items)).not.toContain("Pin to Top");
  });

  it("exposes Thumbnail Background on the gallery menu only", () => {
    const gallery = buildSaveMenu(fileSave(), { clipboardEmpty: true });
    expect(labels(gallery)).toContain("Thumbnail Background");
    const submenu = findSubmenu(gallery, "Thumbnail Background");
    expect(submenu ? labels(submenu.items) : []).toEqual([
      "None",
      "Black",
      "Gray",
      "White",
      "Grid",
    ]);
    const opened = buildSaveMenu(fileSave(), {
      clipboardEmpty: true,
      opened: true,
    });
    expect(labels(opened)).not.toContain("Thumbnail Background");
  });

  it("exposes Reset Loop Range on an opened GIF", () => {
    const items = buildSaveMenu(gifSave(), {
      clipboardEmpty: true,
      opened: true,
    });
    expect(labels(items)).toContain("Reset Loop Range");
  });

  it("hides Reset Loop Range on a still image", () => {
    const items = buildSaveMenu(imageSave("still"), {
      clipboardEmpty: true,
      opened: true,
    });
    expect(labels(items)).not.toContain("Reset Loop Range");
  });

  it("exposes Set as GIF Thumbnail on an opened GIF", () => {
    const items = buildSaveMenu(gifSave(), {
      clipboardEmpty: true,
      opened: true,
    });
    expect(labels(items)).toContain("Set as GIF Thumbnail");
  });

  it("hides Set as GIF Thumbnail in the gallery", () => {
    expect(
      labels(buildSaveMenu(gifSave(), { clipboardEmpty: true })),
    ).not.toContain("Set as GIF Thumbnail");
  });

  it("exposes Load Subtitles on a video save", () => {
    expect(
      labels(buildSaveMenu(videoSave(), { clipboardEmpty: true })),
    ).toContain("Load Subtitles");
  });

  it("hides Load Subtitles on a still image", () => {
    expect(
      labels(buildSaveMenu(imageSave("still"), { clipboardEmpty: true })),
    ).not.toContain("Load Subtitles");
  });

  it("exposes Show Navigator on an opened image", () => {
    expect(
      labels(
        buildSaveMenu(imageSave("still"), {
          clipboardEmpty: true,
          opened: true,
        }),
      ),
    ).toContain("Show Navigator");
  });

  it("exposes Convert to PNG and Convert to JPG on a WebP save", () => {
    const top = labels(buildSaveMenu(webpSave(), { clipboardEmpty: true }));
    expect(top).toContain("Convert to PNG");
    expect(top).toContain("Convert to JPG");
  });

  it("hides WebP convert rows on a PNG save", () => {
    const top = labels(
      buildSaveMenu(imageSave("png"), { clipboardEmpty: true }),
    );
    expect(top).not.toContain("Convert to PNG");
    expect(top).not.toContain("Convert to JPG");
  });

  it("exposes Activate Font on a font save", () => {
    expect(
      labels(buildSaveMenu(fontSave(), { clipboardEmpty: true })),
    ).toContain("Activate Font");
    expect(
      labels(
        buildSaveMenu(fontSave(), {
          clipboardEmpty: true,
          fontActivated: true,
        }),
      ),
    ).toContain("Deactivate Font");
  });

  it("hides font activation on an image save", () => {
    expect(
      labels(buildSaveMenu(imageSave("still"), { clipboardEmpty: true })),
    ).not.toContain("Activate Font");
  });
});
