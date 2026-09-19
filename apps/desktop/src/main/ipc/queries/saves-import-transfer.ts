import { dialog } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import { importFiles } from "../../core/import-files";
import { importPondPackage } from "../../core/pond-package";
import { runTransferJob } from "../../core/transfer-jobs";
import { copySaveSelectionToLibrary } from "../../core/transfer-operations";
import { libraryRoot } from "../../paths";
import { resolveSaveFilePath } from "../helpers";
import { pickImportPaths } from "./import-picker";
import {
  FileIndexParam,
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";

export const savesImportTransferQueries = {
  "saves.copyToLibrary": query(
    z.object({ ids: StringListParam }),
    async ({ ids }) => {
      const picked = await dialog.showOpenDialog({
        title: "Copy to Library",
        buttonLabel: "Copy",
        properties: ["openDirectory", "openFile"],
      });
      const target = picked.filePaths[0];
      if (picked.canceled || !target) return { ok: false, error: "canceled" };
      try {
        return {
          ok: true,
          ...(await runTransferJob(
            {
              kind: "copy_library",
              origin: libraryRoot(),
              destination: target,
              ids,
            },
            () => copySaveSelectionToLibrary(ids, target),
          )),
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Could not copy Saves.",
        };
      }
    },
  ),

  async "saves.importPackage"() {
    const picked = await dialog.showOpenDialog({
      title: "Import Pond Package",
      buttonLabel: "Import",
      properties: ["openDirectory", "openFile"],
    });
    if (picked.canceled || !picked.filePaths[0]) {
      return { ok: false, error: "canceled" };
    }
    try {
      const source = picked.filePaths[0];
      return {
        ok: true,
        ...(await runTransferJob(
          {
            kind: "import_package",
            origin: libraryRoot(),
            source,
            destination: libraryRoot(),
          },
          () => importPondPackage(source),
        )),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Package import failed.",
      };
    }
  },

  "saves.pickImportPaths": query(
    z.object({ kind: z.enum(["files", "folders"]) }),
    (params) => pickImportPaths(params.kind),
  ),

  "saves.importFiles": query(
    z.object({
      paths: StringListParam,
      tags: StringListParam,
      folderIds: StringListParam,
    }),
    async (params) => {
      const paths = params.paths.filter(Boolean);
      if (paths.length === 0) return { ok: false, error: "no_files" };
      return importFiles({
        paths,
        tags: params.tags,
        folderIds: params.folderIds,
      });
    },
  ),

  "saves.startDrag": query(
    z.object({
      id: StringParam,
      ids: StringListParam,
      fileIndex: FileIndexParam,
    }),
    async (params, event) => {
      const ids = [
        ...new Set(
          (params.ids.length > 0 ? params.ids : [params.id]).filter(Boolean),
        ),
      ];
      if (ids.length === 0 || !event) return { ok: false };
      const files: string[] = [];
      for (const id of ids) {
        const target = await resolveSaveFilePath(id, params.fileIndex);
        if (target.ok) files.push(target.path);
      }
      if (files.length === 0) return { ok: false };
      try {
        const { nativeImage } = await import("electron");
        const first = files[0] ?? "";
        let icon = nativeImage.createFromPath(first);
        if (icon.isEmpty()) icon = nativeImage.createEmpty();
        else icon = icon.resize({ width: 72, height: 72, quality: "better" });
        if (files.length === 1) {
          event.sender.startDrag({ file: first, icon });
        } else {
          event.sender.startDrag({ file: first, files, icon });
        }
        return { ok: true };
      } catch (error) {
        log.warn("[pond ipc] startDrag failed", error);
        return { ok: false };
      }
    },
  ),
} satisfies QueryHandlerMap;
