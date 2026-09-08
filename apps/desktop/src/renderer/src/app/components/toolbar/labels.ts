import { domainFromUrl } from "@pond/schema/domain";
import { saveIdFromPath } from "@/features/saves/lib/save-nav";
import { getSourceLabel } from "@/features/saves/lib/source-labels";
import type { Save } from "@/features/saves/types";
import { listBaseFromPath } from "@/features/search/lib/schemas";

const ROUTE_LABELS: ReadonlyMap<string, string> = new Map([
  ["/", "All"],
  ["/sources", "Sources"],
  ["/trash", "Trash"],
  ["/downloads", "Downloads"],
]);

function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(" ");
}

function saveLabel(save: Save): string {
  const title = save.title?.trim();
  if (title) return title;
  if (save.url) {
    const host = domainFromUrl(save.url);
    if (host) return host;
    return save.url;
  }
  return "Untitled save";
}

function labelForPath(path: string): string {
  const pathname = path.split("?")[0] ?? path;
  const clean = listBaseFromPath(pathname);

  const exact = ROUTE_LABELS.get(clean);
  if (exact) return exact;

  if (clean.startsWith("/source/")) {
    const source = clean.split("/")[2];
    return source ? getSourceLabel(source) : "Source";
  }

  if (clean.length > 1) return titleCase(clean.slice(1));
  return "All";
}

export function computeLabel(path: string, save: Save | undefined): string {
  if (save) return saveLabel(save);
  if (saveIdFromPath(path.split("?")[0] ?? path)) return "Save";
  return labelForPath(path);
}
