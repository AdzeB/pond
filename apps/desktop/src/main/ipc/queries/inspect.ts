import { basename } from "node:path";
import { z } from "zod";
import { LibraryQueryRequestSchema } from "../../../shared/library-query";
import {
  closeCaptureWindow,
  configurePreviewWindow,
  openCaptureWindow,
  openCollectionWindow,
  openPreviewWindow,
  previewWindowQuery,
} from "../../aux-windows";
import { readAutoImportLog, startAutoImport } from "../../core/auto-import";
import { saveCropCopy } from "../../core/crop-copy";
import { queryLibraryIds } from "../../core/library-query";
import { getPrefs, setPrefs } from "../../core/prefs";
import {
  captureArea,
  captureDisplay,
  captureWindow,
} from "../../core/screenshot";
import { getDb } from "../../db";
import { probeVideoDims } from "../../lib/video-dims";
import { resolvePaths } from "../../paths";
import { resolveSaveFilePath } from "../helpers";
import {
  NumberParam,
  type QueryHandlerMap,
  query,
  StringParam,
} from "./params";

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
      const result = await probeVideoDims(target.path);
      return { frameRate: result?.frameRate ?? null };
    },
  ),
  "preview.configure": query(
    z.object({
      pinned: z.boolean().optional(),
      opacity: z.number().min(0.2).max(1).optional(),
      fit: z
        .object({
          width: z.number().positive().max(100000),
          height: z.number().positive().max(100000),
        })
        .optional(),
    }),
    (params, event) => configurePreviewWindow(event?.sender.id ?? -1, params),
  ),
  "preview.pin": query(
    z.object({
      id: StringParam,
      navigation: LibraryQueryRequestSchema.optional(),
    }),
    async (params) => {
      if (!params.id) return { ok: false };
      await openPreviewWindow(params.id, params.navigation);
      return { ok: true };
    },
  ),
  "preview.neighbor": query(
    z.object({
      id: StringParam,
      delta: z.union([z.literal(-1), z.literal(1)]),
    }),
    async (params, event) => {
      const session = previewWindowQuery(event?.sender.id ?? -1);
      if (!session || session.libraryRoot !== resolvePaths().libraryRoot)
        return { id: null };
      const db = await getDb();
      const manual =
        session.query.sortKey === "manual" && session.query.orderFolderId
          ? ((await getPrefs()).folderViews[session.query.orderFolderId]
              ?.manualOrder ?? [])
          : [];
      if (session.libraryRoot !== resolvePaths().libraryRoot)
        return { id: null };
      const result = await queryLibraryIds(
        db,
        basename(resolvePaths().indexDb, ".db"),
        session.query,
        manual,
      );
      if (session.libraryRoot !== resolvePaths().libraryRoot)
        return { id: null };
      const index = result.ids.indexOf(params.id);
      return {
        id: index < 0 ? null : (result.ids[index + params.delta] ?? null),
      };
    },
  ),

  async "collection.open"() {
    await openCollectionWindow();
    return { ok: true };
  },

  async "capture.screenshot"() {
    return captureDisplay();
  },

  async "capture.display"() {
    return captureDisplay();
  },

  async "capture.window"() {
    return captureWindow();
  },

  async "capture.selectArea"() {
    await openCaptureWindow();
    return { ok: true };
  },

  "capture.area": query(
    z.object({
      x: NumberParam,
      y: NumberParam,
      width: NumberParam,
      height: NumberParam,
    }),
    async (params) => {
      if (
        !Number.isFinite(params.width) ||
        !Number.isFinite(params.height) ||
        params.width < 2 ||
        params.height < 2
      ) {
        closeCaptureWindow();
        return { ok: false, error: "too_small" };
      }
      return captureArea(params);
    },
  ),

  async "capture.cancel"() {
    closeCaptureWindow();
    return { ok: true };
  },

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
