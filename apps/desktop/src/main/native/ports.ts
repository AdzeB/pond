import { app } from "electron";
import { attachCaptureCookies, captures } from "../core/captures";
import { enqueue, libraryInfo, sessionImport, sessionPending } from "../ops";
import type { NativePorts } from "./rpc";

export function liveNativePorts(): NativePorts {
  return {
    capture: async (draft, cookies) => {
      if (cookies?.length) attachCaptureCookies(draft.id, cookies);
      return captures.accept(draft);
    },
    captureStatus: (id) => captures.status(id),
    enqueue: (url, opts) => enqueue(url, opts),
    libraryInfo,
    foldersList: async () => {
      const { listFolders } = await import("../core/folders");
      return (await listFolders()).map((folder) => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        color: folder.color,
      }));
    },
    tagsList: async () => {
      const { listTags } = await import("../core/tags");
      return (await listTags())
        .filter((tag) => !tag.archived)
        .map((tag) => ({
          name: tag.name,
          starred: tag.starred,
          usageCount: tag.usageCount,
          lastUsedAt: tag.lastUsedAt?.getTime() ?? null,
        }));
    },
    sessionPending,
    sessionImport,
    appVersion: () => app.getVersion(),
  };
}
