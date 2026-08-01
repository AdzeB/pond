import { useCallback, useEffect } from "react";
import { openSave } from "@/lib/ui/save-nav";
import { selection, useSelectionSize } from "@/stores/selection";
import type { SavesMode } from "./use-library-state";

interface CardActions {
  selectionSize: number;
  multiSelectActive: boolean;
  handleCardClick: (id: string, e: React.MouseEvent) => void;
  handleCardAuxClick: (id: string, e: React.MouseEvent) => void;
  focus: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
}

export function useCardActions(
  filteredIds: ReadonlyArray<string>,
  mode: SavesMode,
  sourceFilter: string,
): CardActions {
  const selectionSize = useSelectionSize();
  const multiSelectActive = selectionSize > 0;

  const focus = useCallback((id: string) => {
    openSave(id);
  }, []);

  const handleCardAuxClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    openSave(id, { background: true });
  }, []);

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
      openSave(id);
    },
    [filteredIds, multiSelectActive],
  );

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

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;

    /** Electron 41 removed File.path; resolve absolute paths via the preload bridge. */
    const paths = Array.from(dt.files ?? [])
      .map((f) => {
        try {
          return window.pond.pathForFile(f);
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    if (paths.length > 0) {
      await window.pond.query("saves.importFiles", { paths });
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
    }
  }, []);

  return {
    selectionSize,
    multiSelectActive,
    handleCardClick,
    handleCardAuxClick,
    focus,
    onDragOver,
    onDrop,
  };
}
