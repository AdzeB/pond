import type { ImportScope, ListKind, Source } from "@pond/schema/db";
import { LIST_KIND_LABELS } from "@pond/schema/list-kinds";
import {
  type ImportCollectionKind,
  importScopeOptions,
  importsEverything,
} from "@shared/import-scope";
import type { OkResult } from "@shared/query-contracts-shared";
import { refetchAccounts } from "@/features/sources/hooks/use-accounts";
import { syncMonitor } from "@/features/sources/state/sync-monitor";

const SOURCE_LIST_KIND_LABELS = {
  instagram: { saved: "Saved Posts", liked: "Liked Posts" },
  youtube: { saved: "Watch Later", liked: "Liked Videos" },
} satisfies Partial<Record<Source, Record<ListKind, string>>>;

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
} satisfies Record<ImportCollectionKind, CollectionNouns>;

export function listKindLabel(source: Source, kind: ListKind): string {
  const labels: Partial<Record<ListKind, string>> | undefined =
    source === "instagram" || source === "youtube"
      ? SOURCE_LIST_KIND_LABELS[source]
      : undefined;
  return labels?.[kind] ?? LIST_KIND_LABELS[kind];
}

export function collectionNouns(kind: ImportCollectionKind): CollectionNouns {
  return COLLECTION_NOUNS[kind];
}

/** Whether the Source offers any choice beyond importing everything. */
export function hasImportChoices(source: Source): boolean {
  const options = importScopeOptions(source);
  return options.listKinds.length > 0 || options.collections !== null;
}

export function importScopeSummary(
  source: Source,
  scope: ImportScope | undefined,
): string {
  if (importsEverything(scope)) return "Everything";
  const collections = scope?.collections ?? [];
  const kind = importScopeOptions(source).collections;
  if (kind && collections.length > 0) {
    const nouns = collectionNouns(kind);
    const [first] = collections;
    return collections.length === 1 && first
      ? first.name
      : `${collections.length} ${nouns.many}`;
  }
  return (scope?.listKinds ?? [])
    .map((listKind) => listKindLabel(source, listKind))
    .join(" and ");
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
