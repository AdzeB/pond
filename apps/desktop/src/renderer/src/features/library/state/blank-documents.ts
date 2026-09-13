import type { BlankDocumentKind } from "@shared/blank-documents";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

const store = new Store<{ kinds: BlankDocumentKind[] }>({ kinds: [] });

export const blankDocuments = {
  kinds(): BlankDocumentKind[] {
    return store.state.kinds;
  },
  async refresh(): Promise<void> {
    const result = await window.pond.query("saves.listBlankDocuments", {});
    store.setState(() => ({ kinds: result.kinds ?? [] }));
  },
};

export function useBlankDocumentKinds(): BlankDocumentKind[] {
  return useSelector(store, (state) => state.kinds);
}
