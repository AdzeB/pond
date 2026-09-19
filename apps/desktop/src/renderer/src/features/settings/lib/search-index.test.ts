// @vitest-environment jsdom
import { SETTINGS_GROUP_LABELS, SETTINGS_SECTIONS } from "@pond/schema";
import { describe, expect, it } from "vitest";
import { SETTINGS_SEARCH_INDEX } from "./search-index";

function entry(id: string) {
  const result = SETTINGS_SEARCH_INDEX.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`Missing Settings search entry: ${id}`);
  return result;
}

describe("settings search index", () => {
  it("routes custom rows to their focused pages", () => {
    expect(entry("library:logo").path).toBe("library");
    expect(entry("library:name").path).toBe("library");
    expect(entry("storage:location").path).toBe("storage");
    expect(entry("backups:backup").path).toBe("backups");
    expect(entry("harvesting:watched-folder").path).toBe("harvesting");
  });

  it("omits actions owned by application menus", () => {
    for (const id of [
      "library:new",
      "library:open",
      "library:merge",
      "library:package",
      "library:import",
    ]) {
      expect(
        SETTINGS_SEARCH_INDEX.some((candidate) => candidate.id === id),
      ).toBe(false);
    }
  });

  it("indexes search and processing independently", () => {
    expect(entry("search:semanticSearch").sectionLabel).toBe("Search");
    expect(entry("processing:enableClip").sectionLabel).toBe("Processing");
    expect(entry("shortcuts").sectionLabel).toBe("Hotkeys");
    expect(entry("viewer").sectionLabel).toBe("Preview");
  });

  it("keeps group headings distinct from their items", () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(section.label).not.toBe(SETTINGS_GROUP_LABELS[section.group]);
    }
  });
});
