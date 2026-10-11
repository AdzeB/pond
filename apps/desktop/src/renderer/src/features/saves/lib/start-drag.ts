import { resolveFileIndex } from "@/features/saves/lib/actions";
import { pool } from "@/features/saves/state/pool";
import { selection } from "@/features/saves/state/selection";

export const SAVE_DRAG_TYPE = "application/x-pond-save";

export interface SaveDragDataTransfer {
  readonly types: readonly string[];
  effectAllowed: DataTransfer["effectAllowed"];
  getData(format: string): string;
  setData(format: string, data: string): void;
  setDragImage?(image: Element, x: number, y: number): void;
}

export interface SaveDragStartEvent {
  readonly dataTransfer: SaveDragDataTransfer | null;
  preventDefault(): void;
}

let draggingIds: string[] = [];
let dragPreview: HTMLElement | null = null;
let removeSessionListeners: (() => void) | null = null;
let dragAnnouncement: HTMLElement | null = null;

export function draggingSaveIds(): string[] {
  return draggingIds;
}

export function clearDraggingSaveIds(): void {
  endSaveDrag();
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

function cardImage(id: string): HTMLImageElement | null {
  const card = [
    ...document.querySelectorAll<HTMLElement>("[data-save-id]"),
  ].find((candidate) => candidate.dataset.saveId === id);
  return card?.querySelector("img") ?? null;
}

function createDragPreview(ids: readonly string[]): HTMLElement {
  const preview = document.createElement("div");
  preview.dataset.saveDragPreview = "";
  preview.setAttribute("aria-hidden", "true");
  preview.style.cssText =
    "position:fixed;top:-160px;left:-160px;width:92px;height:72px;pointer-events:none;z-index:2147483647;";

  for (const [index, id] of ids.slice(0, 3).entries()) {
    const layer = document.createElement("div");
    const offset = index * 5;
    layer.style.cssText = `position:absolute;inset:${offset}px ${12 - offset}px ${12 - offset}px ${offset}px;overflow:hidden;background:var(--ds-gray-3,#e5e5e5);border:1px solid color-mix(in srgb,var(--ds-gray-12,#111),transparent 82%);border-radius:10px;box-shadow:0 4px 12px rgb(0 0 0 / 20%);`;
    const image = cardImage(id);
    if (image) {
      /** SAFETY: cloning an img element always yields an img element. */
      const clone = image.cloneNode() as HTMLImageElement;
      clone.removeAttribute("id");
      clone.style.cssText =
        "display:block;width:100%;height:100%;object-fit:cover;";
      layer.append(clone);
    }
    preview.append(layer);
  }

  const count = document.createElement("span");
  count.textContent = `${ids.length} ${ids.length === 1 ? "Save" : "Saves"}`;
  count.style.cssText =
    "position:absolute;right:0;bottom:0;display:flex;align-items:center;min-height:24px;padding:0 8px;color:white;font:600 11px/1 system-ui,sans-serif;background:var(--ds-accent-9,#1677ff);border:2px solid white;border-radius:999px;box-shadow:0 2px 8px rgb(0 0 0 / 24%);white-space:nowrap;";
  preview.append(count);
  document.body.append(preview);
  return preview;
}

function announce(message: string): void {
  if (!dragAnnouncement) {
    dragAnnouncement = document.createElement("span");
    dragAnnouncement.dataset.saveDragAnnouncement = "";
    dragAnnouncement.setAttribute("role", "status");
    dragAnnouncement.setAttribute("aria-live", "polite");
    dragAnnouncement.setAttribute("aria-atomic", "true");
    dragAnnouncement.style.cssText =
      "position:fixed;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
    document.body.append(dragAnnouncement);
  }
  dragAnnouncement.textContent = "";
  requestAnimationFrame(() => {
    if (dragAnnouncement) dragAnnouncement.textContent = message;
  });
}

export function announceSaveDragTarget(
  folderName: string,
  count: number,
): void {
  announce(`Add ${count} ${count === 1 ? "Save" : "Saves"} to ${folderName}`);
}

function installSessionListeners(): void {
  removeSessionListeners?.();
  const finish = () => endSaveDrag();
  window.addEventListener("dragend", finish, { once: true });
  window.addEventListener("drop", finish, { once: true });
  removeSessionListeners = () => {
    window.removeEventListener("dragend", finish);
    window.removeEventListener("drop", finish);
    removeSessionListeners = null;
  };
}

/** A native drag fires no dragend here, so any drop, click, released-button move or refocus ends it. */
function installNativeSessionListeners(): void {
  removeSessionListeners?.();
  const finish = () => endSaveDrag();
  const released = (event: PointerEvent) => {
    if (event.buttons === 0) endSaveDrag();
  };
  window.addEventListener("drop", finish);
  window.addEventListener("pointerdown", finish, true);
  window.addEventListener("pointermove", released, true);
  window.addEventListener("focus", finish);
  removeSessionListeners = () => {
    window.removeEventListener("drop", finish);
    window.removeEventListener("pointerdown", finish, true);
    window.removeEventListener("pointermove", released, true);
    window.removeEventListener("focus", finish);
    removeSessionListeners = null;
  };
}

export function endSaveDrag(): void {
  draggingIds = [];
  removeSessionListeners?.();
  document.body.removeAttribute("data-save-dragging");
  dragPreview?.remove();
  dragPreview = null;
}

export function beginSaveDrag(id: string, event?: SaveDragStartEvent): void {
  endSaveDrag();
  const selected = selection.has(id) ? [...selection.snapshot()] : [id];
  draggingIds = selected;
  document.body.dataset.saveDragging = String(selected.length);
  announce(
    `${selected.length} ${selected.length === 1 ? "Save" : "Saves"} ready to add to a folder`,
  );
  const ids = selected.filter((saveId) => {
    const save = pool.get(saveId);
    return save ? resolveFileIndex(save) != null : false;
  });
  if (ids.length > 0) {
    /** `startDrag` only adds files to Chromium's drag; running both strands this window in a drag that never ends. */
    event?.preventDefault();
    installNativeSessionListeners();
    const save = pool.get(ids[0] ?? id);
    const fileIndex = save ? resolveFileIndex(save) : 0;
    void window.pond.query("saves.startDrag", { ids, fileIndex });
    return;
  }
  const dataTransfer = event?.dataTransfer;
  if (dataTransfer) {
    dataTransfer.setData(SAVE_DRAG_TYPE, selected.join(","));
    dataTransfer.effectAllowed = "copy";
    if (dataTransfer.setDragImage) {
      dragPreview = createDragPreview(selected);
      dataTransfer.setDragImage(dragPreview, 46, 36);
    }
  }
  installSessionListeners();
}
