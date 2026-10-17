import type {
  ImportCollection,
  ImportScope,
  Source,
  SourceSyncPrefs,
} from "@pond/schema/db";
import {
  importsEverything,
  importsListKind,
} from "../../../shared/import-scope";

/** Sources whose Account sync walks Likes as a second list beside the main saved list. */
const SEPARATE_LIKED_LISTS: ReadonlySet<Source> = new Set([
  "instagram",
  "youtube",
]);

export interface ListHarvestPlan {
  primary: boolean;
  liked: boolean;
  collections: ImportCollection[] | null;
}

export function listHarvestPlan(
  source: Source,
  scope: ImportScope | undefined,
): ListHarvestPlan {
  const collections =
    scope?.collections && scope.collections.length > 0
      ? scope.collections
      : null;
  const separateLiked = SEPARATE_LIKED_LISTS.has(source);
  return {
    primary:
      collections === null &&
      (!separateLiked || importsListKind(scope, "saved")),
    liked: separateLiked && importsListKind(scope, "liked"),
    collections,
  };
}

export function isImportPending(
  sync: Pick<SourceSyncPrefs, "importPending">,
): boolean {
  return sync.importPending === true;
}

export function importScopePatch(
  current: Pick<SourceSyncPrefs, "importScope">,
  scope: ImportScope,
): Partial<SourceSyncPrefs> {
  const next = importsEverything(scope) ? undefined : scope;
  const patch: Partial<SourceSyncPrefs> = {
    importScope: next,
    importPending: false,
  };
  /** Early stop ends a walk at ids already in the Library, so a new selection needs one full walk to reach its older items. */
  if (!sameScope(current.importScope, next)) {
    patch.lastFullSyncAt = null;
    patch.resumeCursor = null;
  }
  return patch;
}

function sameScope(
  a: ImportScope | undefined,
  b: ImportScope | undefined,
): boolean {
  return scopeKey(a) === scopeKey(b);
}

function scopeKey(scope: ImportScope | undefined): string {
  if (!scope) return "";
  const listKinds = [...(scope.listKinds ?? [])].sort().join(",");
  const collections = (scope.collections ?? [])
    .map((collection) => collection.id)
    .sort()
    .join(",");
  return `${scope.listKinds ? listKinds : "*"}|${scope.collections ? collections : "*"}`;
}
