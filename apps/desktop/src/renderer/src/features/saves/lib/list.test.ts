import { describe, expect, it } from "vitest";
import type { Save, SaveFile } from "@/features/saves/types";
import { applyModeFilter } from "./list";

function file(kind: string, path: string, mimeType: string): SaveFile {
  return { kind, path, mimeType, sha256: "abcdef1234567890", size: 10 };
}

function save(mediaType: Save["mediaType"], entry: SaveFile): Save {
  return {
    id: entry.path,
    source: "local",
    sourceId: entry.path,
    url: `pond:local/${entry.path}`,
    title: entry.path,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType,
    files: [entry],
    tags: [],
    savedAt: 1,
    createdAt: 1,
    deletedAt: null,
    status: "complete",
  };
}

describe("applyModeFilter expanded library formats", () => {
  it.each([
    ["audio", file("audio", "recording.mp3", "audio/mpeg")],
    ["document", file("document", "paper.pdf", "application/pdf")],
    ["font", file("font", "family.woff2", "font/woff2")],
    ["file", file("file", "model.usdz", "model/vnd.usdz+zip")],
  ] as const)("keeps %s saves visible in the library", (mediaType, entry) => {
    const input = save(mediaType, entry);
    expect(
      applyModeFilter([input], {
        mode: "library",
        sourceFilter: "",
        recentsOrder: null,
      }),
    ).toEqual([input]);
  });
});
