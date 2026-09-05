import type { Folder } from "@pond/schema/db";
import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect } from "react";

interface FoldersState {
  folders: Folder[];
  bySave: Record<string, string[]>;
  loaded: boolean;
}

const store = new Store<FoldersState>({
  folders: [],
  bySave: {},
  loaded: false,
});

export const folders = {
  snapshot(): Folder[] {
    return store.state.folders;
  },
  async refresh(): Promise<void> {
    const [folderRows, membershipRows] = await Promise.all([
      window.pond.query("folders.list", {}),
      window.pond.query("folders.memberships", {}),
    ]);
    const bySave: Record<string, string[]> = {};
    for (const row of membershipRows ?? []) {
      const list = bySave[row.saveId] ?? [];
      list.push(row.folderId);
      bySave[row.saveId] = list;
    }
    store.setState(() => ({
      folders: folderRows ?? [],
      bySave,
      loaded: true,
    }));
  },
};

export function useFolders(): Folder[] {
  return useSelector(store, (s) => s.folders);
}

export function useFolderMemberships(): Record<string, string[]> {
  return useSelector(store, (s) => s.bySave);
}

export function useHydrateFolders(): void {
  useEffect(() => {
    void folders.refresh();
  }, []);
}
