import { dialog } from "electron";
import log from "electron-log/main.js";
import {
  createManualSave,
  IMPORTABLE_EXTENSIONS,
} from "../../core/manual-import";
import { persistSave } from "../../core/persist-save";
import { enqueueSaveByUrl } from "../../core/pipeline/enqueue";
import { UnsupportedError } from "../../core/pipeline/extractors/errors";
import { setSaveTags } from "../../core/tags";
import { type QueryHandlerMap, resolveSaveFilePath } from "../helpers";

// Import each file as its own save so a multi-file drop becomes individual items.
async function importFilesImpl(
  paths: string[],
): Promise<{ ok: boolean; ids: string[] }> {
  const ids: string[] = [];
  for (const path of paths) {
    const res = await createManualSave({ filePaths: [path] });
    if (res.ok && res.id) ids.push(res.id);
  }
  return { ok: ids.length > 0, ids };
}

export const savesImportQueries: QueryHandlerMap = {
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
    });
  },

  async "saves.pickFiles"() {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Media", extensions: [...IMPORTABLE_EXTENSIONS] }],
    });
    if (result.canceled) return { ok: false, paths: [] };
    return { ok: true, paths: result.filePaths };
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
      // No URL: treat as a manual note entry rather than rejecting it.
      const res = await createManualSave({ title: note, note, tags });
      return res.ok
        ? { ok: true, id: res.id }
        : { ok: false, error: res.error ?? "empty_input" };
    }
    try {
      const result = await enqueueSaveByUrl(url, { trigger: "user:quickAdd" });
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
        // Unsupported URL: keep it as a manual save instead of dropping it.
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
