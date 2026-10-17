import type {
  ImportMediaKind,
  ImportScope,
  ListKind,
  Source,
} from "@pond/schema/db";
import { LIST_KIND_LABELS } from "@pond/schema/list-kinds";
import {
  type ImportCollectionKind,
  importScopeOptions,
  importsEverything,
  sinceStart,
} from "@shared/import-scope";
import type { OkResult } from "@shared/query-contracts-shared";
import { refetchAccounts } from "@/features/sources/hooks/use-accounts";
import { syncMonitor } from "@/features/sources/state/sync-monitor";

const SOURCE_LIST_KIND_LABELS = {
  instagram: { saved: "Saved Posts", liked: "Liked Posts" },
  youtube: { saved: "Saved Videos", liked: "Liked Videos" },
  tiktok: { saved: "Favorites", liked: "Liked Videos" },
  reddit: { saved: "Saved Posts", liked: "Upvoted Posts" },
  twitter: { saved: "Bookmarks", liked: "Likes" },
} satisfies Partial<Record<Source, Record<ListKind, string>>>;

const MEDIA_KIND_LABELS = {
  image: "Images",
  video: "Videos",
  text: "Text Posts",
} satisfies Record<ImportMediaKind, string>;

interface CollectionNouns {
  many: string;
  title: string;
  all: string;
  some: string;
  item: { one: string; many: string };
}

const COLLECTION_NOUNS = {
  board: {
    many: "boards",
    title: "Boards",
    all: "All Pins",
    some: "Specific Boards",
    item: { one: "pin", many: "pins" },
  },
  collection: {
    many: "collections",
    title: "Collections",
    all: "All Saved Posts",
    some: "Specific Collections",
    item: { one: "post", many: "posts" },
  },
  folder: {
    many: "folders",
    title: "Folders",
    all: "All Bookmarks",
    some: "Specific Folders",
    item: { one: "post", many: "posts" },
  },
  playlist: {
    many: "playlists",
    title: "Playlists",
    all: "Watch Later",
    some: "Specific Playlists",
    item: { one: "video", many: "videos" },
  },
} satisfies Record<ImportCollectionKind, CollectionNouns>;

export function listKindLabel(source: Source, kind: ListKind): string {
  switch (source) {
    case "instagram":
    case "youtube":
    case "tiktok":
    case "reddit":
    case "twitter":
      return SOURCE_LIST_KIND_LABELS[source][kind];
    default:
      return LIST_KIND_LABELS[kind];
  }
}

export function mediaKindLabel(kind: ImportMediaKind): string {
  return MEDIA_KIND_LABELS[kind];
}

export function collectionNouns(kind: ImportCollectionKind): CollectionNouns {
  return COLLECTION_NOUNS[kind];
}

/** Whether the Source offers any choice beyond importing everything. */
export function hasImportChoices(source: Source): boolean {
  const options = importScopeOptions(source);
  return (
    options.listKinds.length > 0 ||
    options.collections !== null ||
    options.mediaKinds.length > 0 ||
    options.since
  );
}

export function importScopeSummary(
  source: Source,
  scope: ImportScope | undefined,
): string {
  if (importsEverything(scope)) return "Everything";
  const parts = [whatSummary(source, scope)];
  if (scope?.mediaKinds) {
    parts.push(scope.mediaKinds.map(mediaKindLabel).join(" and "));
  }
  if (scope?.since) parts.push(`from ${formatSince(scope.since)}`);
  return parts.filter(Boolean).join(", ");
}

function whatSummary(source: Source, scope: ImportScope | undefined): string {
  const collections = scope?.collections ?? [];
  const kind = importScopeOptions(source).collections;
  const listKinds = scope?.listKinds ?? importScopeOptions(source).listKinds;
  const lists = listKinds.map((listKind) => {
    if (listKind !== "saved" || !kind || collections.length === 0) {
      return listKindLabel(source, listKind);
    }
    const [first] = collections;
    return collections.length === 1 && first
      ? first.name
      : `${collections.length} ${collectionNouns(kind).many}`;
  });
  if (lists.length > 0) return lists.join(" and ");
  return scope?.mediaKinds || scope?.since ? "" : "Everything";
}

function formatSince(since: string): string {
  const start = sinceStart(since);
  return start
    ? start.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : since;
}

export async function saveImportScope(input: {
  accountId: string;
  source: Source;
  scope: ImportScope;
  start: boolean;
}): Promise<OkResult> {
  const result = await window.pond.query("accounts.setImportScope", {
    accountId: input.accountId,
    scope: input.scope,
  });
  if (!result.ok) return result;
  if (input.start) {
    syncMonitor.seed(input.accountId, input.source, { connected: true });
    void window.pond.syncRunNow(input.accountId);
  }
  await refetchAccounts();
  return { ok: true };
}
