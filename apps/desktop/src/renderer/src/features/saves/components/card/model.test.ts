import { describe, expect, it } from "vitest";
import type { DisplayPrefs } from "@/features/saves/state/display-prefs";
import type { Save } from "@/features/saves/types";
import { buildSaveCardModel } from "./model";

const display: DisplayPrefs = {
  name: true,
  date: true,
  fileCount: true,
  source: true,
  type: true,
};

function save(partial: Partial<Save> & { id: string }): Save {
  return {
    url: "https://example.com",
    title: "Example",
    description: null,
    author: null,
    notes: "Keep this",
    source: "twitter",
    sourceId: "",
    accountId: null,
    mediaUrl: null,
    mediaType: null,
    fileSize: null,
    width: 1200,
    height: 800,
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
    coverIndex: 0,
    files: [
      {
        path: "first.jpg",
        kind: "media",
        mimeType: "image/jpeg",
        sha256: "",
        size: 0,
        width: 1200,
        height: 800,
      },
      {
        path: "second.jpg",
        kind: "media",
        mimeType: "image/jpeg",
        sha256: "",
        size: 0,
        width: 800,
        height: 1200,
      },
    ],
    tags: [],
    ...partial,
  };
}

describe("buildSaveCardModel", () => {
  it("derives metadata and overlays once for every presentation", () => {
    const model = buildSaveCardModel(save({ id: "a" }), {}, display, 1.5);

    expect(model.aspect).toBe(1.5);
    expect(model.title).toBe("Example");
    expect(model.time).not.toBeNull();
    expect(model.overlay.type).toEqual({ label: "JPG", kind: "image" });
    expect(model.overlay.source?.label).toBe("Twitter");
    expect(model.overlay.fileCount).toBe(2);
    expect(model.overlay.hasNote).toBe(true);
  });

  it("omits chrome disabled by display preferences", () => {
    const hidden: DisplayPrefs = {
      name: false,
      date: false,
      fileCount: false,
      source: false,
      type: false,
    };
    const model = buildSaveCardModel(save({ id: "b" }), {}, hidden, 1);

    expect(model.title).toBeNull();
    expect(model.time).toBeNull();
    expect(model.overlay.type).toBeNull();
    expect(model.overlay.source).toBeNull();
    expect(model.overlay.fileCount).toBeNull();
    expect(model.overlay.hasNote).toBe(true);
  });

  it("uses a portrait page inside the container for dimensionless documents", () => {
    const model = buildSaveCardModel(
      save({
        id: "document",
        width: null,
        height: null,
        files: [
          {
            path: "Untitled.docx",
            kind: "media",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            sha256: "",
            size: 0,
            width: null,
            height: null,
          },
        ],
      }),
      {},
      display,
      1,
    );

    expect(model.aspect).toBeCloseTo(8.5 / 11);
  });

  it("uses exact media dimensions for the fitted preview", () => {
    const model = buildSaveCardModel(
      save({
        id: "narrow",
        width: 100,
        height: 1000,
        files: [
          {
            path: "narrow.jpg",
            kind: "media",
            mimeType: "image/jpeg",
            sha256: "",
            size: 0,
            width: 100,
            height: 1000,
          },
        ],
      }),
      {},
      display,
      0.4,
    );

    expect(model.aspect).toBe(0.1);
  });
});
