import { stat } from "node:fs/promises";
import { type SaveFile, saves } from "@pond/schema/db";
import { classifyLibraryFile, libraryFilename } from "@shared/file-format";
import { eq } from "drizzle-orm";
import mime from "mime-types";
import { getDb } from "../db";
import { persistSave } from "./persist-save";

const AUXILIARY = new Set([
  "custom_thumbnail",
  "avatar",
  "source_icon",
  "poster",
]);

export function replacementKind(
  files: readonly Pick<SaveFile, "kind" | "path">[],
): string | null {
  return files.find((file) => !AUXILIARY.has(file.kind))?.kind ?? null;
}

export async function replaceSaveFile(input: {
  id: string;
  sourcePath: string;
}): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const row = db.select().from(saves).where(eq(saves.id, input.id)).all()[0];
  const kind = replacementKind(row?.files ?? []);
  if (!kind) return { ok: false, error: "This save has no file to replace." };
  const format = classifyLibraryFile(
    input.sourcePath,
    mime.lookup(input.sourcePath) || null,
  );
  const info = await stat(input.sourcePath).catch(() => null);
  if (!info?.isFile() || info.size === 0) {
    return { ok: false, error: "Choose a non-empty file." };
  }
  const updated = await persistSave(
    input.id,
    { mediaType: format.mediaType },
    {
      actorReason: "user:replace-file",
      replaceFilesWithKind: kind,
      newFiles: [
        {
          kind,
          filename: libraryFilename(input.sourcePath, "original"),
          sourcePath: input.sourcePath,
          mimeType: format.mimeType,
        },
      ],
    },
  );
  return updated
    ? { ok: true }
    : { ok: false, error: "Couldn’t replace this file." };
}
