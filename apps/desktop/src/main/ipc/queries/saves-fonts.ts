import { basename, extname } from "node:path";
import { saves } from "@pond/schema/db";
import type { Transaction } from "@pond/schema/tx";
import { applyRenameTemplate } from "@shared/rename-template";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { executeBatch } from "../../core/executor";
import {
  activateFont,
  clearFontActivation,
  deactivateFont,
  pondFontsDir,
  readFontActivation,
  writeFontActivation,
} from "../../core/font-activation";
import { extractFontFamily, renameWithFamily } from "../../core/font-metadata";
import { persistSave } from "../../core/persist-save";
import { withDecryptedLibraryMediaPath } from "../../core/storage/library-media-storage";
import { hasUserTitle } from "../../core/user-metadata";
import { getDb } from "../../db";
import { itemFile } from "../../paths";
import {
  type QueryHandlerMap,
  query,
  StringListParam,
  StringParam,
} from "./params";

export const savesFontQueries = {
  "saves.batchRename": query(
    z.object({ ids: StringListParam, pattern: StringParam }),
    async (params) => {
      const pattern = params.pattern.trim();
      if (!pattern || params.ids.length === 0) return { ok: false, renamed: 0 };
      const db = await getDb();
      const rows = await db
        .select()
        .from(saves)
        .where(inArray(saves.id, params.ids));
      const byId = new Map(rows.map((row) => [row.id, row]));
      const txs: Transaction[] = [];
      for (const [index, id] of [...new Set(params.ids)].entries()) {
        const row = byId.get(id);
        if (!row) continue;
        const stored = row.files[0];
        const family =
          stored?.family ??
          (stored?.path
            ? await withDecryptedLibraryMediaPath(
                itemFile(row.id, stored.path),
                extractFontFamily,
              )
            : null);
        const fallback = renameWithFamily("{family}", {
          n: index + 1,
          title: row.title ?? "Untitled",
          id: row.id,
          family,
        });
        const original = stored?.path
          ? basename(stored.path, extname(stored.path))
          : (row.title ?? "Untitled");
        const title = applyRenameTemplate(pattern, {
          index,
          title: row.title ?? "Untitled",
          id: row.id,
          family: fallback,
          date: row.savedAt,
          tags: row.tags,
          original,
        });
        if (title === row.title) continue;
        txs.push({
          kind: "update",
          model: "save",
          id: row.id,
          titleLock: { before: hasUserTitle(row.id), after: true },
          patch: { title },
          before: { title: row.title },
          meta: { actor: "user", actorReason: "batch-rename" },
        });
      }
      if (txs.length > 0) await executeBatch(txs);
      return { ok: true, renamed: txs.length };
    },
  ),

  "saves.fontStatus": query(z.object({ id: StringParam }), ({ id }) => {
    const path = readFontActivation(id);
    return path ? { activated: true, path } : { activated: false };
  }),

  "saves.activateFont": query(z.object({ id: StringParam }), async ({ id }) => {
    const db = await getDb();
    const row = db.select().from(saves).where(eq(saves.id, id)).get();
    const file = row?.files[0];
    if (!row || !file?.path)
      return { ok: false, error: "missing_file" as const };
    const { app } = await import("electron");
    const result = await activateFont({
      sourcePath: itemFile(id, file.path),
      saveId: id,
      fontsDir: pondFontsDir(app.getPath("home")),
    });
    if (result.ok && result.path) {
      writeFontActivation(id, result.path);
      await persistSave(
        id,
        { fontActivated: true },
        { actorReason: "font:activate" },
      );
    }
    return result;
  }),

  "saves.deactivateFont": query(
    z.object({ id: StringParam }),
    async ({ id }) => {
      const installed = readFontActivation(id);
      if (!installed) return { ok: true };
      const { app } = await import("electron");
      const result = await deactivateFont({
        installedPath: installed,
        fontsDir: pondFontsDir(app.getPath("home")),
      });
      if (result.ok) {
        clearFontActivation(id);
        await persistSave(
          id,
          { fontActivated: false },
          { actorReason: "font:deactivate" },
        );
      }
      return result;
    },
  ),

  "saves.setAudioAnalysis": query(
    z.object({
      id: StringParam,
      bpm: z.number().int().min(1).max(300),
    }),
    async ({ id, bpm }) => {
      const db = await getDb();
      const [row] = await db.select().from(saves).where(eq(saves.id, id));
      if (!row) return { ok: false };
      const files = row.files.map((file, index) =>
        index === 0 ? { ...file, bpm } : file,
      );
      await persistSave(id, { files }, { actorReason: "audio:bpm" });
      return { ok: true };
    },
  ),
} satisfies QueryHandlerMap;
