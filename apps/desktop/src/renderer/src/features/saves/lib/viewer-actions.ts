import type { Prefs } from "@pond/schema/db";
import { openSave } from "@/features/saves/lib/save-nav";
import { selectOnlySave } from "@/features/saves/lib/select";
import { pool } from "@/features/saves/state/pool";
import { requestQuickPreview } from "@/features/saves/state/quick-preview";
import { notify } from "@/shared/lib/toast";

type ViewerAction = Prefs["viewer"]["doubleClickAction"];

export function imageFileIndex(saveId: string): number | null {
  const save = pool.get(saveId);
  if (!save) return null;
  const index = save.files.findIndex(
    (file) =>
      file.mimeType?.startsWith("image/") ||
      /\.(avif|gif|jpe?g|png|webp)$/i.test(file.path),
  );
  return index < 0 ? null : index;
}

export function runViewerAction(saveId: string, action: ViewerAction): void {
  if (action === "none") return;
  if (action === "open") {
    openSave(saveId);
    return;
  }
  selectOnlySave(saveId);
  if (action === "preview") {
    requestQuickPreview(saveId);
    return;
  }
  const fileIndex = imageFileIndex(saveId);
  if (fileIndex === null) {
    notify({
      id: "preview-window",
      title: "This Save doesn’t contain an image",
    });
    return;
  }
  void window.pond
    .openPreviewWindow({
      saveId,
      fileIndex,
      kind: action,
    })
    .catch((error) =>
      notify({
        id: "preview-window",
        title: "Couldn’t open this image",
        description: error instanceof Error ? error.message : "Try again.",
      }),
    );
}
