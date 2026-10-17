import type {
  ImportCollection,
  ImportScope,
  ListKind,
  Source,
} from "@pond/schema/db";
import { importScopeOptions, normalizeImportScope } from "@shared/import-scope";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ImportScopeMode = "all" | "collections";

export interface ImportScopeAccount {
  id: string;
  source: Source;
  sync: { importScope?: ImportScope; importPending?: boolean };
}

interface ImportScopeFlowState {
  accountId: string | null;
  source: Source | null;
  /** A pending Account starts its first sync on confirm; an active one only saves. */
  starts: boolean;
  listKinds: readonly ListKind[];
  mode: ImportScopeMode;
  collections: readonly ImportCollection[];
  saving: boolean;
  error: string | null;
}

const EMPTY: ImportScopeFlowState = {
  accountId: null,
  source: null,
  starts: false,
  listKinds: [],
  mode: "all",
  collections: [],
  saving: false,
  error: null,
};

const store = new Store<ImportScopeFlowState>(EMPTY);

export const importScopeFlow = {
  open(account: ImportScopeAccount): void {
    const scope = account.sync.importScope;
    const collections = scope?.collections ?? [];
    store.setState(() => ({
      ...EMPTY,
      accountId: account.id,
      source: account.source,
      starts: account.sync.importPending === true,
      listKinds:
        scope?.listKinds ?? importScopeOptions(account.source).listKinds,
      mode: collections.length > 0 ? "collections" : "all",
      collections,
    }));
  },
  setListKind(kind: ListKind, included: boolean): void {
    store.setState((s) => ({
      ...s,
      error: null,
      listKinds: included
        ? Array.from(new Set([...s.listKinds, kind]))
        : s.listKinds.filter((k) => k !== kind),
    }));
  },
  setMode(mode: ImportScopeMode): void {
    store.setState((s) => (s.mode === mode ? s : { ...s, mode, error: null }));
  },
  setCollection(collection: ImportCollection, included: boolean): void {
    store.setState((s) => ({
      ...s,
      error: null,
      collections: included
        ? s.collections.some((c) => c.id === collection.id)
          ? s.collections
          : [...s.collections, collection]
        : s.collections.filter((c) => c.id !== collection.id),
    }));
  },
  setSaving(saving: boolean): void {
    store.setState((s) => ({ ...s, saving, error: saving ? null : s.error }));
  },
  fail(error: string): void {
    store.setState((s) => ({ ...s, saving: false, error }));
  },
  snapshot(): ImportScopeFlowState {
    return store.state;
  },
  clear(): void {
    store.setState(() => EMPTY);
  },
};

/** The scope the draft describes, or null while it would import nothing. */
export function draftImportScope(
  state: Pick<
    ImportScopeFlowState,
    "source" | "listKinds" | "mode" | "collections"
  >,
): ImportScope | null {
  if (!state.source) return null;
  const options = importScopeOptions(state.source);
  const scope: ImportScope = {};
  if (options.listKinds.length > 0) scope.listKinds = [...state.listKinds];
  if (options.collections && state.mode === "collections") {
    scope.collections = [...state.collections];
  }
  const normalized = normalizeImportScope(state.source, scope);
  return normalized.ok ? normalized.scope : null;
}

export function useImportScopeFlow(): ImportScopeFlowState {
  return useSelector(store, (s) => s);
}
