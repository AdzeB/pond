import type { Prefs } from "@pond/schema";
import { loadPrefs, savePrefsSection } from "@/shared/state/prefs";
export type FolderPresentation = Prefs["folderViews"][string];
const defaults: FolderPresentation = {
  layout: "waterfall",
  sortKey: "savedAt",
  sortDir: "desc",
  zoom: 130,
  includeSubfolders: true,
  randomSeed: "pond",
  manualOrder: [],
  pinnedIds: [],
  coverSaveId: null,
};
let queue = Promise.resolve();
export function saveFolderPresentation(
  id: string,
  patch: Partial<FolderPresentation>,
): Promise<void> {
  const operation = queue.then(async () => {
    const prefs = await loadPrefs();
    await savePrefsSection("folderViews", {
      [id]: { ...defaults, ...prefs.folderViews[id], ...patch },
    });
  });
  queue = operation.catch(() => {});
  return operation;
}
