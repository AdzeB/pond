import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import {
  BrowserWindow,
  clipboard,
  dialog,
  type NativeImage,
  nativeImage,
} from "electron";
import { getDb } from "../../db";
import { extractFrameAt } from "../../lib/ffmpeg-frame";
import { itemDir, itemFile } from "../../paths";
import { type QueryHandlerMap, resolvePondItemPath } from "../helpers";
import { toWireSave } from "../wire";

async function frameImage(
  resolved: { path: string } | null,
  timeSec: unknown,
): Promise<NativeImage | null> {
  if (!resolved) return null;
  const frame = await extractFrameAt(resolved.path, Number(timeSec));
  if (!frame) return null;
  try {
    const img = nativeImage.createFromBuffer(await readFile(frame.path));
    return img.isEmpty() ? null : img;
  } finally {
    await frame.cleanup();
  }
}

export const videoQueries: QueryHandlerMap = {
  async "video.copyFrame"(params) {
    const img = await frameImage(
      resolvePondItemPath(String(params.src ?? "")),
      params.timeSec,
    );
    if (!img) return { ok: false };
    clipboard.writeImage(img);
    return { ok: true };
  },

  async "video.saveFrame"(params, event) {
    const resolved = resolvePondItemPath(String(params.src ?? ""));
    if (!resolved) return { ok: false };
    const win = event
      ? (BrowserWindow.fromWebContents(event.sender) ?? undefined)
      : undefined;
    const result = await dialog.showSaveDialog({
      ...(win ? { browserWindow: win } : {}),
      defaultPath: `frame-${Date.now()}.png`,
      filters: [{ name: "Images", extensions: ["png"] }],
    } as Electron.SaveDialogOptions);
    if (result.canceled || !result.filePath) return { ok: false };
    const img = await frameImage(resolved, params.timeSec);
    if (!img) return { ok: false };
    await writeFile(result.filePath, img.toPNG());
    return { ok: true, path: result.filePath };
  },

  async "video.setThumbnail"(params) {
    const saveId = String(params.saveId ?? "");
    if (!saveId) return { ok: false };
    const resolved = resolvePondItemPath(String(params.src ?? ""));
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

  async "video.copyFilePath"(params) {
    const db = await getDb();
    const saveId = String(params.saveId ?? "");
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
};
