import { pathToFileURL } from "node:url";
import { ClipboardItem, clipboard, nativeImage } from "electron";
import log from "electron-log/main.js";
import { z } from "zod";
import { resolveSaveFilePath } from "../helpers";
import {
  FileIndexParam,
  type QueryHandlerMap,
  query,
  StringParam,
} from "./params";

const FileParams = z.object({ id: StringParam, fileIndex: FileIndexParam });

async function writeFileRefsToClipboard(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await clipboard.write([
    new ClipboardItem({
      "text/plain": paths.join("\n"),
      "text/uri-list": paths
        .map((path) => pathToFileURL(path).href)
        .join("\r\n"),
    }),
  ]);
}

export const savesClipboardQueries = {
  "saves.copyImage": query(FileParams, async (params) => {
    if (!params.id) return { ok: false as const, reason: "not_found" as const };
    const target = await resolveSaveFilePath(params.id, params.fileIndex);
    if (!target.ok) return target;
    try {
      const image = nativeImage.createFromPath(target.path);
      if (image.isEmpty())
        return { ok: false as const, reason: "missing" as const };
      await clipboard.write([
        new ClipboardItem({
          "image/png": new Blob([Uint8Array.from(image.toPNG())], {
            type: "image/png",
          }),
        }),
      ]);
      return { ok: true as const };
    } catch (error) {
      log.warn("[pond ipc] saves.copyImage failed", error);
      return { ok: false as const, reason: "internal_error" as const };
    }
  }),

  "saves.copyFile": query(FileParams, async (params) => {
    if (!params.id) return { ok: false as const, reason: "not_found" as const };
    const target = await resolveSaveFilePath(params.id, params.fileIndex);
    if (!target.ok) return target;
    try {
      await writeFileRefsToClipboard([target.path]);
      return { ok: true as const };
    } catch (error) {
      log.warn("[pond ipc] saves.copyFile failed", error);
      return { ok: false as const, reason: "internal_error" as const };
    }
  }),

  "saves.copyFiles": query(
    z.object({
      files: z.array(FileParams.catch({ id: "", fileIndex: 0 })).catch([]),
    }),
    async (params) => {
      if (params.files.length === 0)
        return { ok: false as const, reason: "not_found" as const };
      const paths: string[] = [];
      for (const entry of params.files) {
        if (!entry.id) continue;
        const target = await resolveSaveFilePath(entry.id, entry.fileIndex);
        if (target.ok) paths.push(target.path);
      }
      if (paths.length === 0)
        return { ok: false as const, reason: "missing" as const };
      try {
        await writeFileRefsToClipboard(paths);
        return { ok: true as const, copied: paths.length };
      } catch (error) {
        log.warn("[pond ipc] saves.copyFiles failed", error);
        return { ok: false as const, reason: "internal_error" as const };
      }
    },
  ),

  /** Renderer clipboard access can fail after a closing menu steals focus. */
  "clipboard.writeText": query(
    z.object({ text: StringParam }),
    async (params) => {
      if (!params.text) return { ok: false as const };
      try {
        await clipboard.writeText(params.text);
        return { ok: true as const };
      } catch (error) {
        log.warn("[pond ipc] clipboard.writeText failed", error);
        return { ok: false as const };
      }
    },
  ),
} satisfies QueryHandlerMap;
