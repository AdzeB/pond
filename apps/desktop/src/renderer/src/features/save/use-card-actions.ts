import { useToast } from "@pond/ui";
import { useCallback, useEffect } from "react";
import {
  primarySelection,
  selection,
  useSelectionSize,
} from "@/core/data/selection";
import type { SavesMode } from "@/features/library/hooks/use-library-state";

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
  const toast = useToast();

  const selectionSize = useSelectionSize();
  const multiSelectActive = selectionSize > 0;

  // Opening a save highlights it in the grid and shows it in the inline detail
  // modal (`SaveModal`), which renders whenever a save is selected. Stepping the
  // selection navigates the modal in place.
  const select = useCallback((id: string) => {
    primarySelection.set(id);
  }, []);

  const focus = useCallback((id: string) => {
    primarySelection.set(id);
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
      select(id);
    },
    [filteredIds, multiSelectActive, select],
  );

  useEffect(() => {
    void mode;
    void sourceFilter;
    selection.clear();
    primarySelection.set(null);
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

      // Electron 41 removed File.path, so resolve dropped files to absolute
      // paths via the preload bridge and let the main process read them.
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
        const result = (await window.pond.query("saves.importFiles", {
          paths,
        })) as { ok: boolean; ids?: string[] };
        const count = result.ids?.length ?? 0;
        if (count > 0) {
          toast.add({
            title: `Imported ${count} file${count === 1 ? "" : "s"}`,
            type: "success",
          });
        } else {
          toast.add({ title: "Couldn't import those files", type: "error" });
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
