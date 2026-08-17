import { existsSync } from "node:fs";
import { sep as pathSep, resolve as resolvePath } from "node:path";
import { saves } from "@pond/schema/db";
import { eq } from "drizzle-orm";
import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import log from "electron-log/main.js";
import { POND_PROTOCOL } from "../../shared/constants";
import { getDb } from "../db";
import { itemFile, itemsRoot } from "../paths";
import { toWireSave } from "./wire";

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? "";
  if (!url) return false;
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl && url.startsWith(devUrl)) return true;
  if (url.startsWith("file://")) return true;
  if (url.startsWith("pond://")) return true;
  return false;
}

function isInsideLibrary(absolute: string): boolean {
  const root = resolvePath(itemsRoot());
  return absolute === root || absolute.startsWith(root + pathSep);
}

export function safeHandle<Args extends unknown[], R>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => R,
  bus: IpcMain = ipcMain,
): void {
  bus.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) {
      log.warn(
        "[pond ipc] rejected untrusted sender",
        channel,
        event.senderFrame?.url ?? "<no url>",
      );
      throw new Error("untrusted sender");
    }
    return handler(event, ...(args as Args));
  });
}

export async function resolveSaveFilePath(
  id: string,
  fileIndex: number | undefined,
): Promise<
  | { ok: true; path: string }
  | {
      ok: false;
      reason:
        | "not_found"
        | "no_files"
        | "out_of_range"
        | "missing"
        | "unsafe_path";
    }
> {
  try {
    const db = await getDb();
    const rows = await db.select().from(saves).where(eq(saves.id, id));
    const row = rows[0];
    if (!row) return { ok: false, reason: "not_found" };

    const files = toWireSave(row).files ?? [];
    if (files.length === 0) return { ok: false, reason: "no_files" };

    const idx = typeof fileIndex === "number" ? fileIndex : 0;
    const file = files[idx];
    if (!file) return { ok: false, reason: "out_of_range" };

    const absolute = resolvePath(itemFile(id, file.path));
    if (!isInsideLibrary(absolute)) {
      log.warn("[pond ipc] refused path outside library", { id, absolute });
      return { ok: false, reason: "unsafe_path" };
    }
    if (!existsSync(absolute)) return { ok: false, reason: "missing" };
    return { ok: true, path: absolute };
  } catch (err) {
    log.warn("[pond ipc] resolveSaveFilePath failed", err);
    return { ok: false, reason: "not_found" };
  }
}

export function resolvePondItemPath(
  src: string,
): { saveId: string; path: string } | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== `${POND_PROTOCOL}:`) return null;
  const saveId = url.hostname;
  const file = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!saveId || !file) return null;
  const absolute = resolvePath(itemFile(saveId, file));
  if (!isInsideLibrary(absolute)) {
    log.warn("[pond ipc] refused pond URL outside library", { src, absolute });
    return null;
  }
  if (!existsSync(absolute)) return null;
  return { saveId, path: absolute };
}

type QueryParams = Record<string, unknown>;
export type QueryHandler = (
  params: QueryParams,
  event?: IpcMainInvokeEvent,
) => Promise<unknown> | unknown;
export type QueryHandlerMap = Record<string, QueryHandler>;
