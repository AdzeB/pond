import { useHotkeys } from "@tanstack/react-hotkeys";
import { useRef } from "react";
import { SHORTCUTS } from "@/lib/save/shortcuts";
import { getAppRouter } from "@/lib/ui/app-router";
import { openSave, saveIdFromPath } from "@/lib/ui/save-nav";
import { dockMode } from "@/stores/dock-mode";
import { selection } from "@/stores/selection";

/** Arrows and Enter must not fire while focus sits in toolbars, dialogs, or the dock. */
function gridFocusFree(): boolean {
  const el = document.activeElement;
  if (!el || el === document.body) return true;
  return el.closest("[data-save-id]") != null;
}

function saveRouteOpen(): boolean {
  const path = getAppRouter()?.state.location.pathname ?? "";
  return saveIdFromPath(path) != null;
}

function scrollToCard(id: string): void {
  document
    .querySelector(`[data-save-id="${CSS.escape(id)}"]`)
    ?.scrollIntoView({ block: "nearest" });
}

/**
 * Keyboard cursor for the library grid: arrows move the anchor, Shift extends
 * the multi selection, Enter/Space open, Mod+A selects all, Escape clears.
 */
export function useGridHotkeys(filteredIds: ReadonlyArray<string>): void {
  const idsRef = useRef(filteredIds);
  idsRef.current = filteredIds;
  /** Shift-extension endpoint; the anchor stays put as the range origin. */
  const cursorRef = useRef<string | null>(null);

  const move = (delta: number, extend: boolean, event: KeyboardEvent) => {
    if (saveRouteOpen()) return;
    if (!gridFocusFree()) return;
    const ids = idsRef.current;
    if (ids.length === 0) return;
    event.preventDefault();

    const anchor = selection.getAnchor();
    const base = extend ? (cursorRef.current ?? anchor) : anchor;
    const baseIdx = base ? ids.indexOf(base) : -1;
    const nextIdx =
      baseIdx < 0
        ? delta > 0
          ? 0
          : ids.length - 1
        : Math.min(ids.length - 1, Math.max(0, baseIdx + delta));
    const next = ids[nextIdx];
    if (!next) return;

    if (extend) {
      const from = anchor ?? next;
      if (!anchor) selection.setAnchor(next);
      selection.setRange(ids, from, next);
    } else {
      if (selection.size() > 0) selection.clear();
      selection.setAnchor(next);
    }
    cursorRef.current = next;
    scrollToCard(next);
  };

  const open = (event: KeyboardEvent) => {
    if (saveRouteOpen()) return;
    if (!gridFocusFree()) return;
    const anchor = selection.getAnchor();
    if (!anchor || !idsRef.current.includes(anchor)) return;
    event.preventDefault();
    openSave(anchor);
  };

  useHotkeys([
    {
      hotkey: SHORTCUTS["grid.prev"].keys!,
      callback: (event) => move(-1, false, event),
      options: { preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["grid.next"].keys!,
      callback: (event) => move(1, false, event),
      options: { preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["grid.extend-prev"].keys!,
      callback: (event) => move(-1, true, event),
      options: { preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["grid.extend-next"].keys!,
      callback: (event) => move(1, true, event),
      options: { preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["grid.open"].keys!,
      callback: open,
      options: { preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["grid.preview"].keys!,
      callback: open,
      options: { preventDefault: false },
    },
    {
      hotkey: SHORTCUTS["grid.select-all"].keys!,
      callback: (event) => {
        if (saveRouteOpen()) return;
        if (!gridFocusFree()) return;
        const ids = idsRef.current;
        if (ids.length === 0) return;
        event.preventDefault();
        selection.set(ids);
        const first = ids[0];
        if (!selection.getAnchor() && first) selection.setAnchor(first);
      },
      options: { preventDefault: false },
    },
    {
      /** Save page, dock, and expanded pill own Escape while open; only a bare grid clears. */
      hotkey: SHORTCUTS["grid.clear"].keys!,
      callback: (event) => {
        if (event.defaultPrevented) return;
        if (saveRouteOpen()) return;
        if (dockMode.current() !== "nav") return;
        if (selection.size() === 0 && !selection.getAnchor()) return;
        selection.clear();
        cursorRef.current = null;
      },
      options: { preventDefault: false },
    },
  ]);
}
