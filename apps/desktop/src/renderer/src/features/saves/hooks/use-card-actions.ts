import { useCallback, useEffect } from "react";
import { z } from "zod";
import type { SaveListMode } from "@/features/saves/lib/list";
import {
  clearSaveSelection,
  clickSave,
  selectOnlySave,
} from "@/features/saves/lib/select";
import { isLibrarySaveDrag } from "@/features/saves/lib/start-drag";
import { asUrlList, filePathsFromText } from "@/features/saves/lib/url-list";
import { runViewerAction } from "@/features/saves/lib/viewer-actions";
import { importFilesWithDuplicateReview } from "@/features/saves/state/duplicate-import-review";
import { useSelectionSize } from "@/features/saves/state/selection";
import { notify } from "@/shared/lib/toast";
import { getPrefsSnapshot, usePrefs } from "@/shared/state/prefs";

interface CardActions {
  selectionSize: number;
  multiSelectActive: boolean;
  handleCardClick: (id: string, e: React.MouseEvent) => void;
  handleCardAuxClick: (id: string, e: React.MouseEvent) => void;
  focus: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
}

const ImportReplySchema = z
  .object({
    ok: z.boolean().catch(false),
    id: z.string().optional().catch(undefined),
    ids: z.array(z.string()).optional().catch(undefined),
  })
  .catch({ ok: false });

function pasteSavedTitle(count: number): string {
  return count === 1 ? "Saved to Pond" : `Saved ${count} items to Pond`;
}

function downloadingTitle(count: number): string {
  return count === 1 ? "Downloading" : `Downloading ${count} links`;
}

async function importFilesAndNotify(paths: readonly string[]): Promise<void> {
  const result = ImportReplySchema.parse(
    await importFilesWithDuplicateReview({ paths: [...paths] }),
  );
  if (!result.ok) return;
  const count = result.ids?.length ?? paths.length;
  if (count === 0) return;
  notify({
    id: "paste-import",
    title: pasteSavedTitle(count),
  });
}

async function quickAddUrls(urls: readonly string[]): Promise<void> {
  const added: Array<string | null> = [];
  for (const url of urls) {
    const result = ImportReplySchema.parse(
      await window.pond.query("saves.quickAdd", { url }),
    );
    if (result.ok) added.push(result.id ?? null);
  }
  if (added.length === 0) return;
  notify({
    id: "paste-import",
    title: downloadingTitle(added.length),
  });
  const newest = added.findLast((id) => id !== null);
  if (newest && getPrefsSnapshot()?.preferences.autoSelectAfterImport)
    selectOnlySave(newest);
}

async function importClipboardAndNotify(): Promise<void> {
  const result = ImportReplySchema.parse(
    await window.pond.query("saves.importClipboard", {}),
  );
  if (!result.ok) return;
  const count = result.ids?.length ?? 1;
  if (count === 0) return;
  notify({
    id: "paste-import",
    title: pasteSavedTitle(count),
  });
}
export function useCardActions(
  filteredIds: ReadonlyArray<string>,
  mode: SaveListMode,
  sourceFilter: string,
): CardActions {
  const [viewer] = usePrefs("viewer");
  const selectionSize = useSelectionSize();
  const multiSelectActive = selectionSize > 0;

  const focus = useCallback(
    (id: string) => {
      runViewerAction(id, viewer.doubleClickAction);
    },
    [viewer.doubleClickAction],
  );

  const handleCardAuxClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      runViewerAction(id, viewer.middleClickAction);
    },
    [viewer.middleClickAction],
  );

  const handleCardClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      if (meta || shift) e.preventDefault();
      clickSave(id, { meta, shift }, filteredIds);
    },
    [filteredIds],
  );

  useEffect(() => {
    void mode;
    void sourceFilter;
    clearSaveSelection();
  }, [mode, sourceFilter]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLElement &&
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
        void importFilesAndNotify(paths);
        return;
      }

      const text =
        data.getData("text/uri-list") || data.getData("text/plain") || "";
      const textPaths = filePathsFromText(text);
      if (textPaths.length > 0) {
        e.preventDefault();
        void importFilesAndNotify(textPaths);
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
        void importClipboardAndNotify();
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer || isLibrarySaveDrag(e.dataTransfer)) return;
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
    if (!dt || isLibrarySaveDrag(dt)) return;

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
      await importFilesAndNotify(paths);
      return;
    }

    const text = dt.getData("text/uri-list") || dt.getData("text/plain");
    const textPaths = filePathsFromText(text);
    if (textPaths.length > 0) {
      await importFilesAndNotify(textPaths);
      return;
    }

    const urls = asUrlList(text);
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
