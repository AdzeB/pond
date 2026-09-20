import { z } from "zod";
import {
  captureDesktopScreenshot,
  listDesktopScreenshotSources,
} from "../../core/desktop-screenshot";
import {
  NullableStringParam,
  type QueryHandlerMap,
  query,
  StringParam,
} from "./params";

export const savesImportDesktopQueries = {
  "saves.desktopScreenshotSources": query(z.object({}), async () => ({
    sources: await listDesktopScreenshotSources(),
  })),
  "saves.captureDesktopScreenshot": query(
    z.object({
      sourceId: StringParam,
      folderId: NullableStringParam,
      title: NullableStringParam,
      notes: NullableStringParam,
      tags: z.array(z.string()).optional(),
      rating: z.number().min(0).max(5).optional(),
      format: z.enum(["png", "jpeg", "webp"]).optional(),
      quality: z.number().int().min(1).max(100).optional(),
      crop: z
        .object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          width: z.number().positive().max(1),
          height: z.number().positive().max(1),
        })
        .nullable()
        .optional(),
      copyToClipboard: z.boolean().optional(),
    }),
    (params) => captureDesktopScreenshot(params),
  ),
} satisfies QueryHandlerMap;
