import { useToast } from "@pond/ui";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { isChordPending } from "@/components/command-palette/use-chords";
import { navigateTo, patchSearch } from "@/lib/navigate-path";
import { listBaseFromPath } from "@/lib/search-schemas";
import type { SavesMode } from "@/lib/use-library-state";
import {
  isLayoutValue,
  type LayoutValue,
  nextLayout,
  readViewPref,
  writeViewPref,
} from "@/lib/view-prefs";
import {
  primarySelection,
  selection,
  useSelectionSize,
} from "@/pool/selection";

interface CardActions {
  selectionSize: number;
  multiSelectActive: boolean;
  handleCardClick: (id: string, e: React.MouseEvent) => void;
  focus: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
}

export function useCardActions(
  filteredIds: ReadonlyArray<string>,
  mode: SavesMode,
  sourceFilter: string,
): CardActions {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const selectionSize = useSelectionSize();
  const multiSelectActive = selectionSize > 0;

  const listBase = listBaseFromPath(location.pathname);
  const buildSavePath = useCallback(
    (id: string) =>
      listBase === "/" ? `/save/${id}` : `${listBase}/save/${id}`,
    [listBase],
  );
  const buildDetailPath = useCallback(
    (id: string) =>
      listBase === "/" ? `/detail/${id}` : `${listBase}/detail/${id}`,
    [listBase],
  );

  const select = useCallback(
    (id: string) => {
      navigateTo(navigate, buildSavePath(id));
    },
    [buildSavePath, navigate],
  );

  const focus = useCallback(
    (id: string) => {
      navigateTo(navigate, buildDetailPath(id));
    },
    [buildDetailPath, navigate],
  );

  const handleCardClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      if (meta) {
        e.preventDefault();
        selection.toggle(id);
        if (selection.has(id)) selection.setAnchor(id);
        return;
      }
      if (shift) {
        e.preventDefault();
        const anchor = selection.getAnchor() ?? id;
        selection.setRange(filteredIds, anchor, id);
        return;
      }
      if (multiSelectActive) selection.clear();
      selection.setAnchor(id);
      select(id);
    },
    [filteredIds, multiSelectActive, select],
  );

  const cycleLayout = useCallback(() => {
    patchSearch(
      navigate,
      (prev) => {
        const raw =
          (prev.view as string | undefined) ??
          readViewPref("view") ??
          "waterfall";
        const current: LayoutValue = isLayoutValue(raw) ? raw : "waterfall";
        const next = nextLayout(current);
        writeViewPref("view", next);
        const out = { ...prev };
        if (next === "waterfall") delete out.view;
        else out.view = next;
        return out;
      },
      { replace: true },
    );
  }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (isInput) return;

      // Dialogs / menus / listboxes own their own roving focus. Base UI
      // doesn't stop arrow keys from bubbling so we have to.
      const inOverlay = target?.closest(
        '[role="dialog"],[role="menu"],[role="listbox"],[role="combobox"]',
      );
      if (inOverlay) return;

      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "a") {
        if (filteredIds.length === 0) return;
        e.preventDefault();
        selection.set(filteredIds);
        return;
      }

      if (meta && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        cycleLayout();
        return;
      }

      if (e.key === "Escape" && selectionSize > 0) {
        selection.clear();
        return;
      }

      // Bare-key grid nav from here on: defer to chord matcher so `g a`
      // etc. wins over single-letter actions.
      if (meta || e.altKey) return;
      if (isChordPending()) return;
      if (filteredIds.length === 0) return;

      const id = primarySelection.get();
      const idx = id ? filteredIds.indexOf(id) : -1;

      const isUp =
        e.key === "ArrowUp" ||
        (!e.shiftKey && (e.key === "k" || e.key === "K"));
      const isDown =
        e.key === "ArrowDown" ||
        (!e.shiftKey && (e.key === "j" || e.key === "J"));
      const isLeft = e.key === "ArrowLeft";
      const isRight = e.key === "ArrowRight";

      if (isUp || isDown || isLeft || isRight) {
        e.preventDefault();
        let nextIdx: number;
        if (idx < 0) {
          nextIdx = isUp || isLeft ? filteredIds.length - 1 : 0;
        } else if (isUp || isLeft) {
          nextIdx = Math.max(0, idx - 1);
        } else {
          nextIdx = Math.min(filteredIds.length - 1, idx + 1);
        }
        const nextId = filteredIds[nextIdx];
        if (nextId) select(nextId);
        return;
      }

      if (idx < 0) return;
      const focusedId = filteredIds[idx];
      if (!focusedId) return;

      if (e.key === "Enter") {
        e.preventDefault();
        focus(focusedId);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        select(focusedId);
        return;
      }
      if (!e.shiftKey && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        selection.toggle(focusedId);
        if (selection.has(focusedId)) selection.setAnchor(focusedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredIds, selectionSize, select, focus, cycleLayout]);

  useEffect(() => {
    void mode;
    void sourceFilter;
    selection.clear();
  }, [mode, sourceFilter]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer) return;
    const types = Array.from(e.dataTransfer.types ?? []);
    if (
      types.includes("text/uri-list") ||
      types.includes("text/plain") ||
      types.includes("Files")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const dt = e.dataTransfer;
      if (!dt) return;

      const files = Array.from(dt.files ?? []) as Array<
        File & { path?: string }
      >;
      const items = files
        .map((f) => ({
          path: f.path ?? "",
          name: f.name,
          type: f.type,
        }))
        .filter((it) => it.path);
      if (items.length > 0) {
        const result = (await window.pond.query("saves.dropFiles", {
          items,
        })) as { ok: boolean; ids?: string[] };
        if (result.ok && (result.ids?.length ?? 0) > 0) {
          toast.add({
            title: `Imported ${result.ids?.length} file${result.ids?.length === 1 ? "" : "s"}`,
            type: "success",
          });
        }
        return;
      }

      const uri = dt.getData("text/uri-list") || dt.getData("text/plain");
      if (uri) {
        const lines = uri
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#"));
        for (const line of lines) {
          await window.pond.query("saves.quickAdd", { url: line });
        }
        if (lines.length > 0) {
          toast.add({
            title: `Saved ${lines.length} link${lines.length === 1 ? "" : "s"}`,
            type: "success",
          });
        }
      }
    },
    [toast],
  );

  return {
    selectionSize,
    multiSelectActive,
    handleCardClick,
    focus,
    onDragOver,
    onDrop,
  };
}
