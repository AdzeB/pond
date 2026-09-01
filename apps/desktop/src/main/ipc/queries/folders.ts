import { z } from "zod";
import { type QueryHandlerMap, query } from "./params";

const Params = z.looseObject({});

export const foldersQueries: QueryHandlerMap = {
  "folders.list": query(Params, async () => {
    const { listFolders } = await import("../../core/folders");
    return await listFolders();
  }),

  "folders.create": query(Params, async (params) => {
    const { createFolder } = await import("../../core/folders");
    return await createFolder({
      name: String(params.name ?? ""),
      parentId: params.parentId == null ? null : String(params.parentId),
      color: params.color == null ? null : String(params.color),
    });
  }),

  "folders.rename": query(Params, async (params) => {
    const { renameFolder } = await import("../../core/folders");
    return await renameFolder(
      String(params.id ?? ""),
      String(params.name ?? ""),
    );
  }),

  "folders.delete": query(Params, async (params) => {
    const { deleteFolder } = await import("../../core/folders");
    return await deleteFolder(String(params.id ?? ""));
  }),

  "folders.memberships": query(Params, async () => {
    const { memberships } = await import("../../core/folders");
    return await memberships();
  }),

  "folders.setSaveFolders": query(Params, async (params) => {
    const { setSaveFolders } = await import("../../core/folders");
    const folderIds = Array.isArray(params.folderIds)
      ? params.folderIds.map((id) => String(id))
      : [];
    return await setSaveFolders(String(params.saveId ?? ""), folderIds);
  }),

  "folders.addSaves": query(Params, async (params) => {
    const { addSavesToFolder } = await import("../../core/folders");
    const saveIds = Array.isArray(params.saveIds)
      ? params.saveIds.map((id) => String(id))
      : [];
    return await addSavesToFolder(String(params.folderId ?? ""), saveIds);
  }),
};
