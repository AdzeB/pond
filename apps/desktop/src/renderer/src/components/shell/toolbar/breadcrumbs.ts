import { SETTINGS_SECTIONS } from "@pond/schema";
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
  searchResultCount?: number;
}

const SETTINGS_LABELS = new Map(
  SETTINGS_SECTIONS.map((section) => [section.path, section.label]),
);

function settingsCrumb(section: string): string {
  return SETTINGS_LABELS.get(section) ?? "Settings";
}

function destinationCrumbs(base: string): Breadcrumb[] | null {
  switch (base) {
    case "/assistant":
      return [{ label: "Assistant", path: base }];
    case "/sources":
      return [{ label: "Sources", path: base, nav: { kind: "sources" } }];
    case "/tags":
      return [{ label: "Tags", path: base }];
    case "/downloads":
      return [{ label: "Downloads", path: base, nav: { kind: "downloads" } }];
    case "/trash":
      return [{ label: "Trash", path: base, nav: { kind: "trash" } }];
    default:
      break;
  }
  if (base.startsWith("/settings")) {
    const crumbs: Breadcrumb[] = [{ label: "Settings", path: "/settings" }];
    const section = base.slice("/settings/".length);
    if (section) crumbs.push({ label: settingsCrumb(section), path: base });
    return crumbs;
  }
  if (base.startsWith("/source/")) {
    return [
      { label: "Sources", path: "/sources", nav: { kind: "sources" } },
      {
        label: getSourceLabel(base.slice("/source/".length)),
        path: base,
        nav: { kind: "all" },
      },
    ];
  }
  return null;
}

export function buildBreadcrumbs({
  pathname,
  listPath,
  nav,
  folders,
  saveLabel,
  searchResultCount,
}: BreadcrumbInput): Breadcrumb[] {
  const isSave = saveIdFromPath(pathname) !== null;
  const base = isSave ? listPath : pathname;
  const destination = destinationCrumbs(base);
  const searchCrumb =
    !isSave && searchResultCount !== undefined
      ? { label: `Search results (${searchResultCount})`, path: base }
      : null;
  if (destination) {
    if (searchCrumb && (base === "/trash" || base.startsWith("/source/")))
      destination.push(searchCrumb);
    if (isSave)
      destination.push({ label: saveLabel || "Save", path: pathname });
    return destination;
  }
  const crumbs: Breadcrumb[] = [
    { label: "Library", path: "/", nav: { kind: "all" } },
  ];
  if (base === "/" && nav.kind === "folder") {
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
  if (searchCrumb) crumbs.push(searchCrumb);
  if (isSave) crumbs.push({ label: saveLabel || "Save", path: pathname });
  return crumbs;
}
