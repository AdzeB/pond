import type { LibraryNav } from "@/shared/lib/library-nav";

export interface SaveFolderReference {
  id: string;
  name: string;
  parentId?: string | null;
}

export type SaveInspectorTab = "organize" | "info";

export interface SaveLibraryBridge {
  getNav(): LibraryNav;
  inspectSave(id: string | null): void;
  openSaveDetails(id: string): void;
  setInspectorSaveId(id: string | null): void;
  setInspectorTab(tab: SaveInspectorTab): void;
  setNav(nav: LibraryNav): void;
  setAgentOpen(open: boolean): void;
  closeRightPane(): void;
  resetFilters(): void;
  openFolderPicker(ids: readonly string[]): void;
  openRename(ids: readonly string[]): void;
  openConversion(
    ids: readonly string[],
    fileIndex: number,
    mode?: "files" | "converted",
  ): void;
  openDuplicateReview(saveId: string): void;
  findSimilarColor(color: string): void;
  setVisualProbe(input: { id: string; label: string }): void;
  foldersForSave(id: string): readonly SaveFolderReference[];
  foldersSnapshot(): readonly SaveFolderReference[];
  lastUsedFolderId(): string | null;
  rememberFolderDestinations(ids: string[]): void;
  refreshFolders(): Promise<void>;
  startEditingFolder(id: string): void;
  saveFolderPresentation(
    folderId: string,
    patch: { pinnedIds?: string[]; coverSaveId?: string | null },
  ): Promise<void>;
}

function unavailable(): never {
  throw new Error("Save Library bridge is not registered.");
}

let current: SaveLibraryBridge = {
  getNav: unavailable,
  inspectSave: unavailable,
  openSaveDetails: unavailable,
  setInspectorSaveId: unavailable,
  setInspectorTab: unavailable,
  setNav: unavailable,
  setAgentOpen: unavailable,
  closeRightPane: unavailable,
  resetFilters: unavailable,
  openFolderPicker: unavailable,
  openRename: unavailable,
  openConversion: unavailable,
  openDuplicateReview: unavailable,
  findSimilarColor: unavailable,
  setVisualProbe: unavailable,
  foldersForSave: unavailable,
  foldersSnapshot: unavailable,
  lastUsedFolderId: unavailable,
  rememberFolderDestinations: unavailable,
  refreshFolders: unavailable,
  startEditingFolder: unavailable,
  saveFolderPresentation: unavailable,
};

export function registerSaveLibraryBridge(bridge: SaveLibraryBridge): void {
  current = bridge;
}

export const saveLibraryBridge: SaveLibraryBridge = {
  getNav: () => current.getNav(),
  inspectSave: (id) => current.inspectSave(id),
  openSaveDetails: (id) => current.openSaveDetails(id),
  setInspectorSaveId: (id) => current.setInspectorSaveId(id),
  setInspectorTab: (tab) => current.setInspectorTab(tab),
  setNav: (nav) => current.setNav(nav),
  setAgentOpen: (open) => current.setAgentOpen(open),
  closeRightPane: () => current.closeRightPane(),
  resetFilters: () => current.resetFilters(),
  openFolderPicker: (ids) => current.openFolderPicker(ids),
  openRename: (ids) => current.openRename(ids),
  openConversion: (ids, fileIndex, mode) =>
    current.openConversion(ids, fileIndex, mode),
  openDuplicateReview: (saveId) => current.openDuplicateReview(saveId),
  findSimilarColor: (color) => current.findSimilarColor(color),
  setVisualProbe: (input) => current.setVisualProbe(input),
  foldersForSave: (id) => current.foldersForSave(id),
  foldersSnapshot: () => current.foldersSnapshot(),
  lastUsedFolderId: () => current.lastUsedFolderId(),
  rememberFolderDestinations: (ids) => current.rememberFolderDestinations(ids),
  refreshFolders: () => current.refreshFolders(),
  startEditingFolder: (id) => current.startEditingFolder(id),
  saveFolderPresentation: (folderId, patch) =>
    current.saveFolderPresentation(folderId, patch),
};
