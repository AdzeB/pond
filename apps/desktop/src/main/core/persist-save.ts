import type { NewSave, Save } from "@pond/schema/db";
import { writeSaveInfo } from "../lib/library";
import { patchTouchesInfo } from "../lib/library-format";
import { applySavePatch, type WriteFileArgs } from "./pipeline/workers/apply";

export interface PersistSaveOptions {
  actorReason: string;
  newFiles?: WriteFileArgs[];
  replaceFilesWithKind?: WriteFileArgs["kind"];
  // Force an info.json refresh even for DB-only patches; used by finalize.
  writeInfo?: boolean;
}

// Single write path for a save: update the row, then refresh info.json when needed.
export async function persistSave(
  id: string,
  patch: Partial<NewSave>,
  opts: PersistSaveOptions,
): Promise<Save | null> {
  const updated = await applySavePatch(id, patch, {
    actorReason: opts.actorReason,
    newFiles: opts.newFiles,
    replaceFilesWithKind: opts.replaceFilesWithKind,
  });
  if (!updated) return null;

  const wroteFiles = (opts.newFiles?.length ?? 0) > 0;
  if (opts.writeInfo || wroteFiles || patchTouchesInfo(patch)) {
    await writeSaveInfo(updated);
  }

  return updated;
}
