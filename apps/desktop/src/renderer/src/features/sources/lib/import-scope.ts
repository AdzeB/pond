import type {
  ImportMediaKind,
  ImportScope,
  ListKind,
  Source,
} from "@pond/schema/db";
import { LIST_KIND_LABELS } from "@pond/schema/list-kinds";
import {
  collectionFiling,
  type ImportCollectionKind,
  importScopeOptions,
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
  one: string;
  many: string;
  title: string;
  all: string;
}

const COLLECTION_NOUNS = {
  board: {
    one: "board",
    many: "boards",
    title: "Boards",
    all: "All Pins",
  },
  collection: {
    one: "collection",
    many: "collections",
    title: "Collections",
    all: "All Saved Posts",
  },
  folder: {
    one: "bookmark folder",
    many: "folders",
    title: "Folders",
    all: "All Bookmarks",
  },
  playlist: {
    one: "playlist",
    many: "playlists",
    title: "Playlists",
    all: "Watch Later",
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

export interface ImportScopeRow {
  label: string;
  value: string;
}

/** One row per choice the Source offers, as the inspector lists them. */
export function importScopeRows(
  source: Source,
  scope: ImportScope | undefined,
): ImportScopeRow[] {
  const options = importScopeOptions(source);
  const listKinds = scope?.listKinds ?? options.listKinds;
  const rows: ImportScopeRow[] = [];
  if (options.listKinds.length > 0) {
    rows.push({
      label: "Lists",
      value: listKinds.map((kind) => listKindLabel(source, kind)).join(" and "),
    });
  }
  const savedChosen =
    options.listKinds.length === 0 || listKinds.includes("saved");
  if (options.collections && savedChosen) {
    const nouns = collectionNouns(options.collections);
    const chosen = scope?.collections ?? [];
    rows.push({
      label: nouns.title,
      value:
        chosen.length > 0 ? chosen.map((c) => c.name).join(", ") : nouns.all,
    });
    if (chosen.length > 0 || options.fileEveryCollection) {
      rows.push({
        label: "Add to Folders",
        value: collectionFiling(source, scope) === "off" ? "Off" : "On",
      });
    }
  }
  if (options.mediaKinds.length > 0) {
    rows.push({
      label: "Kinds of Posts",
      value: scope?.mediaKinds
        ? scope.mediaKinds.map(mediaKindLabel).join(", ")
        : "All Kinds",
    });
  }
  if (options.since) {
    rows.push({
      label: "Posted Since",
      value: scope?.since ? formatSince(scope.since) : "Any Time",
    });
  }
  return rows;
}

export type SincePreset =
  | "any"
  | "month"
  | "quarter"
  | "half"
  | "year"
  | "custom";

const SINCE_PRESET_MONTHS = {
  month: 1,
  quarter: 3,
  half: 6,
  year: 12,
} satisfies Record<Exclude<SincePreset, "any" | "custom">, number>;

export const SINCE_PRESETS = [
  { value: "any", label: "Any Time" },
  { value: "month", label: "Past Month" },
  { value: "quarter", label: "Past 3 Months" },
  { value: "half", label: "Past 6 Months" },
  { value: "year", label: "Past Year" },
  { value: "custom", label: "Custom Date" },
] as const satisfies ReadonlyArray<{ value: SincePreset; label: string }>;

/** The local `YYYY-MM-DD` a preset starts from; empty for any time or a custom date. */
export function sinceForPreset(preset: SincePreset, now = new Date()): string {
  if (preset === "any" || preset === "custom") return "";
  const start = new Date(
    now.getFullYear(),
    now.getMonth() - SINCE_PRESET_MONTHS[preset],
    now.getDate(),
  );
  return localDay(start);
}

/** A date as the local `YYYY-MM-DD` the scope stores. */
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
