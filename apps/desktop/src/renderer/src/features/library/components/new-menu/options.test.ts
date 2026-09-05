import { describe, expect, it } from "vitest";
import { filterNewActions } from "./options";

const ids = (search: string) =>
  filterNewActions(search).flatMap((group) =>
    group.actions.map((action) => action.id),
  );

describe("new menu actions", () => {
  it("includes every supported creation and import entry point", () => {
    expect(ids("  ")).toEqual([
      "folder",
      "tag",
      "tag-group",
      "note",
      "files",
      "folders",
      "links",
      "clipboard",
      "bookmarks",
      "page-assets",
      "eagle",
      "connect",
      "watch",
    ]);
  });

  it("matches labels without case or surrounding whitespace", () => {
    expect(ids(" EAGLE ")).toEqual(["eagle"]);
  });

  it("matches keywords and all search terms", () => {
    expect(ids("text document")).toEqual(["note", "files"]);
    expect(ids("auto import")).toEqual(["connect", "watch"]);
    expect(ids("paste")).toEqual(["clipboard"]);
    expect(ids("from folder")).toEqual(["folders"]);
    expect(ids("package")).toEqual(["eagle"]);
    expect(ids("watch someone")).toEqual(["watch"]);
  });

  it("matches group names and removes empty groups", () => {
    expect(filterNewActions("sources").map((group) => group.label)).toEqual([
      "Sources",
    ]);
    expect(filterNewActions("photoshop")).toEqual([]);
  });
});
