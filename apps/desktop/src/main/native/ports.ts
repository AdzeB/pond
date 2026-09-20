import { app } from "electron";
import { attachCaptureCookies, captures } from "../core/captures";
import { assertLibraryUnlocked } from "../core/security/app-lock-runtime";
import { lockedFolderIds } from "../core/security/folder-passwords";
import { enqueue, libraryInfo, sessionImport, sessionPending } from "../ops";
import type { NativePorts } from "./rpc";

export function liveNativePorts(): NativePorts {
  return {
    authorize: (requestType) => {
      if (requestType !== "capture.accept") assertLibraryUnlocked();
    },
    capture: async (draft, cookies) => {
      if (cookies?.length) attachCaptureCookies(draft.id, cookies);
      return captures.accept(draft);
    },
    enqueue: (url, opts) => enqueue(url, opts),
    libraryInfo,
    foldersList: async () => {
      const { listFolders } = await import("../core/folders");
      const hidden = await lockedFolderIds();
      return (await listFolders())
        .filter((folder) => !hidden.has(folder.id))
        .map((folder) => ({
          id: folder.id,
          name: folder.name,
        }));
    },
    sessionPending,
    sessionImport,
    appVersion: () => app.getVersion(),
  };
}
