import { z } from "zod";
import { readAutoImportLog, startAutoImport } from "../../core/auto-import";
import { saveCropCopy } from "../../core/crop-copy";
import { applyImageTransformToFile } from "../../core/image-transform";
import { getPrefs, setPrefs } from "../../core/prefs";
import { withDecryptedLibraryMediaPath } from "../../core/security/library-media-storage";
import { probeVideoDims } from "../../lib/video-dims";
import { resolveSaveFilePath } from "../helpers";
import { type QueryHandlerMap, query } from "./params";

export const inspectQueries = {
  "saves.cropAsCopy": query(
    z.object({
      id: z.string().min(1),
      fileIndex: z.number().int().nonnegative(),
      frameIndex: z.number().int().nonnegative().optional(),
      crop: z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        w: z.number().positive().max(1),
        h: z.number().positive().max(1),
      }),
    }),
    saveCropCopy,
  ),
  "saves.mediaTiming": query(
    z.object({
      id: z.string().min(1),
      fileIndex: z.number().int().nonnegative(),
    }),
    async (params) => {
      const target = await resolveSaveFilePath(params.id, params.fileIndex);
      if (!target.ok) return { frameRate: null };
      const result = await withDecryptedLibraryMediaPath(
        target.path,
        probeVideoDims,
      );
      return { frameRate: result?.frameRate ?? null };
    },
  ),
  "saves.applyImageTransform": query(
    z.object({
      id: z.string().min(1),
      fileIndex: z.number().int().nonnegative(),
      rotate: z
        .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
        .optional(),
      flipX: z.boolean().optional(),
      flipY: z.boolean().optional(),
      crop: z
        .object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          w: z.number().positive().max(1),
          h: z.number().positive().max(1),
        })
        .nullable()
        .optional(),
    }),
    applyImageTransformToFile,
  ),
  async "autoImport.status"() {
    const prefs = await getPrefs();
    const log = await readAutoImportLog();
    return { ...prefs.autoImport, history: log.entries };
  },

  "autoImport.set": query(
    z.object({
      enabled: z.boolean().optional(),
      path: z.string().optional(),
      mode: z.enum(["copy", "move"]).optional(),
    }),
    async (params) => {
      await setPrefs({ autoImport: params });
      await startAutoImport();
      return { ok: true };
    },
  ),

  async "autoImport.pickFolder"() {
    const { dialog, BrowserWindow } = await import("electron");
    const win = BrowserWindow.getFocusedWindow();
    const result = win
      ? await dialog.showOpenDialog(win, {
          properties: ["openDirectory"],
          message: "Choose a folder to watch",
        })
      : await dialog.showOpenDialog({
          properties: ["openDirectory"],
          message: "Choose a folder to watch",
        });
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, path: null };
    }
    await setPrefs({
      autoImport: { enabled: true, path: result.filePaths[0] },
    });
    await startAutoImport();
    return { ok: true, path: result.filePaths[0] };
  },
} satisfies QueryHandlerMap;
