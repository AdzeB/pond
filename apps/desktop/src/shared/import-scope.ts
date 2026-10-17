import type {
  ImportCollection,
  ImportScope,
  ListKind,
  Source,
} from "@pond/schema/db";

export interface ImportScopeOptions {
  /** Lists the Account sync walks separately, so leaving one out skips its requests. */
  listKinds: readonly ListKind[];
  /** The kind of collection that can replace the whole list, or null when the sync can only walk everything. */
  collections: ImportCollectionKind | null;
}

export type ImportCollectionKind = "board";

export interface ImportCollectionOption extends ImportCollection {
  itemCount: number | null;
}

const EVERYTHING_ONLY: ImportScopeOptions = {
  listKinds: [],
  collections: null,
};

const IMPORT_SCOPE_OPTIONS = {
  twitter: EVERYTHING_ONLY,
  youtube: { listKinds: ["saved", "liked"], collections: null },
  cosmos: EVERYTHING_ONLY,
  arena: EVERYTHING_ONLY,
  pinterest: { listKinds: [], collections: "board" },
  instagram: { listKinds: ["saved", "liked"], collections: null },
  tiktok: EVERYTHING_ONLY,
  reddit: EVERYTHING_ONLY,
  threads: EVERYTHING_ONLY,
  web: EVERYTHING_ONLY,
  local: EVERYTHING_ONLY,
} satisfies Record<Source, ImportScopeOptions>;

export function importScopeOptions(source: Source): ImportScopeOptions {
  return IMPORT_SCOPE_OPTIONS[source];
}

export type ImportScopeProblem = "no_lists" | "no_collections";

export type NormalizedImportScope =
  | { ok: true; scope: ImportScope }
  | { ok: false; problem: ImportScopeProblem };

/** Drops parts the Source can't honor and collapses a full selection to the omitted form, so "everything" has one representation. */
export function normalizeImportScope(
  source: Source,
  scope: ImportScope,
): NormalizedImportScope {
  const options = importScopeOptions(source);
  const next: ImportScope = {};

  if (scope.listKinds && options.listKinds.length > 0) {
    const chosen = new Set(scope.listKinds);
    const listKinds = options.listKinds.filter((kind) => chosen.has(kind));
    if (listKinds.length === 0) return { ok: false, problem: "no_lists" };
    if (listKinds.length < options.listKinds.length) {
      next.listKinds = listKinds;
    }
  }

  if (scope.collections && options.collections) {
    const collections = uniqueCollections(scope.collections);
    if (collections.length === 0) {
      return { ok: false, problem: "no_collections" };
    }
    next.collections = collections;
  }

  return { ok: true, scope: next };
}

export function importsListKind(
  scope: ImportScope | undefined,
  kind: ListKind,
): boolean {
  return !scope?.listKinds || scope.listKinds.includes(kind);
}

export function importsEverything(scope: ImportScope | undefined): boolean {
  return !scope?.listKinds && !scope?.collections?.length;
}

function uniqueCollections(
  collections: readonly ImportCollection[],
): ImportCollection[] {
  const seen = new Set<string>();
  const out: ImportCollection[] = [];
  for (const collection of collections) {
    const id = collection.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: collection.name.trim() || id });
  }
  return out;
}
