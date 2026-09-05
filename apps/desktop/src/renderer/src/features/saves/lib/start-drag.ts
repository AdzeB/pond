import { selection } from "@/features/library/state/selection";
import { resolveFileIndex } from "@/features/saves/lib/actions";
import { pool } from "@/features/saves/state/pool";

let draggingIds: string[] = [];

export function draggingSaveIds(): string[] {
  return draggingIds;
}

export function startNativeDrag(id: string): void {
  const selected = selection.has(id) ? [...selection.snapshot()] : [id];
  draggingIds = selected;
  const ids = selected.filter((saveId) => {
    const save = pool.get(saveId);
    return save ? resolveFileIndex(save) != null : false;
  });
  if (ids.length === 0) return;
  const save = pool.get(ids[0] ?? id);
  const fileIndex = save ? resolveFileIndex(save) : 0;
  void window.pond.query("saves.startDrag", { ids, fileIndex });
}
