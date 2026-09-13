import { describe, expect, it } from "vitest";
import {
  BLANK_DOCUMENTS,
  blankDocumentDef,
  isBlankDocumentKind,
} from "./blank-documents";

describe("blank documents", () => {
  it("names every Eagle installed-app document type", () => {
    expect(BLANK_DOCUMENTS.map((item) => item.label)).toEqual([
      "Photoshop Document",
      "Illustrator Document",
      "XD Document",
      "Word Document",
      "PowerPoint Document",
      "Excel Document",
      "Keynote Document",
      "Pages Document",
      "Numbers Document",
    ]);
  });

  it("matches installed app bundle names", () => {
    const photoshop = blankDocumentDef("photoshop");
    expect(photoshop?.matchApp("Adobe Photoshop 2025.app")).toBe(true);
    expect(photoshop?.matchApp("Microsoft Word.app")).toBe(false);
    expect(blankDocumentDef("pages")?.matchApp("Pages.app")).toBe(true);
    expect(isBlankDocumentKind("word")).toBe(true);
    expect(isBlankDocumentKind("note")).toBe(false);
  });
});
