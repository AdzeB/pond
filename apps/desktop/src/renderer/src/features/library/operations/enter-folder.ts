import { libraryChrome } from "@/features/library/state/library-chrome";
import { resetFilters } from "@/features/library/state/view-store";
import { getAppRouter } from "@/shared/lib/app-router";

export interface FolderUnlockRequest {
  hint: string | null;
  targetId: string;
  unlockId: string;
}

export async function enterFolder(
  folderId: string,
  onUnlockRequired: (request: FolderUnlockRequest) => void,
): Promise<void> {
  const status = await window.pond.query("folders.security.status", {
    folderId,
  });
  if (!status.locked) {
    resetFilters();
    libraryChrome.setNav({ kind: "folder", id: folderId });
    getAppRouter()?.history.push("/");
    return;
  }
  if (status.unlockFolderId) {
    onUnlockRequired({
      hint: status.hint,
      targetId: folderId,
      unlockId: status.unlockFolderId,
    });
  }
}
