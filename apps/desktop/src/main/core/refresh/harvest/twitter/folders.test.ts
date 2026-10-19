import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  buildOpenBookmarkFolderExpression,
  parseBookmarkFolders,
} from "./folders";

const page = (items: Array<{ id: string; name: string }>) =>
  JSON.stringify({
    data: {
      viewer: {
        user_results: {
          result: {
            __typename: "User",
            bookmark_collections_slice: { items, slice_info: {} },
          },
        },
      },
    },
  });

describe("parseBookmarkFolders", () => {
  it("reads folders across captured pages without repeats", () => {
    expect(
      parseBookmarkFolders([
        page([
          { id: "1720", name: "Type" },
          { id: "1721", name: "" },
        ]),
        page([{ id: "1720", name: "Type" }]),
      ]),
    ).toEqual([
      { id: "1720", name: "Type", itemCount: null },
      { id: "1721", name: "1721", itemCount: null },
    ]);
  });

  it("skips bodies that aren't JSON or carry no folders", () => {
    expect(
      parseBookmarkFolders(["<html>", JSON.stringify({ data: {} })]),
    ).toEqual([]);
    expect(parseBookmarkFolders(null)).toEqual([]);
  });
});

/** Stands in for X: the bookmarks list has loaded, and routing to a folder sends that folder's request. */
function bookmarksPage(url: string) {
  const dom = new JSDOM('<div data-testid="primaryColumn"></div>', {
    runScripts: "outside-only",
    url,
  });
  const captures = () => Reflect.get(dom.window, "__pondBookmarksCaptures");
  Reflect.set(dom.window, "__pondBookmarksCaptures", [{ url: "Bookmarks" }]);
  dom.window.addEventListener("popstate", () => {
    Reflect.set(dom.window, "__pondBookmarkFolderRequest", {
      url: "BookmarkFolderTimeline",
    });
    captures().push({ url: "BookmarkFolderTimeline" });
  });
  const open = async (folderId: string): Promise<unknown> =>
    // SAFETY: the expression wraps the controlled in-page function exercised by this fixture.
    await dom.window.eval(buildOpenBookmarkFolderExpression(folderId));
  return { dom, captures, open };
}

describe("buildOpenBookmarkFolderExpression", () => {
  it("routes the open bookmarks page to the folder and keeps only its captures", async () => {
    const { dom, captures, open } = bookmarksPage("https://x.com/i/history");

    expect(await open("2111")).toBe(true);
    expect(dom.window.location.pathname).toBe("/i/history/bookmarks/2111");
    expect(captures()).toEqual([{ url: "BookmarkFolderTimeline" }]);
  });

  it("keeps the older bookmarks path when X hasn't moved it under History", async () => {
    const { dom, open } = bookmarksPage("https://x.com/i/bookmarks");

    expect(await open("2111")).toBe(true);
    expect(dom.window.location.pathname).toBe("/i/bookmarks/2111");
  });
});
