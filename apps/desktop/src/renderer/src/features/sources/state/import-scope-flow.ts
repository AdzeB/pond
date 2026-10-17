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
import { createContext, use } from "react";
import {
  type SincePreset,
  sinceForPreset,
} from "@/features/sources/lib/import-scope";

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
  /** Empty imports the whole saved list. */
  collections: readonly ImportCollection[];
  /** Unset follows the default: picked collections file, and none picked doesn't. */
  addToFolders: boolean | undefined;
  /** Empty imports every kind. */
  mediaKinds: readonly ImportMediaKind[];
  /** Local `YYYY-MM-DD`; empty imports every date. */
  since: string;
  sincePreset: SincePreset;
  saving: boolean;
  error: string | null;
}

const EMPTY: ImportScopeFlowState = {
  accountId: null,
  source: null,
  starts: false,
  listKinds: [],
  collections: [],
  addToFolders: undefined,
  mediaKinds: [],
  since: "",
  sincePreset: "any",
  saving: false,
  error: null,
};

/** Each flow owns its draft, so a gallery can show several pickers at once. */
export function createImportScopeFlow() {
  const store = new Store<ImportScopeFlowState>(EMPTY);
  return {
    store,
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
        collections,
        addToFolders: scope?.addToFolders,
        mediaKinds: scope?.mediaKinds ?? [],
        since: scope?.since ?? "",
        sincePreset: scope?.since ? "custom" : "any",
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
    setCollections(collections: readonly ImportCollection[]): void {
      store.setState((s) => ({ ...s, collections, error: null }));
    },
    setAddToFolders(addToFolders: boolean): void {
      store.setState((s) => ({ ...s, addToFolders, error: null }));
    },
    setMediaKinds(mediaKinds: readonly ImportMediaKind[]): void {
      store.setState((s) => ({ ...s, mediaKinds, error: null }));
    },
    setSincePreset(sincePreset: SincePreset): void {
      store.setState((s) => ({
        ...s,
        sincePreset,
        since: sincePreset === "custom" ? s.since : sinceForPreset(sincePreset),
        error: null,
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
}

export type ImportScopeFlow = ReturnType<typeof createImportScopeFlow>;

export const importScopeFlow = createImportScopeFlow();

const ImportScopeFlowContext = createContext<ImportScopeFlow>(importScopeFlow);

export const ImportScopeFlowProvider = ImportScopeFlowContext;

export function useImportScopeFlowActions(): ImportScopeFlow {
  return use(ImportScopeFlowContext);
}

export function draftFiles(
  state: Pick<ImportScopeFlowState, "collections" | "addToFolders">,
): boolean {
  return state.addToFolders ?? state.collections.length > 0;
}

/** The scope the draft describes, or null while it would import nothing. */
export function draftImportScope(
  state: Pick<
    ImportScopeFlowState,
    | "source"
    | "listKinds"
    | "collections"
    | "addToFolders"
    | "mediaKinds"
    | "since"
  >,
): ImportScope | null {
  if (!state.source) return null;
  const options = importScopeOptions(state.source);
  const scope: ImportScope = {};
  if (options.listKinds.length > 0) scope.listKinds = [...state.listKinds];
  if (options.collections && state.collections.length > 0) {
    scope.collections = [...state.collections];
    if (!draftFiles(state)) scope.addToFolders = false;
  } else if (draftFiles(state)) {
    scope.addToFolders = true;
  }
  if (options.mediaKinds.length > 0 && state.mediaKinds.length > 0) {
    scope.mediaKinds = [...state.mediaKinds];
  }
  if (options.since && state.since) scope.since = state.since;
  const normalized = normalizeImportScope(state.source, scope);
  return normalized.ok ? normalized.scope : null;
}

export function useImportScopeFlow(): ImportScopeFlowState {
  return useSelector(useImportScopeFlowActions().store, (s) => s);
}
