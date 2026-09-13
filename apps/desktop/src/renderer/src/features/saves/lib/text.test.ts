import { describe, expect, it } from "vitest";
import type { Save } from "@/features/saves/types";
import {
  displayTitleForSave,
  isTextOnlySave,
  noteBodyForSave,
  textBodyForSave,
} from "./text";

function save(partial: Partial<Save> = {}): Save {
  return {
    id: "note",
    source: "local",
    sourceId: "note",
    url: "pond:local/note",
    title: null,
    description: null,
    author: null,
    notes: null,
    mediaUrl: null,
    mediaType: "text",
    files: [],
    tags: [],
    savedAt: 0,
    createdAt: 0,
    deletedAt: null,
    ...partial,
  };
}

describe("text saves", () => {
  it("treats empty local text saves as notes", () => {
    expect(isTextOnlySave(save())).toBe(true);
    expect(displayTitleForSave(save())).toBe("Untitled");
    expect(noteBodyForSave(save())).toBe("");
    expect(textBodyForSave(save())).toBe("Untitled");
  });

  it("keeps the editor body on description only", () => {
    const titled = save({ title: "Brief", description: null });
    expect(noteBodyForSave(titled)).toBe("");
    expect(textBodyForSave(titled)).toBe("Brief");
    expect(noteBodyForSave(save({ description: "Hello **world**" }))).toBe(
      "Hello **world**",
    );
  });
});
