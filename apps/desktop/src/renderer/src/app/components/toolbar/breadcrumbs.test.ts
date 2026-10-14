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
    ).toEqual([{ label: "All", path: "/", nav: { kind: "all" } }]);
  });

  it.each([
    ["/assistant", "Assistant"],
    ["/sources", "Sources"],
    ["/tags", "Tags"],
    ["/untagged", "Untagged"],
    ["/downloads", "Downloads"],
    ["/trash", "Trash"],
    ["/settings", "Settings"],
  ] as const)("keeps %s as its own root", (pathname, label) => {
    expect(
      buildBreadcrumbs({
        pathname,
        listPath: "/",
        nav: { kind: "folder", id: "child" },
        folders,
      }).map((crumb) => crumb.label),
    ).toEqual([label]);
  });

  it("orders folder parents before children and gives each a destination", () => {
    const crumbs = buildBreadcrumbs({
      pathname: "/",
      listPath: "/",
      nav: { kind: "folder", id: "child" },
      folders,
    });
    expect(crumbs.map((c) => c.label)).toEqual(["All", "Design", "Interfaces"]);
    expect(crumbs[1]?.nav).toEqual({ kind: "folder", id: "parent" });
    expect(crumbs[2]?.nav).toEqual({ kind: "folder", id: "child" });
  });

  it("nests Model Context Protocol under Settings", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/settings/mcp",
        listPath: "/",
        nav: { kind: "folder", id: "child" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Settings", "Model Context Protocol"]);
  });

  it("nests Models under Settings", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/settings/agent-models",
        listPath: "/",
        nav: { kind: "folder", id: "child" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Settings", "Models"]);
  });

  it("nests a settings section under Settings", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/settings/models",
        listPath: "/",
        nav: { kind: "folder", id: "child" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Settings", "Providers"]);
  });

  it.each([
    ["/settings/library", "Library"],
    ["/settings/storage", "Storage"],
    ["/settings/backups", "Backups"],
    ["/settings/processing", "Processing"],
    ["/settings/harvesting", "Harvesting"],
  ] as const)("labels the focused section at %s", (pathname, label) => {
    expect(
      buildBreadcrumbs({
        pathname,
        listPath: "/",
        nav: { kind: "all" },
        folders,
      }).map((crumb) => crumb.label),
    ).toEqual(["Settings", label]);
  });

  it("nests a source page under Sources", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/source/pinterest",
        listPath: "/",
        nav: { kind: "folder", id: "child" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["Sources", "Pinterest"]);
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
      "All",
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
    ).toEqual(["Trash", "Save"]);
  });

  it("supports Uncategorized and tag locations", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "uncategorized" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["All", "Uncategorized"]);
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "tag", name: "Animation" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["All", "Animation"]);
  });

  it("handles missing folders and cyclic ancestry without hanging", () => {
    expect(
      buildBreadcrumbs({
        pathname: "/",
        listPath: "/",
        nav: { kind: "folder", id: "missing" },
        folders,
      }).map((c) => c.label),
    ).toEqual(["All", "Folder"]);
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
    ).toEqual(["All", "Design", "Interfaces"]);
  });
});
