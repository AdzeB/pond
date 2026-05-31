import type { NewSave, Save } from "@pond/schema/db";
import { writeSaveInfo } from "../lib/library";
import { patchTouchesInfo } from "../lib/library-format";
import { applySavePatch, type WriteFileArgs } from "./pipeline/workers/apply";

export interface PersistSaveOptions {
  actorReason: string;
  newFiles?: WriteFileArgs[];
  replaceFilesWithKind?: WriteFileArgs["kind"];
  // Force an info.json refresh even when the patch only touches DB-only
  // columns. The pipeline's finalize step uses this for its authoritative
  // post-ingest write.
  writeInfo?: boolean;
}

// persistSave: the single main-process write path for a save. It updates the
// SQLite row (via applySavePatch, which also emits the sync_actions row and
// writes any new files), then refreshes info.json from the updated row
// whenever the patch touches an exported field, adds files, or the caller
// asks for it. DB-only columns never reach disk because the shared projection
// (infoDocFromSave) excludes them.
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
