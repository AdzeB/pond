import { resolveFileIndex } from "@/features/saves/lib/actions";
import { pool } from "@/features/saves/state/pool";
import { selection } from "@/features/saves/state/selection";

export const SAVE_DRAG_TYPE = "application/x-pond-save";

export interface SaveDragDataTransfer {
  readonly types: readonly string[];
  effectAllowed: DataTransfer["effectAllowed"];
  getData(format: string): string;
  setData(format: string, data: string): void;
}

let draggingIds: string[] = [];

export function draggingSaveIds(): string[] {
  return draggingIds;
}

export function clearDraggingSaveIds(): void {
  draggingIds = [];
}

export function isLibrarySaveDrag(
  dataTransfer: SaveDragDataTransfer | null | undefined,
): boolean {
  if (draggingIds.length) return true;
  return Array.from(dataTransfer?.types ?? []).includes(SAVE_DRAG_TYPE);
}

export function saveDropIds(
  dataTransfer: SaveDragDataTransfer | null | undefined,
): string[] {
  const fromMime = dataTransfer?.getData(SAVE_DRAG_TYPE).trim();
  if (fromMime) return fromMime.split(",").filter(Boolean);
  return draggingIds;
}

export function beginSaveDrag(
  id: string,
  dataTransfer?: SaveDragDataTransfer,
): void {
  const selected = selection.has(id) ? [...selection.snapshot()] : [id];
  draggingIds = selected;
  dataTransfer?.setData(SAVE_DRAG_TYPE, selected.join(","));
  if (dataTransfer) dataTransfer.effectAllowed = "copy";
  const ids = selected.filter((saveId) => {
    const save = pool.get(saveId);
    return save ? resolveFileIndex(save) != null : false;
  });
  if (ids.length === 0) return;
  const save = pool.get(ids[0] ?? id);
  const fileIndex = save ? resolveFileIndex(save) : 0;
  void window.pond.query("saves.startDrag", { ids, fileIndex });
}
