import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow, clipboard, dialog } from "electron";
import log from "electron-log/main.js";
import { importEagleLibrary } from "../../core/eagle-import";
import { createManualSave } from "../../core/manual-import";
import { persistSave } from "../../core/persist-save";
import { enqueue, normalizeUrl } from "../../core/pipeline/enqueue";
import { classifyUrlToSource } from "../../core/pipeline/extractors";
import { UnsupportedError } from "../../core/pipeline/extractors/errors";
import { setSaveTags } from "../../core/tags";
import { walkImportPaths } from "../../core/walk-import-paths";
import { type QueryHandlerMap, resolveSaveFilePath } from "../helpers";

async function importFilesImpl(
  paths: string[],
): Promise<{ ok: boolean; ids: string[]; error?: string }> {
  const files = await walkImportPaths(paths);
  if (files.length === 0) return { ok: false, ids: [], error: "no_files" };
  const ids: string[] = [];
  for (const path of files) {
    const res = await createManualSave({ filePaths: [path] });
    if (res.ok && res.id) ids.push(res.id);
  }
  return { ok: ids.length > 0, ids };
}

/** Finder/Explorer put file refs on the native pasteboard; Chromium's `clipboardData.files` is often empty. */
function clipboardFilePaths(): string[] {
  const out: string[] = [];
  const pushFileUrl = (raw: string) => {
    const token = raw.trim();
    if (!token.startsWith("file:")) return;
    try {
      out.push(fileURLToPath(token));
    } catch {}
  };

  try {
    const formats = clipboard.availableFormats();
    if (formats.includes("public.file-url")) {
      const buf = clipboard.readBuffer("public.file-url").toString("utf8");
      for (const part of buf.split(/[\r\n\0]+/)) pushFileUrl(part);
    }
  } catch (err) {
    log.warn("[pond ipc] clipboard file-url read failed", err);
  }

  const text = clipboard.readText();
  for (const part of text.split(/\s+/).filter(Boolean)) {
    if (part.startsWith("file:")) pushFileUrl(part);
    else if (isAbsolute(part)) out.push(part);
  }

  return [...new Set(out)];
}

export const savesImportQueries: QueryHandlerMap = {
  "saves.classifyUrl"(params) {
    const url = String(params.url ?? "").trim();
    if (!url) return { source: null };
    const { source } = classifyUrlToSource(normalizeUrl(url));
    return { source };
  },

  async "saves.importFiles"(params) {
    const paths = Array.isArray(params.paths)
      ? (params.paths as unknown[]).map(String).filter(Boolean)
      : [];
    if (paths.length === 0) return { ok: false, error: "no_files" };
    return importFilesImpl(paths);
  },

  async "saves.createManual"(params) {
    return createManualSave({
      title: params.title != null ? String(params.title) : null,
      url: params.url != null ? String(params.url) : null,
      note: params.note != null ? String(params.note) : null,
      tags: Array.isArray(params.tags) ? (params.tags as string[]) : [],
      filePaths: Array.isArray(params.filePaths)
        ? (params.filePaths as string[])
        : [],
      sourceId: params.sourceId != null ? String(params.sourceId) : null,
      ...(params.width != null && Number.isFinite(Number(params.width))
        ? { width: Number(params.width) }
        : {}),
      ...(params.height != null && Number.isFinite(Number(params.height))
        ? { height: Number(params.height) }
        : {}),
    });
  },

  async "saves.pickEagleLibrary"() {
    const win = BrowserWindow.getFocusedWindow() ?? undefined;
    const opts = {
      properties: ["openDirectory" as const],
      message: "Choose an Eagle library folder",
    };
    const result = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts);
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, path: null };
    }
    return { ok: true, path: result.filePaths[0] };
  },

  async "saves.importEagleLibrary"(params) {
    const path = String(params.path ?? "").trim();
    if (!path)
      return {
        ok: false,
        error: "no_path",
        imported: 0,
        skipped: 0,
        failed: 0,
      };
    return importEagleLibrary(path);
  },

  async "saves.importClipboard"() {
    const filePaths = clipboardFilePaths();
    if (filePaths.length > 0) return importFilesImpl(filePaths);

    const img = clipboard.readImage();
    if (img.isEmpty()) return { ok: false, error: "empty_clipboard", ids: [] };

    try {
      const dir = await mkdtemp(join(tmpdir(), "pond-clip-"));
      const path = join(dir, "clipboard.png");
      await writeFile(path, img.toPNG());
      return importFilesImpl([path]);
    } catch (err) {
      log.warn("[pond ipc] importClipboard failed", err);
      return { ok: false, error: "clipboard_write_failed", ids: [] };
    }
  },

  async "saves.startDrag"(params, event) {
    const id = String(params.id ?? "");
    const fileIndex = Number(params.fileIndex ?? 0);
    if (!id || !event) return { ok: false };
    const target = await resolveSaveFilePath(
      id,
      Number.isFinite(fileIndex) ? fileIndex : 0,
    );
    if (!target.ok) return { ok: false };
    try {
      const { nativeImage } = await import("electron");
      const icon = nativeImage.createEmpty();
      event.sender.startDrag({ file: target.path, icon });
      return { ok: true };
    } catch (err) {
      log.warn("[pond ipc] startDrag failed", err);
      return { ok: false };
    }
  },

  async "saves.quickAdd"(params) {
    const url = String(params.url ?? "").trim();
    const note =
      params.note != null ? String(params.note).trim() || null : null;
    const tags = Array.isArray(params.tags) ? (params.tags as string[]) : [];

    if (!url) {
      const res = await createManualSave({ title: note, note, tags });
      return res.ok
        ? { ok: true, id: res.id }
        : { ok: false, error: res.error ?? "empty_input" };
    }
    try {
      const result = await enqueue(url, { trigger: "user:quickAdd" });
      if (tags.length > 0) await setSaveTags(result.id, tags);
      if (note) {
        await persistSave(
          result.id,
          { notes: note },
          { actorReason: "user:quickAdd-note" },
        );
      }
      return { ok: true, id: result.id, created: result.created };
    } catch (err) {
      if (err instanceof UnsupportedError) {
        const res = await createManualSave({
          url,
          title: note ?? url,
          note,
          tags,
        });
        return res.ok
          ? { ok: true, id: res.id }
          : { ok: false, error: "unsupported_url" };
      }
      log.error("[pond ipc] quickAdd failed", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
