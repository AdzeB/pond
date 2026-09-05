import { z } from "zod";
import {
  NullableStringParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";

export const foldersQueries = {
  "folders.list": query(z.object({}), async () => {
    const { listFolders } = await import("../../core/folders");
    return await listFolders();
  }),
  "folders.create": query(
    z.object({
      name: StringParam,
      parentId: NullableStringParam,
      color: NullableStringParam,
    }),
    async (params) => {
      const { createFolder } = await import("../../core/folders");
      return await createFolder(params);
    },
  ),
  "folders.rename": query(
    z.object({ id: StringParam, name: StringParam }),
    async (params) => {
      const { renameFolder } = await import("../../core/folders");
      return await renameFolder(params.id, params.name);
    },
  ),
  "folders.delete": query(z.object({ id: StringParam }), async (params) => {
    const { deleteFolder } = await import("../../core/folders");
    return await deleteFolder(params.id);
  }),
  "folders.memberships": query(z.object({}), async () => {
    const { memberships } = await import("../../core/folders");
    return await memberships();
  }),
  "folders.setSaveFolders": query(
    z.object({ saveId: StringParam, folderIds: StringListParam }),
    async (params) => {
      const { setSaveFolders } = await import("../../core/folders");
      return await setSaveFolders(params.saveId, params.folderIds);
    },
  ),
  "folders.addSaves": query(
    z.object({ folderId: StringParam, saveIds: StringListParam }),
    async (params) => {
      const { addSavesToFolder } = await import("../../core/folders");
      return await addSavesToFolder(params.folderId, params.saveIds);
    },
  ),
} satisfies QueryHandlerMap;
