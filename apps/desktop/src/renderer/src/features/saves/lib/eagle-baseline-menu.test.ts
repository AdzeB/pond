// @vitest-environment jsdom

import type { MenuItemSpec } from "@pond/ui";
import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import { buildSaveMenu } from "./menu";

function labels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === "separator" || item.type === "custom") return [];
    if ("hidden" in item && item.hidden) return [];
    if ("label" in item && typeof item.label === "string") return [item.label];
    return [];
  });
}

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

describe("Eagle baseline save menu", () => {
  /** Wave 2: Combine Images, Share, Pin to Top, Set as Folder Cover, Replace File. */
  /** Wave 3: Thumbnail Background, Show Navigator, Convert to PNG/JPG from WebP. */

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

  it("keeps Open With as apps only", () => {
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
      (item) => item.type === "submenu" && item.label === "Open With",
    );
    expect(
      openWith && "items" in openWith ? labels(openWith.items) : [],
    ).toEqual(["Preview.app (Default)"]);
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
});
