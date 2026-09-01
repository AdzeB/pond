import { describe, expect, it } from "vitest";
import { buildBreadcrumbs } from "./breadcrumbs";

const folders = [
  { id: "parent", name: "Design", parentId: null },
  { id: "child", name: "Interfaces", parentId: "parent" },
];

describe("library breadcrumb paths", () => {
  it("keeps the library root to one crumb", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "all" },
        folders,
      }),
    ).toEqual([{ label: "Library", path: "/", nav: { kind: "all" } }]);
  });

  it("orders folder parents before children and gives each a destination", () => {
    const crumbs = buildBreadcrumbs({
      pathname: "/",
      listPath: "/",
      nav: { kind: "folder", id: "child" },
      folders,
    });
    expect(crumbs.map((c) => c.label)).toEqual([
      "Library",
      "Design",
      "Interfaces",
    ]);
    expect(crumbs[1]?.nav).toEqual({ kind: "folder", id: "parent" });
    expect(crumbs[2]?.nav).toEqual({ kind: "folder", id: "child" });
  });

  it("prioritizes the route over a stale folder selection", () => {
    for (const [pathname, label] of [
      ["/sources", "Sources"],
      ["/tags", "Tags"],
      ["/trash", "Trash"],
      ["/downloads", "Downloads"],
    ]) {
      expect(
        buildBreadcrumbs({
          pathname: pathname ?? "/",
          listPath: "/",
          nav: { kind: "folder", id: "child" },
          folders,
        }).map((c) => c.label),
      ).toEqual(["Library", label]);
    }
  });

  it("includes a save after its containing folder path", () => {
    const crumbs = buildBreadcrumbs({
      pathname: "/save/one",
      listPath: "/",
      nav: { kind: "folder", id: "child" },
      folders,
      saveLabel: "A saved interface",
    });
    expect(crumbs.map((c) => c.label)).toEqual([
      "Library",
      "Design",
      "Interfaces",
      "A saved interface",
    ]);
  });

  it("uses the originating list for saves opened from Trash", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/save/one",
        listPath: "/trash",
        nav: { kind: "all" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Library", "Trash", "Save"]);
  });

  it("supports Uncategorized and tag locations", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "uncategorized" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Library", "Uncategorized"]);
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "tag", name: "Animation" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Library", "Animation"]);
  });

  it("handles missing folders and cyclic ancestry without hanging", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "folder", id: "missing" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Library", "Folder"]);
    const cyclic = folders.map((f) => ({
      ...f,
      parentId: f.id === "parent" ? "child" : "parent",
    }));
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "folder", id: "child" },
        folders: cyclic,
      }).map((c) => c.label),
    ).toEqual(["Library", "Design", "Interfaces"]);
  });
});
