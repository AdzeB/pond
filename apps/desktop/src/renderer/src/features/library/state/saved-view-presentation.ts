import type { Prefs } from "@pond/schema";
import { loadPrefs, savePrefsSection } from "@/shared/state/prefs";

export type SavedViewPresentation = Prefs["savedViewViews"][string];

let queue = Promise.resolve();

export function saveSavedViewPresentation(
  id: string,
  patch: Partial<SavedViewPresentation>,
): Promise<void> {
  const operation = queue.then(async () => {
    const prefs = await loadPrefs();
    await savePrefsSection("savedViewViews", {
      [id]: { ...prefs.savedViewViews[id], ...patch },
    });
  });
  queue = operation.catch(() => {});
  return operation;
}
