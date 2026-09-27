import { ScreenshotPrefsSchema } from "@pond/schema/db";
import { z } from "zod";
import { readAutoImportLog, startAutoImport } from "../../core/auto-import";
import { saveCropCopy } from "../../core/crop-copy";
import { applyImageTransformToFile } from "../../core/image-transform";
import { getPrefs, setPrefs } from "../../core/prefs";
import { screenshotCapture } from "../../core/screenshot-capture";
import {
  readScreenshotIntakeLog,
  startScreenshotIntake,
} from "../../core/screenshot-intake";
import {
  launchScreenshotTool,
  listScreenshotTools,
} from "../../core/screenshot-tools";
import {
  beginScreenshot,
  finishScreenshot,
} from "../../core/screenshot-window";
import { withDecryptedLibraryMediaPath } from "../../core/storage/library-media-storage";
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

  "screenshots.capture": query(
    z.object({ mode: z.enum(["area", "window", "screen"]) }),
    ({ mode }) => beginScreenshot(mode),
  ),
  "screenshots.finish": query(
    z.object({
      token: z.string().uuid(),
      title: z.string().max(255).optional(),
      notes: z.string().max(8192).optional(),
      tags: z.array(z.string()).optional(),
      folderId: z.string().nullable().optional(),
      rating: z.number().int().min(0).max(5).optional(),
    }),
    (input) => finishScreenshot(input),
  ),
  "screenshots.discard": query(
    z.object({ token: z.string().uuid() }),
    ({ token }) => {
      screenshotCapture.discard(token);
      return { ok: true };
    },
  ),
  async "screenshots.status"() {
    const prefs = await getPrefs();
    const history = await readScreenshotIntakeLog();
    return {
      ...prefs.screenshots,
      tools: listScreenshotTools(),
      history: history.entries,
    };
  },

  "screenshots.set": query(ScreenshotPrefsSchema.partial(), async (params) => {
    await setPrefs({ screenshots: params });
    await startScreenshotIntake();
    return { ok: true };
  }),

  async "screenshots.pickFolder"() {
    const { dialog, BrowserWindow } = await import("electron");
    const win = BrowserWindow.getFocusedWindow();
    const result = win
      ? await dialog.showOpenDialog(win, {
          properties: ["openDirectory"],
          message: "Choose a screenshot folder to watch",
        })
      : await dialog.showOpenDialog({
          properties: ["openDirectory"],
          message: "Choose a screenshot folder to watch",
        });
    return {
      ok: !result.canceled && Boolean(result.filePaths[0]),
      path: result.filePaths[0] ?? null,
    };
  },

  async "screenshots.launch"() {
    const prefs = await getPrefs();
    return launchScreenshotTool(prefs.screenshots.tool);
  },
} satisfies QueryHandlerMap;
