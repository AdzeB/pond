import type { Folder } from "@pond/schema/db";
import { getSourceLabel } from "@/lib/save/source-labels";
import { saveIdFromPath } from "@/lib/ui/save-nav";
import type { LibraryNav } from "@/stores/library-chrome";

export interface Breadcrumb {
  label: string;
  path: string;
  nav?: LibraryNav;
}

interface BreadcrumbInput {
  pathname: string;
  listPath: string;
  nav: LibraryNav;
  folders: readonly Pick<Folder, "id" | "name" | "parentId">[];
  saveLabel?: string;
}

export function buildBreadcrumbs({
  pathname,
  listPath,
  nav,
  folders,
  saveLabel,
}: BreadcrumbInput): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [
    { label: "Library", path: "/", nav: { kind: "all" } },
  ];
  const isSave = saveIdFromPath(pathname) !== null;
  const base = isSave ? listPath : pathname;
  if (base === "/assistant") {
    crumbs.push({ label: "Assistant", path: base });
  } else if (base === "/sources") {
    crumbs.push({ label: "Sources", path: base, nav: { kind: "sources" } });
  } else if (base === "/tags") {
    crumbs.push({ label: "Tags", path: base });
  } else if (base === "/downloads") {
    crumbs.push({ label: "Downloads", path: base, nav: { kind: "downloads" } });
  } else if (base === "/trash") {
    crumbs.push({ label: "Trash", path: base, nav: { kind: "trash" } });
  } else if (base.startsWith("/source/")) {
    crumbs.push({
      label: getSourceLabel(base.slice("/source/".length)),
      path: base,
      nav: { kind: "all" },
    });
  } else if (base === "/" && nav.kind === "folder") {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const ancestors: Breadcrumb[] = [];
    const seen = new Set<string>();
    let folder = byId.get(nav.id);
    while (folder && !seen.has(folder.id)) {
      seen.add(folder.id);
      ancestors.unshift({
        label: folder.name,
        path: "/",
        nav: { kind: "folder", id: folder.id },
      });
      folder = folder.parentId ? byId.get(folder.parentId) : undefined;
    }
    crumbs.push(
      ...(ancestors.length ? ancestors : [{ label: "Folder", path: "/", nav }]),
    );
  } else if (base === "/" && nav.kind === "uncategorized") {
    crumbs.push({ label: "Uncategorized", path: "/", nav });
  } else if (base === "/" && nav.kind === "tag") {
    crumbs.push({ label: nav.name, path: "/", nav });
  }
  if (isSave) crumbs.push({ label: saveLabel || "Save", path: pathname });
  return crumbs;
}
