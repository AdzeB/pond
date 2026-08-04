import { useCallback, useEffect } from "react";
import { asUrlList, filePathsFromText } from "@/lib/save/url-list";
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

async function quickAddUrls(urls: readonly string[]): Promise<void> {
  for (const url of urls) {
    await window.pond.query("saves.quickAdd", { url });
  }
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

  /** Paste files, images, or links into the library when focus isn't in an editable field. */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "INPUT")
      ) {
        return;
      }

      const data = e.clipboardData;
      if (!data) return;

      const files = Array.from(data.files ?? []);
      const paths = files
        .map((f) => {
          try {
            return window.pond.pathForFile(f);
          } catch {
            return "";
          }
        })
        .filter(Boolean);

      if (paths.length > 0) {
        e.preventDefault();
        void window.pond.query("saves.importFiles", { paths });
        return;
      }

      const text =
        data.getData("text/uri-list") || data.getData("text/plain") || "";
      const textPaths = filePathsFromText(text);
      if (textPaths.length > 0) {
        e.preventDefault();
        void window.pond.query("saves.importFiles", { paths: textPaths });
        return;
      }

      /** Browsers often advertise a `Files` type for copied links; prefer URL text before image import. */
      const urls = asUrlList(text);
      if (urls) {
        e.preventDefault();
        void quickAddUrls(urls);
        return;
      }

      const types = Array.from(data.types ?? []);
      /** Finder paste often exposes `Files` with an empty FileList; main reads the native pasteboard. */
      if (
        types.includes("Files") ||
        files.some((f) => f.type.startsWith("image/")) ||
        types.some((t) => t.startsWith("image/"))
      ) {
        e.preventDefault();
        void window.pond.query("saves.importClipboard", {});
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

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

    const urls = asUrlList(
      dt.getData("text/uri-list") || dt.getData("text/plain"),
    );
    if (!urls) return;
    await quickAddUrls(urls);
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
