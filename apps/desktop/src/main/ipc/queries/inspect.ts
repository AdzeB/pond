import { z } from "zod";
import {
  closeCaptureWindow,
  openCaptureWindow,
  openCollectionWindow,
  openPreviewWindow,
} from "../../aux-windows";
import { readAutoImportLog, startAutoImport } from "../../core/auto-import";
import { getPrefs, setPrefs } from "../../core/prefs";
import {
  captureArea,
  captureDisplay,
  captureWindow,
} from "../../core/screenshot";
import {
  NumberParam,
  type QueryHandlerMap,
  query,
  StringParam,
} from "./params";

export const inspectQueries: QueryHandlerMap = {
  "preview.pin": query(z.object({ id: StringParam }), async (params) => {
    if (!params.id) return { ok: false };
    await openPreviewWindow(params.id);
    return { ok: true };
  }),

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
};
