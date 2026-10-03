import { readFile, writeFile } from "node:fs/promises";
import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import {
  ClipboardItem,
  clipboard,
  dialog,
  type NativeImage,
  nativeImage,
} from "electron";
import { z } from "zod";
import { persistSaveThumbnail } from "../../core/save-thumbnail";
import {
  materializeLibraryMediaForExternalUse,
  withDecryptedLibraryMediaPath,
} from "../../core/storage/library-media-storage";
import { ensureVideoPreviewProxy } from "../../core/video-preview-proxy";
import { getDb } from "../../db";
import { extractFrameAt, extractSampledFrames } from "../../lib/ffmpeg-frame";
import { itemFile } from "../../paths";
import { resolvePondItemPath } from "../helpers";
import { toWireSave } from "../wire";
import {
  NumberParam,
  type QueryHandlerMap,
  query,
  StringParam,
} from "./params";

async function frameImage(
  resolved: { path: string } | null,
  timeSec: number,
): Promise<NativeImage | null> {
  if (!resolved) return null;
  const frame = await withDecryptedLibraryMediaPath(resolved.path, (path) =>
    extractFrameAt(path, timeSec),
  );
  if (!frame) return null;
  try {
    const img = nativeImage.createFromBuffer(await readFile(frame.path));
    return img.isEmpty() ? null : img;
  } finally {
    await frame.cleanup();
  }
}

const FrameParams = z.object({ src: StringParam, timeSec: NumberParam });
const SampleFramesParams = z.object({
  src: StringParam,
  maxFrames: z.number().int().min(3).max(12),
});

export const videoQueries = {
  "video.preparePreview": query(
    z.object({ src: StringParam }),
    async ({ src }) => ensureVideoPreviewProxy(src),
  ),

  "video.sampleFrames": query(SampleFramesParams, async (params) => {
    const resolved = resolvePondItemPath(params.src);
    if (!resolved) return { ok: false, frames: [] };
    const sampled = await withDecryptedLibraryMediaPath(resolved.path, (path) =>
      extractSampledFrames(path, params.maxFrames),
    );
    if (!sampled) return { ok: false, frames: [] };
    try {
      const frames = await Promise.all(
        sampled.frames.map(async (frame) => ({
          bytes: Uint8Array.from(await readFile(frame.path)),
          mimeType: frame.mimeType,
        })),
      );
      return { ok: true, frames };
    } finally {
      await sampled.cleanup();
    }
  }),

  "video.copyFrame": query(FrameParams, async (params) => {
    const img = await frameImage(
      resolvePondItemPath(params.src),
      params.timeSec,
    );
    if (!img) return { ok: false };
    await clipboard.write([
      new ClipboardItem({
        "image/png": new Blob([Uint8Array.from(img.toPNG())], {
          type: "image/png",
        }),
      }),
    ]);
    return { ok: true };
  }),

  "video.saveFrame": query(FrameParams, async (params) => {
    const resolved = resolvePondItemPath(params.src);
    if (!resolved) return { ok: false };
    const result = await dialog.showSaveDialog({
      defaultPath: `frame-${Date.now()}.png`,
      filters: [{ name: "Images", extensions: ["png"] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };
    const img = await frameImage(resolved, params.timeSec);
    if (!img) return { ok: false };
    await writeFile(result.filePath, img.toPNG());
    return { ok: true, path: result.filePath };
  }),

  "video.setThumbnail": query(
    FrameParams.extend({ saveId: StringParam }),
    async (params) => {
      const saveId = params.saveId;
      if (!saveId) return { ok: false };
      const resolved = resolvePondItemPath(params.src);
      if (!resolved || resolved.saveId.toLowerCase() !== saveId.toLowerCase()) {
        return { ok: false };
      }
      const img = await frameImage(resolved, params.timeSec);
      if (!img) return { ok: false };
      const ok = await persistSaveThumbnail(
        saveId,
        img.toPNG(),
        "user:set-video-thumbnail",
      );
      return { ok };
    },
  ),

  "video.copyFilePath": query(
    z.object({ saveId: StringParam }),
    async (params) => {
      const db = await getDb();
      const saveId = params.saveId;
      if (!saveId) return { ok: false };
      const rows = await db.select().from(saves).where(eq(saves.id, saveId));
      const save = rows[0];
      if (!save) return { ok: false };
      const wire = toWireSave(save);
      const f = wire.files[0];
      if (!f) return { ok: false };
      await clipboard.writeText(
        await materializeLibraryMediaForExternalUse(itemFile(saveId, f.path)),
      );
      return { ok: true };
    },
  ),
} satisfies QueryHandlerMap;
