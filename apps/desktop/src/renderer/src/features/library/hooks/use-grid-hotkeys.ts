import { useHotkeys } from "@tanstack/react-hotkeys";
import { useRef } from "react";
import { dockMode } from "@/features/library/state/dock-mode";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { resultNavigation } from "@/features/library/state/result-navigation";
import {
  primarySelection,
  selection,
} from "@/features/library/state/selection";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { openSave, saveIdFromPath } from "@/features/saves/lib/save-nav";
import {
  clearSaveSelection,
  selectOnlySave,
} from "@/features/saves/lib/select";
import { getAppRouter } from "@/shared/lib/app-router";
import { useShortcutBindings } from "@/shared/lib/shortcuts";

function gridFocusFree(): boolean {
  const el = document.activeElement;
  if (!el || el === document.body) return true;
  return el.closest("[data-save-id]") != null;
}

function saveRouteOpen(): boolean {
  const path = getAppRouter()?.state.location.pathname ?? "";
  return saveIdFromPath(path) != null;
}

export function useGridHotkeys(
  filteredIds: ReadonlyArray<string>,
  allIds?: () => Promise<string[] | null>,
): void {
  const shortcuts = useShortcutBindings();
  const idsRef = useRef(filteredIds);
  idsRef.current = filteredIds;
  const cursorRef = useRef<string | null>(null);
  const movementQueue = useRef(Promise.resolve());

  const move = async (delta: number, extend: boolean, event: KeyboardEvent) => {
    if (saveRouteOpen()) return;
    if (!gridFocusFree()) return;
    let ids = idsRef.current;
    if (ids.length === 0) return;
    event.preventDefault();

    const anchor = selection.getAnchor();
    const base = extend ? (cursorRef.current ?? anchor) : anchor;
    let baseIdx = base ? ids.indexOf(base) : -1;
    if (
      allIds &&
      (baseIdx + delta >= ids.length || (baseIdx < 0 && delta < 0))
    ) {
      ids = (await allIds()) ?? ids;
      baseIdx = base ? ids.indexOf(base) : -1;
    }
    const nextIdx =
      baseIdx < 0
        ? delta > 0
          ? 0
          : ids.length - 1
        : Math.min(ids.length - 1, Math.max(0, baseIdx + delta));
    const next = ids[nextIdx];
    if (!next) return;
    await ensureSaves([next]);

    if (extend) {
      const from = anchor ?? next;
      if (!anchor) selection.setAnchor(next);
      selection.setRange(ids, from, next);
      primarySelection.set(next);
      libraryChrome.setInspectorSaveId(next);
    } else {
      selectOnlySave(next);
    }
    cursorRef.current = next;
    await resultNavigation.reveal(next);
  };

  const enqueueMove = (
    delta: number,
    extend: boolean,
    event: KeyboardEvent,
  ) => {
    if (saveRouteOpen() || !gridFocusFree()) return;
    event.preventDefault();
    movementQueue.current = movementQueue.current
      .then(() => move(delta, extend, event))
      .catch((error) => console.warn("[pond navigation]", error));
  };

  const open = (event: KeyboardEvent) => {
    if (saveRouteOpen()) return;
    if (!gridFocusFree()) return;
    const anchor = selection.getAnchor();
    if (!anchor || !idsRef.current.includes(anchor)) return;
    event.preventDefault();
    openSave(anchor);
  };

  useHotkeys(
    [
      {
        hotkey: shortcuts["grid.prev"].keys!,
        callback: (event) => enqueueMove(-1, false, event),
        options: { preventDefault: false },
      },
      {
        hotkey: shortcuts["grid.next"].keys!,
        callback: (event) => enqueueMove(1, false, event),
        options: { preventDefault: false },
      },
      {
        hotkey: shortcuts["grid.extend-prev"].keys!,
        callback: (event) => enqueueMove(-1, true, event),
        options: { preventDefault: false },
      },
      {
        hotkey: shortcuts["grid.extend-next"].keys!,
        callback: (event) => enqueueMove(1, true, event),
        options: { preventDefault: false },
      },
      {
        hotkey: shortcuts["grid.open"].keys!,
        callback: open,
        options: { preventDefault: false },
      },
      {
        hotkey: shortcuts["grid.select-all"].keys!,
        callback: (event) => {
          if (saveRouteOpen()) return;
          if (!gridFocusFree()) return;
          const ids = idsRef.current;
          if (ids.length === 0) return;
          event.preventDefault();
          if (allIds) {
            void allIds()
              .then((matches) => {
                if (matches) selection.set(matches);
              })
              .catch((error) => console.warn("[pond selection]", error));
          } else selection.set(ids);
          const first = ids[0];
          if (first && !selection.getAnchor()) selection.setAnchor(first);
          const focus = selection.getAnchor() ?? first;
          if (focus) {
            primarySelection.set(focus);
            libraryChrome.setInspectorSaveId(focus);
          }
        },
        options: { preventDefault: false },
      },
      {
        hotkey: shortcuts["grid.clear"].keys!,
        callback: (event) => {
          if (event.defaultPrevented) return;
          if (saveRouteOpen()) return;
          const focused = document.activeElement;
          if (
            focused instanceof HTMLElement &&
            focused.closest("[data-library-search]")
          ) {
            return;
          }
          const mode = dockMode.current();
          if (
            mode === "selection-run" ||
            mode === "selection-tag" ||
            mode === "selection-copy" ||
            mode === "selection-export" ||
            mode === "confirm"
          ) {
            dockMode.close();
            return;
          }
          if (mode !== "nav") return;
          if (selection.size() === 0 && !selection.getAnchor()) return;
          clearSaveSelection();
          cursorRef.current = null;
        },
        options: { preventDefault: false },
      },
    ],
    { ignoreInputs: true },
  );
}
