import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import { clipboard, dialog, type NativeImage, nativeImage } from "electron";
import { z } from "zod";
import { getDb } from "../../db";
import { extractFrameAt } from "../../lib/ffmpeg-frame";
import { itemDir, itemFile } from "../../paths";
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
  const frame = await extractFrameAt(resolved.path, timeSec);
  if (!frame) return null;
  try {
    const img = nativeImage.createFromBuffer(await readFile(frame.path));
    return img.isEmpty() ? null : img;
  } finally {
    await frame.cleanup();
  }
}

const FrameParams = z.object({ src: StringParam, timeSec: NumberParam });

export const videoQueries: QueryHandlerMap = {
  "video.copyFrame": query(FrameParams, async (params) => {
    const img = await frameImage(
      resolvePondItemPath(params.src),
      params.timeSec,
    );
    if (!img) return { ok: false };
    clipboard.writeImage(img);
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
      const thumbDir = resolvePath(itemDir(saveId));
      await mkdir(thumbDir, { recursive: true });
      const thumbPath = resolvePath(thumbDir, "thumb.png");
      await writeFile(thumbPath, img.toPNG());
      return { ok: true };
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
      clipboard.writeText(itemFile(saveId, f.path));
      return { ok: true };
    },
  ),
};
