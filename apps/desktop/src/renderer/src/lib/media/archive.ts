/** Site-archive manifest helpers; mirrors archive-page.ts constants, inlined since the renderer can't reach the main bundle. */
import { buildPondUrl } from "@/lib/media/url";
import type { Save, SaveFile } from "@/lib/types";

export const ARCHIVE_KIND = "archive";
export const ARCHIVE_MANIFEST_KIND = "archive_manifest";

export type ArchiveScope = "page" | "site";

export interface ArchiveManifestPage {
  url: string;
  title: string;
}

export interface ArchiveManifest {
  version: number;
  rootUrl: string;
  archivedAt: string;
  scope: ArchiveScope;
  pages: ArchiveManifestPage[];
}

export function isArchiveFile(file: SaveFile): boolean {
  return file.kind === ARCHIVE_KIND || file.kind === ARCHIVE_MANIFEST_KIND;
}

export function archiveManifestFile(save: Save): SaveFile | null {
  return (
    (save.files ?? []).find((f) => f.kind === ARCHIVE_MANIFEST_KIND) ?? null
  );
}

/** The replayable WARC; MHTML-era archive files don't qualify and are ignored by the viewer. */
export function archiveWarcFile(save: Save): SaveFile | null {
  return (
    (save.files ?? []).find(
      (f) => f.kind === ARCHIVE_KIND && f.path.endsWith(".warc.gz"),
    ) ?? null
  );
}

export function hasArchive(save: Save): boolean {
  return archiveManifestFile(save) !== null && archiveWarcFile(save) !== null;
}

export async function loadArchiveManifest(
  save: Save,
): Promise<ArchiveManifest | null> {
  const file = archiveManifestFile(save);
  if (!file) return null;
  try {
    const res = await fetch(buildPondUrl(save.id, file));
    if (!res.ok) return null;
    const raw = (await res.json()) as ArchiveManifest;
    if (!Array.isArray(raw.pages)) return null;
    /** Manifests written before the scope field carried site crawls. */
    return { ...raw, scope: raw.scope === "page" ? "page" : "site" };
  } catch {
    return null;
  }
}

/**
 * wabac.js sniffs the archive format from the source URL's extension, so the URL must stay query-free.
 * The collection id folds in archivedAt: wabac caches indexed collections by id, so a re-archived save must mint a new id or the viewer replays the stale index.
 */
export function buildArchiveViewerUrl(
  save: Save,
  pageUrl: string,
  manifest: ArchiveManifest,
): string | null {
  const warc = archiveWarcFile(save);
  if (!warc) return null;
  const source = `pond://${save.id}/${warc.path}`;
  const coll = `${save.id}-${manifest.archivedAt.replace(/[^0-9]/g, "")}`;
  const params = new URLSearchParams({ source, url: pageUrl, coll });
  return `pond://_replay/index.html?${params.toString()}`;
}

/** Matches the crawler's dedupe: host + path (no trailing slash) + query, so archived links resolve across redirects and slash variants. */
export function archiveUrlKey(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return url;
  }
}
