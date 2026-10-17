import type {
  ImportCollection,
  ImportMediaKind,
  ImportScope,
  ListKind,
  Source,
} from "@pond/schema/db";
import {
  accountImportScope,
  importScopeOptions,
  normalizeImportScope,
} from "@shared/import-scope";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type ImportScopeMode = "all" | "collections";

export interface ImportScopeAccount {
  id: string;
  source: Source;
  sync: {
    importScope?: ImportScope | undefined;
    importPending?: boolean | undefined;
    syncLikes?: boolean | undefined;
  };
}

interface ImportScopeFlowState {
  accountId: string | null;
  source: Source | null;
  /** A pending Account starts its first sync on confirm; an active one only saves. */
  starts: boolean;
  listKinds: readonly ListKind[];
  mode: ImportScopeMode;
  collections: readonly ImportCollection[];
  mediaKinds: readonly ImportMediaKind[];
  /** Local `YYYY-MM-DD`; empty imports every date. */
  since: string;
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
  mediaKinds: [],
  since: "",
  saving: false,
  error: null,
};

const store = new Store<ImportScopeFlowState>(EMPTY);

export const importScopeFlow = {
  open(account: ImportScopeAccount): void {
    const scope = accountImportScope(account.source, account.sync);
    const collections = scope?.collections ?? [];
    const options = importScopeOptions(account.source);
    store.setState(() => ({
      ...EMPTY,
      accountId: account.id,
      source: account.source,
      starts: account.sync.importPending === true,
      listKinds: scope?.listKinds ?? options.listKinds,
      mode: collections.length > 0 ? "collections" : "all",
      collections,
      mediaKinds: scope?.mediaKinds ?? options.mediaKinds,
      since: scope?.since ?? "",
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
  setMediaKind(kind: ImportMediaKind, included: boolean): void {
    store.setState((s) => ({
      ...s,
      error: null,
      mediaKinds: included
        ? Array.from(new Set([...s.mediaKinds, kind]))
        : s.mediaKinds.filter((k) => k !== kind),
    }));
  },
  setSince(since: string): void {
    store.setState((s) => ({ ...s, since, error: null }));
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
    "source" | "listKinds" | "mode" | "collections" | "mediaKinds" | "since"
  >,
): ImportScope | null {
  if (!state.source) return null;
  const options = importScopeOptions(state.source);
  const scope: ImportScope = {};
  if (options.listKinds.length > 0) scope.listKinds = [...state.listKinds];
  if (options.collections && state.mode === "collections") {
    scope.collections = [...state.collections];
  }
  if (options.mediaKinds.length > 0) scope.mediaKinds = [...state.mediaKinds];
  if (options.since && state.since) scope.since = state.since;
  const normalized = normalizeImportScope(state.source, scope);
  return normalized.ok ? normalized.scope : null;
}

export function useImportScopeFlow(): ImportScopeFlowState {
  return useSelector(store, (s) => s);
}
